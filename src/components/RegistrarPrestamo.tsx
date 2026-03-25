import React, { useState, useEffect, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue, SingleValue } from 'react-select';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import styles from './RegistrarPrestamo.module.css';

// --- DATOS ESTÁTICOS ---
const CARRERAS = [
  'Ingeniería Mecatrónica', 'Arquitectura', 'Ingeniería Eléctrica', 'Ingeniería Electrónica',
  'Ingeniería Industrial', 'Ingeniería Logística', 'Ingeniería en Materiales',
  'Ingeniería Mecánica', 'Sistemas Computacionales',
];

const ASIGNATURAS_MECATRONICA: Record<string, string[]> = {
  '1': ['Cálculo Diferencial', 'Administración y Contabilidad', 'Química', 'Dibujo Asistido por Computadora', 'Taller de Ética', 'Fundamentos de Investigación'],
  '2': ['Cálculo Integral', 'Programación Básica', 'Ciencia e Ingeniería de Materiales', 'Metrología y Normalización', 'Estadística y Control de Calidad'],
  '3': ['Cálculo Vectorial', 'Álgebra Lineal', 'Procesos de Fabricación', 'Estática', 'Desarrollo Sustentable'],
  '4': ['Ecuaciones Diferenciales', 'Métodos Numéricos', 'Mecánica de Materiales', 'Dinámica', 'Electromagnetismo'],
  '5': ['Análisis de Fluidos', 'Electrónica Digital', 'Fundamentos de Termodinámica', 'Mecanismos', 'Análisis de Circuitos Eléctricos', 'Programación Avanzada'],
  '6': ['Electrónica Analógica', 'Microcontroladores', 'Dinámica de Sistemas', 'Circuitos Hidráulicos y Neumáticos', 'Taller de Investigación I', 'Máquinas Eléctricas'],
  '7': ['Electrónica de Potencia Aplicada', 'Mantenimiento', 'Diseño de Elementos Mecánicos', 'Control', 'Taller de Investigación II', 'Instrumentación'],
  '8': ['Manufactura Avanzada', 'Vibraciones Mecánicas', 'Tópicos de Inteligencia de Negocios', 'Robótica', 'Formulación y Evaluación de Proyectos', 'Controladores Lógicos Programables', 'Tópicos Avanzados de Diseño', 'Introducción a Redes de Computadoras'],
  '9': ['Toma de Decisiones Basada en Datos', 'Gestión Estratégica y Empresarial', 'Ingeniería de Datos', 'Liderazgo y Gestión de Proyectos', 'Análisis y Visualización de Datos', 'Desarrollo de Soluciones con Inteligencia de Negocios', 'Desarrollo de Líderes y Equipos de Alto Rendimiento', 'Habilidades de Dirección y Gestión', 'Estadística para Inteligencia de Negocios', 'Innovación Tecnológica', 'Lean Manufacturing', 'Manufactura Aditiva', 'Inteligencia Artificial'],
};

const TODAS_MECATRONICA = Object.values(ASIGNATURAS_MECATRONICA).flat();

// --- Interfaces ---
interface Option { label: string; value: string; }
interface Producto { id: number; nombre_equipo: string; }
interface ItemExistente { id: number; nombre_equipo: string; cantidad: number; fecha_devolucion: string | null; }

interface SolicitudItem { 
  tempId: string;        
  nombre_ui: string;     
  cantidad: string;
  producto_real?: Producto | null; 
}

interface RegistrarPrestamoProps { 
  apiUrl: string;
  solicitudUuid?: string | null;
  onPrestamoSaved?: () => void;
}

const fuseOptions = { keys: ['nombre_equipo'], threshold: 0.3, includeScore: true };

