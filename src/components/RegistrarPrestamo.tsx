import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import styles from './RegistrarPrestamo.module.css';

// --- Interfaces ---
interface Producto { id: number; nombre_equipo: string; }
interface ItemExistente { id: number; nombre_equipo: string; cantidad: number; fecha_devolucion: string | null; }

// Interfaz para items en el "Carrito" (Entrada Libre)
interface SolicitudItem { 
  tempId: string;        // ID temporal para manejo en lista
  nombre_ui: string;     // Lo que escribió el usuario
  cantidad: string;
  producto_real?: Producto | null; // El objeto del inventario (si se encontró)
}

interface RegistrarPrestamoProps { 
  apiUrl: string;
  solicitudUuid?: string | null;
  onPrestamoSaved?: () => void;
}

type Seccion = 'solicitante' | 'tipo' | 'equipo' | '';
type TipoSolicitud = 'PERSONAL' | 'EQUIPO';

const fuseOptions = { keys: ['nombre_equipo'], threshold: 0.3, includeScore: true };

function RegistrarPrestamo({ apiUrl, solicitudUuid, onPrestamoSaved }: RegistrarPrestamoProps) {
  // --- Estados Generales ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  // Fuse para búsquedas internas
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
  const [editModeLocked, setEditModeLocked] = useState(false);

  // --- Estados de Listas ---
  const [existingItems, setExistingItems] = useState<ItemExistente[]>([]);
  const [listaSolicitud, setListaSolicitud] = useState<SolicitudItem[]>([]);
  
  // Inputs de Agregar (Texto Libre)
  const [textoMaterial, setTextoMaterial] = useState('');
  const [cantidadInput, setCantidadInput] = useState('1');
  
  // Estado para el Modal de Ligado
  const [itemToLinkIndex, setItemToLinkIndex] = useState<number | null>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkResults, setLinkResults] = useState<Producto[]>([]);

  const [enviando, setEnviando] = useState(false);
  const isEditing = !!solicitudUuid;

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
    setEditModeLocked(true); 
    setSeccionAbierta('equipo'); 

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
              nombre_equipo: p.nombre_equipo, // Aquí el backend ya debe resolver el nombre con COALESCE
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


  // --- Funciones de Manejo (Entrada Libre + Validación) ---
  
  // Buscar coincidencia exacta
  const findExactMatch = (text: string): Producto | null => {
    if (!text) return null;
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const target = normalize(text);
    return todosLosProductos.find(p => normalize(p.nombre_equipo) === target) || null;
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!textoMaterial.trim()) return;

    const coincidencia = findExactMatch(textoMaterial);

    const newItem: SolicitudItem = {
      tempId: crypto.randomUUID(),
      nombre_ui: textoMaterial,
      cantidad: cantidadInput === '' ? '1' : cantidadInput,
      producto_real: coincidencia // null si no encontró
    };

    setListaSolicitud([...listaSolicitud, newItem]);
    setTextoMaterial('');
    setCantidadInput('1');
  };

  const handleRemoveItem = (tempId: string) => {
    setListaSolicitud(prev => prev.filter(i => i.tempId !== tempId));
  };

  // --- Lógica de Ligado (Modal) ---
  const openLinkModal = (index: number, textoActual: string) => {
    setItemToLinkIndex(index);
    setLinkSearchTerm(textoActual);
    const results = fuse.search(textoActual).map(r => r.item);
    setLinkResults(results.slice(0, 5));
  };

  const handleLinkSearch = (val: string) => {
    setLinkSearchTerm(val);
    if (!val.trim()) { setLinkResults([]); return; }
    const results = fuse.search(val).map(r => r.item);
    setLinkResults(results.slice(0, 5));
  };

  const confirmLink = (producto: Producto) => {
    if (itemToLinkIndex !== null) {
      setListaSolicitud(prev => prev.map((item, i) => 
        i === itemToLinkIndex 
          ? { ...item, nombre_ui: producto.nombre_equipo, producto_real: producto }
          : item
      ));
      setItemToLinkIndex(null);
      toast.success("Material ligado correctamente");
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

  // --- ENVÍO (LÓGICA PERMISIVA - UPDATED) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validaciones de Datos Personales
    if (!editModeLocked) {
        if (isProfesorRequest) {
            if (!nombrePersona) { toast.error('Falta Nombre del Profesor.'); return; }
        } else {
            if (!nombrePersona || !numeroControl) { toast.error('Falta Nombre o N° Control.'); return; }
        }
    }
    
    // 2. Validación de Lista
    if (!isEditing && listaSolicitud.length === 0) { 
        toast.error('La lista está vacía. Añade material.'); return; 
    }

    // AVISO VISUAL: Si hay items no ligados, solo avisamos (no bloqueamos)
    const unlinkedCount = listaSolicitud.filter(i => !i.producto_real).length;
    if (unlinkedCount > 0) {
      toast(`${unlinkedCount} items externos (sin inventario) se guardarán manualmente.`, { 
        icon: 'ℹ️',
        duration: 4000 
      });
    }
    
    setEnviando(true);
    const loadingToast = toast.loading(isEditing ? "Guardando cambios..." : "Generando folio...");
    const uuidFinal = isEditing ? solicitudUuid : crypto.randomUUID();

    try {
      // A. Actualizar Cabeceras
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

      // B. Insertar Items (TODOS, vinculados y no vinculados)
      if (listaSolicitud.length > 0) {
          const solicitudes = listaSolicitud.map(item => {
            // LÓGICA CLAVE: Si tiene producto_real, mandamos ID. Si no, mandamos nombre_extra.
            const esVinculado = !!item.producto_real?.id;
            
            return fetch(`${apiUrl}/api/prestamos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto_id: esVinculado ? item.producto_real!.id : null, 
                    nombre_extra: esVinculado ? null : item.nombre_ui, // <-- Se envía el texto libre si no hay ID
                    
                    nombre_persona: nombrePersona,
                    numero_de_control: isProfesorRequest ? null : numeroControl, 
                    integrantes: 1, 
                    cantidad: parseInt(item.cantidad) || 1,
                    materia: null, grupo: null, nombre_profesor: null,
                    solicitud_uuid: uuidFinal
                }),
            });
          });
          
          const responses = await Promise.all(solicitudes);
          if (responses.some(res => !res.ok)) throw new Error('Error al registrar algunos items');
      }

      // C. Éxito
      toast.success(isEditing ? "Solicitud actualizada" : "¡Préstamo registrado!", { id: loadingToast });
      
      if (isEditing && onPrestamoSaved) {
          setTimeout(onPrestamoSaved, 800); 
      } else {
          setListaSolicitud([]); setNombrePersona(''); setNumeroControl(''); 
          setLinkSearchTerm(''); setTipo('PERSONAL'); setSeccionAbierta('solicitante');
          setTextoMaterial(''); setCantidadInput('1');
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
        <h1>{isEditing ? 'Gestionar Préstamo' : 'Registrar Nuevo Préstamo'}</h1>
        
        <div className={styles.profesorToggleGroup}>
            <label className={styles.switch}>
                <input 
                    type="checkbox"
                    checked={isEditing ? !editModeLocked : isProfesorRequest} 
                    onChange={(e) => {
                        if (isEditing) {
                            setEditModeLocked(!e.target.checked); 
                            if(e.target.checked) toast('Edición habilitada', {icon:'🔓'});
                        } else {
                            setIsProfesorRequest(e.target.checked);
                            if(e.target.checked) { setTipo('PERSONAL'); setNumeroControl(''); }
                        }
                    }} 
                />
                <span className={styles.slider}></span>
            </label>
            {isEditing ? ( <span className={styles.profesorBadge} style={{color: !editModeLocked ? '#00aaff' : '#666'}}>{!editModeLocked ? 'Edición Habilitada' : 'Lectura'}</span> ) 
                       : ( isProfesorRequest && <span className={styles.profesorBadge}>Préstamo a Profesor</span> )}
        </div>
      </header>
      
      {loading && <p style={{textAlign:'center'}}>Cargando...</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className={styles.formularioPrestamo}>
            
            {/* --- ZONA DE ITEMS EXISTENTES (SOLO EDICIÓN) --- */}
            {isEditing && (
                <div className={styles.userInfoBlock}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h2>{nombrePersona}</h2>
                        <span style={{color:'#aaa', fontSize:'0.8em'}}>Folio: {solicitudUuid?.substring(0,8)}...</span>
                    </div>
                    
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
                                <label>Profesor a Cargo:</label>
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
            
            {/* --- SECCIÓN 3: AÑADIR ITEMS (ENTRADA LIBRE + LIGADO) --- */}
            <div className={styles.accordionItem}>
                <div className={styles.accordionHeader} onClick={() => setSeccionAbierta('equipo')}>
                    <span>3. {isEditing ? 'Añadir MÁS Items' : 'Seleccionar Items'}</span>
                    <span>{seccionAbierta === 'equipo' ? '▲' : '▼'}</span>
                </div>

                {seccionAbierta === 'equipo' && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        <label>Agregar Material:</label>
                        <div className={styles.addItemRow}>
                            <input 
                                type="text" 
                                className={styles.inputMaterial}
                                value={textoMaterial}
                                onChange={(e) => setTextoMaterial(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                                placeholder="Ej. Caimanes, Arduino..." 
                            />
                            <input 
                                type="number" 
                                className={styles.inputCantidad}
                                value={cantidadInput}
                                onChange={(e) => setCantidadInput(e.target.value)}
                                onBlur={() => { if(!cantidadInput) setCantidadInput('1'); }}
                                placeholder="1"
                                min="1"
                            />
                            <button type="button" onClick={() => handleAddItem()} className={styles.btnAdd}>+</button>
                        </div>
                        
                        <div className={styles.listaSolicitud}>
                            <h4>{isEditing ? 'Nuevos a agregar:' : 'Carrito de Solicitud:'}</h4>
                            {listaSolicitud.length === 0 && <p style={{fontSize:'0.9em', color:'#888'}}>Lista vacía.</p>}
                            
                            <ul className={styles.solicitudItemsList}>
                                {listaSolicitud.map((item, index) => (
                                <li key={item.tempId} className={styles.solicitudItem}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <div className={styles.itemStatus}>
                                            {item.producto_real ? (
                                                <span className={styles.statusOk} title="OK: Encontrado en inventario">✅</span>
                                            ) : (
                                                <div className={styles.statusWarning} title="No coincide con inventario. (Se guardará como texto libre)">
                                                    {/* Botón opcional si quieren ligar, pero ya no es forzoso */}
                                                    <button type="button" onClick={() => openLinkModal(index, item.nombre_ui)}>⚠️</button>
                                                </div>
                                            )}
                                        </div>
                                        <span className={styles.itemName}>{item.nombre_ui}</span>
                                    </div>
                                    
                                    <div className={styles.itemControls}>
                                        <span style={{marginRight:'10px', color:'#ccc'}}>x {item.cantidad}</span>
                                        <button type="button" onClick={() => handleRemoveItem(item.tempId)} className={styles.removeBtn}>X</button>
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

      {/* --- MODAL FLOTANTE PARA LIGAR --- */}
      {itemToLinkIndex !== null && (
        <div className={styles.linkModalOverlay} onClick={() => setItemToLinkIndex(null)}>
            <div className={styles.linkModal} onClick={e => e.stopPropagation()}>
                <h4>Ligar "{listaSolicitud[itemToLinkIndex].nombre_ui}" con:</h4>
                <input 
                    type="text" 
                    className={styles.formularioPrestamo + ' input'}
                    style={{width:'100%', padding:'10px', background:'#333', color:'#fff', border:'1px solid #555', borderRadius:'5px'}}
                    value={linkSearchTerm}
                    onChange={(e) => handleLinkSearch(e.target.value)}
                    placeholder="Buscar en inventario..."
                    autoFocus
                />
                <div className={styles.linkOptions}>
                    {linkResults.length === 0 && <p style={{padding:'10px', color:'#888'}}>Sin coincidencias.</p>}
                    {linkResults.map(prod => (
                        <div key={prod.id} className={styles.linkOption} onClick={() => confirmLink(prod)}>
                            {prod.nombre_equipo}
                        </div>
                    ))}
                </div>
                <button style={{marginTop:'15px', background:'transparent', border:'none', color:'#aaa', cursor:'pointer', width:'100%'}} onClick={() => setItemToLinkIndex(null)}>Cancelar</button>
            </div>
        </div>
      )}

    </div>
  );
}

export default RegistrarPrestamo;