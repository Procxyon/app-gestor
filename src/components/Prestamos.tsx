import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'

// --- ¡INTERFAZ ACTUALIZADA! ---
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
  solicitud_uuid: string | null; // <-- ¡NUEVO VÍNCULO!
}

interface PrestamosProps {
  apiUrl: string;
}

// Datos para el formulario (solo datos compartidos)
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

  // fetchPrestamos ya está actualizado por el backend (obtiene solicitud_uuid)
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

  // handleDevolucion (sin cambios)
  const handleDevolucion = async (prestamoId: number) => {
    if (!window.confirm('¿Seguro?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/${prestamoId}/devolver`, { method: 'PUT' })
      if (!response.ok) throw new Error('Error al registrar la devolución')
      alert('¡Devolución registrada!')
      fetchPrestamos() 
    } catch (error) {
      if (error instanceof Error) alert(`Error: ${error.message}`)
    }
  }

  // handleExportCSV (sin cambios)
  const handleExportCSV = () => {
    if (prestamos.length === 0) return;
    const headers = [
      "ID", "Solicitud_UUID", "Producto", "Cantidad", "Solicitante", "N° Control/Maestro", "Integrantes", 
      "Materia", "Grupo", "Fecha Préstamo", "Fecha Devolución"
    ];
    const rows = prestamos.map(p => [
      p.id,
      p.solicitud_uuid || 'N/A', // <-- Exportamos el nuevo UUID
      p.nombre_equipo.replace(/,/g, ''),
      p.cantidad,
      p.nombre_persona.replace(/,/g, ''),
      p.id_persona || 'Maestro',
      p.integrantes,
      p.materia || 'N/A',
      p.grupo || 'N/A',
      new Date(p.fecha_prestamo).toLocaleString(),
      p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : 'Pendiente'
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historial_prestamos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // handleDeleteAll (sin cambios)
  const handleDeleteAll = async () => {
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

  // handleOpenModalModificar (¡Actualizado!)
  const handleOpenModalModificar = (prestamo: Prestamo) => {
    if (!prestamo.solicitud_uuid) {
      alert("Error: Este es un préstamo antiguo sin 'ID de Solicitud'. No se puede modificar en cadena.");
      return;
    }
    setPrestamoSeleccionado(prestamo);
    // Pre-llena el formulario solo con datos compartidos
    setEditFormData({
      nombre_persona: prestamo.nombre_persona,
      id_persona: prestamo.id_persona,
      integrantes: prestamo.integrantes,
      materia: prestamo.materia,
      grupo: prestamo.grupo
    });
    setModalModificarAbierto(true);
  }

  // handleEditFormChange (sin cambios, maneja los inputs)
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
  }

  // --- ¡handleUpdatePrestamo (Totalmente Actualizado!) ---
  const handleUpdatePrestamo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editFormData || !prestamoSeleccionado || !prestamoSeleccionado.solicitud_uuid) {
      alert("Error: No se encontró el ID de la solicitud.");
      return;
    }
    
    setEnviandoModificacion(true);
    try {
      // Llama a la NUEVA ruta del backend
      const response = await fetch(`${apiUrl}/api/solicitud/${prestamoSeleccionado.solicitud_uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData) // Envía solo los datos compartidos
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.err || 'Error al actualizar');
      }

      alert('¡Solicitud actualizada! (Todos los items vinculados fueron modificados)');
      setModalModificarAbierto(false);
      setPrestamoSeleccionado(null);
      fetchPrestamos(); // Recarga el historial

    } catch (error) {
      console.error('Error al modificar:', error);
      if (error instanceof Error) alert(`Error: ${error.message}`);
      else alert('Ocurrió un error desconocido');
    } finally {
      setEnviandoModificacion(false);
    }
  }

  // --- RENDERIZADO (Tabla + Botones + Modal) ---
  if (loading) return <p>Cargando historial de préstamos...</p>

  return (
    <div className="lista-prestamos-container">
      <h2>Historial de Préstamos</h2>
      
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Acción</th>
              <th>Estado</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Solicitante</th>
              <th>N° Control / Maestro</th>
              <th>Folio Solicitud (UUID)</th> {/* <-- Nueva columna útil */}
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
                      Devolver
                    </button>
                  )}
                  {/* El botón ahora modifica la SOLICITUD, no el item */}
                  <button 
                    onClick={() => handleOpenModalModificar(prestamo)} 
                    className="modify-btn"
                    disabled={!!prestamo.fecha_devolucion || !prestamo.solicitud_uuid} // Deshabilitado si se devolvió O si es antiguo
                  >
                    Modificar
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
                
                {/* Nueva columna para ver el "folio" */}
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

      {/* --- MODAL DE MODIFICAR (Actualizado) --- */}
      {/* Ya no muestra 'cantidad', solo los datos compartidos */}
      {modalModificarAbierto && editFormData && prestamoSeleccionado && (
        <div className="modal-overlay" onClick={() => setModalModificarAbierto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Modificar Solicitud (Folio: ...{prestamoSeleccionado.solicitud_uuid?.substring(28)})</h2>
            <p><strong>Nota:</strong> Esto modificará los datos de <strong>todos</strong> los equipos en esta solicitud.</p>

            <form onSubmit={handleUpdatePrestamo} className="formulario-prestamo">
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
                <div className="form-group"> {/* (No necesita .form-row si es solo 1) */}
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
              <div className="modal-actions">
                <button type="button" className="modal-close-btn" onClick={() => setModalModificarAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submit-btn" disabled={enviandoModificacion}>
                  {enviandoModificacion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </div>
  )
}

export default Prestamos