const formatTitleCase = (text: string) => {
  return text
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

function RegistrarPrestamo({ apiUrl, solicitudUuid, onPrestamoSaved }: RegistrarPrestamoProps) {
  // --- Estados Generales ---
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const fuse = useMemo(() => new Fuse(todosLosProductos, fuseOptions), [todosLosProductos]);

  // --- Estados del Formulario ---
  const [nombrePersona, setNombrePersona] = useState('');
  const [numeroControl, setNumeroControl] = useState('');
  const [integrantes, setIntegrantes] = useState('1');
  const [grupo, setGrupo] = useState('');
  const [nombreProfesor, setNombreProfesor] = useState('');
  
  // --- Estados Académicos ---
  const [carrera, setCarrera] = useState('Ingeniería Mecatrónica');
  const [semestre, setSemestre] = useState('Todos');
  const [asignaturaOptions, setAsignaturaOptions] = useState<Option[]>([]);
  const [materia, setMateria] = useState<SingleValue<Option>>(null);

  const [isProfesorRequest, setIsProfesorRequest] = useState(false);
  const [editModeLocked, setEditModeLocked] = useState(false);

  const [secciones, setSecciones] = useState({
    solicitante: true,
    tipo: true,
    equipo: true
  });

  const toggleSeccion = (seccion: keyof typeof secciones) => {
    if (editModeLocked && isEditing) return; 
    setSecciones(prev => ({ ...prev, [seccion]: !prev[seccion] }));
  };

  // --- Estados de Listas ---
  const [existingItems, setExistingItems] = useState<ItemExistente[]>([]);
  const [listaSolicitud, setListaSolicitud] = useState<SolicitudItem[]>([]);
  
  const [textoMaterial, setTextoMaterial] = useState('');
  const [cantidadInput, setCantidadInput] = useState('1');
  
  const [itemToLinkIndex, setItemToLinkIndex] = useState<number | null>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkResults, setLinkResults] = useState<Producto[]>([]);

  const [enviando, setEnviando] = useState(false);
  const isEditing = !!solicitudUuid;

  // 1. Carga de Asignaturas
  useEffect(() => {
    let materiasParaMostrar: string[] = [];
    if (carrera === 'Ingeniería Mecatrónica') {
      if (semestre === 'Todos') {
        materiasParaMostrar = TODAS_MECATRONICA;
      } else {
        materiasParaMostrar = ASIGNATURAS_MECATRONICA[semestre] || [];
      }
    } else {
      materiasParaMostrar = []; 
    }
    const options = materiasParaMostrar.map(m => ({ label: m, value: m }));
    setAsignaturaOptions(options);
  }, [carrera, semestre]);

  // 2. Carga de Inventario
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

  // 3. Carga de Datos en Modo Edición
  const cargarDatosEdicion = () => {
    if (!solicitudUuid) return;
    setLoading(true);
    setEditModeLocked(true); 

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
            } else {
                setIsProfesorRequest(false);
                setIntegrantes(String(header.integrantes || 1));
                setGrupo(header.grupo || '');
                setNombreProfesor(header.nombre_profesor || '');
                
                if (header.materia) {
                    setMateria({ label: header.materia, value: header.materia });
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
      setEditModeLocked(false); 
    }
  }, [isEditing, solicitudUuid, apiUrl]);


  // --- LÓGICA DE AUTO-CONTRAER AL PERDER EL FOCO (onBlur) ---

  const checkSolicitanteComplete = (nombre: string, control: string, isProf: boolean) => {
    const nombreOk = nombre.trim() !== '';
    const controlOk = isProf || control.trim() !== '';
    if (nombreOk && controlOk) {
      setSecciones(s => ({ ...s, solicitante: false }));
    }
  };

  const handleNombrePersonaBlur = () => {
    const fmt = formatTitleCase(nombrePersona);
    setNombrePersona(fmt);
    checkSolicitanteComplete(fmt, numeroControl, isProfesorRequest);
  };

  const handleNumeroControlBlur = () => {
    checkSolicitanteComplete(nombrePersona, numeroControl, isProfesorRequest);
  };

  // Se ejecuta solo al salir de "Profesor a Cargo" para cerrar la sección de forma fluida
  const checkDetallesComplete = () => {
    const intOk = parseInt(integrantes) > 0;
    const carOk = carrera.trim() !== '';
    const semOk = semestre.trim() !== '';
    if (intOk && carOk && semOk) {
        setSecciones(s => ({ ...s, tipo: false }));
    }
  };

  const handleProfesorBlur = () => {
    const fmt = formatTitleCase(nombreProfesor);
    setNombreProfesor(fmt);
    checkDetallesComplete(); // Cerramos la sección al terminar el último campo visual
  };

  const handleGrupoBlur = () => {
    // Solo normalizamos, no cerramos la sección aún
  };

  const handleIntegrantesBlur = () => {
    let val = integrantes;
    if (!val || parseInt(val) < 1) {
        val = '1';
        setIntegrantes(val);
    }
  };

  const handleCarreraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCarrera(e.target.value); 
    setMateria(null); 
    setSemestre('Todos'); 
  };

  const handleSemestreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSemestre(e.target.value);
    setMateria(null); 
  };


  // --- Funciones de Manejo (Entrada Libre + Validación) ---
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
      producto_real: coincidencia 
    };

    setListaSolicitud([...listaSolicitud, newItem]);
    setTextoMaterial('');
    setCantidadInput('1');
  };

  const handleRemoveItem = (tempId: string) => {
    setListaSolicitud(prev => prev.filter(i => i.tempId !== tempId));
  };

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

  // --- ENVÍO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editModeLocked) {
        if (isProfesorRequest) {
            if (!nombrePersona) { toast.error('Falta Nombre del Profesor.'); return; }
        } else {
            // Se quitó la obligación de materia y profesor
            if (!nombrePersona || !numeroControl || !carrera || !semestre) { 
                toast.error('Faltan campos obligatorios del solicitante, carrera o semestre.'); return; 
            }
        }
    }
    
    if (!isEditing && listaSolicitud.length === 0) { 
        toast.error('La lista está vacía. Añade material.'); return; 
    }

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
      if (!editModeLocked || !isEditing) {
         if(isEditing && uuidFinal) {
             await fetch(`${apiUrl}/api/solicitud/${uuidFinal}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   nombre_persona: nombrePersona,
                   id_persona: isProfesorRequest ? 'Profesor' : numeroControl,
                   integrantes: isProfesorRequest ? 1 : parseInt(integrantes) || 1,
                   materia: isProfesorRequest ? null : (materia?.value || null),
                   grupo: isProfesorRequest ? null : (grupo || null),
                   nombre_profesor: isProfesorRequest ? null : (nombreProfesor || null),
                   carrera: carrera,
                   semestre: semestre
                })
             });
         }
      }

      if (listaSolicitud.length > 0) {
          const solicitudes = listaSolicitud.map(item => {
            const esVinculado = !!item.producto_real?.id;
            
            return fetch(`${apiUrl}/api/prestamos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto_id: esVinculado ? item.producto_real!.id : null, 
                    nombre_extra: esVinculado ? null : item.nombre_ui, 
                    nombre_persona: nombrePersona,
                    numero_de_control: isProfesorRequest ? null : numeroControl, 
                    integrantes: isProfesorRequest ? 1 : parseInt(integrantes) || 1, 
                    cantidad: parseInt(item.cantidad) || 1,
                    materia: isProfesorRequest ? null : (materia?.value || null), 
                    grupo: isProfesorRequest ? null : (grupo || null), 
                    nombre_profesor: isProfesorRequest ? null : (nombreProfesor || null),
                    solicitud_uuid: uuidFinal,
                    carrera: carrera,
                    semestre: semestre
                }),
            });
          });
          
          const responses = await Promise.all(solicitudes);
          if (responses.some(res => !res.ok)) throw new Error('Error al registrar algunos items');
      }

      toast.success(isEditing ? "Solicitud actualizada" : "¡Préstamo registrado!", { id: loadingToast });
      
      if (isEditing && onPrestamoSaved) {
          setTimeout(onPrestamoSaved, 800); 
      } else {
          setListaSolicitud([]); setNombrePersona(''); setNumeroControl(''); 
          setLinkSearchTerm(''); setNombreProfesor(''); setGrupo('');
          setTextoMaterial(''); setCantidadInput('1'); setMateria(null);
          setSecciones({ solicitante: true, tipo: true, equipo: true });
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al guardar", { id: loadingToast });
    } finally {
      setEnviando(false);
    }
  };

  // --- ESTILOS REACT SELECT ---
  const reactSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderColor: state.isFocused ? 'rgba(0, 170, 255, 0.18)' : 'rgba(255, 255, 255, 0.16)',
      boxShadow: state.isFocused ? '0 6px 20px rgba(0, 170, 255, 0.06)' : 'none',
      color: '#eee',
      padding: '2px 6px',
      borderRadius: '8px',
      minHeight: '48px', 
      fontSize: '16px', 
      '&:hover': { borderColor: 'rgba(0, 170, 255, 0.18)' },
    }),
    menu: (base: any) => ({
      ...base, backgroundColor: '#1e222d',
      border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.14))',
      color: '#eee', borderRadius: '8px', overflow: 'hidden',
      zIndex: 9999, 
    }),
    option: (base: any, state: any) => ({
      ...base, 
      backgroundColor: state.isFocused ? 'rgba(0, 123, 255, 0.2)' : 'transparent', 
      color: '#eee',
      padding: '12px', 
      fontSize: '16px',
    }),
    singleValue: (base: any) => ({ ...base, color: '#eee', fontSize: '16px' }),
    input: (base: any) => ({ ...base, color: '#eee', fontSize: '16px' }),
    placeholder: (base: any) => ({ ...base, color: '#888', fontSize: '16px' }),
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
                            if(e.target.checked) { 
                                setNumeroControl(''); 
                                checkSolicitanteComplete(nombrePersona, '', true);
                            }
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

            {/* --- SECCIÓN 1: DATOS --- */}
            <div className={`${styles.accordionItem} ${editModeLocked && isEditing ? styles.locked : ''}`}>
                <div className={styles.accordionHeader} onClick={() => toggleSeccion('solicitante')}>
                    <span>1. Datos del Solicitante</span>
                    <span>{secciones.solicitante ? '▲' : '▼'}</span>
                </div>
                
                {secciones.solicitante && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        <div className={styles.formGroup}>
                            <label>Nombre Completo:</label>
                            <input type="text" value={nombrePersona} placeholder='Ingrese su nombre completo' onChange={(e) => setNombrePersona(e.target.value)} onBlur={handleNombrePersonaBlur} required disabled={editModeLocked && isEditing} />
                        </div>
                        
                        {!isProfesorRequest && (
                            <div className={styles.formGroup}>
                                <label>Número de Control:</label>
                                <input type="text" inputMode="numeric" value={numeroControl} placeholder='Ingrese su numero de control' onChange={(e) => {if (/^\d*$/.test(e.target.value)) setNumeroControl(e.target.value)}} onBlur={handleNumeroControlBlur} disabled={editModeLocked && isEditing} />
                            </div>
                        )}
                    </fieldset>
                </div>
                )}
            </div>

            {/* --- SECCIÓN 2: DETALLES --- */}
            <div className={`${styles.accordionItem} ${(isProfesorRequest || (editModeLocked && isEditing)) ? styles.disabled : ''} ${editModeLocked && isEditing ? styles.locked : ''}`}>
                <div className={styles.accordionHeader} onClick={() => !isProfesorRequest && !editModeLocked && toggleSeccion('tipo')}>
                    <span>2. Detalles Académicos</span>
                    <span>{secciones.tipo ? '▲' : '▼'}</span>
                </div>

                {secciones.tipo && !isProfesorRequest && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        {/* --- FILA 1: Carrera (Largo) y Semestre (Corto) --- */}
                        <div className={styles.formRow2}>
                            <div className={`${styles.formGroup} ${styles.colLarge}`}>
                                <label htmlFor="carrera">Carrera:</label>
                                <select id="carrera" value={carrera} onChange={handleCarreraChange} disabled={editModeLocked && isEditing}> 
                                    {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)} 
                                </select>
                            </div>
                            <div className={`${styles.formGroup} ${styles.colSmall}`}>
                                <label htmlFor="semestre">Semestre:</label>
                                <select id="semestre" value={semestre} onChange={handleSemestreChange} disabled={(editModeLocked && isEditing) || carrera !== 'Ingeniería Mecatrónica'}>
                                    <option value="Todos">Todas</option>
                                    <option value="1">1°</option>
                                    <option value="2">2°</option>
                                    <option value="3">3°</option>
                                    <option value="4">4°</option>
                                    <option value="5">5°</option>
                                    <option value="6">6°</option>
                                    <option value="7">7°</option>
                                    <option value="8">8°</option>
                                    <option value="9">9°</option>
                                </select>
                            </div>
                        </div>

                        {/* --- FILA 2: Materia (Largo) y Grupo (Corto) --- */}
                        <div className={styles.formRow2}>
                            <div className={`${styles.formGroup} ${styles.colLarge}`}>
                                <label>Materia:</label>
                                <CreatableSelect 
                                    options={asignaturaOptions} 
                                    value={materia} 
                                    onChange={(newValue) => setMateria(newValue)} 
                                    placeholder="Materia relacionada al semestre" 
                                    formatCreateLabel={(inputValue) => `Crear: "${inputValue}"`} 
                                    styles={reactSelectStyles} 
                                    isDisabled={editModeLocked && isEditing}
                                />
                            </div>
                            <div className={`${styles.formGroup} ${styles.colSmall}`}>
                                <label>Grupo:</label>
                                <input type="text" value={grupo} onChange={(e) => setGrupo(e.target.value.toUpperCase())} onBlur={handleGrupoBlur} placeholder="Ej. 0A" style={{ textTransform: 'uppercase' }} disabled={editModeLocked && isEditing} />
                            </div>
                        </div>

                        {/* --- FILA 3: Integrantes (Corto) y Profesor (Largo) --- */}
                        <div className={styles.formRow2}>
                            <div className={`${styles.formGroup} ${styles.colSmall}`}>
                                <label>Int.:</label>
                                <input type="number" value={integrantes} min="1" onChange={(e) => setIntegrantes(e.target.value)} onBlur={handleIntegrantesBlur} disabled={editModeLocked && isEditing} />
                            </div>
                            <div className={`${styles.formGroup} ${styles.colLarge}`}>
                                <label>Profesor a Cargo:</label>
                                <input type="text" value={nombreProfesor} placeholder='Ingrese el nombre completo' onChange={(e) => setNombreProfesor(e.target.value)} onBlur={handleProfesorBlur} disabled={editModeLocked && isEditing} />
                            </div>
                        </div>
                    </fieldset>
                </div>
                )}
            </div>
            
            {/* --- SECCIÓN 3: MATERIALES --- */}
            <div className={styles.accordionItem}>
                <div className={styles.accordionHeader} onClick={() => toggleSeccion('equipo')}>
                    <span>3. {isEditing ? 'Añadir MÁS Materiales' : 'Materiales'}</span>
                    <span>{secciones.equipo ? '▲' : '▼'}</span>
                </div>

                {secciones.equipo && (
                <div className={styles.accordionContent}>
                    <fieldset>
                        <label>Buscar / Agregar Material:</label>
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