import { useState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import styles from './RegistrarPrestamo.module.css';

// --- Interfaces ---
interface Producto { id: number; nombre_equipo: string; }
interface SolicitudItem extends Producto { cantidad: string; }
interface PrestamosProps { apiUrl: string; }
type Seccion = 'solicitante' | 'tipo' | 'equipo' | '';
type TipoSolicitud = 'PERSONAL' | 'EQUIPO';

const fuseOptions = { keys: ['nombre_equipo'], threshold: 0.4, includeScore: true };

function RegistrarPrestamo({ apiUrl }: PrestamosProps) {
  // --- Estados ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos]);

  // --- Estados de Solicitante y Tipo ---
  const [nombrePersona, setNombrePersona] = useState('');
  const [numeroControl, setNumeroControl] = useState('');
  const [tipo, setTipo] = useState<TipoSolicitud>('PERSONAL');
  const [integrantes, setIntegrantes] = useState('1');
  const [materia, setMateria] = useState('');
  const [grupo, setGrupo] = useState('');
  const [nombreProfesor, setNombreProfesor] = useState('');
  const [seccionAbierta, setSeccionAbierta] = useState<Seccion>('solicitante');
  
  const [isProfesorRequest, setIsProfesorRequest] = useState(true);
  
  // --- Estados de Listas de Items ---
  const [listaSolicitud, setListaSolicitud] = useState<SolicitudItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);

  const [enviando, setEnviando] = useState(false);

  // Carga los productos (sin cambios)
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/api/inventario?public=true`);
        const data = await response.json();
        setTodosLosProductos(data);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
      setLoading(false);
    }
    fetchProductos();
  }, [apiUrl]);

  // --- Funciones de Manejo (Equipos) ---
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (newSearchTerm.trim() === '') {
      setSearchResults([]); return;
    }
    const results = fuse.search(newSearchTerm).map(result => result.item);
    setSearchResults(results.slice(0, 5));
  };
  const handleAddItem = (producto: Producto) => {
    if (!listaSolicitud.find(item => item.id === producto.id)) {
      setListaSolicitud([...listaSolicitud, { ...producto, cantidad: '1' }]);
    }
    setSearchTerm(''); setSearchResults([]);
  };
  const handleRemoveItem = (productoId: number) => {
    setListaSolicitud(listaSolicitud.filter(item => item.id !== productoId));
  };
  const handleUpdateCantidad = (id: number, nuevaCantidad: string) => {
    if (/^\d*$/.test(nuevaCantidad)) {
        setListaSolicitud(prev => prev.map(item => 
          item.id === id ? { ...item, cantidad: nuevaCantidad } : item
        ));
    }
  };

  // --- FUNCIÓN DE ENVÍO (sin cambios) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const todosLosItems = [...listaSolicitud];
    if (todosLosItems.length === 0) { toast.error('Debes añadir al menos un equipo.'); return; }
    
    if (isProfesorRequest) {
      if (!nombrePersona) { toast.error('Completa el Nombre del Profesor.'); return; }
    } else {
      if (!nombrePersona || !numeroControl) { toast.error('Completa Nombre y N° de Control.'); return; }
      if (tipo === 'EQUIPO' && (!integrantes || parseInt(integrantes) <= 0 || !nombreProfesor)) {
        toast.error('Para solicitudes de EQUIPO, el N° de Integrantes y el Nombre del Profesor son obligatorios.');
        return;
      }
    }
    
    const itemsSinCantidad = todosLosItems.filter(item => !item.cantidad || parseInt(item.cantidad) <= 0);
    if (itemsSinCantidad.length > 0) {
        toast.error(`Introduce una cantidad válida (mayor a 0) para: ${itemsSinCantidad[0].nombre_equipo}`);
        return;
    }
    
    setEnviando(true);
    const loadingToast = toast.loading("Registrando préstamo...");
    const solicitud_id = crypto.randomUUID();

    const solicitudes = todosLosItems.map(producto => {
      const cantidadNum = parseInt(producto.cantidad) || 0;
      return fetch(`${apiUrl}/api/prestamos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: producto.id, 
          nombre_persona: nombrePersona,
          numero_de_control: isProfesorRequest ? null : numeroControl, 
          integrantes: (isProfesorRequest || tipo === 'PERSONAL') ? 1 : parseInt(integrantes) || 1, 
          cantidad: cantidadNum,
          materia: (isProfesorRequest || tipo === 'PERSONAL') ? null : materia,
          grupo: (isProfesorRequest || tipo === 'PERSONAL') ? null : grupo,
          nombre_profesor: (isProfesorRequest || tipo === 'PERSONAL') ? null : nombreProfesor,
          solicitud_uuid: solicitud_id
        }),
      });
    });

    try {
      const responses = await Promise.all(solicitudes);
      const algunaFallo = responses.some(res => !res.ok);
      if (algunaFallo) throw new Error('No se pudieron registrar algunas solicitudes');

      toast.success(`¡Solicitud registrada con éxito!`, { id: loadingToast });
      
      setListaSolicitud([]);
      setNombrePersona(''); setNumeroControl(''); 
      setIntegrantes('1'); setMateria(''); setGrupo(''); setNombreProfesor('');
      setSearchTerm(''); 
      setTipo('PERSONAL');
      setIsProfesorRequest(true);
      setSeccionAbierta('solicitante');

    } catch (error) {
      console.error('Error en el formulario:', error);
      toast.error(error instanceof Error ? error.message : 'Error desconocido', { id: loadingToast });
    } finally {
      setEnviando(false);
    }
  };

  // --- RENDERIZADO (JSX) ---
  return (
    <div className={styles.appContainer}>
      <header>
        <h1>Registrar Nuevo Préstamo</h1>
        <input 
          type="checkbox" 
          className={styles.profesorCheck}
          title="ACTIVAR SOLO SI UN PROFESOR HACE UNA PETICIÓN DE MATERIAL"
          checked={isProfesorRequest} 
          onChange={(e) => setIsProfesorRequest(e.target.checked)} 
        />
      </header>
      
      {loading && <p>Cargando lista de equipos...</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className={`${styles.formularioPrestamo} ${styles.accordion}`}>
          
          {/* --- SECCIÓN 1: SOLICITANTE --- */}
          <div className={styles.accordionItem}>
            <h3 className={styles.accordionHeader} onClick={() => setSeccionAbierta('solicitante')}>
              1. Datos del Solicitante {isProfesorRequest ? '(Profesor)' : '(Alumno)'}
              <span>{seccionAbierta === 'solicitante' ? '▲' : '▼'}</span>
            </h3>
            {seccionAbierta === 'solicitante' && (
              <div className={styles.accordionContent}>
                <fieldset>
                  <div>
                    <label htmlFor="nombre">Nombre Completo:</label>
                    <input type="text" id="nombre" value={nombrePersona} onChange={(e) => setNombrePersona(e.target.value)} placeholder={isProfesorRequest ? "Nombre completo del profesor" : "Nombre completo del alumno"} required />
                  </div>
                  
                  {!isProfesorRequest && (
                    <div>
                      <label htmlFor="control">Número de Control:</label>
                      <input type="text" id="control" inputMode="numeric" value={numeroControl} onChange={(e) => {if (/^\d*$/.test(e.target.value)) {setNumeroControl(e.target.value);}}} placeholder="N° de control del alumno" required={!isProfesorRequest} />
                    </div>
                  )}

                  <button 
                    type="button" 
                    className={styles.nextBtn} 
                    onClick={() => setSeccionAbierta(isProfesorRequest ? 'equipo' : 'tipo')}
                  >
                    Siguiente ▼
                  </button>
                </fieldset>
              </div>
            )}
          </div>

          {/* --- SECCIÓN 2: TIPO DE SOLICITUD (Condicional) --- */}
          <div className={`${styles.accordionItem} ${isProfesorRequest ? styles.disabled : ''}`}>
            <h3 
              className={styles.accordionHeader} 
              onClick={() => !isProfesorRequest && setSeccionAbierta('tipo')}
            >
              2. Tipo de Solicitud (Alumno)
              <span>{seccionAbierta === 'tipo' ? '▲' : '▼'}</span>
            </h3>
            {seccionAbierta === 'tipo' && !isProfesorRequest && (
              <div className={styles.accordionContent}>
                <fieldset>
                  <div className={styles.tipoSolicitudSelector}>
                    <label className={tipo === 'PERSONAL' ? styles.active : ''}>
                      <input type="radio" name="tipo" value="PERSONAL" checked={tipo === 'PERSONAL'} onChange={(e) => setTipo(e.target.value as TipoSolicitud)} />
                      👤 PERSONAL
                    </label>
                    <label className={tipo === 'EQUIPO' ? styles.active : ''}>
                      <input type="radio" name="tipo" value="EQUIPO" checked={tipo === 'EQUIPO'} onChange={(e) => setTipo(e.target.value as TipoSolicitud)} />
                      👥 EQUIPO (Clase / Práctica)
                    </label>
                  </div>
                  
                  <div className={`${styles.camposEquipo} ${tipo === 'EQUIPO' ? styles.visible : ''}`}>
                    <div className={styles.formGroup} style={{marginBottom: '15px'}}>
                      <label htmlFor="nombreProfesor">Nombre del Profesor:</label>
                      <input type="text" id="nombreProfesor" value={nombreProfesor} onChange={(e) => setNombreProfesor(e.target.value)} placeholder="Nombre del Profesor a cargo" disabled={tipo === 'PERSONAL'} />
                    </div>
                    
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="integrantes">Núm. de Integrantes:</label>
                        <input type="number" id="integrantes" value={integrantes} min="1" onChange={(e) => setIntegrantes(e.target.value)} required={tipo === 'EQUIPO'} disabled={tipo === 'PERSONAL'} />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="materia">Materia :</label>
                        <input type="text" id="materia" value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ej. Circuitos Eléctricos" disabled={tipo === 'PERSONAL'} />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="grupo">Grupo :</label>
                        <input type="text" id="grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Ej. 0A" disabled={tipo === 'PERSONAL'} />
                      </div>
                    </div>
                  </div>
                  
                  <button type="button" className={styles.nextBtn} onClick={() => setSeccionAbierta('equipo')}>
                    Siguiente ▼
                  </button>
                </fieldset>
              </div>
            )}
          </div>
          
          {/* --- SECCIÓN 3: EQUIPOS --- */}
          <div className={styles.accordionItem}>
            <h3 className={styles.accordionHeader} onClick={() => setSeccionAbierta('equipo')}>
              3. Equipos y Materiales a Solicitar
              <span>{seccionAbierta === 'equipo' ? '▲' : '▼'}</span>
            </h3>
            {seccionAbierta === 'equipo' && (
              <div className={styles.accordionContent}>
                <fieldset>
                  <label htmlFor="busqueda-equipo">Herramienta / Equipo / Material:</label>
                  <input type="text" id="busqueda-equipo" value={searchTerm} onChange={handleSearch} placeholder="Escribe el nombre del item" />
                  
                  <div className={styles.searchResults}>
                    {searchResults.map((producto) => (
                      <button type="button" key={producto.id} onClick={() => handleAddItem(producto)} className={styles.searchResultItem}>
                        Añadir: {producto.nombre_equipo}
                      </button>
                    ))}
                  </div>
                  
                  <div className={styles.listaSolicitud}>
                    <h4>Items en esta solicitud:</h4>
                    {listaSolicitud.length === 0 ? ( <p>Aún no has añadido items.</p> ) : (
                      <ul className={styles.solicitudItemsList}>
                        {listaSolicitud.map((prod) => (
                          <li key={prod.id} className={styles.solicitudItem}>
                            <span className={styles.itemName}>{prod.nombre_equipo}</span>
                            <div className={styles.itemControls}>
                              <label htmlFor={`qty-eq-${prod.id}`}>Cantidad:</label>
                              <input type="text" pattern="[0-9]*" inputMode="numeric" id={`qty-eq-${prod.id}`} className={styles.itemQuantity} value={prod.cantidad} placeholder="Cant." onChange={(e) => handleUpdateCantidad(prod.id, e.target.value)} required />
                              <button type="button" onClick={() => handleRemoveItem(prod.id)} className={styles.removeBtn}> Quitar </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </fieldset>
                
                {/* --- CAMBIO AQUÍ: Botón de envío movido adentro --- */}
                <button type="submit" disabled={enviando || loading} className={styles.submitBtn}>
                  {enviando ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            )}
          </div>

          {/* --- Botón de envío final ELIMINADO de aquí --- */}
        </form>
      )}
    </div>
  )
}

export default RegistrarPrestamo