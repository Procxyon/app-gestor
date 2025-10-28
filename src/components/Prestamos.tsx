import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'

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

function Prestamos({ apiUrl }: PrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalModificarAbierto, setModalModificarAbierto] = useState(false)
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null)
  const [enviandoModificacion, setEnviandoModificacion] = useState(false)

  // Cargar Préstamos
  const fetchPrestamos = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`)
      const data: Prestamo[] = await response.json()
      data.sort((a, b) => 
        (a.fecha_devolucion ? 1 : -1) - (b.fecha_devolucion ? 1 : -1) || 
        new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime()
      );
      setPrestamos(data)
    } catch (error) { console.error('Error al cargar préstamos:', error) }
    setLoading(false)
  }

  useEffect(() => { fetchPrestamos() }, [apiUrl])

  // --- Devolver UN (1) Item ---
  // (Esta es la función del botón en la fila)
  const handleDevolucion = async (prestamoId: number) => {
    if (!window.confirm('¿Devolver este item individual?')) return;
    try {
      // Llama a la ruta de DEVOLVER POR ID
      const response = await fetch(`${apiUrl}/api/prestamos/${prestamoId}/devolver`, { method: 'PUT' })
      if (!response.ok) throw new Error('Error al registrar la devolución')
      alert('¡Devolución de item registrada!')
      fetchPrestamos() 
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`)
    }
  }

  // Exportar (sin cambios)
  const handleExportCSV = () => {
    // ... (Tu código de exportar CSV va aquí, sin cambios) ...
    if (prestamos.length === 0) return;
    const headers = ["ID", "Solicitud_UUID", "Producto", "Cantidad", "Solicitante", "N° Control/Maestro", "Integrantes", "Materia", "Grupo", "Fecha Préstamo", "Fecha Devolución"];
    const rows = prestamos.map(p => [p.id, p.solicitud_uuid || 'N/A', p.nombre_equipo.replace(/,/g, ''), p.cantidad, p.nombre_persona.replace(/,/g, ''), p.id_persona || 'Maestro', p.integrantes, p.materia || 'N/A', p.grupo || 'N/A', new Date(p.fecha_prestamo).toLocaleString(), p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : 'Pendiente'].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historial_prestamos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Borrar Todo (sin cambios)
  const handleDeleteAll = async () => {
    // ... (Tu código de borrar todo va aquí, sin cambios) ...
    if (!window.confirm("¿BORRAR TODO?")) return;
    if (!window.confirm("¡¡ADVERTENCIA FINAL!! ¿CONTINUAR?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/all`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al borrar el historial');
      alert('Historial borrado.');
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
    }
  }

  // Abrir Modal (sin cambios)
  const handleOpenModalModificar = (prestamo: Prestamo) => {
    if (!prestamo.solicitud_uuid) {
      alert("Error: Este es un préstamo antiguo sin 'ID de Solicitud'. No se puede modificar en cadena.");
      return;
    }
    setPrestamoSeleccionado(prestamo);
    setEditFormData({
      nombre_persona: prestamo.nombre_persona,
      id_persona: prestamo.id_persona,
      integrantes: prestamo.integrantes,
      materia: prestamo.materia,
      grupo: prestamo.grupo
    });
    setModalModificarAbierto(true);
  }

  // Input Change (sin cambios)
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
  }

  // Enviar Modificación (sin cambios)
  const handleUpdatePrestamo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editFormData || !prestamoSeleccionado || !prestamoSeleccionado.solicitud_uuid) return;
    setEnviandoModificacion(true);
    try {
      // Llama a la ruta de MODIFICAR POR UUID
      const response = await fetch(`${apiUrl}/api/solicitud/${prestamoSeleccionado.solicitud_uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (!response.ok) throw new Error('Error al actualizar');
      alert('¡Solicitud actualizada!');
      setModalModificarAbierto(false);
      fetchPrestamos();
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
    } finally {
      setEnviandoModificacion(false);
    }
  }

  // --- ¡NUEVA FUNCIÓN! ---
  // --- Devolver TODA la Solicitud (desde el modal) ---
  const handleDevolverSolicitudCompleta = async () => {
    if (!prestamoSeleccionado || !prestamoSeleccionado.solicitud_uuid) return;
    
    if (!window.confirm(`¿Estás seguro de que quieres devolver TODOS los items pendientes de esta solicitud? (Folio: ...${prestamoSeleccionado.solicitud_uuid.slice(-8)})`)) {
      return;
    }
    
    setEnviandoModificacion(true); // Re-usamos el estado de "enviando"
    try {
      // Llama a la NUEVA ruta de DEVOLVER POR UUID
      const response = await fetch(`${apiUrl}/api/solicitud/${prestamoSeleccionado.solicitud_uuid}/devolver`, {
        method: 'PUT'
      });
      if (!response.ok) throw new Error('Error al devolver la solicitud');
      
      alert('¡Solicitud completa marcada como devuelta!');
      setModalModificarAbierto(false); // Cierra el modal
      fetchPrestamos(); // Recarga la tabla
    } catch (error) {
       if (error instanceof Error) alert(`Error: ${error.message}`);
    } finally {
      setEnviandoModificacion(false);
    }
  }

  // --- RENDERIZADO (JSX) ---
  if (loading) return <p>Cargando historial de préstamos...</p>

  return (
    <div className="lista-prestamos-container">
      <h2>Historial de Préstamos</h2>
      
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            {/* ... (Tu <thead> de la tabla se queda igual) ... */}
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
                {/* --- CAMBIO EN ONCLICK DE DEVOLVER --- */}
                <td>
                  {!prestamo.fecha_devolucion && (
                    // Este botón solo devuelve 1 item
                    <button onClick={() => handleDevolucion(prestamo.id)} className="devolver-btn"> 
                      Devolver Item
                    </button>
                  )}
                  {/* Este botón abre el modal para la solicitud completa */}
                  <button 
                    onClick={() => handleOpenModalModificar(prestamo)} 
                    className="modify-btn"
                    disabled={!prestamo.solicitud_uuid} // Deshabilitado si es un registro antiguo
                  >
                    Ver Solicitud
                  </button>
                </td>
                
                {/* ... (El resto de tu <tbody> se queda igual) ... */}
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

      {/* Botones Generales (sin cambios) */}
      <div className="general-actions">
        <button onClick={handleExportCSV} className="export-btn">
          Exportar a CSV
        </button>
        <button onClick={handleDeleteAll} className="delete-all-btn">
          Borrar Historial
        </button>
      </div>

      {/* --- MODAL DE MODIFICAR (ACTUALIZADO CON EL NUEVO BOTÓN) --- */}
      {modalModificarAbierto && editFormData && prestamoSeleccionado && (
        <div className="modal-overlay" onClick={() => setModalModificarAbierto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Gestionar Solicitud (Folio: ...{prestamoSeleccionado.solicitud_uuid?.substring(28)})</h2>
            
            {/* Formulario de Modificación */}
            <form onSubmit={handleUpdatePrestamo} className="formulario-prestamo">
              {/* ... (El fieldset del formulario se queda igual) ... */}
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
              
              {/* --- ¡SECCIÓN DE BOTONES ACTUALIZADA! --- */}
              <div className="modal-actions">
                {/* Botón 1: Devolver Todo (NUEVO) */}
                <button 
                  type="button" 
                  className="devolver-toda-btn"
                  onClick={handleDevolverSolicitudCompleta}
                  disabled={enviandoModificacion}
                >
                  Devolver Toda la Solicitud
                </button>
                
                {/* Contenedor para los otros 2 botones */}
                <div>
                  <button type="button" className="modal-close-btn" onClick={() => setModalModificarAbierto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="submit-btn" disabled={enviandoModificacion}>
                    {enviandoModificacion ? 'Guardando...' : 'Guardar Cambios'}
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