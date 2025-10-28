import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import Fuse from 'fuse.js' 

// --- Interfaces ---
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

const fuseOptions = {
  keys: ['nombre_equipo'],
  threshold: 0.4,
  includeScore: true
};

function RegistrarPrestamo({ apiUrl }: PrestamosProps) {
  // --- Estados del formulario ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([])
  const [listaSolicitud, setListaSolicitud] = useState<SolicitudItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos])

  const [nombrePersona, setNombrePersona] = useState('')
  const [numeroControl, setNumeroControl] = useState('')
  const [integrantes, setIntegrantes] = useState(1)
  const [materia, setMateria] = useState('')
  const [grupo, setGrupo] = useState('')
  
  const [isMaestro, setIsMaestro] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  // Carga los productos
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/api/inventario`);
        const data = await response.json();
        setTodosLosProductos(data);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
      setLoading(false);
    }
    fetchProductos()
  }, [apiUrl])

  // --- Funciones de manejo del formulario ---
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

  const handleAddItem = (producto: Producto) => {
    if (!listaSolicitud.find(item => item.id === producto.id)) {
      setListaSolicitud([...listaSolicitud, { ...producto, cantidad: 1 }]) 
    }
    setSearchTerm('')
    setSearchResults([])
  }

  const handleRemoveItem = (productoId: number) => {
    setListaSolicitud(listaSolicitud.filter(item => item.id !== productoId))
  }

  const handleUpdateCantidad = (id: number, nuevaCantidad: number) => {
    const cantidadValidada = Math.max(1, nuevaCantidad);
    setListaSolicitud(listaSolicitud.map(item => 
      item.id === id ? { ...item, cantidad: cantidadValidada } : item
    ));
  };

  // --- FUNCIÓN DE ENVÍO (ACTUALIZADA) ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault() 
    
    if (listaSolicitud.length === 0) {
      alert('Debes añadir al menos un equipo a tu solicitud.')
      return
    }
    if (!isMaestro && !numeroControl.trim()) {
      alert('El Número de Control es obligatorio para alumnos.')
      return
    }
    if (!nombrePersona.trim()) {
      alert('Por favor, llena el nombre del solicitante.')
      return
    }
    
    setEnviando(true)
    
    const solicitud_id = crypto.randomUUID();

    const solicitudes = listaSolicitud.map(producto => {
      return fetch(`${apiUrl}/api/prestamos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: producto.id, 
          nombre_persona: nombrePersona,
          numero_de_control: isMaestro ? null : numeroControl, 
          
          // Si es maestro, envía 1. Si es alumno, envía el valor del input.
          integrantes: isMaestro ? 1 : integrantes, 

          cantidad: producto.cantidad,
          materia: materia,
          grupo: grupo,
          solicitud_uuid: solicitud_id
        }),
      })
    })

    try {
      const responses = await Promise.all(solicitudes)
      const algunaFallo = responses.some(res => !res.ok)
      if (algunaFallo) throw new Error('No se pudieron registrar algunas solicitudes')

      alert(`¡Solicitud registrada con éxito para ${listaSolicitud.length} tipo(s) de equipo!`)
      
      // Limpia el formulario
      setListaSolicitud([])
      setNombrePersona('')
      setNumeroControl('')
      setIntegrantes(1)
      setMateria('')
      setGrupo('')
      setSearchTerm('')
      setIsMaestro(false)

    } catch (error) {
      console.error('Error en el formulario:', error)
      if (error instanceof Error) alert(`Error: ${error.message}`)
      else alert('Ocurrió un error desconocido')
    } finally {
      setEnviando(false)
    }
  }

  // --- RENDERIZADO (JSX ACTUALIZADO) ---
  return (
    <div className="formulario-container">
      <h2>Registrar Nuevo Préstamo</h2>
      
      {loading && <p>Cargando lista de equipos...</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className="formulario-prestamo">
          
          <fieldset>
            <legend>Datos del Solicitante</legend>

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
              <input type="text" id="nombre" value={nombrePersona} onChange={(e) => setNombrePersona(e.target.value)} placeholder="NOMBRE | APELLIDOS" required />
            </div>
            
            {/* Oculto si es maestro */}
            {!isMaestro && (
              <div>
                <label htmlFor="control">Número de Control:</label>
                <input type="text" id="control" value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} placeholder="SE ENCUENTRA EN LA PARTE INFERIOR DE SU CREDENCIAL " required={!isMaestro} />
              </div>
            )}

            <div className="form-row">

              {/* Oculto si es maestro */}
              {!isMaestro && (
                <div className="form-group">
                  <label htmlFor="integrantes">Núm. de Integrantes:</label>
                  <input 
                    type="number" 
                    id="integrantes"
                    value={integrantes}
                    min="1"
                    onChange={(e) => setIntegrantes(parseInt(e.target.value) || 1)}
                    required={!isMaestro} // Solo requerido si no es maestro
                  />
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="materia">Materia (Opcional):</label>
                <input type="text" id="materia" value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ej. Circuitos Eléctricos" />
              </div>
              <div className="form-group">
                <label htmlFor="grupo">Grupo (Opcional):</label>
                <input type="text" id="grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Ej. 5CV1" />
              </div>
            </div>
          </fieldset>
          
          <fieldset>
            <legend>Equipos a Solicitar</legend>
            <label htmlFor="busqueda">Herramienta / Equipo:</label>
            <input type="text" id="busqueda" value={searchTerm} onChange={handleSearch} placeholder="Escribe el nombre de la herramienta o equipo" />
            <div className="search-results">
              {searchResults.map((producto) => (
                <button type="button" key={producto.id} onClick={() => handleAddItem(producto)} className="search-result-item">
                  Añadir: {producto.nombre_equipo}
                </button>
              ))}
            </div>
            <div className="lista-solicitud">
              <h4>Equipos en esta solicitud:</h4>
              {listaSolicitud.length === 0 ? (
                <p>Aún no has añadido equipos.</p>
              ) : (
                <ul className="solicitud-items-list">
                  {listaSolicitud.map((prod) => (
                    <li key={prod.id} className="solicitud-item">
                      <span className="item-name">{prod.nombre_equipo}</span>
                      <div className="item-controls">
                        <label htmlFor={`qty-${prod.id}`}>Cantidad:</label>
                        <input type="number" id={`qty-${prod.id}`} className="item-quantity" value={prod.cantidad} min="1" onChange={(e) => handleUpdateCantidad(prod.id, parseInt(e.target.value) || 1)} />
                        <button type="button" onClick={() => handleRemoveItem(prod.id)} className="remove-btn">
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          <button type="submit" disabled={enviando || loading} className="submit-btn">
            {enviando ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </form>
      )}
    </div>
  )
}

export default RegistrarPrestamo