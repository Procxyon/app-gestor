import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx'; 
import toast from 'react-hot-toast';
import styles from './Inventario.module.css'; 
import RealizarInventario from './RealizarInventario';

// --- 1. Definición de Categorías (Nueva Estructura) ---
const CATEGORIAS: { [key: number]: string } = {
    // Rango 1-10: CASETA
    1: 'Consumibles',
    2: 'Herramientas',
    3: 'Equipo de Seguridad',
    
    // Rango 11-20: LABORATORIO
    11: 'NMLC1',
    12: 'NMLC2',
    13: 'NMPR',
    14: 'NMLE',
    15: 'ELECTROMECANICA',
    16: 'PLC',
    17: 'PROYECTOS',
    18: 'AREA 1',
    19: 'AREA 2',
    20: 'AREA 3'
};

// --- 2. Interfaces ---
interface Producto {
  id: number;
  nombre_equipo: string;
  descripcion: string; 
  unidades_totales: number; 
  unidades_prestadas: number; 
  // visible: 0 = Laboratorio, 1 = Caseta
  visible: number; 
  categoria: number;
}

interface InventarioProps {
  apiUrl: string; 
}

function Inventario({ apiUrl }: InventarioProps) {
  const [productosOriginales, setProductosOriginales] = useState<Producto[]>([]);
  const [productosEditados, setProductosEditados] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [hayCambios, setHayCambios] = useState(false);
  
  const [modoInventario, setModoInventario] = useState(false);
  
  const refsInputs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [filtro, setFiltro] = useState('');

  // --- 3. Carga Inicial ---
  const fetchInventario = async () => {
      setCargando(true);
      try {
        const respuesta = await fetch(`${apiUrl}/api/inventario`); 
        if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);
        const data: Producto[] = await respuesta.json(); 
        
        // Saneamiento
        const dataSanatized = data.map(p => ({
            ...p,
            categoria: p.categoria || 1 
        }));

        setProductosOriginales(dataSanatized); 
        setProductosEditados(dataSanatized);   
        setHayCambios(false);       
        setIdEditando(null);         
      } catch (error) {
        console.error('Error al cargar inventario:', error);
        toast.error("No se pudo cargar el inventario.");
      }
      setCargando(false);
  };

  useEffect(() => {
    fetchInventario();
  }, [apiUrl]);

  // --- 4. Funciones de Edición ---
  const handleDobleClick = (id: number) => {
    setIdEditando(id);
    setTimeout(() => { 
        const input = refsInputs.current[`nombre-${id}`] as HTMLInputElement;
        if(input) { input.focus(); input.select(); }
    }, 50);
  };
  
  const handleCambioInput = (id: number, campo: keyof Producto, valor: string | number) => {
    if (campo !== 'nombre_equipo' && campo !== 'unidades_totales' && campo !== 'categoria') return;
    
    let valorProcesado = valor;
    if (campo === 'unidades_totales' || campo === 'categoria') {
        valorProcesado = (parseInt(valor as string, 10) || 0);
    }

    setProductosEditados(prev => prev.map(p => (p.id === id ? { ...p, [campo]: valorProcesado } : p)));
    setHayCambios(true); 
  };

  const handleTeclaAbajo = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, id: number, campoActual: 'nombre' | 'unidades' | 'categoria') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (campoActual === 'nombre') { 
          (refsInputs.current[`unidades-${id}`] as HTMLInputElement)?.focus(); 
          (refsInputs.current[`unidades-${id}`] as HTMLInputElement)?.select();
      } else if (campoActual === 'unidades') {
          (refsInputs.current[`categoria-${id}`] as HTMLSelectElement)?.focus();
      } else if (campoActual === 'categoria') {
        const indiceActual = productosEditados.findIndex(p => p.id === id);
        const siguienteProducto = productosEditados[indiceActual + 1];
        if (siguienteProducto) {
          setIdEditando(siguienteProducto.id); 
           setTimeout(() => { 
               const nextInput = refsInputs.current[`nombre-${siguienteProducto.id}`] as HTMLInputElement;
               if(nextInput) { nextInput.focus(); nextInput.select(); }
           }, 50);
        } else { setIdEditando(null); }
      }
    } else if (e.key === 'Escape') {
        setProductosEditados(prev => prev.map(p => (p.id === id ? productosOriginales.find(op => op.id === id) || p : p)));
        setIdEditando(null);
        setHayCambios(productosEditados.some((pe, i) => JSON.stringify(pe) !== JSON.stringify(productosOriginales[i]) && pe.id !== id));
    }
  };

  // --- 5. Guardar Cambios ---
  const handleGuardarCambios = async () => {
    setIdEditando(null); 
    setGuardando(true);
    const cambios: Producto[] = [];
    let validationError = false; 

    productosEditados.forEach(productoEditado => {
        if (validationError) return; 
        const productoOriginal = productosOriginales.find(p => p.id === productoEditado.id);
        if (!productoOriginal) return;

        const haCambiado = 
            productoEditado.nombre_equipo !== productoOriginal.nombre_equipo || 
            Number(productoEditado.unidades_totales) !== Number(productoOriginal.unidades_totales) ||
            Number(productoEditado.categoria) !== Number(productoOriginal.categoria);

        if (haCambiado) {
            if (Number(productoEditado.unidades_totales) >= 0) {
                cambios.push({ ...productoEditado });
            } else {
                toast.error(`Cantidad inválida para '${productoEditado.nombre_equipo}'`);
                validationError = true; 
            }
        }
    });

    if (validationError) { setGuardando(false); return; }
    if (cambios.length === 0) {
        setGuardando(false); setHayCambios(false);
        toast('No hay cambios para guardar.', { icon: 'ℹ️' });
        return;
    }

    const promesasUpdate = cambios.map(cambio => 
        fetch(`${apiUrl}/api/inventario/${cambio.id}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                nombre_equipo: cambio.nombre_equipo, 
                unidades_totales: cambio.unidades_totales,
                categoria: cambio.categoria 
            }), 
        })
    );

    try {
        await Promise.all(promesasUpdate);
        toast.success(`¡${cambios.length} item(s) actualizados con éxito!`);
        await fetchInventario(); 
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        toast.error(`Error al guardar.`);
    } finally {
        setGuardando(false);
    }
  };

   const handleCancelarCambios = () => {
        if (hayCambios && window.confirm("¿Descartar cambios no guardados?")) {
            setProductosEditados(productosOriginales); 
            setHayCambios(false);
            setIdEditando(null);
            toast('Cambios descartados', { icon: '🗑️' });
        } else if (!hayCambios){
            setIdEditando(null);
        }
   };

  // --- 6. Exportar a Excel ---
  const handleExportXLS = () => {
    if (productosOriginales.length === 0) { toast.error("No hay datos para exportar."); return; }
    
    const dataToExport = productosOriginales.map(p => ({ 
        ID: p.id, 
        NombreEquipo: p.nombre_equipo, 
        Descripcion: p.descripcion, 
        UnidadesTotales: p.unidades_totales, 
        UnidadesPrestadas: p.unidades_prestadas, 
        Disponibles: p.unidades_totales - p.unidades_prestadas,
        // NUEVA LÓGICA DE TIPO
        Tipo: p.visible === 1 ? 'Caseta' : 'Laboratorio',
        Categoria: CATEGORIAS[p.categoria] || 'General', 
        CategoriaID: p.categoria 
    })); 
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario_completo.xlsx");
    toast.success("Inventario exportado");
  }

  // --- 7. Importar CSV ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { handleImportCSV(file); }
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  }

  const handleImportCSV = (file: File) => {
    if (!window.confirm("IMPORTANTE: Esto reemplazará TODO el inventario. ¿Continuar?")) return;
    setImportando(true);
    const loadingToast = toast.loading("Importando inventario..."); 
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) { toast.error("Error al leer archivo.", { id: loadingToast }); setImportando(false); return; }
      try {
        const workbook = XLSX.read(text, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); 
        if (jsonData.length < 2) throw new Error("Archivo vacío.");
        
        const headers = (jsonData[0] as string[]).map(h => h.trim().toLowerCase());
        const dataRows = jsonData.slice(1);
        
        const itemsToImport = dataRows.map(rowArray => { 
            const row = rowArray as (string|number)[]; 
            let item: {[key: string]: any} = {}; 
            headers.forEach((header, index) => { 
                let key = header; 
                if (header.includes('nombre') || header.includes('name')) key = 'nombre_equipo'; 
                if (header.includes('desc')) key = 'descripcion'; 
                if (header.includes('total') || header.includes('cantidad')) key = 'unidades_totales'; 
                if (header.includes('visible') || (header.includes('tipo') && !header.includes('cat'))) key = 'visible'; 
                if (header.includes('categoria') || header.includes('cat')) key = 'categoria'; 
                item[key] = row[index]; 
            }); 
            return item; 
        });

        const response = await fetch(`${apiUrl}/api/inventario/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemsToImport) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.err || `Error: ${response.statusText}`);
        toast.success(result.message, { id: loadingToast });
        await fetchInventario(); 
      } catch (error) {
        console.error("Error importar:", error);
        toast.error(`Error importación: ${error instanceof Error ? error.message : 'Desconocido'}`, { id: loadingToast });
      } finally { setImportando(false); }
    };
    reader.readAsText(file);
  }
  
  // --- 8. Toggle Tipo (0=Lab, 1=Caseta) ---
  const handleToggleTipo = async (id: number) => {
      const originalMap = new Map(productosEditados.map(p => [p.id, p.visible]));
      
      // Al cambiar tipo, cambiamos el visible
      // NOTA: No cambiamos la categoría automáticamente en DB, 
      // el usuario deberá editarla si queda fuera de rango.
      setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: p.visible === 1 ? 0 : 1} : p));
      
      try {
          const response = await fetch(`${apiUrl}/api/inventario/${id}/toggle-type`, { method: 'PUT' });
          if (!response.ok) throw new Error('Error al cambiar tipo');
          
          const result = await response.json();
          setProductosOriginales(prev => prev.map(p => p.id === id ? {...p, visible: result.visible} : p));
          toast.success("Tipo actualizado");
      } catch (error) {
          toast.error("No se pudo cambiar el tipo");
          setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: originalMap.get(id) ?? p.visible} : p));
      }
  }

  // --- RENDERIZADO CONDICIONAL: MODO INVENTARIO ---
  if (modoInventario) {
    return (
      <RealizarInventario 
        apiUrl={apiUrl} 
        onVolver={() => {
            setModoInventario(false);
            fetchInventario(); 
        }} 
      />
    );
  }

  if (cargando) return <p>Cargando inventario...</p>;

  const productosFiltrados = productosEditados.filter(p => 
    p.nombre_equipo.toLowerCase().includes(filtro.toLowerCase()) ||
    p.id.toString().includes(filtro)
  );

  return (
    <div className={styles.appContainer}>
      <header>
        <h2>Gestión de Inventario</h2>
        <p>Doble clic en celdas para editar (Nombre, Cantidad o Categoría).</p>
      </header>

      {hayCambios && (
        <div className={styles.saveActions}>
           <button onClick={handleGuardarCambios} disabled={guardando} className={styles.saveBtn}> {guardando ? 'Guardando...' : 'Guardar Cambios'} </button>
           <button onClick={handleCancelarCambios} disabled={guardando} className={styles.cancelBtn}> Cancelar </button>
        </div>
      )}

      <div className={styles.controls}>
        <input type="text" placeholder="Buscar..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        
        <button 
             onClick={() => setModoInventario(true)} 
             className={styles.exportBtn} 
             style={{background: '#6f42c1', color: 'white', borderColor: '#6f42c1', marginRight: 'auto', marginLeft: '10px'}}
        >
             📋 REALIZAR INVENTARIO
        </button>

        <div className={styles.importExportActions} style={{ marginBottom: 0 }}>
          <button onClick={handleExportXLS} disabled={guardando || importando || hayCambios} className={styles.exportBtn}> Exportar Excel </button>
          <label htmlFor="csv-input" className={`${styles.importBtn} ${importando || hayCambios ? styles.disabled : ''}`}> {importando ? '...' : 'Importar CSV'} </label>
          <input ref={fileInputRef} id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} disabled={importando || hayCambios} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Equipo</th>
              <th style={{textAlign: 'center'}}>Total</th>
              <th style={{textAlign: 'center'}}>Prestado</th>
              <th style={{textAlign: 'center'}}>Disp.</th>        
              <th style={{textAlign: 'center'}}>Categoría</th> 
              <th style={{textAlign: 'center'}}>Tipo</th> 
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((producto) => {
              const disponibles = producto.unidades_totales - producto.unidades_prestadas;
              const isEditing = idEditando === producto.id;
              const hayPrestados = producto.unidades_prestadas > 0;
              const isCaseta = producto.visible === 1; // 1 = Caseta, 0 = Lab

              // Filtramos opciones del dropdown según el Tipo seleccionado
              const categoriasDisponibles = Object.entries(CATEGORIAS).filter(([k, v]) => {
                  const catId = Number(k);
                  if (isCaseta) return catId >= 1 && catId <= 10;
                  return catId >= 11 && catId <= 20;
              });
              
              return (
                <tr key={producto.id} className={isEditing ? styles.editingRow : ''}>
                  <td>{producto.id}</td>
                  
                  {/* Nombre */}
                  <td onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? ( 
                        <input 
                            ref={el => { refsInputs.current[`nombre-${producto.id}`] = el as HTMLInputElement; }} 
                            type="text" 
                            value={producto.nombre_equipo} 
                            onChange={(e) => handleCambioInput(producto.id, 'nombre_equipo', e.target.value)} 
                            onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'nombre')} 
                        /> 
                    ) : ( producto.nombre_equipo )}
                  </td>
                  
                  {/* Unidades Totales */}
                  <td style={{textAlign: 'center'}} onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? ( 
                        <input 
                            ref={el => { refsInputs.current[`unidades-${producto.id}`] = el as HTMLInputElement; }} 
                            type="number" min="0" 
                            style={{width: '60px', textAlign: 'center'}}
                            value={producto.unidades_totales} 
                            onChange={(e) => handleCambioInput(producto.id, 'unidades_totales', e.target.value)} 
                            onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'unidades')} 
                        /> 
                    ) : ( producto.unidades_totales )}
                  </td>
                  
                  {/* En Préstamo */}
                  <td style={{textAlign: 'center'}} className={hayPrestados ? styles.alertaPrestamo : ''}>
                    {producto.unidades_prestadas}
                  </td>
                  
                  {/* Disponibles */}
                  <td style={{textAlign: 'center'}}>
                    <span className={`${styles.badgeDisponible} ${disponibles < 0 ? styles.negativo : disponibles === 0 ? styles.agotado : ''}`}>
                        {disponibles}
                    </span>
                  </td>

                  {/* Categoría (Dropdown condicionado) */}
                  <td style={{textAlign: 'center'}} onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? (
                        <select
                            ref={el => { refsInputs.current[`categoria-${producto.id}`] = el as HTMLSelectElement; }} 
                            value={producto.categoria}
                            onChange={(e) => handleCambioInput(producto.id, 'categoria', e.target.value)}
                            onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'categoria')}
                            style={{ padding: '6px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555', maxWidth: '150px' }}
                        >
                            {/* Opciones filtradas según el Tipo actual del producto */}
                            {categoriasDisponibles.map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ 
                            fontSize: '0.85em', 
                            padding: '4px 8px', 
                            borderRadius: '12px', 
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            {CATEGORIAS[producto.categoria] || `Cat ${producto.categoria}`}
                        </span>
                    )}
                  </td>

                  {/* Tipo (0=Lab, 1=Caseta) */}
                  <td className={styles.visibilityCell}>
                    <button 
                        onClick={() => handleToggleTipo(producto.id)} 
                        className={`${styles.tipoBadge} ${isCaseta ? styles.tipoMaterial : styles.tipoEquipo}`} 
                        title="Clic para cambiar Tipo"
                    >
                        {isCaseta ? 'CASETA' : 'LABORATORIO'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Inventario;