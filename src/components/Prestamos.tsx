import React, { useState, useEffect } from 'react'

// Define la estructura de tus datos (incluye el nombre del equipo)
interface Prestamo {
  id: number;
  nombre_persona: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  nombre_equipo: string; // Este viene del JOIN en la API
}

interface PrestamosProps {
  apiUrl: string;
}

function Prestamos({ apiUrl }: PrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)

  // Función para cargar los datos desde la API
  const fetchPrestamos = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`)
      const data = await response.json()
      setPrestamos(data)
    } catch (error) {
      console.error('Error al cargar préstamos:', error)
    }
    setLoading(false)
  }

  // Carga los datos cuando el componente aparece
  useEffect(() => {
    fetchPrestamos()
  }, [])

  if (loading) return <p>Cargando préstamos...</p>

  return (
    <div>
      <h2>Gestión de Préstamos</h2>
      {/* Aquí puedes poner un formulario para REGISTRAR un préstamo */}
      
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
    </div>
  )
}

export default Prestamos