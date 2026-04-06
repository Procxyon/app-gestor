import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx'; 
import toast from 'react-hot-toast';
import styles from './Inventario.module.css'; 
import RealizarInventario from './RealizarInventario';

// --- 1. Definición de Categorías ---
const CATEGORIAS: { [key: number]: string } = {
    1: 'Consumibles', 2: 'Herramientas', 3: 'Equipo de Seguridad',
    11: 'NMLC1', 12: 'NMLC2', 13: 'NMPR', 14: 'NMLE', 15: 'ELECTROMECANICA',
    16: 'PLC', 17: 'PROYECTOS', 18: 'AREA 1', 19: 'AREA 2', 20: 'AREA 3'
};

interface Producto {
  id: number;
  nombre_equipo: string;
  descripcion: string; 
  unidades_totales: number; 
  unidades_prestadas: number; 
  visible: number; 
  categoria: number;
}

interface InventarioProps { apiUrl: string; }

function Inventario({ apiUrl }: InventarioProps) {
  const [productosOriginales, setProductosOriginales] = useState<Producto[]>([]);
  const [productosEditados, setProductosEditados] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [hayCambios, setHayCambios] = useState(false);
  const [modoInventario, setModoInventario] = useState(false);
  
  const [fantasmas, setFantasmas] = useState<Producto[]>([]);
  const [mostrarFantasmas, setMostrarFantasmas] = useState(false);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Laboratorio' | 'Caseta'>('Todos');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMenuOptionsOpen, setIsMenuOptionsOpen] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  const refsInputs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuFiltroRef = useRef<HTMLDivElement>(null);
  const menuOptionsRef = useRef<HTMLDivElement>(null);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setShowMobileWarning(true);
      const timer = setTimeout(() => { setShowMobileWarning(false); }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOptionsRef.current && !menuOptionsRef.current.contains(event.target as Node)) setIsMenuOptionsOpen(false);
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(event.target as Node)) setIsFilterPanelOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInventario = async () => {
      setCargando(true);
      try {
        const respuesta = await fetch(`${apiUrl}/api/inventario`, { cache: 'no-store' }); 
        if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);
        const data: Producto[] = await respuesta.json(); 
        
        const dataSanatized = data.map(p => ({ ...p, categoria: p.categoria || 1 }));
        dataSanatized.sort((a, b) => String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || '')));

        setProductosOriginales(dataSanatized); 
        setProductosEditados(dataSanatized);   
        setHayCambios(false);       
        setIdEditando(null);
        setMostrarFantasmas(false); 
      } catch (error) { toast.error("No se pudo cargar el inventario."); }
      setCargando(false);
  };

  useEffect(() => { fetchInventario(); }, [apiUrl]);

  // --- BUSCADOR DE FANTASMAS ---
  const fetchMaterialesNoLinkeados = async () => {
    setIsMenuOptionsOpen(false);
    const toastId = toast.loading("Analizando base de datos de Préstamos...");
    try {
        const res = await fetch(`${apiUrl}/api/prestamos`);
        if (!res.ok) throw new Error("Error fetching loans");
        const prestamos = await res.json();
        
        const idsInventario = new Set(productosOriginales.filter(p => p.id > 0).map(p => p.id));
        const mapaFantasmas = new Map<string, Producto>();
        
        prestamos.forEach((prestamo: any) => {
            if (!prestamo.producto_id || !idsInventario.has(prestamo.producto_id)) {
                const nombreItem = (prestamo.nombre_equipo || 'Desconocido').trim();
                const key = nombreItem.toLowerCase();
                
                if (!mapaFantasmas.has(key)) {
                    mapaFantasmas.set(key, {
                        id: -(mapaFantasmas.size + 1), // ID Negativo
                        nombre_equipo: nombreItem,
                        descripcion: 'Material ingresado manualmente',
                        unidades_totales: prestamo.fecha_devolucion ? 0 : prestamo.cantidad, 
                        unidades_prestadas: prestamo.fecha_devolucion ? 0 : prestamo.cantidad,
                        visible: -1, 
                        categoria: 0   
                    });
                } else {
                    if (!prestamo.fecha_devolucion) {
                        mapaFantasmas.get(key)!.unidades_prestadas += prestamo.cantidad;
                        mapaFantasmas.get(key)!.unidades_totales += prestamo.cantidad; 
                    }
                }
            }
        });
        
        const arrFantasmas = Array.from(mapaFantasmas.values()).filter(f => f.unidades_prestadas > 0);
        
        if (arrFantasmas.length > 0) {
            setFantasmas(arrFantasmas);
            setMostrarFantasmas(true);

            // Integramos los fantasmas para que el usuario pueda editarlos y registrarlos
            setProductosOriginales(prev => [...prev.filter(p => p.id > 0), ...arrFantasmas]);
            setProductosEditados(prev => [...prev.filter(p => p.id > 0), ...arrFantasmas]);

            toast.success(`Se detectaron ${arrFantasmas.length} ítems no linkeados.`, { id: toastId });
        } else {
            toast.success("Todo en orden. No hay ítems fantasma pendientes.", { id: toastId });
            setMostrarFantasmas(false);
            setProductosOriginales(prev => prev.filter(p => p.id > 0));
            setProductosEditados(prev => prev.filter(p => p.id > 0));
        }
    } catch (error) {
        toast.error("Error al buscar ítems no linkeados", { id: toastId });
    }
  };

  // --- 4. Funciones de Edición (Permite Crear Fantasmas) ---
  const handleDobleClick = (id: number) => {
    setIdEditando(id);
    if (id < 0) {
        toast.success("Modifica la categoría o cantidad para registrar este material oficialmente.");
    }
    setTimeout(() => { 
        const input = refsInputs.current[`nombre-${id}`] as HTMLInputElement;
        if(input) { input.focus(); input.select(); }
    }, 50);
  };
  
  const handleCambioInput = (id: number, campo: keyof Producto, valor: string | number) => {
    if (campo !== 'nombre_equipo' && campo !== 'unidades_totales' && campo !== 'categoria') return;
    let valorProcesado = valor;
    if (campo === 'unidades_totales' || campo === 'categoria') valorProcesado = (parseInt(valor as string, 10) || 0);
    
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
        const siguienteProducto = productosEditados.find((p, index) => index > indiceActual);
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
        setHayCambios(productosEditados.some((pe, i) => JSON.stringify(pe) !== JSON.stringify(productosOriginales[i])));
    }
  };

  // --- 5. Guardar Cambios ---
  const handleGuardarCambios = async () => {
    setIdEditando(null); setGuardando(true);
    const cambiosPUT: Producto[] = [];
    const cambiosPOST: Producto[] = [];
    let validationError = false; 

    productosEditados.forEach(productoEditado => {
        if (validationError) return; 
        
        const productoOriginal = productosOriginales.find(p => p.id === productoEditado.id);
        if (!productoOriginal) return;

        const haCambiado = productoEditado.nombre_equipo !== productoOriginal.nombre_equipo || Number(productoEditado.unidades_totales) !== Number(productoOriginal.unidades_totales) || Number(productoEditado.categoria) !== Number(productoOriginal.categoria);

        if (haCambiado) {
            if (Number(productoEditado.unidades_totales) >= 0) {
                if (productoEditado.id < 0) cambiosPOST.push({ ...productoEditado }); // Es un fantasma, debemos crearlo
                else cambiosPUT.push({ ...productoEditado }); // Es un item real, debemos actualizarlo
            } else { 
                toast.error(`Cantidad inválida en '${productoEditado.nombre_equipo}'`); 
                validationError = true; 
            }
        }
    });

    if (validationError || (cambiosPUT.length === 0 && cambiosPOST.length === 0)) { 
        setGuardando(false); 
        if(cambiosPUT.length === 0 && cambiosPOST.length === 0) setHayCambios(false); 
        return; 
    }

    const promesasUpdate = cambiosPUT.map(cambio => 
        fetch(`${apiUrl}/api/inventario/${cambio.id}`, { 
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ nombre_equipo: cambio.nombre_equipo, unidades_totales: cambio.unidades_totales, categoria: cambio.categoria }), 
        })
    );

    const promesasPost = cambiosPOST.map(cambio => 
        fetch(`${apiUrl}/api/inventario`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                nombre_equipo: cambio.nombre_equipo, 
                unidades_totales: cambio.unidades_totales, 
                categoria: cambio.categoria || 1,
                // Asigna automáticamente el tipo (Caseta o Lab) dependiendo de la categoría que le asignaste
                visible: (cambio.categoria >= 1 && cambio.categoria <= 10) ? 1 : 0
            }), 
        })
    );

    try {
        await Promise.all([...promesasUpdate, ...promesasPost]);
        toast.success(`Cambios guardados: ${cambiosPOST.length} creados, ${cambiosPUT.length} actualizados.`);
        await fetchInventario(); 
    } catch (error) { toast.error(`Error al guardar datos en el servidor.`); } finally { setGuardando(false); }
  };

  const handleCancelarCambios = () => {
      if (hayCambios && window.confirm("¿Descartar cambios no guardados?")) {
          setProductosEditados(productosOriginales); setHayCambios(false); setIdEditando(null);
      } else if (!hayCambios) setIdEditando(null);
  };

  const handleToggleTipo = async (id: number) => {
      if (id < 0) return; // No permitir toggle directo en fantasmas
      const originalMap = new Map(productosEditados.map(p => [p.id, p.visible]));
      setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: p.visible === 1 ? 0 : 1} : p));
      try {
          const response = await fetch(`${apiUrl}/api/inventario/${id}/toggle-type`, { method: 'PUT' });
          if (!response.ok) throw new Error();
          const result = await response.json();
          setProductosOriginales(prev => prev.map(p => p.id === id ? {...p, visible: result.visible} : p));
      } catch (error) {
          toast.error("Error al cambiar tipo");
          setProductosEditados(prev => prev.map(p => p.id === id ? {...p, visible: originalMap.get(id) ?? p.visible} : p));
      }
  }

  // --- FILTRADO OMNI-SEARCH MEJORADO ---
  const productosFiltrados = useMemo(() => {
    return productosEditados.filter(p => {
      const nombreCategoria = p.categoria === 0 ? 'Sin Vincular' : (CATEGORIAS[p.categoria] || '');
      const nombreTipo = p.visible === 1 ? 'Caseta' : (p.visible === 0 ? 'Laboratorio' : 'Préstamo Manual');

      const matchTexto = 
        String(p.nombre_equipo || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
        String(p.id).includes(filtroTexto) ||
        String(p.unidades_prestadas).includes(filtroTexto) ||
        nombreCategoria.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        nombreTipo.toLowerCase().includes(filtroTexto.toLowerCase());

      const matchTipo = filtroTipo === 'Todos' ? true : (filtroTipo === 'Caseta' ? p.visible === 1 : p.visible === 0);
      
      return matchTexto && matchTipo;
    });
  }, [productosEditados, filtroTexto, filtroTipo]);

  const handleExportXLS = () => {
    setIsMenuOptionsOpen(false);
    if (productosFiltrados.length === 0) { toast.error("No hay datos para exportar."); return; }
    
    const dataToExport = productosFiltrados.map(p => ({ 
        "ID Inventario": p.id < 0 ? 'NO EXISTE' : p.id, 
        "Nombre Equipo": p.nombre_equipo, 
        "Total (Registrado)": p.id < 0 ? 0 : p.unidades_totales, 
        "En Préstamo (Activo)": p.unidades_prestadas, 
        "Disponibles en Estante": p.id < 0 ? 0 : (p.unidades_totales - p.unidades_prestadas),
        "Ubicación / Tipo": p.visible === 1 ? 'Caseta' : (p.visible === 0 ? 'Laboratorio' : 'Fantasma / Manual'),
        "Categoría Asignada": p.categoria === 0 ? 'Desconocido' : (CATEGORIAS[p.categoria] || 'General')
    })); 
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario_Vista");
    XLSX.writeFile(wb, `Inventario_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsMenuOptionsOpen(false);
    const file = event.target.files?.[0];
    if (file) {
      if (!window.confirm("IMPORTANTE: Esto reemplazará TODO el inventario. ¿Continuar?")) return;
      setImportando(true);
      const loadingToast = toast.loading("Importando inventario..."); 
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
          const workbook = XLSX.read(text, { type: 'string' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); 
          
          const headers = (jsonData[0] as string[]).map(h => h.trim().toLowerCase());
          const dataRows = jsonData.slice(1);
          const itemsToImport = dataRows.map(rowArray => { 
              const row = rowArray as (string|number)[]; let item: {[key: string]: any} = {}; 
              headers.forEach((header, index) => { 
                  let key = header; 
                  if (header.includes('nombre') || header.includes('name')) key = 'nombre_equipo'; 
                  if (header.includes('total') || header.includes('cantidad')) key = 'unidades_totales'; 
                  if (header.includes('visible') || (header.includes('tipo') && !header.includes('cat'))) key = 'visible'; 
                  if (header.includes('categoria') || header.includes('cat')) key = 'categoria'; 
                  item[key] = row[index]; 
              }); return item; 
          });

          const response = await fetch(`${apiUrl}/api/inventario/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemsToImport) });
          if (!response.ok) throw new Error("Error en servidor");
          toast.success("Inventario importado correctamente", { id: loadingToast });
          await fetchInventario(); 
        } catch (error) { toast.error(`Error de importación`, { id: loadingToast }); } finally { setImportando(false); }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (modoInventario) return <RealizarInventario apiUrl={apiUrl} onVolver={() => { setModoInventario(false); fetchInventario(); }} />;
  if (cargando) return <p style={{textAlign: 'center', color: '#fff'}}>Cargando inventario...</p>;

  return (
    <>
      {showMobileWarning && (
        <div className={styles.mobileWarningOverlay}>
          <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <h3>Recomendación</h3>
          <p>Para auditar el inventario y corregir cantidades de forma ergonómica, te sugerimos utilizar una Computadora.</p>
        </div>
      )}

      <div className={styles.appContainer}>
        <header>
          <h2>Gestión de Inventario</h2>
          <p style={{color: '#aaa', marginTop: '5px', fontSize: '0.9em'}}>Doble clic en celdas para editar (Nombre, Cantidad o Categoría).</p>
        </header>

        {hayCambios && (
          <div className={styles.saveActions}>
             <button onClick={handleGuardarCambios} disabled={guardando} className={styles.saveBtn}> {guardando ? 'Guardando...' : 'Guardar Cambios'} </button>
             <button onClick={handleCancelarCambios} disabled={guardando} className={styles.cancelBtn}> Cancelar </button>
          </div>
        )}

        <div className={styles.controlsRow}>
          <div className={styles.searchAndFilterWrapper} ref={menuFiltroRef}>
            <div className={styles.searchInputGroup}>
              <input 
                type="text" placeholder="Búsqueda Total (Nombre, Categoría, ID, Cantidad...)" 
                value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)}
              />
              <button className={styles.filterIconBtn} onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} title="Filtro Avanzado">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </button>
            </div>
            
            {isFilterPanelOpen && (
              <div className={`${styles.dropdownMenu} ${styles.dropdownLeft}`}>
                <span className={styles.dropdownTitle}>Tipo de Material</span>
                <div className={styles.segmentedControlVertical}>
                  <button className={filtroTipo === 'Todos' ? styles.segmentedActive : ''} onClick={() => { setFiltroTipo('Todos'); setIsFilterPanelOpen(false); }}>Todos</button>
                  <button className={filtroTipo === 'Laboratorio' ? styles.segmentedActive : ''} onClick={() => { setFiltroTipo('Laboratorio'); setIsFilterPanelOpen(false); }}>Solo Laboratorio</button>
                  <button className={filtroTipo === 'Caseta' ? styles.segmentedActive : ''} onClick={() => { setFiltroTipo('Caseta'); setIsFilterPanelOpen(false); }}>Solo Caseta</button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.optionsWrapper} ref={menuOptionsRef}>
            <button className={styles.optionsIconBtn} onClick={() => setIsMenuOptionsOpen(!isMenuOptionsOpen)} title="Opciones Globales">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
            
            {isMenuOptionsOpen && (
              <div className={`${styles.dropdownMenu} ${styles.dropdownRight}`}>
                <div className={styles.optionsList}>
                  <button onClick={() => { setIsMenuOptionsOpen(false); setModoInventario(true); }} style={{color: '#00aaff', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '5px'}}>
                    Realizar Inventario Físico
                  </button>
                  <button onClick={fetchMaterialesNoLinkeados} style={{color: '#ffaa77', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '5px'}}>
                    Buscar Préstamos No Linkeados
                  </button>

                  <button onClick={handleExportXLS} disabled={guardando || importando || hayCambios}>Exportar Vista a Excel</button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={guardando || importando || hayCambios}>Cargar CSV (Sobrescribir)</button>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
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
                const isGhost = producto.visible === -1; 
                const isEditing = idEditando === producto.id;
                const hayPrestados = producto.unidades_prestadas > 0;
                const isCaseta = producto.visible === 1;

                const categoriasDisponibles = Object.entries(CATEGORIAS).filter(([k]) => {
                    const catId = Number(k);
                    // Para fantasmas permitimos seleccionar de cualquier categoría
                    return isCaseta || isGhost ? (catId >= 1 && catId <= 10) || isGhost : (catId >= 11 && catId <= 20);
                });
                
                return (
                  <tr key={producto.id} className={`${isEditing ? styles.editingRow : ''} ${isGhost ? styles.ghostRow : ''}`}>
                    <td data-label="ID">
                        {isGhost ? <span style={{color: '#ff5555', fontWeight: 'bold'}}>N/A</span> : producto.id}
                    </td>
                    
                    <td data-label="Equipo" onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                      {isEditing ? ( 
                          <input ref={el => { refsInputs.current[`nombre-${producto.id}`] = el; }} type="text" value={producto.nombre_equipo} onChange={(e) => handleCambioInput(producto.id, 'nombre_equipo', e.target.value)} onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'nombre')} /> 
                      ) : ( 
                          <span style={{color: isGhost ? '#ffaa77' : 'inherit', fontWeight: isGhost ? 'bold' : 'normal'}}>
                              {producto.nombre_equipo} {isGhost && <span title="Material escrito manualmente" className={styles.ghostIcon}>[!]</span>}
                          </span> 
                      )}
                    </td>
                    
                    <td data-label="Total" style={{textAlign: 'center'}} onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                      {isEditing ? ( 
                          <input ref={el => { refsInputs.current[`unidades-${producto.id}`] = el; }} type="number" min="0" style={{width: '70px', textAlign: 'center'}} value={producto.unidades_totales} onChange={(e) => handleCambioInput(producto.id, 'unidades_totales', e.target.value)} onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'unidades')} /> 
                      ) : ( 
                          isGhost ? <span style={{opacity: 0.5}}>--</span> : producto.unidades_totales 
                      )}
                    </td>
                    
                    <td data-label="Prestado" style={{textAlign: 'center'}} className={hayPrestados ? styles.alertaPrestamo : ''}>
                      {producto.unidades_prestadas}
                    </td>
                    
                    <td data-label="Disp." style={{textAlign: 'center'}}>
                      {isGhost && !isEditing ? <span style={{opacity: 0.5}}>--</span> : (
                          <span className={`${styles.badgeDisponible} ${disponibles < 0 ? styles.negativo : disponibles === 0 ? styles.agotado : ''}`}>
                              {disponibles}
                          </span>
                      )}
                    </td>

                    <td data-label="Categoría" style={{textAlign: 'center'}} onDoubleClick={() => !isEditing && handleDobleClick(producto.id)}>
                      {isEditing ? (
                          <select ref={el => { refsInputs.current[`categoria-${producto.id}`] = el; }} value={producto.categoria} onChange={(e) => handleCambioInput(producto.id, 'categoria', e.target.value)} onKeyDown={(e) => handleTeclaAbajo(e, producto.id, 'categoria')} className={styles.inlineSelect}>
                              {isGhost && <option value={0}>Selecciona...</option>}
                              {categoriasDisponibles.map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                          </select>
                      ) : (
                          isGhost ? <span className={styles.ghostBadge}>Sin Vincular</span> :
                          <span className={styles.catBadge}>{CATEGORIAS[producto.categoria] || `Cat ${producto.categoria}`}</span>
                      )}
                    </td>

                    <td data-label="Tipo" style={{textAlign: 'center'}}>
                      {isGhost ? <span className={styles.ghostBadge} style={{borderColor: '#ffaa77', color: '#ffaa77'}}>Manual</span> : (
                          <button onClick={() => handleToggleTipo(producto.id)} className={`${styles.tipoBadge} ${isCaseta ? styles.tipoMaterial : styles.tipoEquipo}`} title="Cambiar">
                              {isCaseta ? 'CASETA' : 'LABORATORIO'}
                          </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {productosFiltrados.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No se encontraron equipos con esos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Inventario;