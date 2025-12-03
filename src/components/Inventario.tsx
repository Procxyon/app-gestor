import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx'; 
import toast from 'react-hot-toast';
import styles from './Inventario.module.css'; 

// --- Interfaces ---
interface Producto {
  id: number;
  nombre_equipo: string;
  descripcion: string; 
  unidades_totales: number; 
  unidades_prestadas: number; 
  // 'visible' en DB ahora lo usamos como 'tipo' (1=Equipo, 0=Material)
  visible: number; 
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
  const refsInputs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [filtro, setFiltro] = useState('');

  // --- Carga Inicial ---
  const fetchInventario = async () => {
      setCargando(true);
      try {
        const respuesta = await fetch(`${apiUrl}/api/inventario`); 
        if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);
        const data: Producto[] = await respuesta.json(); 
        setProductosOriginales(data); 
        setProductosEditados(data);   
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

  // --- Funciones de Edición ---
  const handleDobleClick = (id: number) => {
    setIdEditando(id);
    setTimeout(() => { refsInputs.current[`nombre-${id}`]?.focus(); refsInputs.current[`nombre-${id}`]?.select(); }, 50);
  };
  
  const handleCambioInput = (id: number, campo: keyof Producto, valor: string | number) => {
    if (campo !== 'nombre_equipo' && campo !== 'unidades_totales') return;
    const valorProcesado = campo === 'unidades_totales' ? (parseInt(valor as string, 10) || 0) : valor;
    setProductosEditados(prev => prev.map(p => (p.id === id ? { ...p, [campo]: valorProcesado } : p)));
    setHayCambios(true); 
  };

  const handleTeclaAbajo = (e: React.KeyboardEvent<HTMLInputElement>, id: number, campoActual: 'nombre' | 'unidades') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (campoActual === 'nombre') { 
          refsInputs.current[`unidades-${id}`]?.focus(); 
          refsInputs.current[`unidades-${id}`]?.select(); 
      } else if (campoActual === 'unidades') {
        const indiceActual = productosEditados.findIndex(p => p.id === id);
        const siguienteProducto = productosEditados[indiceActual + 1];
        if (siguienteProducto) {
          setIdEditando(siguienteProducto.id); 
           setTimeout(() => { refsInputs.current[`nombre-${siguienteProducto.id}`]?.focus(); refsInputs.current[`nombre-${siguienteProducto.id}`]?.select(); }, 50);
        } else { setIdEditando(null); }
      }
    } else if (e.key === 'Escape') {
        // Revertir cambios de esa fila específica
        setProductosEditados(prev => prev.map(p => (p.id === id ? productosOriginales.find(op => op.id === id) || p : p)));
        setIdEditando(null);
        // Verificar si quedan otros cambios
        setHayCambios(productosEditados.some((productoEditado, index) => JSON.stringify(productoEditado) !== JSON.stringify(productosOriginales[index]) && productoEditado.id !== id));
    }
  };

  // --- Guardar Cambios (Solo Nombre y Totales) ---
  const handleGuardarCambios = async () => {
    setIdEditando(null); 
    setGuardando(true);
    const cambios: Producto[] = [];
    let validationError = false; 

    productosEditados.forEach(productoEditado => {
        if (validationError) return; 
        const productoOriginal = productosOriginales.find(p => p.id === productoEditado.id);
        const unidadesOriginales = productoOriginal ? Number(productoOriginal.unidades_totales) : undefined;
        const unidadesEditadas = Number(productoEditado.unidades_totales);

        if (productoOriginal && (productoEditado.nombre_equipo !== productoOriginal.nombre_equipo || unidadesEditadas !== unidadesOriginales)) {
            if (!isNaN(unidadesEditadas) && unidadesEditadas >= 0) {
                cambios.push({ ...productoEditado, unidades_totales: unidadesEditadas });
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

    const promesasUpdate = cambios.map(cambio => fetch(`${apiUrl}/api/inventario/${cambio.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre_equipo: cambio.nombre_equipo, unidades_totales: cambio.unidades_totales }), }));

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

  // --- Exportar a Excel ---
  const handleExportXLS = () => {
    if (productosOriginales.length === 0) { toast.error("No hay datos para exportar."); return; }
    // Ajustamos el export para reflejar el nuevo significado de columnas
    const dataToExport = productosOriginales.map(p => ({ 
        ID: p.id, 
        NombreEquipo: p.nombre_equipo, 
        Descripcion: p.descripcion, 
        UnidadesTotales: p.unidades_totales, 
        UnidadesPrestadas: p.unidades_prestadas, 
        Disponibles: p.unidades_totales - p.unidades_prestadas,
        Tipo: p.visible === 1 ? 'Equipo' : 'Material' 
    })); 
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [ { wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]; 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario_actualizado.xlsx");
    toast.success("Inventario exportado");
  }

  // --- Importar CSV ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { handleImportCSV(file); }
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  }

  const handleImportCSV = (file: File) => {
    if (!window.confirm("IMPORTANTE: Esto reemplazará TODO el inventario actual. ¿Continuar?")) return;
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
        
        // Mapeo básico de headers
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
                if (header.includes('tipo') || header.includes('visible')) key = 'visible'; // 1 o 0
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
  
  // --- Cambiar Tipo (Equipo/Material) ---
  // Nota: Usamos el endpoint que antes era toggle-visibility, ahora toggle-type
  const handleToggleTipo = async (id: number) => {
      const originalMap = new Map(productosEditados.map(p => [p.id, p.visible]));
      // Optimistic update
      setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: p.visible === 1 ? 0 : 1} : p));
      try {
          const response = await fetch(`${apiUrl}/api/inventario/${id}/toggle-type`, { method: 'PUT' });
          const result = await response.json();
          if (!response.ok) throw new Error(result.err || 'Error al cambiar tipo');
          
          setProductosOriginales(prev => prev.map(p => p.id === id ? {...p, visible: result.visible} : p));
          toast.success("Categoría actualizada");
      } catch (error) {
          console.error("Error al cambiar tipo:", error);
          toast.error("No se pudo cambiar el tipo");
          setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: originalMap.get(id) ?? p.visible} : p));
      }
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
        <p>Doble clic en celdas para editar. 'Prestadas' en rojo indica items faltantes.</p>
      </header>

      {hayCambios && (
        <div className={styles.saveActions}>
           <button onClick={handleGuardarCambios} disabled={guardando} className={styles.saveBtn}> {guardando ? 'Guardando...' : 'Guardar Cambios'} </button>
           <button onClick={handleCancelarCambios} disabled={guardando} className={styles.cancelBtn}> Cancelar </button>
        </div>
      )}

      <div className={styles.controls}>
        <input type="text" placeholder="Buscar equipo..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
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
              <th>Descripción</th>
              <th style={{textAlign: 'center'}}>Total</th>
              <th style={{textAlign: 'center'}}>En Préstamo</th>
              <th style={{textAlign: 'center'}}>Disponibles</th>        
              <th style={{textAlign: 'center'}}>Tipo</th> 
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((producto) => {
              const disponibles = producto.unidades_totales - producto.unidades_prestadas;
              const isEditing = idEditando === producto.id;
              // Lógica visual de alerta
              const hayPrestados = producto.unidades_prestadas > 0;
              
              return (
                <tr key={producto.id} className={isEditing ? styles.editingRow : ''}>
                  <td>{producto.id}</td>
                  
                  {/* Nombre */}
                  <td onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? ( 
                        <input 
                            ref={el => { refsInputs.current[`nombre-${producto.id}`] = el; }} 
                            type="text" 
                            value={producto.nombre_equipo} 
                            onChange={(e) => handleCambioInput(producto.id, 'nombre_equipo', e.target.value)} 
                            onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'nombre')} 
                            onBlur={() => setIdEditando(prevId => prevId === producto.id ? null : prevId)} 
                        /> 
                    ) : ( producto.nombre_equipo )}
                  </td>
                  
                  <td>{producto.descripcion}</td>
                  
                  {/* Unidades Totales */}
                  <td style={{textAlign: 'center'}} onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? ( 
                        <input 
                            ref={el => { refsInputs.current[`unidades-${producto.id}`] = el; }} 
                            type="number" min="0" 
                            value={producto.unidades_totales} 
                            onChange={(e) => handleCambioInput(producto.id, 'unidades_totales', e.target.value)} 
                            onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'unidades')} 
                            onBlur={() => setIdEditando(prevId => prevId === producto.id ? null : prevId)} 
                        /> 
                    ) : ( producto.unidades_totales )}
                  </td>
                  
                  {/* En Préstamo (Alerta Roja) */}
                  <td style={{textAlign: 'center'}} className={hayPrestados ? styles.alertaPrestamo : ''}>
                    {producto.unidades_prestadas}
                  </td>
                  
                  {/* Disponibles (Calculado) */}
                  <td style={{textAlign: 'center'}}>
                    <span className={`${styles.badgeDisponible} ${disponibles < 0 ? styles.negativo : disponibles === 0 ? styles.agotado : ''}`}>
                        {disponibles}
                    </span>
                  </td>

                  {/* Tipo (Equipo/Material) */}
                  <td className={styles.visibilityCell}>
                    <button 
                        onClick={() => handleToggleTipo(producto.id)} 
                        className={`${styles.tipoBadge} ${producto.visible === 1 ? styles.tipoEquipo : styles.tipoMaterial}`}
                        title="Clic para cambiar categoría"
                    >
                        {producto.visible === 1 ? 'EQUIPO' : 'MATERIAL'}
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