// Nuevas importaciones
import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import Fuse from 'fuse.js' // <-- Importamos Fuse.js

// --- INTERFACES ---
interface Prestamo {
  id: number;
  nombre_persona: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  nombre_equipo: string; 
}

interface Producto {
  id: number;
  nombre_equipo: string;
}

// Opciones para la búsqueda difusa
const fuseOptions = {
  keys: ['nombre_equipo'],
  threshold: 0.4,
  includeScore: true
};

interface PrestamosProps {
  apiUrl: string;
}

function Prestamos({ apiUrl }: PrestamosProps) {
  // --- ESTADO PARA LA LISTA (HISTORIAL) ---
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)

  // --- ESTADO PARA EL NUEVO FORMULARIO ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([])
  const [listaSolicitud, setListaSolicitud] = useState<Producto[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const [nombrePersona, setNombrePersona] = useState('')
  const [numeroControl, setNumeroControl] = useState('')
  const [integrantes, setIntegrantes] = useState(1)
  const [enviando, setEnviando] = useState(false)
  
  // --- ¡NUEVA FEATURE! ---
  const [isMaestro, setIsMaestro] = useState(false)

  // Instancia de Fuse para la búsqueda
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos])

  // --- FUNCIONES DEL HISTORIAL (Sin cambios) ---
  const fetchPrestamos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/prestamos`)
      const data = await response.json()
      setPrestamos(data)
    } catch (error) {
      console.error('Error al cargar préstamos:', error)
    }
  }

  const handleDevolucion = async (prestamoId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres marcar este préstamo como devuelto?')) {
      return
    }
    try {
      const response = await fetch(`${apiUrl}/api/prestamos/${prestamoId}/devolver`, {
        method: 'PUT',
      })
      if (!response.ok) throw new Error('Error al registrar la devolución')
      alert('¡Devolución registrada con éxito!')
      fetchPrestamos() 
    } catch (error) {
      console.error('Error al devolver:', error)
      if (error instanceof Error) alert(`Error: ${error.message}`)
      else alert('Ocurrió un error desconocido')
    }
  }

  // --- FUNCIONES DEL FORMULARIO (Nuevas/Actualizadas) ---
  const fetchProductos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/inventario`)
      const data = await response.json()
      setTodosLosProductos(data) // Almacena todos los productos para la búsqueda
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  // Carga TODOS los datos (historial y productos) al inicio
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

  // Búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value
    setSearchTerm(newSearchTerm)
    if (newSearchTerm.trim() === '') {
      setSearchResults([])
      return
    }
    const results = fuse.search(newSearchTerm).map(result => result.item)
    setSearchResults(results.slice(0, 5)) 
  }

  // Añadir a la lista
  const handleAddItem = (producto: Producto) => {
    if (!listaSolicitud.find(item => item.id === producto.id)) {
      setListaSolicitud([...listaSolicitud, producto])
    }
    setSearchTerm('')
    setSearchResults([])
  }

  // Quitar de la lista
  const handleRemoveItem = (productoId: number) => {
    setListaSolicitud(listaSolicitud.filter(item => item.id !== productoId))
  }

  // ¡NUEVO SUBMIT! (Fusiona todo)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault() 
    
    if (listaSolicitud.length === 0) {
      alert('Debes añadir al menos un equipo a tu solicitud.')
      return
    }
    
    // --- LÓGICA DE MAESTRO ---
    if (!isMaestro && !numeroControl.trim()) {
      alert('El Número de Control es obligatorio para alumnos.')
      return
    }

    if (!nombrePersona.trim() || !integrantes) {
      alert('Por favor, llena el nombre y el número de integrantes.')
      return
    }
    
    setEnviando(true)

    const solicitudes = listaSolicitud.map(producto => {
      return fetch(`${apiUrl}/api/prestamos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: producto.id, 
          nombre_persona: nombrePersona,
          // --- LÓGICA DE MAESTRO ---
          // Si es maestro, envía null. Si no, envía el número de control.
          numero_de_control: isMaestro ? null : numeroControl,
          integrantes: integrantes
        }),
      })
    })

    try {
      const responses = await Promise.all(solicitudes)
      const algunaFallo = responses.some(res => !res.ok)
      if (algunaFallo) {
        throw new Error('No se pudieron registrar algunas solicitudes')
      }

      alert(`¡Solicitud registrada con éxito para ${listaSolicitud.length} equipo(s)!`)
      
      // Limpia el formulario
      setListaSolicitud([])
      setNombrePersona('')
      setNumeroControl('')
      setIntegrantes(1)
      setSearchTerm('')
      setIsMaestro(false) // Resetea la casilla

      // Recarga el historial de préstamos
      fetchPrestamos()

    } catch (error) {
      console.error('Error en el formulario:', error)
      if (error instanceof Error) alert(`Error: ${error.message}`)
      else alert('Ocurrió un error desconocido')
    } finally {
      setEnviando(false)
    }
  }


  if (loading) return <p>Cargando datos...</p>

  // --- RENDERIZADO (JSX) ---
  return (
    <div>
      {/* --- NUEVO FORMULARIO DE PRÉSTAMO --- */}
      <section className="formulario-prestamo">
        <h2>Registrar un Nuevo Préstamo</h2>
        <form onSubmit={handleSubmit}>
          
          <fieldset>
            <legend>Datos del Solicitante</legend>
            
            {/* --- ¡NUEVA FEATURE! Casilla de Maestro --- */}
            <div className="maestro-check">
              <input 
                type="checkbox"
                id="maestro"
                checked={isMaestro}
                onChange={(e) => setIsMaestro(e.target.checked)}
              />
              <label htmlFor="maestro">El solicitante es un Maestro</label>
            </div>

            <div>
              <label htmlFor="nombre">Nombre Completo:</label>
              <input 
                type="text" 
                id="nombre"
                value={nombrePersona}
                onChange={(e) => setNombrePersona(e.target.value)}
                required
              />
            </div>
            
            {/* --- LÓGICA DE MAESTRO: Mostrar solo si NO es maestro --- */}
            {!isMaestro && (
              <div>
                <label htmlFor="control">Número de Control:</label>
                <input 
                  type="text" 
                  id="control"
                  value={numeroControl}
                  onChange={(e) => setNumeroControl(e.target.value)}
                  required={!isMaestro} // Es requerido si no es maestro
                />
              </div>
            )}

            <div>
              <label htmlFor="integrantes">Número de Integrantes (total):</label>
              <input 
                type="number" 
                id="integrantes"
                value={integrantes}
                min="1"
                onChange={(e) => setIntegrantes(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Equipos a Solicitar</legend>
            <label htmlFor="busqueda">Buscar equipo (ej: "Osciloscopio", "Caiman"):</label>
            <input
              type="text"
              id="busqueda"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Escribe el nombre del equipo..."
              autoComplete="off"
            />
            <div className="search-results">
              {searchResults.map((producto) => (
                <button 
                  type="button" 
                  key={producto.id} 
                  onClick={() => handleAddItem(producto)}
                  className="search-result-item"
                >
                  Añadir: {producto.nombre_equipo}
                </button>
              ))}
            </div>

            <div className="lista-solicitud">
              <h4>Equipos en esta solicitud:</h4>
              {listaSolicitud.length === 0 ? (
                <p>Aún no has añadido equipos.</p>
              ) : (
                <ul>
                  {listaSolicitud.map((prod) => (
                    <li key={prod.id}>
                      {prod.nombre_equipo}
                      <button type="button" onClick={() => handleRemoveItem(prod.id)} className="remove-btn">
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          <button type="submit" disabled={enviando || loading} className="submit-btn">
            {enviando ? 'Enviando...' : 'Registrar Préstamo(s)'}
          </button>
        </form>
      </section>

      {/* --- LISTA DE PRÉSTAMOS (Sin cambios) --- */}
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
              <th>Acción</th>
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
                <td>
                  {prestamo.fecha_devolucion ? (
                    <span style={{ color: 'green' }}>Devuelto</span>
                  ) : (
                    <button onClick={() => handleDevolucion(prestamo.id)}>
                      Marcar Devolución
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default Prestamos