import { useState, useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import styles from './Prestamos.module.css'; // Asegúrate de que este CSS tiene los estilos del menú ☰

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

interface Producto {
  id: number;
  nombre_equipo: string;
}
interface SolicitudItem extends Producto {
  cantidad: number;
}
interface PrestamosProps {
  apiUrl: string;
}
type EditFormData = {
  nombre_persona: string;
  id_persona: string | null;
  integrantes: number;
  materia: string | null;
  grupo: string | null;
}
const fuseOptions = {
  keys: ['nombre_equipo'],
  threshold: 0.4,
  includeScore: true
};
// --- Fin de Interfaces ---

function Prestamos({ apiUrl }: PrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  // const [filtro, setFiltro] = useState(''); // Filtro eliminado

  // --- Estados del Modal ---
  const [modalModificarAbierto, setModalModificarAbierto] = useState(false);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<PrestamoAgrupado | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [enviandoModificacion, setEnviandoModificacion] = useState(false);
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [nuevosItemsParaAnadir, setNuevosItemsParaAnadir] = useState<SolicitudItem[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<Producto[]>([]);
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos]);

  const menuRefs = useRef<Map<string, HTMLDetailsElement>>(new Map());

  // --- LÓGICA DE AGRUPACIÓN (Filtro eliminado) ---
  const prestamosAgrupados = useMemo(() => {
    const grupos = new Map<string, PrestamoAgrupado>();
    
    // Itera sobre TODOS los préstamos
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

    return Array.from(grupos.values());
  }, [prestamos]); // <-- Dependencia 'filtro' eliminada

  // --- Función para Cargar Préstamos ---
  const fetchPrestamos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`);
      const data: Prestamo[] = await response.json();
      data.sort((a, b) => new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime());
      setPrestamos(data);
    } catch (error) { 
      console.error('Error al cargar préstamos:', error);
    }
    if(loading) setLoading(false);
  };

  // --- Carga Inicial de Datos ---
  useEffect(() => {
    const fetchDatosIniciales = async () => {
      setLoading(true);
      try {
        const [prestamosRes, productosRes] = await Promise.all([
          fetch(`${apiUrl}/api/prestamos`),
          fetch(`${apiUrl}/api/inventario?public=true`)
        ]);
        const prestamosData: Prestamo[] = await prestamosRes.json();
        prestamosData.sort((a, b) => new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime());
        setPrestamos(prestamosData);
        const productosData: Producto[] = await productosRes.json();
        setTodosLosProductos(productosData);
      } catch (error) { 
        console.error('Error al cargar datos iniciales:', error);
      }
      setLoading(false);
    }
    fetchDatosIniciales();
  }, [apiUrl]);

  // --- Funciones de Acción ---
  const handleDevolucion = async (prestamoId: number) => {
    if (!window.confirm('¿Devolver este item individual?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/${prestamoId}/devolver`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || data.message || 'Error al devolver');
      toast.success(data.message || '¡Devolución de item registrada!');
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) toast.error(`Error: ${error.message}`);
      else toast.error('Ocurrió un error desconocido');
    }
  };
  
  const handleExportXLS = () => { 
    if (prestamos.length === 0) {
      toast.error("No hay datos para exportar.");
      return;
    }
    // Lógica de exportación (puedes ajustar las columnas)
    const headers = ["ID", "Folio Solicitud", "Producto", "Cantidad", "Solicitante", "N° Control/Maestro", "Integrantes", "Materia", "Grupo", "Fecha Préstamo", "Fecha Devolución", "Estado"];
    const rows = prestamos.map(p => [p.id, p.solicitud_uuid || 'N/A', p.nombre_equipo, p.cantidad, p.nombre_persona, p.id_persona || 'Maestro', p.integrantes, p.materia || 'N/A', p.grupo || 'N/A', new Date(p.fecha_prestamo).toLocaleString(), p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : '---', p.fecha_devolucion ? 'Devuelto' : 'Pendiente']);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial de Préstamos");
    XLSX.writeFile(wb, "historial_prestamos.xlsx");
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("¿ESTÁS SEGURO DE QUE QUIERES BORRAR TODO EL HISTORIAL?")) return;
    if (!window.confirm("¡¡ADVERTENCIA FINAL!! Esta acción es irreversible. ¿Deseas continuar?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/all`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || 'Error al borrar historial');
      alert('Historial borrado con éxito.');
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
      else alert('Ocurrió un error desconocido');
    }
  };

  const handleDeleteSolicitud = async (uuid: string | null) => {
    if (!uuid) return;
    if (!window.confirm("¿Borrar TODOS los items de esta solicitud? Esta acción no se puede deshacer.")) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/solicitud/${uuid}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || data.message || 'Error al borrar');
      toast.success(data.message || 'Solicitud borrada');
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) toast.error(`Error: ${error.message}`);
      else toast.error('Ocurrió un error desconocido');
    }
  };

  // --- Funciones del Modal ---
  const handleOpenModalModificar = (prestamo: PrestamoAgrupado) => {
    setPrestamoSeleccionado(prestamo);
    setEditFormData({
      nombre_persona: prestamo.nombre_persona,
      id_persona: prestamo.id_persona,
      integrantes: prestamo.integrantes,
      materia: prestamo.materia,
      grupo: prestamo.grupo
    });
    setNuevosItemsParaAnadir([]);
    setModalSearchTerm('');
    setModalSearchResults([]);
    setModalModificarAbierto(true);
  };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = (name === 'integrantes') ? parseInt(value) || 1 : value;
    setEditFormData(prev => prev ? ({ ...prev, [name]: val }) : null);
  };
  
  const handleDevolverSolicitudCompleta = async (uuid: string | null) => {
    if (!uuid) return;
    if (!window.confirm(`¿Devolver TODOS los items pendientes de esta solicitud?`)) return;
    setEnviandoModificacion(true);
    try {
      const response = await fetch(`${apiUrl}/api/solicitud/${uuid}/devolver`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err || data.message || 'Error al devolver');
      toast.success(data.message || '¡Solicitud completa marcada como devuelta!');
      setModalModificarAbierto(false);
      fetchPrestamos();
    } catch (error) {
       if (error instanceof Error) toast.error(`Error: ${error.message}`);
       else toast.error('Ocurrió un error desconocido al devolver');
    } finally {
      setEnviandoModificacion(false);
    }
  };
  
  const handleModalSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setModalSearchTerm(newSearchTerm);
    if (newSearchTerm.trim() === '') {
      setModalSearchResults([]);
      return;
    }
    const results = fuse.search(newSearchTerm).map(result => result.item);
    setModalSearchResults(results.slice(0, 5));
  };
  const handleModalAddItem = (producto: Producto) => {
    const yaEnSolicitud = prestamos.some(p => p.solicitud_uuid === prestamoSeleccionado?.solicitud_uuid && p.producto_id === producto.id);
    const yaEnNuevos = nuevosItemsParaAnadir.some(item => item.id === producto.id);
    if (!yaEnSolicitud && !yaEnNuevos) {
      setNuevosItemsParaAnadir([...nuevosItemsParaAnadir, { ...producto, cantidad: 1 }]);
    } else {
        toast.error("Este equipo ya está en la solicitud o ya lo has añadido.");
    }
    setModalSearchTerm('');
    setModalSearchResults([]);
  };
  const handleModalRemoveItem = (productoId: number) => {
    setNuevosItemsParaAnadir(nuevosItemsParaAnadir.filter(item => item.id !== productoId));
  };
  const handleModalUpdateCantidad = (id: number, nuevaCantidad: number) => {
    const cantidadValidada = Math.max(1, nuevaCantidad);
    setNuevosItemsParaAnadir(nuevosItemsParaAnadir.map(item => 
      item.id === id ? { ...item, cantidad: cantidadValidada } : item
    ));
  };
  const handleUpdatePrestamo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editFormData || !prestamoSeleccionado || !prestamoSeleccionado.solicitud_uuid) {
        alert("Error crítico: Faltan datos para actualizar.");
        return;
    }
    setEnviandoModificacion(true);
    try {
      const updateSharedData = fetch(`${apiUrl}/api/solicitud/${prestamoSeleccionado.solicitud_uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const addNuevosItems = nuevosItemsParaAnadir.map(producto => {
        return fetch(`${apiUrl}/api/prestamos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre_persona: editFormData.nombre_persona,
            numero_de_control: editFormData.id_persona, 
            integrantes: editFormData.integrantes,
            materia: editFormData.materia,
            grupo: editFormData.grupo,
            producto_id: producto.id, 
            cantidad: producto.cantidad,
            solicitud_uuid: prestamoSeleccionado.solicitud_uuid 
          })
        });
      });
      const responses = await Promise.all([updateSharedData, ...addNuevosItems]);
      const algunaFallo = responses.some(res => !res.ok);
      if (algunaFallo) {
        throw new Error('Error al actualizar la solicitud o al añadir nuevos items');
      }
      toast.success('¡Solicitud actualizada con éxito!');
      setModalModificarAbierto(false);
      fetchPrestamos();
    } catch (error) {
      console.error('Error al modificar:', error);
      if (error instanceof Error) toast.error(`Error: ${error.message}`);
      else toast.error('Ocurrió un error desconocido al guardar');
    } finally {
      setEnviandoModificacion(false);
    }
  };
  
  // --- Manejo de Menús ---
  const setMenuRef = (uuid: string, el: HTMLDetailsElement | null) => {
    if (el) {
      menuRefs.current.set(uuid, el);
    } else {
      menuRefs.current.delete(uuid);
    }
  };
  const handleMenuClick = (uuid: string) => {
    menuRefs.current.forEach((el, key) => {
      if (key !== uuid && el.open) {
        el.open = false;
      }
    });
  };

  // --- RENDERIZADO (JSX) ---
  if (loading) return <p>Cargando historial de préstamos...</p>

  return (
    <div className={styles.appContainer}>
      <header>
        <h2>Historial de Préstamos</h2>
      </header>

      {/* --- BARRA DE CONTROLES (SIN FILTRO) --- */}
      <div className={styles.controls}>
        <div /> {/* Div vacío para empujar los botones a la derecha */}
        <div className={styles.buttonGroup}>
          <button onClick={handleExportXLS} className={styles.exportBtn}>
            Exportar a Excel (.xlsx)
          </button>
          <button onClick={handleDeleteAll} className={styles.deleteAllBtn}>
            Borrar Historial
          </button>
        </div>
      </div>
      
      {/* --- TABLA ACTUALIZADA --- */}
      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th>Folio Solicitud (UUID)</th>
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
                  <span title={grupo.solicitud_uuid}>{grupo.solicitud_uuid.substring(0, 8)}...</span>
                </td>
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
                
                {/* --- MENÚ DE ACCIONES ☰ --- */}
                <td className={styles.actionsCell}>
                  <details 
                    className={styles.actionsMenu}
                    ref={(el) => setMenuRef(grupo.solicitud_uuid, el)}
                    onClick={() => handleMenuClick(grupo.solicitud_uuid)}
                  >
                    <summary className={styles.menuToggle}>☰</summary>
                    <div className={styles.menuDropdown}>
                      <button 
                        className={styles.menuButton}
                        onClick={() => handleOpenModalModificar(grupo)}
                      >
                        Modificar (Ver Solicitud)
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

      {/* --- MODAL MODIFICADO --- */}
      {modalModificarAbierto && editFormData && prestamoSeleccionado && (
        <div className={styles.modalOverlay} onClick={() => setModalModificarAbierto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Gestionar Solicitud (Folio: ...{prestamoSeleccionado.solicitud_uuid?.substring(28)})</h2>
            
            <form onSubmit={handleUpdatePrestamo} className={styles.formularioPrestamo}>
              
              <fieldset>
                <legend>Items en esta Solicitud (Devolución Parcial)</legend>
                <ul className={styles.existingItemsList}>
                  {prestamos
                    .filter(p => p.solicitud_uuid === prestamoSeleccionado.solicitud_uuid)
                    .map(item => (
                      <li key={item.id} className={styles.existingItem}>
                        <span>{item.nombre_equipo} (x{item.cantidad})</span>
                        <button 
                          type="button"
                          className={styles.devolverItemBtn}
                          disabled={!!item.fecha_devolucion}
                          onClick={() => handleDevolucion(item.id)}
                        >
                          {item.fecha_devolucion ? 'Devuelto' : 'Entregar'}
                        </button>
                      </li>
                    ))
                  }
                </ul>
              </fieldset>

              <fieldset>
                <legend>Datos de la Solicitud</legend>
                <div>
                  <label htmlFor="edit_nombre_persona">Nombre Solicitante:</label>
                  <input type="text" id="edit_nombre_persona" name="nombre_persona" value={editFormData.nombre_persona} onChange={handleEditFormChange} required />
                </div>
                <div>
                  <label htmlFor="edit_id_persona">N° Control (o dejar vacío si es Maestro):</label>
                  <input type="text" id="edit_id_persona" name="id_persona" value={editFormData.id_persona || ''} onChange={handleEditFormChange} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="edit_integrantes">Integrantes:</label>
                    <input type="number" id="edit_integrantes" name="integrantes" value={editFormData.integrantes} min="1" onChange={handleEditFormChange} required />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="edit_materia">Materia (Opcional):</label>
                    <input type="text" id="edit_materia" name="materia" value={editFormData.materia || ''} onChange={handleEditFormChange} />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="edit_grupo">Grupo (Opcional):</label>
                    <input type="text" id="edit_grupo" name="grupo" value={editFormData.grupo || ''} onChange={handleEditFormChange} />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Añadir Equipos a esta Solicitud</legend>
                <label htmlFor="modal_busqueda">Buscar equipo:</label>
                <input
                  type="text"
                  id="modal_busqueda"
                  value={modalSearchTerm}
                  onChange={handleModalSearch}
                  placeholder="Escribe el nombre del equipo..."
                />
                <div className={styles.searchResults}>
                  {modalSearchResults.map((producto) => (
                    <button type="button" key={producto.id} onClick={() => handleModalAddItem(producto)} className={styles.searchResultItem}>
                      Añadir: {producto.nombre_equipo}
                    </button>
                  ))}
                </div>
                
                <div className={styles.listaSolicitud}>
                  <h4>Nuevos equipos a añadir:</h4>
                  {nuevosItemsParaAnadir.length === 0 ? (
                    <p>No has añadido nuevos equipos.</p>
                  ) : (
                    <ul className={styles.solicitudItemsList}>
                      {nuevosItemsParaAnadir.map((prod) => (
                        <li key={prod.id} className={styles.solicitudItem}>
                          <span className={styles.itemName}>{prod.nombre_equipo}</span>
                          <div className={styles.itemControls}>
                            <label htmlFor={`modal-qty-${prod.id}`}>Cantidad:</label>
                            <input type="number" id={`modal-qty-${prod.id}`} className={styles.itemQuantity} value={prod.cantidad} min="1" onChange={(e) => handleModalUpdateCantidad(prod.id, parseInt(e.target.value) || 1)} />
                            <button type="button" onClick={() => handleModalRemoveItem(prod.id)} className={styles.removeBtn}>
                              Quitar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </fieldset>
              
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.devolverTodaBtn}
                  onClick={() => handleDevolverSolicitudCompleta(prestamoSeleccionado?.solicitud_uuid || null)}
                  disabled={enviandoModificacion}
                >
                  Devolver Toda la Solicitud
                </button>
                <div>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setModalModificarAbierto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={enviandoModificacion}>
                    {enviandoModificacion ? 'Guardando...' : 'Guardar Cambios y Añadir'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Prestamos;