import { useState, useEffect, useMemo } from 'react' // Se añade useMemo
import type { FormEvent } from 'react'
import * as XLSX from 'xlsx'; // Importación para Excel
import Fuse from 'fuse.js'; // Importación para búsqueda

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
  solicitud_uuid: string | null; // El "folio"
}

// Para la lista completa de productos
interface Producto {
  id: number;
  nombre_equipo: string;
}
// Para los items en la lista de añadir/modificar
interface SolicitudItem extends Producto {
  cantidad: number;
}

interface PrestamosProps {
  apiUrl: string;
}
// Para el formulario de edición (solo datos compartidos)
type EditFormData = {
  nombre_persona: string;
  id_persona: string | null;
  integrantes: number;
  materia: string | null;
  grupo: string | null;
}

// Opciones de búsqueda para el modal
const fuseOptions = {
  keys: ['nombre_equipo'],
  threshold: 0.4,
  includeScore: true
};
// --- Fin de Interfaces ---

function Prestamos({ apiUrl }: PrestamosProps) {
  // --- Estados Principales ---
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)

  // --- Estados del Modal de Modificación ---
  const [modalModificarAbierto, setModalModificarAbierto] = useState(false)
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null)
  const [enviandoModificacion, setEnviandoModificacion] = useState(false)

  // --- Estados para Añadir Items DENTRO del Modal ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([])
  const [nuevosItemsParaAnadir, setNuevosItemsParaAnadir] = useState<SolicitudItem[]>([])
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [modalSearchResults, setModalSearchResults] = useState<Producto[]>([])
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos])

  // --- Función para Cargar Préstamos ---
  const fetchPrestamos = async () => {
    // No reseteamos loading aquí para evitar parpadeos al refrescar
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`);
      const data: Prestamo[] = await response.json();
      data.sort((a, b) => 
        (a.fecha_devolucion ? 1 : -1) - (b.fecha_devolucion ? 1 : -1) || 
        new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime()
      );
      setPrestamos(data);
    } catch (error) { 
      console.error('Error al cargar préstamos:', error);
      // Podrías añadir un estado de error aquí para mostrarlo al usuario
    }
    // Solo quitamos el loading la primera vez
    if(loading) setLoading(false);
  }

  // --- Carga Inicial de Datos (Préstamos e Inventario) ---
  useEffect(() => {
    const fetchDatosIniciales = async () => {
      setLoading(true); // Ponemos loading al inicio
      try {
        // Ejecutamos ambas peticiones en paralelo para más rapidez
        const [prestamosRes, productosRes] = await Promise.all([
          fetch(`${apiUrl}/api/prestamos`),
          fetch(`${apiUrl}/api/inventario`)
        ]);

        // Procesamos préstamos
        const prestamosData: Prestamo[] = await prestamosRes.json();
        prestamosData.sort((a, b) => 
          (a.fecha_devolucion ? 1 : -1) - (b.fecha_devolucion ? 1 : -1) || 
          new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime()
        );
        setPrestamos(prestamosData);

        // Procesamos inventario
        const productosData: Producto[] = await productosRes.json();
        setTodosLosProductos(productosData);

      } catch (error) { 
        console.error('Error al cargar datos iniciales:', error);
        // Podrías manejar el error aquí (mostrar mensaje, etc.)
      }
      setLoading(false); // Quitamos loading al final
    }
    fetchDatosIniciales();
  }, [apiUrl]); // Se ejecuta cuando apiUrl cambia (normalmente solo al inicio)


  // --- Funciones de Acción (Devolver, Exportar, Borrar) ---

  // Devolver UN (1) Item (desde la fila)
  const handleDevolucion = async (prestamoId: number) => {
    if (!window.confirm('¿Devolver este item individual?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/${prestamoId}/devolver`, { method: 'PUT' });
      if (!response.ok) throw new Error('Error al registrar la devolución');
      alert('¡Devolución de item registrada!');
      fetchPrestamos(); // Refresca la lista
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
      else alert('Ocurrió un error desconocido');
    }
  }

  // Exportar a Excel (.xlsx)
  const handleExportXLS = () => {
    if (prestamos.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const headers = ["ID", "Folio Solicitud", "Producto", "Cantidad", "Solicitante", "N° Control/Maestro", "Integrantes", "Materia", "Grupo", "Fecha Préstamo", "Fecha Devolución", "Estado"];
    const rows = prestamos.map(p => [p.id, p.solicitud_uuid || 'N/A', p.nombre_equipo, p.cantidad, p.nombre_persona, p.id_persona || 'Maestro', p.integrantes, p.materia || 'N/A', p.grupo || 'N/A', new Date(p.fecha_prestamo).toLocaleString(), p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : '---', p.fecha_devolucion ? 'Devuelto' : 'Pendiente']);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial de Préstamos");
    XLSX.writeFile(wb, "historial_prestamos.xlsx");
  }

  // Borrar Todo el Historial
  const handleDeleteAll = async () => {
    if (!window.confirm("¿ESTÁS SEGURO DE QUE QUIERES BORRAR TODO EL HISTORIAL?")) return;
    if (!window.confirm("¡¡ADVERTENCIA FINAL!! Esta acción es irreversible. ¿Deseas continuar?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/all`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al borrar el historial');
      alert('Historial borrado con éxito.');
      fetchPrestamos(); // Refresca (lista vacía)
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
      else alert('Ocurrió un error desconocido');
    }
  }

  // --- Funciones del Modal de Modificación ---

  // Abrir Modal y Resetear Formulario Interno
  const handleOpenModalModificar = (prestamo: Prestamo) => {
    if (!prestamo.solicitud_uuid) {
      alert("Error: Este es un préstamo antiguo sin 'ID de Solicitud'. No se puede modificar en cadena.");
      return;
    }
    setPrestamoSeleccionado(prestamo);
    setEditFormData({ // Pre-llena datos compartidos
      nombre_persona: prestamo.nombre_persona,
      id_persona: prestamo.id_persona,
      integrantes: prestamo.integrantes,
      materia: prestamo.materia,
      grupo: prestamo.grupo
    });
    // Resetea el mini-formulario de añadir
    setNuevosItemsParaAnadir([]);
    setModalSearchTerm('');
    setModalSearchResults([]);
    setModalModificarAbierto(true);
  }

  // Manejar Cambios en Formulario de Edición
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convierte a número si es 'integrantes'
    const val = (name === 'integrantes') ? parseInt(value) || 1 : value;
    setEditFormData(prev => prev ? ({ ...prev, [name]: val }) : null);
  }

  // Devolver TODA la Solicitud (desde el modal)
  const handleDevolverSolicitudCompleta = async () => {
    if (!prestamoSeleccionado || !prestamoSeleccionado.solicitud_uuid) return;
    if (!window.confirm(`¿Devolver TODOS los items pendientes de esta solicitud?`)) return;
    setEnviandoModificacion(true);
    try {
      const response = await fetch(`${apiUrl}/api/solicitud/${prestamoSeleccionado.solicitud_uuid}/devolver`, { method: 'PUT' });
      if (!response.ok) throw new Error('Error al devolver la solicitud');
      alert('¡Solicitud completa marcada como devuelta!');
      setModalModificarAbierto(false);
      fetchPrestamos(); // Refresca
    } catch (error) {
       if (error instanceof Error) alert(`Error: ${error.message}`);
       else alert('Ocurrió un error desconocido al devolver');
    } finally {
      setEnviandoModificacion(false);
    }
  }

  // --- Funciones del Mini-Formulario DENTRO del Modal ---
  const handleModalSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value
    setModalSearchTerm(newSearchTerm)
    if (newSearchTerm.trim() === '') {
      setModalSearchResults([])
      return
    }
    const results = fuse.search(newSearchTerm).map(result => result.item)
    setModalSearchResults(results.slice(0, 5)) 
  }

  const handleModalAddItem = (producto: Producto) => {
    // Evita añadir items que ya estén en la solicitud original o en la lista de nuevos
    const yaEnSolicitud = prestamos.some(p => p.solicitud_uuid === prestamoSeleccionado?.solicitud_uuid && p.producto_id === producto.id);
    const yaEnNuevos = nuevosItemsParaAnadir.some(item => item.id === producto.id);
    
    if (!yaEnSolicitud && !yaEnNuevos) {
      setNuevosItemsParaAnadir([...nuevosItemsParaAnadir, { ...producto, cantidad: 1 }]) 
    } else {
        alert("Este equipo ya está en la solicitud o ya lo has añadido.")
    }
    setModalSearchTerm('')
    setModalSearchResults([])
  }

  const handleModalRemoveItem = (productoId: number) => {
    setNuevosItemsParaAnadir(nuevosItemsParaAnadir.filter(item => item.id !== productoId))
  }

  const handleModalUpdateCantidad = (id: number, nuevaCantidad: number) => {
    const cantidadValidada = Math.max(1, nuevaCantidad);
    setNuevosItemsParaAnadir(nuevosItemsParaAnadir.map(item => 
      item.id === id ? { ...item, cantidad: cantidadValidada } : item
    ));
  };
  
  // --- Función Principal de GUARDAR CAMBIOS del Modal ---
  const handleUpdatePrestamo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editFormData || !prestamoSeleccionado || !prestamoSeleccionado.solicitud_uuid) {
        alert("Error crítico: Faltan datos para actualizar.");
        return;
    }
    
    setEnviandoModificacion(true);
    try {
      // 1. Promesa para actualizar los datos compartidos
      const updateSharedData = fetch(`${apiUrl}/api/solicitud/${prestamoSeleccionado.solicitud_uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      // 2. Array de promesas para AÑADIR los nuevos items
      const addNuevosItems = nuevosItemsParaAnadir.map(producto => {
        return fetch(`${apiUrl}/api/prestamos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Datos compartidos (del formulario de edición)
            nombre_persona: editFormData.nombre_persona,
            // Si es maestro (id_persona null) envía null, si no, envía el valor
            numero_de_control: editFormData.id_persona, 
            integrantes: editFormData.integrantes,
            materia: editFormData.materia,
            grupo: editFormData.grupo,
            // Datos del nuevo item
            producto_id: producto.id, 
            cantidad: producto.cantidad,
            // ¡El VÍNCULO! El UUID existente
            solicitud_uuid: prestamoSeleccionado.solicitud_uuid 
          })
        })
      });

      // 3. Ejecuta todas las promesas en paralelo
      const responses = await Promise.all([updateSharedData, ...addNuevosItems]);

      const algunaFallo = responses.some(res => !res.ok);
      if (algunaFallo) {
        throw new Error('Error al actualizar la solicitud o al añadir nuevos items');
      }

      alert('¡Solicitud actualizada con éxito!');
      setModalModificarAbierto(false);
      fetchPrestamos(); // Recarga la tabla

    } catch (error) {
      console.error('Error al modificar:', error);
      if (error instanceof Error) alert(`Error: ${error.message}`);
      else alert('Ocurrió un error desconocido al guardar');
    } finally {
      setEnviandoModificacion(false);
    }
  }


  // --- RENDERIZADO (JSX) ---
  if (loading) return <p>Cargando historial de préstamos...</p>

  return (
    <div className="lista-prestamos-container">
      <h2>Historial de Préstamos</h2>
      
      {/* La tabla del historial */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Acción</th>
              <th>Estado</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Solicitante</th>
              <th>N° Control / Maestro</th>
              <th>Folio Solicitud (UUID)</th>
              <th>Materia</th>
              <th>Grupo</th>
              <th>Fecha Préstamo</th>
              <th>Fecha Devolución</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.map((prestamo) => (
              <tr key={prestamo.id}>
                <td>
                  {!prestamo.fecha_devolucion && (
                    <button onClick={() => handleDevolucion(prestamo.id)} className="devolver-btn"> 
                      Devolver Item
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenModalModificar(prestamo)} 
                    className="modify-btn"
                    disabled={!prestamo.solicitud_uuid}
                  >
                    Ver Solicitud
                  </button>
                </td>
                <td>
                  {prestamo.fecha_devolucion ? (
                    <span style={{ color: 'green', fontWeight: 'bold' }}>Devuelto</span>
                  ) : (
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Pendiente</span>
                  )}
                </td>
                <td>{prestamo.nombre_equipo}</td>
                <td>{prestamo.cantidad || 1}</td>
                <td>{prestamo.nombre_persona}</td>
                <td>{prestamo.id_persona ? prestamo.id_persona : (<span style={{ fontStyle: 'italic' }}>Maestro</span>)}</td>
                <td>{prestamo.solicitud_uuid ? (
                  <span title={prestamo.solicitud_uuid}>{prestamo.solicitud_uuid.substring(0, 8)}...</span>
                  ) : 'N/A'}
                </td>
                <td>{prestamo.materia || 'N/A'}</td>
                <td>{prestamo.grupo || 'N/A'}</td>
                <td>{new Date(prestamo.fecha_prestamo).toLocaleString()}</td>
                <td>{prestamo.fecha_devolucion ? new Date(prestamo.fecha_devolucion).toLocaleString() : '---'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botones Generales */}
      <div className="general-actions">
        <button onClick={handleExportXLS} className="export-btn">
          Exportar a Excel (.xlsx)
        </button>
        <button onClick={handleDeleteAll} className="delete-all-btn">
          Borrar Historial
        </button>
      </div>

      {/* --- MODAL DE MODIFICAR (ACTUALIZADO CON SEGUNDO FIELDSET) --- */}
      {modalModificarAbierto && editFormData && prestamoSeleccionado && (
        <div className="modal-overlay" onClick={() => setModalModificarAbierto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Gestionar Solicitud (Folio: ...{prestamoSeleccionado.solicitud_uuid?.substring(28)})</h2>
            
            <form onSubmit={handleUpdatePrestamo} className="formulario-prestamo">
              
              {/* --- FIELDSET 1: DATOS COMPARTIDOS --- */}
              <fieldset>
                <legend>Datos de la Solicitud</legend>
                <p><strong>Nota:</strong> Los cambios aquí afectarán a <strong>todos</strong> los items de esta solicitud.</p>
                <div>
                  <label htmlFor="edit_nombre_persona">Nombre Solicitante:</label>
                  <input type="text" id="edit_nombre_persona" name="nombre_persona" value={editFormData.nombre_persona} onChange={handleEditFormChange} required />
                </div>
                <div>
                  <label htmlFor="edit_id_persona">N° Control (o dejar vacío si es Maestro):</label>
                  <input type="text" id="edit_id_persona" name="id_persona" value={editFormData.id_persona || ''} onChange={handleEditFormChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="edit_integrantes">Integrantes:</label>
                    <input type="number" id="edit_integrantes" name="integrantes" value={editFormData.integrantes} min="1" onChange={handleEditFormChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit_materia">Materia (Opcional):</label>
                    <input type="text" id="edit_materia" name="materia" value={editFormData.materia || ''} onChange={handleEditFormChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_grupo">Grupo (Opcional):</label>
                    <input type="text" id="edit_grupo" name="grupo" value={editFormData.grupo || ''} onChange={handleEditFormChange} />
                  </div>
                </div>
              </fieldset>

              {/* --- FIELDSET 2: AÑADIR EQUIPOS --- */}
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
                <div className="search-results">
                  {modalSearchResults.map((producto) => (
                    <button type="button" key={producto.id} onClick={() => handleModalAddItem(producto)} className="search-result-item">
                      Añadir: {producto.nombre_equipo}
                    </button>
                  ))}
                </div>
                
                <div className="lista-solicitud">
                  <h4>Nuevos equipos a añadir:</h4>
                  {nuevosItemsParaAnadir.length === 0 ? (
                    <p>No has añadido nuevos equipos.</p>
                  ) : (
                    <ul className="solicitud-items-list">
                      {nuevosItemsParaAnadir.map((prod) => (
                        <li key={prod.id} className="solicitud-item">
                          <span className="item-name">{prod.nombre_equipo}</span>
                          <div className="item-controls">
                            <label htmlFor={`modal-qty-${prod.id}`}>Cantidad:</label>
                            <input type="number" id={`modal-qty-${prod.id}`} className="item-quantity" value={prod.cantidad} min="1" onChange={(e) => handleModalUpdateCantidad(prod.id, parseInt(e.target.value) || 1)} />
                            <button type="button" onClick={() => handleModalRemoveItem(prod.id)} className="remove-btn">
                              Quitar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </fieldset>
              
              {/* Botones de Acción del Modal */}
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="devolver-toda-btn"
                  onClick={handleDevolverSolicitudCompleta}
                  disabled={enviandoModificacion}
                >
                  Devolver Toda la Solicitud
                </button>
                <div>
                  <button type="button" className="modal-close-btn" onClick={() => setModalModificarAbierto(false)}>
                    Cancelar
                  </button>
                  {/* El botón de submit ahora guarda los cambios Y añade los nuevos items */}
                  <button type="submit" className="submit-btn" disabled={enviandoModificacion}>
                    {enviandoModificacion ? 'Guardando...' : 'Guardar Cambios y Añadir'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Prestamos