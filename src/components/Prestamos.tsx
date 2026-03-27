import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import styles from './Prestamos.module.css';

interface Prestamo {
  id: number;
  producto_id: number;
  nombre_persona: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  nombre_equipo: string;
  id_persona: string | null;
  cantidad: number;
  materia: string | null;
  grupo: string | null;
  integrantes: number;
  solicitud_uuid: string | null;
}

interface PrestamoAgrupado {
  solicitud_uuid: string;
  nombre_persona: string;
  id_persona: string | null;
  fecha_prestamo: string;
  materia: string | null;
  grupo: string | null;
  integrantes: number;
  items: {
    id: number;
    nombre_equipo: string;
    cantidad: number;
    fecha_devolucion: string | null;
  }[];
  estado: 'Pendiente' | 'Devuelto';
}

interface PrestamosProps {
  apiUrl: string;
  onModificar?: (uuid: string) => void;
}

const ITEMS_PER_PAGE = 20;

function Prestamos({ apiUrl, onModificar }: PrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Pendiente' | 'Devuelto'>('Todos');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isMenuFiltroOpen, setIsMenuFiltroOpen] = useState(false);
  const [isMenuGestionOpen, setIsMenuGestionOpen] = useState(false);
  
  const menuRefs = useRef<Map<string, HTMLDetailsElement>>(new Map());
  const menuGestionRef = useRef<HTMLDivElement>(null);
  const menuFiltroRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchPrestamos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const data: Prestamo[] = await response.json();
      data.sort((a, b) => new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime());
      setPrestamos(data);
    } catch (error) { 
      console.error('Error al cargar préstamos:', error); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrestamos();
  }, [apiUrl]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroTexto, filtroEstado]);

  const prestamosFiltrados = useMemo(() => {
    const grupos = new Map<string, PrestamoAgrupado>();
    
    for (const p of prestamos) { 
      const uuid = p.solicitud_uuid;
      if (!uuid) continue; 

      const item = {
        id: p.id,
        nombre_equipo: p.nombre_equipo,
        cantidad: p.cantidad,
        fecha_devolucion: p.fecha_devolucion
      };

      if (!grupos.has(uuid)) {
        grupos.set(uuid, {
          solicitud_uuid: uuid,
          nombre_persona: p.nombre_persona,
          id_persona: p.id_persona,
          fecha_prestamo: p.fecha_prestamo,
          materia: p.materia,
          grupo: p.grupo,
          integrantes: p.integrantes,
          items: [item],
          estado: item.fecha_devolucion ? 'Devuelto' : 'Pendiente'
        });
      } else {
        const grupoExistente = grupos.get(uuid)!;
        grupoExistente.items.push(item);
        if (!item.fecha_devolucion) {
          grupoExistente.estado = 'Pendiente';
        }
      }
    }

    grupos.forEach(grupo => {
      if (grupo.estado === 'Devuelto') {
        if (grupo.items.some(i => !i.fecha_devolucion)) {
          grupo.estado = 'Pendiente';
        }
      }
    });

    let resultados = Array.from(grupos.values());

    if (filtroEstado !== 'Todos') {
      resultados = resultados.filter(g => g.estado === filtroEstado);
    }

    if (filtroTexto.trim()) {
      const texto = filtroTexto.toLowerCase().trim();
      resultados = resultados.filter(g => 
        (g.nombre_persona && String(g.nombre_persona).toLowerCase().includes(texto)) ||
        (g.id_persona && String(g.id_persona).toLowerCase().includes(texto)) ||
        (g.solicitud_uuid && String(g.solicitud_uuid).toLowerCase().includes(texto)) ||
        (g.materia && String(g.materia).toLowerCase().includes(texto))
      );
    }

    return resultados;
  }, [prestamos, filtroTexto, filtroEstado]);

  const totalPages = Math.ceil(prestamosFiltrados.length / ITEMS_PER_PAGE) || 1;
  const currentPrestamos = prestamosFiltrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExportXLS = () => { 
    setIsMenuGestionOpen(false);
    if (prestamosFiltrados.length === 0) { toast.error("No hay datos en pantalla para exportar."); return; }
    
    const dataToExport = prestamosFiltrados.flatMap(grupo => 
      grupo.items.map(item => ({
        "Folio Solicitud (UUID)": grupo.solicitud_uuid,
        "Estado": item.fecha_devolucion ? 'Devuelto' : 'PENDIENTE',
        "Producto": item.nombre_equipo,
        "Cantidad": item.cantidad,
        "Solicitante": grupo.nombre_persona,
        "Matrícula / ID": grupo.id_persona || 'Profesor',
        "Materia": grupo.materia || 'N/A',
        "Grupo": grupo.grupo || 'N/A',
        "Fecha Préstamo": new Date(grupo.fecha_prestamo).toLocaleString(),
        "Fecha Devolución": item.fecha_devolucion ? new Date(item.fecha_devolucion).toLocaleString() : '---'
      }))
    );

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 22 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Préstamos Filtrados");
    XLSX.writeFile(wb, `Reporte_Prestamos_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMenuGestionOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;
    toast("Función de importación masiva en construcción.");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAll = async () => {
    setIsMenuGestionOpen(false);
    if (!window.confirm("¿ESTÁS SEGURO DE QUE QUIERES BORRAR TODO EL HISTORIAL DE PRÉSTAMOS?")) return;
    const toastId = toast.loading('Borrando...');
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/all`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || 'Error al borrar');
      toast.success('Historial borrado con éxito.', { id: toastId });
      fetchPrestamos();
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Desconocido'}`, { id: toastId });
    }
  };

  const handleDeleteSolicitud = async (uuid: string | null) => {
    if (!uuid) return;
    if (!window.confirm("¿Borrar todos los items de esta solicitud?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/solicitud/${uuid}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || data.message || 'Error al borrar');
      toast.success(data.message || 'Solicitud borrada');
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) toast.error(`Error: ${error.message}`);
    }
  };

  const handleDevolverSolicitudCompleta = async (uuid: string | null) => {
    if (!uuid) return;
    if (!window.confirm(`¿Devolver todos los items pendientes?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/solicitud/${uuid}/devolver`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || data.message);
      toast.success('Solicitud devuelta correctamente'); 
      fetchPrestamos();
    } catch (error) { if (error instanceof Error) toast.error(`Error: ${error.message}`); }
  };

  const setMenuRef = (uuid: string, el: HTMLDetailsElement | null) => { if (el) menuRefs.current.set(uuid, el); else menuRefs.current.delete(uuid); };
  const handleMenuClick = (uuid: string) => { menuRefs.current.forEach((el, key) => { if (key !== uuid && el.open) el.open = false; }); };

  if (loading) return <p style={{textAlign: 'center', color: '#fff'}}>Cargando historial de préstamos...</p>;

  return (
    <div className={styles.appContainer}>
      <header>
        <h2>Gestión de Préstamos</h2>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.searchAndFilterWrapper} ref={menuFiltroRef}>
          <div className={styles.searchInputGroup}>
            <input 
              type="text"
              placeholder="Buscar Nombre, Matrícula, Folio, Materia..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
            <button 
              className={styles.filterIconBtn} 
              onClick={() => setIsMenuFiltroOpen(!isMenuFiltroOpen)}
              title="Filtrar por estado"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>
          </div>
          
          {isMenuFiltroOpen && (
            <div className={`${styles.dropdownMenu} ${styles.dropdownLeft}`}>
              <span className={styles.dropdownTitle}>Estado del Préstamo</span>
              <div className={styles.segmentedControlVertical}>
                <button 
                  className={filtroEstado === 'Todos' ? styles.segmentedActive : ''}
                  onClick={() => { setFiltroEstado('Todos'); setIsMenuFiltroOpen(false); }}
                >
                  Todas las solicitudes
                </button>
                <button 
                  className={filtroEstado === 'Pendiente' ? styles.segmentedActive : ''}
                  onClick={() => { setFiltroEstado('Pendiente'); setIsMenuFiltroOpen(false); }}
                >
                  Pendientes
                </button>
                <button 
                  className={filtroEstado === 'Devuelto' ? styles.segmentedActive : ''}
                  onClick={() => { setFiltroEstado('Devuelto'); setIsMenuFiltroOpen(false); }}
                >
                  Devueltas
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
                <button onClick={handleExportXLS}>
                  Exportar a Excel (Vista actual)
                </button>
                <button onClick={() => fileInputRef.current?.click()}>
                  Importar Correcciones
                </button>
                <button onClick={handleDeleteAll} className={styles.deleteOption}>
                  Borrar Todo el Historial
                </button>
              </div>
            </div>
          )}

          <input 
            type="file" 
            accept=".csv, .xlsx" 
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
              <th>Estado</th>
              <th>Solicitante</th>
              <th>N° Control / Maestro</th>
              <th>Materiales Solicitados</th>
              <th>Materia / Grupo</th>
              <th>Fecha Préstamo</th>
              <th>Acciones</th>
            </tr>
          </thead><tbody>
            {currentPrestamos.length > 0 ? (
              currentPrestamos.map((grupo) => (
                <tr key={grupo.solicitud_uuid}>
                  <td data-label="Estado">
                    {grupo.estado === 'Devuelto' ? (
                      <span className={styles.statusDevuelto}>Devuelto</span>
                    ) : (
                      <span className={styles.statusPendiente}>Pendiente</span>
                    )}
                  </td>
                  <td data-label="Solicitante">{grupo.nombre_persona}</td>
                  <td data-label="Matrícula">{grupo.id_persona ? grupo.id_persona : (<span style={{ fontStyle: 'italic', color: '#00aaff' }}>Maestro</span>)}</td>
                  <td data-label="Materiales">
                    <details>
                      <summary>{grupo.items.length} Materiales</summary>
                      <ul>
                        {grupo.items.map(item => (
                          <li key={item.id} style={{textDecoration: item.fecha_devolucion ? 'line-through' : 'none', color: item.fecha_devolucion ? '#666' : '#ccc'}}>
                            {item.nombre_equipo} (x{item.cantidad})
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td data-label="Materia">
                    {grupo.materia || 'N/A'}<br/>
                    <small>{grupo.grupo}</small>
                  </td>
                  <td data-label="Fecha">{new Date(grupo.fecha_prestamo).toLocaleDateString()}<br/><small>{new Date(grupo.fecha_prestamo).toLocaleTimeString()}</small></td>
                  
                  <td data-label="Acciones" className={styles.actionsCell}>
                    <details 
                      className={styles.actionsMenu}
                      ref={(el) => setMenuRef(grupo.solicitud_uuid, el)}
                      onClick={() => handleMenuClick(grupo.solicitud_uuid)}
                    >
                      <summary className={styles.menuToggle}>☰ Opciones</summary>
                      <div className={styles.menuDropdown}>
                        <button className={styles.menuButton} onClick={() => { if (onModificar) onModificar(grupo.solicitud_uuid); }}>
                          Modificar (Ir a Registro)
                        </button>
                        <button className={styles.menuButton} onClick={() => handleDevolverSolicitudCompleta(grupo.solicitud_uuid)} disabled={grupo.estado === 'Devuelto'}>
                          Entregar Material Pendiente
                        </button>
                        <button className={`${styles.menuButton} ${styles.delete}`} onClick={() => handleDeleteSolicitud(grupo.solicitud_uuid)}>
                          Borrar Solicitud
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))
            ) : (
               <tr><td colSpan={7} style={{ padding: '30px', color: '#888' }}>No se encontraron préstamos con esos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {prestamosFiltrados.length > ITEMS_PER_PAGE && (
        <div className={styles.pagination}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            ◀ Anterior
          </button>
          
          <span className={styles.pageInfo}>
            Página {currentPage} de {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={styles.pageBtn}
          >
            Siguiente ▶
          </button>
        </div>
      )}
    </div>
  );
}

export default Prestamos;