import { useState, useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import styles from './Prestamos.module.css';

// --- Interfaces ---
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
  // --- CORRECCIÓN: Agregamos esta propiedad ---
  onModificar?: (uuid: string) => void;
}

function Prestamos({ apiUrl, onModificar }: PrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  // NOTA: Ya no necesitamos los estados del Modal aquí, porque redirigimos.
  // Pero mantenemos las funciones de acción directa (Borrar, Entregar Todo)

  const menuRefs = useRef<Map<string, HTMLDetailsElement>>(new Map());

  // --- LÓGICA DE AGRUPACIÓN ---
  const prestamosAgrupados = useMemo(() => {
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
    // Verificar estado global del grupo
    grupos.forEach(grupo => {
      if (grupo.estado === 'Devuelto') {
        if (grupo.items.some(i => !i.fecha_devolucion)) {
          grupo.estado = 'Pendiente';
        }
      }
    });

    const resultados = Array.from(grupos.values());
    if (!filtro) return resultados;

    const texto = filtro.toLowerCase();
    return resultados.filter(g => 
      g.nombre_persona.toLowerCase().includes(texto) ||
      (g.id_persona && g.id_persona.toLowerCase().includes(texto)) ||
      g.solicitud_uuid.toLowerCase().includes(texto) ||
      (g.materia && g.materia.toLowerCase().includes(texto))
    );
  }, [prestamos, filtro]);

  // --- Carga de Datos ---
  const fetchPrestamos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`);
      const data: Prestamo[] = await response.json();
      data.sort((a, b) => new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime());
      setPrestamos(data);
    } catch (error) { console.error('Error al cargar préstamos:', error); }
    if(loading) setLoading(false);
  };

  useEffect(() => {
    fetchPrestamos();
  }, [apiUrl]);

  // --- Funciones de Acción ---
  const handleExportXLS = () => { 
    if (prestamos.length === 0) { toast.error("No hay datos para exportar."); return; }
    const dataToExport = prestamos.map(p => ({
      "ID Préstamo": p.id,
      "Folio Solicitud (UUID)": p.solicitud_uuid || 'N/A',
      "Estado Actual": p.fecha_devolucion ? 'Devuelto' : 'PENDIENTE',
      "Producto": p.nombre_equipo,
      "ID Producto (Inv)": p.producto_id,
      "Cantidad": p.cantidad,
      "Solicitante": p.nombre_persona,
      "Matrícula / ID": p.id_persona || 'Profesor',
      "Profesor Responsable": p.nombre_persona || 'N/A',
      "Integrantes": p.integrantes,
      "Materia": p.materia || 'N/A',
      "Grupo": p.grupo || 'N/A',
      "Fecha Préstamo": new Date(p.fecha_prestamo).toLocaleString(),
      "Fecha Devolución": p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : '---'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 22 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Préstamos");
    XLSX.writeFile(wb, `Historial_Prestamos_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("¿ESTÁS SEGURO DE QUE QUIERES BORRAR TODO EL HISTORIAL?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/all`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || 'Error al borrar historial');
      alert('Historial borrado con éxito.');
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteSolicitud = async (uuid: string | null) => {
    if (!uuid) return;
    if (!window.confirm("¿Borrar TODOS los items de esta solicitud?")) return;
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
    if (!window.confirm(`¿Devolver TODOS los items pendientes?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/solicitud/${uuid}/devolver`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || data.message);
      toast.success('¡Solicitud devuelta!'); 
      fetchPrestamos();
    } catch (error) { if (error instanceof Error) toast.error(`Error: ${error.message}`); }
  };

  // Menú Handler
  const setMenuRef = (uuid: string, el: HTMLDetailsElement | null) => { if (el) menuRefs.current.set(uuid, el); else menuRefs.current.delete(uuid); };
  const handleMenuClick = (uuid: string) => { menuRefs.current.forEach((el, key) => { if (key !== uuid && el.open) el.open = false; }); };

  // --- RENDERIZADO ---
  if (loading) return <p>Cargando historial de préstamos...</p>

  return (
    <div className={styles.appContainer}>
      <header>
        <h2>Historial de Préstamos</h2>
      </header>

      <div className={styles.controls}>
        <input 
          type="text"
          placeholder="Buscar por Solicitante, Folio, Control..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <div className={styles.buttonGroup}>
          <button onClick={handleExportXLS} className={styles.exportBtn}>
            Exportar a Excel (.xlsx)
          </button>
          <button onClick={handleDeleteAll} className={styles.deleteAllBtn}>
            Borrar Historial
          </button>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Solicitante</th>
              <th>N° Control / Maestro</th>
              <th>Items</th>
              <th>Materia</th>
              <th>Fecha Préstamo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamosAgrupados.map((grupo) => (
              <tr key={grupo.solicitud_uuid}>
                <td>
                  {grupo.estado === 'Devuelto' ? (
                    <span className={styles.statusDevuelto}>Devuelto</span>
                  ) : (
                    <span className={styles.statusPendiente}>Pendiente</span>
                  )}
                </td>
                <td>{grupo.nombre_persona}</td>
                <td>{grupo.id_persona ? grupo.id_persona : (<span style={{ fontStyle: 'italic' }}>Maestro</span>)}</td>
                <td>
                  <details>
                    <summary>{grupo.items.length} Items</summary>
                    <ul>
                      {grupo.items.map(item => (
                        <li key={item.id}>
                          {item.nombre_equipo} (x{item.cantidad})
                          {item.fecha_devolucion ? ' - Devuelto' : ''}
                        </li>
                      ))}
                    </ul>
                  </details>
                </td>
                <td>{grupo.materia || 'N/A'}</td>
                <td>{new Date(grupo.fecha_prestamo).toLocaleString()}</td>
                
                <td className={styles.actionsCell}>
                  <details 
                    className={styles.actionsMenu}
                    ref={(el) => setMenuRef(grupo.solicitud_uuid, el)}
                    onClick={() => handleMenuClick(grupo.solicitud_uuid)}
                  >
                    <summary className={styles.menuToggle}>☰</summary>
                    <div className={styles.menuDropdown}>
                      {/* --- BOTÓN MODIFICAR CONECTADO AL PADRE --- */}
                      <button 
                        className={styles.menuButton}
                        onClick={() => {
                            if (onModificar) onModificar(grupo.solicitud_uuid);
                        }}
                      >
                        Modificar (Ir a Registro)
                      </button>

                      <button 
                        className={styles.menuButton}
                        onClick={() => handleDevolverSolicitudCompleta(grupo.solicitud_uuid)}
                        disabled={grupo.estado === 'Devuelto'}
                      >
                        Entregar (Solicitud Completa)
                      </button>
                      <button 
                        className={`${styles.menuButton} ${styles.delete}`}
                        onClick={() => handleDeleteSolicitud(grupo.solicitud_uuid)}
                      >
                        Borrar (Solicitud Completa)
                      </button>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Prestamos;