import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'

// (La interfaz Prestamo no cambia)
interface Prestamo {
  id: number;
  nombre_persona: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  nombre_equipo: string; 
}

// (La interfaz Producto no cambia)
interface Producto {
  id: number;
  nombre_equipo: string;
}

interface PrestamosProps {
  apiUrl: string;
}

function Prestamos({ apiUrl }: PrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState('')
  const [nombrePersona, setNombrePersona] = useState('')
  const [enviando, setEnviando] = useState(false)

  // (fetchPrestamos y fetchProductos no cambian)
  const fetchPrestamos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`)
      const data = await response.json()
      setPrestamos(data)
    } catch (error) {
      console.error('Error al cargar préstamos:', error)
    }
  }

  const fetchProductos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/inventario`)
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  // (useEffect no cambia)
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      await Promise.all([
        fetchPrestamos(),
        fetchProductos()
      ])
      setLoading(false)
    }
    cargarDatos()
  }, []) 

  // (handleSubmit no cambia)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault() 
    if (!productoId || !nombrePersona) {
      alert('Por favor, selecciona un producto e ingresa un nombre.')
      return
    }
    setEnviando(true)
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: parseInt(productoId), 
          nombre_persona: nombrePersona,
        }),
      })
      if (!response.ok) throw new Error('Error al registrar el préstamo')
      alert('¡Préstamo registrado con éxito!')
      setProductoId('') 
      setNombrePersona('') 
      fetchPrestamos() // Recarga la lista de préstamos
    } catch (error) {
      console.error('Error en el formulario:', error)
      if (error instanceof Error) alert(`Error: ${error.message}`)
      else alert('Ocurrió un error desconocido')
    } finally {
      setEnviando(false)
    }
  }

  // --- ¡NUEVA FUNCIÓN PARA MANEJAR DEVOLUCIONES! ---
  const handleDevolucion = async (prestamoId: number) => {
    // Pedimos confirmación antes de marcar la devolución
    if (!window.confirm('¿Estás seguro de que quieres marcar este préstamo como devuelto?')) {
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/prestamos/${prestamoId}/devolver`, {
        method: 'PUT',
      })

      if (!response.ok) {
        throw new Error('Error al registrar la devolución')
      }

      alert('¡Devolución registrada con éxito!')
      fetchPrestamos() // Recarga la lista para mostrar el cambio

    } catch (error) {
      console.error('Error al devolver:', error)
      if (error instanceof Error) alert(`Error: ${error.message}`)
      else alert('Ocurrió un error desconocido')
    }
  }
  // --- FIN DE LA NUEVA FUNCIÓN ---


  if (loading) return <p>Cargando datos...</p>

  return (
    <div>
      {/* --- Formulario de Préstamo (sin cambios) --- */}
      <section className="formulario-prestamo">
        <h2>Registrar un Nuevo Préstamo</h2>
        <form onSubmit={handleSubmit}>
          {/* ... (todo el formulario sigue igual) ... */}
          <div>
            <label htmlFor="producto">Producto:</label>
            <select id="producto" value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
              <option value="" disabled>-- Selecciona un producto --</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>{producto.nombre_equipo} (ID: {producto.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nombre">Nombre de la Persona:</label>
            <input type="text" id="nombre" value={nombrePersona} onChange={(e) => setNombrePersona(e.target.value)} required />
          </div>
          <button type="submit" disabled={enviando}>{enviando ? 'Registrando...' : 'Registrar Préstamo'}</button>
        </form>
      </section>

      {/* --- Lista de Préstamos (CON CAMBIOS) --- */}
      <section className="lista-prestamos">
        <h2>Historial de Préstamos</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Persona</th>
              <th>Fecha Préstamo</th>
              <th>Fecha Devolución</th>
              <th>Acción</th> {/* <-- NUEVA COLUMNA */}
            </tr>
          </thead>
          <tbody>
            {prestamos.map((prestamo) => (
              <tr key={prestamo.id}>
                <td>{prestamo.id}</td>
                <td>{prestamo.nombre_equipo}</td>
                <td>{prestamo.nombre_persona}</td>
                <td>{new Date(prestamo.fecha_prestamo).toLocaleString()}</td>
                <td>{prestamo.fecha_devolucion ? new Date(prestamo.fecha_devolucion).toLocaleString() : 'Pendiente'}</td>
                
                {/* --- NUEVA CELDA CON LÓGICA CONDICIONAL --- */}
                <td>
                  {prestamo.fecha_devolucion ? (
                    <span style={{ color: 'green' }}>Devuelto</span>
                  ) : (
                    <button onClick={() => handleDevolucion(prestamo.id)}>
                      Marcar Devolución
                    </button>
                  )}
                </td>
                {/* --- FIN DE LA NUEVA CELDA --- */}

              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default Prestamos