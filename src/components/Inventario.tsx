import { useState, useEffect } from 'react'

// Define la estructura de tus datos
interface Producto {
  id: number;
  nombre_equipo: string;
  descripcion: string;
  unidades_totales: number;
}

interface InventarioProps {
  apiUrl: string;
}

function Inventario({ apiUrl }: InventarioProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  // Función para cargar los datos desde la API (tu Worker)
  const fetchInventario = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/inventario`)
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error('Error al cargar inventario:', error)
    }
    setLoading(false)
  }

  // Carga los datos cuando el componente aparece
  useEffect(() => {
    fetchInventario()
  }, [])

  if (loading) return <p>Cargando inventario...</p>

  return (
    <div>
      <h2>Gestión de Inventario</h2>
      {/* Aquí puedes poner un formulario para AÑADIR productos */}
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre Equipo</th>
            <th>Descripción</th>
            <th>Unidades Totales</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id}>
              <td>{producto.id}</td>
              <td>{producto.nombre_equipo}</td>
              <td>{producto.descripcion}</td>
              <td>{producto.unidades_totales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Inventario