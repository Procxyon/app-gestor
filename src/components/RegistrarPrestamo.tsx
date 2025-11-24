import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import styles from './RegistrarPrestamo.module.css';

// --- Interfaces ---
interface Producto { id: number; nombre_equipo: string; }
interface SolicitudItem extends Producto { cantidad: string; }

// Interface para items que YA existen en la BD
interface ItemExistente {
  id: number;
  nombre_equipo: string;
  cantidad: number;
  fecha_devolucion: string | null;
}

interface RegistrarPrestamoProps { 
  apiUrl: string;
  solicitudUuid?: string | null;
  onPrestamoSaved?: () => void;
}

type Seccion = 'solicitante' | 'tipo' | 'equipo' | '';
type TipoSolicitud = 'PERSONAL' | 'EQUIPO';

const fuseOptions = { keys: ['nombre_equipo'], threshold: 0.4, includeScore: true };

function RegistrarPrestamo({ apiUrl, solicitudUuid, onPrestamoSaved }: RegistrarPrestamoProps) {
  // --- Estados Generales ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos]);

  // --- Estados del Formulario ---
  const [nombrePersona, setNombrePersona] = useState('');
  const [numeroControl, setNumeroControl] = useState('');
  const [tipo, setTipo] = useState<TipoSolicitud>('PERSONAL');
  const [integrantes, setIntegrantes] = useState('1');
  const [materia, setMateria] = useState('');
  const [grupo, setGrupo] = useState('');
  const [nombreProfesor, setNombreProfesor] = useState('');
  
  const [seccionAbierta, setSeccionAbierta] = useState<Seccion>('solicitante');
  const [isProfesorRequest, setIsProfesorRequest] = useState(false);
  
  // --- Estados de Listas ---
  const [listaSolicitud, setListaSolicitud] = useState<SolicitudItem[]>([]);
  const [existingItems, setExistingItems] = useState<ItemExistente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [enviando, setEnviando] = useState(false);
  
  const isEditing = !!solicitudUuid;

  // --- NUEVO ESTADO: BLOQUEO DE EDICIÓN ---
  // Si es edición, inicia bloqueado (true). Si es nuevo, inicia desbloqueado (false).
  const [editModeLocked, setEditModeLocked] = useState(false);

  // 1. Carga de Inventario
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/api/inventario?public=true`);
        const data = await response.json();
        setTodosLosProductos(data);
      } catch (error) {
        console.error(error);
        toast.error('Error conexión inventario');
      }
      setLoading(false);
    }
    fetchProductos();
  }, [apiUrl]);

  // 2. Carga de Datos en Modo Edición
  const cargarDatosEdicion = () => {
    if (!solicitudUuid) return;
    setLoading(true);
    setEditModeLocked(true); // Al cargar edición, bloqueamos por defecto
    setSeccionAbierta('equipo'); // Abrimos directamente la sección de añadir items

    fetch(`${apiUrl}/api/prestamos`)
      .then(res => res.json())
      .then((data: any[]) => {
          const itemsSolicitud = data.filter(p => p.solicitud_uuid === solicitudUuid);
          
          if (itemsSolicitud.length > 0) {
            const header = itemsSolicitud[0];
            setNombrePersona(header.nombre_persona || '');
            setNumeroControl(header.id_persona && header.id_persona !== 'Profesor' ? header.id_persona : '');
            
            if (header.id_persona === 'Profesor' || !header.id_persona) {
                setIsProfesorRequest(true);
                setTipo('PERSONAL');
            } else {
                setIsProfesorRequest(false);
                if (parseInt(header.integrantes) > 1 || header.materia) {
                    setTipo('EQUIPO');
                    setIntegrantes(String(header.integrantes));
                    setMateria(header.materia || '');
                    setGrupo(header.grupo || '');
                    setNombreProfesor(header.nombre_profesor || '');
                } else {
                    setTipo('PERSONAL');
                }
            }

            const itemsFormateados: ItemExistente[] = itemsSolicitud.map(p => ({
              id: p.id,
              nombre_equipo: p.nombre_equipo,
              cantidad: p.cantidad,
              fecha_devolucion: p.fecha_devolucion
            }));
            setExistingItems(itemsFormateados);
          } else {
            toast.error("Solicitud no encontrada.");
            if(onPrestamoSaved) onPrestamoSaved();
          }
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isEditing && solicitudUuid) {
      cargarDatosEdicion();
    } else {
      setEditModeLocked(false); // Si es nuevo registro, desbloqueado
    }
  }, [isEditing, solicitudUuid, apiUrl]);


  // --- Funciones de Manejo ---
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (newSearchTerm.trim() === '') { setSearchResults([]); return; }
    const results = fuse.search(newSearchTerm).map(result => result.item);
    setSearchResults(results.slice(0, 5));
  };

  const handleAddItem = (producto: Producto) => {
    setListaSolicitud([...listaSolicitud, { ...producto, cantidad: '1' }]);
    setSearchTerm(''); setSearchResults([]);
  };

  const handleRemoveItem = (index: number) => {
    setListaSolicitud(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCantidad = (index: number, nuevaCantidad: string) => {
    if (/^\d*$/.test(nuevaCantidad)) {
        setListaSolicitud(prev => prev.map((item, i) => i === index ? { ...item, cantidad: nuevaCantidad } : item));
    }
  };

  const handleDevolverItem = async (id: number) => {
    if (!window.confirm("¿Marcar este item como devuelto?")) return;
    const toastId = toast.loading("Procesando...");
    try {
      const res = await fetch(`${apiUrl}/api/prestamos/${id}/devolver`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.err || 'Error');
      toast.success("Item devuelto", { id: toastId });
      cargarDatosEdicion(); 
    } catch (error) {
      toast.error("Error al devolver", { id: toastId });
    }
  };

  // --- ENVÍO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones solo si NO está bloqueada la edición de datos
    if (!editModeLocked) {
        if (isProfesorRequest) {
            if (!nombrePersona) { toast.error('Falta Nombre del Profesor.'); return; }
        } else {
            if (!nombrePersona || !numeroControl) { toast.error('Falta Nombre o N° Control.'); return; }
        }
    }
    
    if (!isEditing && listaSolicitud.length === 0) { 
        toast.error('Añade al menos un equipo.'); return; 
    }
    
    setEnviando(true);
    const loadingToast = toast.loading(isEditing ? "Guardando..." : "Registrando...");
    const uuidFinal = isEditing ? solicitudUuid : crypto.randomUUID();

    try {
      // 1. Actualizar cabeceras (Solo si se desbloqueó la edición o es nuevo)
      if (!editModeLocked || !isEditing) {
         if(isEditing && uuidFinal) {
             await fetch(`${apiUrl}/api/solicitud/${uuidFinal}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   nombre_persona: nombrePersona,
                   id_persona: isProfesorRequest ? 'Profesor' : numeroControl,
                   integrantes: (isProfesorRequest || tipo === 'PERSONAL') ? 1 : parseInt(integrantes) || 1,
                   materia: (isProfesorRequest || tipo === 'PERSONAL') ? null : materia,
                   grupo: (isProfesorRequest || tipo === 'PERSONAL') ? null : grupo
                })
             });
         }
      }

      // 2. Insertar NUEVOS items
      if (listaSolicitud.length > 0) {
          const solicitudes = listaSolicitud.map(producto => {
            return fetch(`${apiUrl}/api/prestamos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                producto_id: producto.id, 
                nombre_persona: nombrePersona,
                numero_de_control: isProfesorRequest ? null : numeroControl, 
                integrantes: 1, cantidad: parseInt(producto.cantidad) || 0,
                materia: null, grupo: null, nombre_profesor: null, // Se heredan o no aplican en items extra
                solicitud_uuid: uuidFinal
                }),
            });
          });
          await Promise.all(solicitudes);
      }

      toast.success("¡Guardado con éxito!", { id: loadingToast });
      
      if (isEditing && onPrestamoSaved) {
          setTimeout(onPrestamoSaved, 800); 
      } else {
          setListaSolicitud([]); setNombrePersona(''); setNumeroControl(''); 
          setSearchTerm(''); setTipo('PERSONAL'); setSeccionAbierta('solicitante');
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al guardar", { id: loadingToast });
    } finally {
      setEnviando(false);
    }
  };

  // --- RENDER ---
  return (
    <div className={styles.appContainer}>
      <header>
        <h1>{isEditing ? 'Modificar Préstamo' : 'Registrar Nuevo Préstamo'}</h1>
        
        {/* --- SWITCH INTELIGENTE --- */}
        <div className={styles.toggleContainer}>
            <span className={styles.toggleLabel}>
                {isEditing ? (editModeLocked ? 'Habilitar Edición' : 'Edición Habilitada') : '¿Es Profesor?'}
            </span>
            <label className={styles.switch}>
                <input 
                    type="checkbox"
                    // Si es edición, el check controla el BLOQUEO (invertido: checked = unlocked)
                    // Si es nuevo, controla ES PROFESOR
                    checked={isEditing ? !editModeLocked : isProfesorRequest} 
                    onChange={(e) => {
                        if (isEditing) {
                            setEditModeLocked(!e.target.checked); // Invertimos lógica: check = unlock
                            if(e.target.checked) toast('Edición de datos habilitada', {icon:'🔓'});
                        } else {
                            setIsProfesorRequest(e.target.checked);
                            if(e.target.checked) { setTipo('PERSONAL'); setNumeroControl(''); }
                        }
                    }} 
                />
                <span className={styles.slider}></span>
            </label>
        </div>
      </header>
      
      {loading && <p style={{textAlign:'center'}}>Cargando...</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className={styles.formularioPrestamo}>
            
            {/* --- BLOQUE DE INFO USUARIO (SOLO EDICIÓN) --- */}
            {isEditing && (
                <div className={styles.userInfoBlock}>
                    <h2>{nombrePersona}</h2>
                    <p>Folio: {solicitudUuid}</p>
                    
                    {existingItems.length > 0 && (
                        <div className={styles.existingItemsSection}>
                            <h3 style={{borderBottom:'none', paddingBottom:0, marginBottom:'10px'}}>Material Solicitado:</h3>
                            <ul className={styles.existingItemsList}>
                                {existingItems.map(item => (
                                    <li key={item.id} className={styles.existingItem}>
                                        <span>{item.nombre_equipo} (x{item.cantidad})</span>
                                        <button 
                                            type="button"
                                            className={styles.devolverItemBtn}
                                            disabled={!!item.fecha_devolucion}
                                            onClick={() => handleDevolverItem(item.id)}
                                        >
                                            {item.fecha_devolucion ? 'Devuelto' : 'Entregar'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* --- SECCIÓN 1: DATOS (Bloqueable) --- */}
            <div className={`${styles.accordionItem} ${editModeLocked && isEditing ? styles.locked : ''}`}>
                <div className={styles.accordionHeader} onClick={() => !editModeLocked && setSeccionAbierta('solicitante')}>
                    <span>1. Datos del Solicitante</span>
                    <span>{seccionAbierta === 'solicitante' ? '▲' : '▼'}</span>
                </div>
                
                {seccionAbierta === 'solicitante' && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        <div className={styles.formGroup}>
                            <label>Nombre Completo:</label>
                            <input type="text" value={nombrePersona} onChange={(e) => setNombrePersona(e.target.value)} required disabled={editModeLocked && isEditing} />
                        </div>
                        
                        {!isProfesorRequest && (
                            <div className={styles.formGroup}>
                                <label>Número de Control:</label>
                                <input type="text" inputMode="numeric" value={numeroControl} onChange={(e) => {if (/^\d*$/.test(e.target.value)) setNumeroControl(e.target.value)}} disabled={editModeLocked && isEditing} />
                            </div>
                        )}
                        {!isEditing && (
                            <button type="button" className={styles.nextBtn} onClick={() => setSeccionAbierta(isProfesorRequest ? 'equipo' : 'tipo')}>Siguiente ▼</button>
                        )}
                    </fieldset>
                </div>
                )}
            </div>

            {/* --- SECCIÓN 2: DETALLES (Bloqueable) --- */}
            <div className={`${styles.accordionItem} ${(isProfesorRequest || (editModeLocked && isEditing)) ? styles.disabled : ''} ${editModeLocked && isEditing ? styles.locked : ''}`}>
                <div className={styles.accordionHeader} onClick={() => !isProfesorRequest && !editModeLocked && setSeccionAbierta('tipo')}>
                    <span>2. Detalles Académicos</span>
                    <span>{seccionAbierta === 'tipo' ? '▲' : '▼'}</span>
                </div>

                {seccionAbierta === 'tipo' && !isProfesorRequest && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        <div className={styles.tipoSolicitudSelector}>
                            <label className={tipo === 'PERSONAL' ? styles.active : ''}>
                                <input type="radio" name="tipo" value="PERSONAL" checked={tipo === 'PERSONAL'} onChange={() => setTipo('PERSONAL')} disabled={editModeLocked && isEditing} />
                                👤 Personal
                            </label>
                            <label className={tipo === 'EQUIPO' ? styles.active : ''}>
                                <input type="radio" name="tipo" value="EQUIPO" checked={tipo === 'EQUIPO'} onChange={() => setTipo('EQUIPO')} disabled={editModeLocked && isEditing} />
                                👥 Equipo
                            </label>
                        </div>
                        
                        <div className={`${styles.camposEquipo} ${tipo === 'EQUIPO' ? styles.visible : ''}`}>
                            <div className={styles.formGroup}>
                                <label>Profesor:</label>
                                <input type="text" value={nombreProfesor} onChange={(e) => setNombreProfesor(e.target.value)} disabled={editModeLocked && isEditing} />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Integrantes:</label>
                                    <input type="number" value={integrantes} min="1" onChange={(e) => setIntegrantes(e.target.value)} disabled={editModeLocked && isEditing} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Materia:</label>
                                    <input type="text" value={materia} onChange={(e) => setMateria(e.target.value)} disabled={editModeLocked && isEditing} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Grupo:</label>
                                    <input type="text" value={grupo} onChange={(e) => setGrupo(e.target.value)} disabled={editModeLocked && isEditing} />
                                </div>
                            </div>
                        </div>
                        {!isEditing && (
                            <button type="button" className={styles.nextBtn} onClick={() => setSeccionAbierta('equipo')}>Siguiente ▼</button>
                        )}
                    </fieldset>
                </div>
                )}
            </div>
            
            {/* --- SECCIÓN 3: AÑADIR ITEMS (Siempre Habilitada) --- */}
            <div className={styles.accordionItem}>
                <div className={styles.accordionHeader} onClick={() => setSeccionAbierta('equipo')}>
                    <span>3. {isEditing ? 'Añadir MÁS Items (Opcional)' : 'Seleccionar Items'}</span>
                    <span>{seccionAbierta === 'equipo' ? '▲' : '▼'}</span>
                </div>

                {seccionAbierta === 'equipo' && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        <div className={styles.formGroup}>
                            <label>Buscar Item:</label>
                            <input type="text" value={searchTerm} onChange={handleSearch} placeholder="Escribe para buscar..." />
                            
                            <div className={styles.searchResults}>
                                {searchResults.map((producto) => (
                                <button type="button" key={producto.id} onClick={() => handleAddItem(producto)} className={styles.searchResultItem}>
                                    + {producto.nombre_equipo}
                                </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className={styles.listaSolicitud}>
                            <h4>{isEditing ? 'Nuevos a agregar:' : 'Carrito de Solicitud:'}</h4>
                            {listaSolicitud.length === 0 && <p style={{fontSize:'0.9em', color:'#888'}}>Ningún item nuevo seleccionado.</p>}
                            
                            <ul className={styles.solicitudItemsList}>
                                {listaSolicitud.map((prod, index) => (
                                <li key={index} className={styles.solicitudItem}>
                                    <span className={styles.itemName}>{prod.nombre_equipo}</span>
                                    <div className={styles.itemControls}>
                                        <input type="text" className={styles.itemQuantity} value={prod.cantidad} onChange={(e) => handleUpdateCantidad(index, e.target.value)} />
                                        <button type="button" onClick={() => handleRemoveItem(index)} className={styles.removeBtn}>X</button>
                                    </div>
                                </li>
                                ))}
                            </ul>
                        </div>
                    </fieldset>
                    
                    <div style={{marginTop: '30px', display: 'flex', gap: '15px'}}>
                        {isEditing && (
                            <button type="button" onClick={onPrestamoSaved} className={styles.removeBtn} style={{background:'#555', width:'auto', padding: '12px 20px', fontSize:'1em'}}>
                                Volver
                            </button>
                        )}
                        <button type="submit" disabled={enviando || loading} className={styles.submitBtn} style={{marginTop:0}}>
                        {enviando ? 'Procesando...' : (isEditing ? 'Guardar y Salir' : 'Finalizar Solicitud')}
                        </button>
                    </div>
                </div>
                )}
            </div>

        </form>
      )}
    </div>
  )
}

export default RegistrarPrestamo;