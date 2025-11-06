import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx'; 
import toast from 'react-hot-toast'; // <-- ¡USAMOS TOAST!

// --- Interfaces ---
interface Producto {
  id: number;
  nombre_equipo: string;
  descripcion: string; 
  unidades_totales: number; 
  unidades_prestadas: number; 
  loan_count: number;         
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
        toast.error("No se pudo cargar el inventario."); // <-- TOAST
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
      if (campoActual === 'nombre') { refsInputs.current[`unidades-${id}`]?.focus(); refsInputs.current[`unidades-${id}`]?.select(); } 
      else if (campoActual === 'unidades') {
        const indiceActual = productosEditados.findIndex(p => p.id === id);
        const siguienteProducto = productosEditados[indiceActual + 1];
        if (siguienteProducto) {
          setIdEditando(siguienteProducto.id); 
           setTimeout(() => { refsInputs.current[`nombre-${siguienteProducto.id}`]?.focus(); refsInputs.current[`nombre-${siguienteProducto.id}`]?.select(); }, 50);
        } else { setIdEditando(null); }
      }
    } else if (e.key === 'Escape') {
        setProductosEditados(prev => prev.map(p => (p.id === id ? productosOriginales.find(op => op.id === id) || p : p)));
        setIdEditando(null);
        setHayCambios(productosEditados.some((productoEditado, index) => JSON.stringify(productoEditado) !== JSON.stringify(productosOriginales[index]) && productoEditado.id !== id));
    }
  };

  // --- Guardar Cambios ---
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
                toast.error(`Cantidad inválida para '${productoEditado.nombre_equipo}'`); // <-- TOAST
                validationError = true; 
            }
        }
    });

    if (validationError) {
        setGuardando(false);
        return; 
    }

    if (cambios.length === 0) {
        setGuardando(false);
        setHayCambios(false);
        toast('No hay cambios para guardar.', { icon: 'ℹ️' }); // <-- TOAST INFO
        return;
    }

    const promesasUpdate = cambios.map(cambio => fetch(`${apiUrl}/api/inventario/${cambio.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre_equipo: cambio.nombre_equipo, unidades_totales: cambio.unidades_totales }), }));

    try {
        const respuestas = await Promise.all(promesasUpdate);
        const updatesFallidos = respuestas.filter(res => !res.ok);
        if (updatesFallidos.length > 0) { throw new Error(`Fallaron ${updatesFallidos.length} actualizaciones`); }
        
        toast.success(`¡${cambios.length} item(s) actualizados!`); // <-- TOAST ÉXITO
        await fetchInventario(); 
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        toast.error("Ocurrió un error al guardar los cambios."); // <-- TOAST ERROR
    } finally {
        setGuardando(false);
    }
  };

   // --- Cancelar Cambios ---
   const handleCancelarCambios = () => {
        if (hayCambios && window.confirm("¿Descartar cambios no guardados?")) {
            setProductosEditados(productosOriginales); 
            setHayCambios(false);
            setIdEditando(null);
            toast('Cambios descartados', { icon: '🗑️' }); // <-- TOAST
        } else if (!hayCambios){
            setIdEditando(null);
        }
   };

  // --- Exportar a Excel ---
  const handleExportXLS = () => {
    if (productosOriginales.length === 0) { toast.error("No hay datos para exportar."); return; } // <-- TOAST
    const dataToExport = productosOriginales.map(p => ({ ID: p.id, NombreEquipo: p.nombre_equipo, Descripcion: p.descripcion, UnidadesTotales: p.unidades_totales, UnidadesPrestadas: p.unidades_prestadas, VecesPrestado: p.loan_count, Visible: p.visible === 1 ? 'Sí' : 'No' })); 
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [ { wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }]; 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario.xlsx");
    toast.success("Inventario exportado correctamente"); // <-- TOAST
  }

  // --- Manejar Cambio de Archivo ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { handleImportCSV(file); }
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  }

  // --- Importar desde CSV ---
  const handleImportCSV = (file: File) => {
    if (!window.confirm("IMPORTANTE: Esto reemplazará TODO el inventario actual. ¿Continuar?")) return;
    setImportando(true);
    const reader = new FileReader();
    
    const loadingToast = toast.loading("Importando inventario..."); // <-- TOAST DE CARGA

    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) { 
          toast.error("Error al leer archivo.", { id: loadingToast }); 
          setImportando(false); return; 
      }
      try {
        const workbook = XLSX.read(text, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); 
        if (jsonData.length < 2) throw new Error("Archivo CSV vacío o sin datos.");
        const headers = (jsonData[0] as string[]).map(h => h.trim().toLowerCase());
        const dataRows = jsonData.slice(1);
        const itemsToImport = dataRows.map(rowArray => { const row = rowArray as (string|number)[]; let item: {[key: string]: any} = {}; headers.forEach((header, index) => { let key = header; if (header === 'nombre' || header === 'nombre equipo' || header === 'name') key = 'nombre_equipo'; if (header === 'descripcion' || header === 'descripción') key = 'descripcion'; if (header === 'total' || header === 'cantidad' || header === 'unidades totales' || header === 'unidadestotales') key = 'unidades_totales'; item[key] = row[index]; }); return item; });
        
        const response = await fetch(`${apiUrl}/api/inventario/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemsToImport) });
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.err || `Error: ${response.statusText}`);
        
        toast.success(result.message || "Importación completada.", { id: loadingToast }); // <-- ACTUALIZA TOAST
        await fetchInventario(); 

      } catch (error) {
        console.error("Error al importar CSV:", error);
        toast.error("Error durante la importación. Revisa el formato CSV.", { id: loadingToast });
      } finally { setImportando(false); }
    };
    reader.onerror = () => { 
        toast.error("Error al leer archivo.", { id: loadingToast }); 
        setImportando(false); 
    };
    reader.readAsText(file);
  }
  
  // --- Cambiar Visibilidad ---
  const handleToggleVisibilidad = async (id: number) => {
      const originalVisibilityMap = new Map(productosEditados.map(p => [p.id, p.visible]));
      setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: p.visible === 1 ? 0 : 1} : p));
      try {
          const response = await fetch(`${apiUrl}/api/inventario/${id}/toggle-visibility`, { method: 'PUT' });
          const result = await response.json();
          if (!response.ok) throw new Error(result.err || 'Error al cambiar visibilidad');
          setProductosOriginales(prev => prev.map(p => p.id === id ? {...p, visible: result.visible} : p));
          toast.success("Visibilidad actualizada"); // <-- TOAST
      } catch (error) {
          console.error("Error al cambiar visibilidad:", error);
          toast.error("Error al cambiar visibilidad"); // <-- TOAST
          setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: originalVisibilityMap.get(id) ?? p.visible} : p));
      }
  }

  // --- Renderizado ---
  if (cargando) return <p>Cargando inventario...</p>;

  return (
    <div className="inventario-container">
      <h2>Gestión de Inventario</h2>
      <p>Haz doble clic en Nombre o U. Totales para editar. Enter para moverte. Esc para cancelar fila.</p>

      {/* Botones Guardar/Cancelar */}
      {hayCambios && (
        <div className="save-actions">
           <button onClick={handleGuardarCambios} disabled={guardando} className="save-btn"> {guardando ? 'Guardando...' : 'Guardar Cambios'} </button>
           <button onClick={handleCancelarCambios} disabled={guardando} className="cancel-btn"> Cancelar </button>
        </div>
      )}

      {/* Botones Exportar/Importar */}
      <div className="import-export-actions">
        <button onClick={handleExportXLS} disabled={guardando || importando || hayCambios} className="export-btn" title={hayCambios ? "Guarda o cancela cambios antes de exportar" : ""}> Exportar a Excel (.xlsx) </button>
        <label htmlFor="csv-input" className={`import-btn ${importando || hayCambios ? 'disabled' : ''}`} title={hayCambios ? "Guarda o cancela cambios antes de importar" : ""}> {importando ? 'Importando...' : 'Importar desde CSV'} </label>
        <input ref={fileInputRef} id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} disabled={importando || hayCambios} />
        <small>(Reemplaza todo el inventario)</small>
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Equipo</th>
              <th>Descripción</th>
              <th>Unidades Totales</th>
              <th>Prestadas Actual.</th> 
              <th>Diferencia</th>        
              <th>Veces Prestado</th>    
              <th>Visible (App Solicitud)</th> 
            </tr>
          </thead>
          <tbody>
            {productosEditados.map((producto) => {
              const diferencia = producto.unidades_totales - producto.unidades_prestadas;
              const isEditing = idEditando === producto.id;
              return (
                <tr key={producto.id} className={isEditing ? 'editing-row' : ''}>
                  <td>{producto.id}</td>
                  <td onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? ( <input ref={el => { refsInputs.current[`nombre-${producto.id}`] = el; }} type="text" value={producto.nombre_equipo} onChange={(e) => handleCambioInput(producto.id, 'nombre_equipo', e.target.value)} onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'nombre')} onBlur={() => setIdEditando(prevId => prevId === producto.id ? null : prevId)} /> ) : ( producto.nombre_equipo )}
                  </td>
                  <td>{producto.descripcion}</td>
                  <td onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                    {isEditing ? ( <input ref={el => { refsInputs.current[`unidades-${producto.id}`] = el; }} type="number" min="0" value={producto.unidades_totales} onChange={(e) => handleCambioInput(producto.id, 'unidades_totales', e.target.value)} onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'unidades')} onBlur={() => setIdEditando(prevId => prevId === producto.id ? null : prevId)} /> ) : ( producto.unidades_totales )}
                  </td>
                  <td>{producto.unidades_prestadas}</td>
                  <td className={`diferencia ${diferencia < 0 ? 'negativa' : diferencia > 0 ? 'positiva' : ''}`}> {diferencia} {diferencia < 0 ? ' (!)' : ''} </td>
                  <td>{producto.loan_count}</td>
                  <td className="visibility-cell">
                    <span className={`status-badge ${producto.visible === 1 ? 'visible' : 'oculto'}`}> {producto.visible === 1 ? 'Visible' : 'Oculto'} </span>
                    <button onClick={() => handleToggleVisibilidad(producto.id)} className="toggle-visibility-btn" title={producto.visible === 1 ? 'Ocultar' : 'Mostrar'}> {producto.visible === 1 ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'} </button>
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