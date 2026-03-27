import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import styles from './HistorialPracticas.module.css';

interface Practica {
  id: number;
  nombre_profesor: string;
  fecha_practica: string;
  hora_inicio: string;
  hora_fin: string | null;
  carrera: string;
  asignatura: string;
  grupo: string;
  no_practica: number;
  no_alumnos: number;
  nombre_practica: string;
  objetivo: string;
  observaciones: string;
  equipos: string[]; 
  materiales: string[];
  solicitud_uuid: string | null;
  semestre: string | null;
}

interface HistorialPracticasProps {
  apiUrl: string;
  onModificar: (id: number) => void;
}

const ITEMS_PER_PAGE = 20;

const EXPECTED_HEADERS = [
  "ID Registro", "Folio Solicitud (UUID)", "No. Práctica", "Profesor",
  "Práctica", "Fecha", "Hora Inicio", "Hora Fin", "Carrera", "Semestre",
  "Asignatura", "Grupo", "No. Alumnos", "Área (Salones/Mesas)", 
  "Materiales (Inventario)", "Objetivo", "Observaciones"
];

function HistorialPracticas({ apiUrl, onModificar }: HistorialPracticasProps) {
  const [practicas, setPracticas] = useState<Practica[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState<'Todas' | 'Con Material' | 'Sin Material'>('Todas');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isMenuFiltroOpen, setIsMenuFiltroOpen] = useState(false);
  const [isMenuGestionOpen, setIsMenuGestionOpen] = useState(false);
  
  const menuRefs = useRef<Map<number, HTMLDetailsElement>>(new Map());
  const menuGestionRef = useRef<HTMLDivElement>(null);
  const menuFiltroRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DEL POP-UP MÓVIL TEMPORAL ---
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    // Si la pantalla es de tamaño móvil (768px o menos), mostramos la advertencia
    if (window.innerWidth <= 768) {
      setShowMobileWarning(true);
      // El CSS hace el fadeOut, pero aquí lo quitamos del DOM a los 2.5s para que no estorbe
      const timer = setTimeout(() => { setShowMobileWarning(false); }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  // --- ESCUCHADOR PARA CERRAR MENÚS AL HACER CLIC FUERA ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuGestionRef.current && !menuGestionRef.current.contains(event.target as Node)) {
        setIsMenuGestionOpen(false);
      }
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(event.target as Node)) {
        setIsMenuFiltroOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPracticas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/practicas`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setPracticas(data);
    } catch (error) {
      toast.error('No se pudo cargar el historial de prácticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPracticas(); }, [apiUrl]);

  useEffect(() => { setCurrentPage(1); }, [filtroTexto, filtroMaterial]);

  // --- FILTRADO A PRUEBA DE ERRORES ---
  const practicasFiltradas = useMemo(() => {
    let resultados = practicas;

    if (filtroMaterial === 'Con Material') {
      resultados = resultados.filter(p => p.solicitud_uuid !== null);
    } else if (filtroMaterial === 'Sin Material') {
      resultados = resultados.filter(p => p.solicitud_uuid === null);
    }

    if (filtroTexto.trim()) {
      const texto = filtroTexto.toLowerCase().trim();
      resultados = resultados.filter(p => 
        (p.nombre_profesor && String(p.nombre_profesor).toLowerCase().includes(texto)) ||
        (p.nombre_practica && String(p.nombre_practica).toLowerCase().includes(texto)) ||
        (p.asignatura && String(p.asignatura).toLowerCase().includes(texto))
      );
    }

    return resultados;
  }, [practicas, filtroTexto, filtroMaterial]);

  const handleEntregarMateriales = async (uuid: string | null) => {
    if (!uuid) { toast.error("Esta práctica no tiene un préstamo asociado."); return; }
    if (!window.confirm("¿Confirmar la devolución de TODO el material de esta práctica?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/solicitud/${uuid}/devolver`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.err || data.message || 'Error en el servidor');
      toast.success(data.message || 'Material devuelto con éxito');
    } catch (error) {
      toast.error(`No se pudo devolver el material: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const handleModificar = (id: number) => { onModificar(id); };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de borrar este registro de práctica?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/practicas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al borrar');
      toast.success('Registro eliminado');
      fetchPracticas();
    } catch (error) { toast.error('Error al eliminar el registro'); }
  };
  
  const handleDeleteAllPracticas = async () => {
    setIsMenuGestionOpen(false);
    if (!window.confirm("¿ESTÁS SEGURO DE QUE QUIERES BORRAR TODO EL HISTORIAL DE PRÁCTICAS?")) return;
    const toastId = toast.loading('Borrando historial...');
    try {
      const res = await fetch(`${apiUrl}/api/reset/practicas`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).err || 'Error al borrar historial');
      setPracticas([]); 
      toast.success('Historial de prácticas borrado', { id: toastId });
      fetchPracticas(); 
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Desconocido'}`, { id: toastId });
    }
  };

  const setMenuRef = (id: number, el: HTMLDetailsElement | null) => { if (el) menuRefs.current.set(id, el); else menuRefs.current.delete(id); };
  const handleMenuClick = (id: number) => { menuRefs.current.forEach((el, key) => { if (key !== id && el.open) el.open = false; }); };
  
  const handleExport = () => {
    setIsMenuGestionOpen(false);
    if (practicasFiltradas.length === 0) { toast.error("No hay datos para exportar."); return; }
    
    const dataToExport = practicasFiltradas.map(p => ({
        [EXPECTED_HEADERS[0]]: p.id,
        [EXPECTED_HEADERS[1]]: p.solicitud_uuid || 'Sin Material',
        [EXPECTED_HEADERS[2]]: p.no_practica,
        [EXPECTED_HEADERS[3]]: p.nombre_profesor,
        [EXPECTED_HEADERS[4]]: p.nombre_practica,
        [EXPECTED_HEADERS[5]]: new Date(p.fecha_practica).toLocaleDateString(),
        [EXPECTED_HEADERS[6]]: p.hora_inicio,
        [EXPECTED_HEADERS[7]]: p.hora_fin || 'N/A',
        [EXPECTED_HEADERS[8]]: p.carrera,
        [EXPECTED_HEADERS[9]]: p.semestre ? `${p.semestre}°` : 'N/A',
        [EXPECTED_HEADERS[10]]: p.asignatura,
        [EXPECTED_HEADERS[11]]: p.grupo,
        [EXPECTED_HEADERS[12]]: p.no_alumnos,
        [EXPECTED_HEADERS[13]]: p.equipos.join(', '), 
        [EXPECTED_HEADERS[14]]: p.materiales.join(', '),
        [EXPECTED_HEADERS[15]]: p.objetivo,
        [EXPECTED_HEADERS[16]]: p.observaciones
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, 
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 25 },
      { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 50 }, { wch: 50 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Filtrado");
    XLSX.writeFile(wb, `Reporte_Practicas_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMenuGestionOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length === 0) { toast.error("El archivo está vacío"); return; }
        const headers = data[0] as string[];
        const isValid = EXPECTED_HEADERS.every((h, i) => headers[i] === h) && headers.length === EXPECTED_HEADERS.length;

        if (!isValid) {
          toast.error("ERROR: Las columnas del archivo no coinciden con la BD.", { duration: 6000 });
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(ws);
        toast.success("Validación exitosa. Columnas correctas.");
        console.log("Datos listos para enviar:", jsonData);

      } catch (error) { toast.error("Error al leer el archivo. Asegúrate que sea un Excel o CSV válido."); }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };
  
  const totalPages = Math.ceil(practicasFiltradas.length / ITEMS_PER_PAGE) || 1;
  const currentPracticas = practicasFiltradas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) return <p style={{textAlign: 'center', color: '#fff'}}>Cargando historial...</p>;

  return (
    <>
      {/* --- POP-UP DE RECOMENDACIÓN PARA MÓVILES (FUERA DEL CONTENEDOR) --- */}
      {showMobileWarning && (
        <div className={styles.mobileWarningOverlay}>
          <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <h3>Recomendación</h3>
          <p>Para una mejor experiencia revisando los historiales detallados, te sugerimos utilizar una Computadora o Laptop.</p>
        </div>
      )}

      {/* --- CONTENEDOR PRINCIPAL --- */}
      <div className={styles.appContainer}>
        <header>
          <h2>Historial de Prácticas de Laboratorio</h2>
        </header>
        
        <div className={styles.controlsRow}>
          <div className={styles.searchAndFilterWrapper} ref={menuFiltroRef}>
            <div className={styles.searchInputGroup}>
              <input 
                type="text" 
                placeholder="Buscar por Profesor, Práctica o Materia..." 
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
              <button 
                className={styles.filterIconBtn} 
                onClick={() => setIsMenuFiltroOpen(!isMenuFiltroOpen)}
                title="Filtrar por material"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </button>
            </div>
            
            {isMenuFiltroOpen && (
              <div className={`${styles.dropdownMenu} ${styles.dropdownLeft}`}>
                <span className={styles.dropdownTitle}>Requisición de Material</span>
                <div className={styles.segmentedControlVertical}>
                  <button 
                    className={filtroMaterial === 'Todas' ? styles.segmentedActive : ''}
                    onClick={() => { setFiltroMaterial('Todas'); setIsMenuFiltroOpen(false); }}
                  >
                    Todas las prácticas
                  </button>
                  <button 
                    className={filtroMaterial === 'Con Material' ? styles.segmentedActive : ''}
                    onClick={() => { setFiltroMaterial('Con Material'); setIsMenuFiltroOpen(false); }}
                  >
                    Con Material Prestado
                  </button>
                  <button 
                    className={filtroMaterial === 'Sin Material' ? styles.segmentedActive : ''}
                    onClick={() => { setFiltroMaterial('Sin Material'); setIsMenuFiltroOpen(false); }}
                  >
                    Sin Material (Solo Área)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.optionsWrapper} ref={menuGestionRef}>
            <button 
              className={styles.optionsIconBtn} 
              onClick={() => setIsMenuGestionOpen(!isMenuGestionOpen)}
              title="Opciones de Gestión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            
            {isMenuGestionOpen && (
              <div className={`${styles.dropdownMenu} ${styles.dropdownRight}`}>
                <div className={styles.optionsList}>
                  <button onClick={handleExport}>
                    Exportar a Excel (Vista actual)
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}>
                    Cargar Excel/CSV
                  </button>
                  <button onClick={handleDeleteAllPracticas} className={styles.deleteOption}>
                    Borrar Todo el Historial
                  </button>
                </div>
              </div>
            )}

            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>Profesor</th>
                <th>Práctica</th>
                <th>Fecha / Hora</th>
                <th>Grupo / Asig.</th>
                <th>Área / Material</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentPracticas.length > 0 ? (
                currentPracticas.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Profesor">
                      <strong>{p.nombre_profesor}</strong><br/>
                      <small>(No. {p.no_practica})</small>
                    </td>
                    <td data-label="Práctica" title={p.objetivo}>{p.nombre_practica}</td>
                    <td data-label="Fecha / Hora">
                      {new Date(p.fecha_practica).toLocaleDateString()}<br/>
                      <small>{p.hora_inicio} - {p.hora_fin || 'N/A'}</small>
                    </td>
                    <td data-label="Académico">
                      {p.asignatura}<br/>
                      <small>{p.carrera} {p.semestre ? `| ${p.semestre}° Sem` : ''} ({p.grupo})</small>
                    </td>
                    
                    <td data-label="Material">
                      <details>
                        <summary>{p.equipos.length} Área(s) | {p.materiales.length} Mat.</summary>
                        <div className={styles.combinedLists}>
                          {p.equipos.length > 0 && (
                            <div className={styles.listSection}>
                              <span className={styles.listTitle}>Áreas:</span>
                              <ul>
                                {p.equipos.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            </div>
                          )}
                          {p.materiales.length > 0 && (
                            <div className={styles.listSection}>
                              <span className={styles.listTitle}>Materiales:</span>
                              <ul>
                                {p.materiales.map((m, i) => <li key={i}>{m}</li>)}
                              </ul>
                            </div>
                          )}
                          {p.equipos.length === 0 && p.materiales.length === 0 && (
                            <span style={{color: '#888'}}>Sin Área/Material registrado</span>
                          )}
                        </div>
                      </details>
                    </td>

                    <td data-label="Acciones" className={styles.actionsCell}>
                      <details 
                        className={styles.actionsMenu}
                        ref={(el) => setMenuRef(p.id, el)}
                        onClick={() => handleMenuClick(p.id)}
                      >
                        <summary className={styles.menuToggle}>☰ Opciones</summary>
                        <div className={styles.menuDropdown}>
                          <button 
                            className={styles.menuButton}
                            onClick={() => handleEntregarMateriales(p.solicitud_uuid)}
                            disabled={!p.solicitud_uuid}
                          >
                            Entregar Material
                          </button>
                          <button className={styles.menuButton} onClick={() => handleModificar(p.id)}>
                            Modificar
                          </button>
                          <button className={`${styles.menuButton} ${styles.delete}`} onClick={() => handleDelete(p.id)}>
                            Borrar
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', color: '#888' }}>No se encontraron prácticas con esos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {practicasFiltradas.length > ITEMS_PER_PAGE && (
          <div className={styles.pagination}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={styles.pageBtn}>
              ◀ Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={styles.pageBtn}>
              Siguiente ▶
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default HistorialPracticas;