import { useState, useEffect, FormEvent } from 'react' // <--- Añadimos FormEvent

// Define la estructura de tus datos de Préstamo
interface Prestamo {
  id: number;
  nombre_persona: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  nombre_equipo: string; 
}

// NUEVO: Definición del tipo Producto (para el dropdown)
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

  // NUEVO: Estado para la lista de productos (para el dropdown)
  const [productos, setProductos] = useState<Producto[]>([])

  // NUEVO: Estado para los campos del formulario
  const [productoId, setProductoId] = useState('')
  const [nombrePersona, setNombrePersona] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Función para cargar los préstamos
  const fetchPrestamos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`)
      const data = await response.json()
      setPrestamos(data)
    } catch (error) {
      console.error('Error al cargar préstamos:', error)
    }
  }

  // NUEVO: Función para cargar los productos del inventario
  const fetchProductos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/inventario`)
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  // Carga TODOS los datos cuando el componente aparece
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      // Ejecuta ambas peticiones en paralelo
      await Promise.all([
        fetchPrestamos(),
        fetchProductos()
      ])
      setLoading(false)
    }
    cargarDatos()
  }, []) // El array vacío asegura que se ejecute solo una vez al montar

  // NUEVO: Función para manejar el envío del formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault() // Evita que la página se recargue
    
    if (!productoId || !nombrePersona) {
      alert('Por favor, selecciona un producto e ingresa un nombre.')
      return
    }
    
    setEnviando(true)

    try {
      const response = await fetch(`${apiUrl}/api/prestamos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // El ID debe ser número, el valor del select es string
        body: JSON.stringify({
          producto_id: parseInt(productoId), 
          nombre_persona: nombrePersona,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al registrar el préstamo')
      }

      // ¡Éxito!
      alert('¡Préstamo registrado con éxito!')
      setProductoId('') // Limpia el formulario
      setNombrePersona('') // Limpia el formulario
      fetchPrestamos() // Vuelve a cargar la lista de préstamos actualizada

    } catch (error) {
      console.error('Error en el formulario:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <p>Cargando datos...</p>

  return (
    <div>
      {/* --- NUEVO: Formulario de Préstamo --- */}
      <section className="formulario-prestamo">
        <h2>Registrar un Nuevo Préstamo</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="producto">Producto:</label>
            <select 
              id="producto"
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required
            >
              <option value="" disabled>-- Selecciona un producto --</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre_equipo} (ID: {producto.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nombre">Nombre de la Persona:</label>
            <input 
              type="text" 
              id="nombre"
              value={nombrePersona}
              onChange={(e) => setNombrePersona(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar Préstamo'}
          </button>
        </form>
      </section>

      {/* --- Lista de Préstamos (Existente) --- */}
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default Prestamos