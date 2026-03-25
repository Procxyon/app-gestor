import React, { useState, useEffect, useRef } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue, SingleValue } from 'react-select';
import toast from 'react-hot-toast';
import styles from './RegistrarPractica.module.css';

// --- DATOS ESTÁTICOS ---
const CARRERAS = [
  'Ingeniería Mecatrónica', 'Arquitectura', 'Ingeniería Eléctrica', 'Ingeniería Electrónica',
  'Ingeniería Industrial', 'Ingeniería Logística', 'Ingeniería en Materiales',
  'Ingeniería Mecánica', 'Sistemas Computacionales',
];

const AREAS_USO = [
  'NMPR - Laboratorio de Prototipos',
  'NMCL1 - Computo 1',
  'NMCL 2 - Computo 2',
  'NMLE - Laboratorio Electrónica',
  'PLC - Laboratorio PLC',
  'EP - Electroneumática',
  'Aula de Investigación'
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

interface Option { label: string; value: string; }
interface Producto { id: number; nombre_equipo: string; }

interface RegistrarPracticaProps { 
  apiUrl: string;
  practicaId: number | null; 
  onPracticaSaved: () => void; 
}

interface PracticaData {
  id: number;
  nombre_profesor: string;
  fecha_practica: string;
  hora_inicio: string;
  hora_fin: string;
  carrera: string;
  asignatura: string | string[]; 
  grupo: string;
  no_practica: number;
  no_alumnos: number;
  nombre_practica: string;
  objetivo: string;
  observaciones: string;
  equipos: string[];
  materiales: string[];
  solicitud_uuid: string | null; 
}

const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const getRoundedTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  if (minutes >= 50) hours = (hours + 1) % 24;
  return `${String(hours).padStart(2, '0')}:00`;
};
const getRoundedTimePlusTwo = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  if (minutes >= 50) hours = (hours + 1) % 24;
  return `${String((hours + 2) % 24).padStart(2, '0')}:00`;
};

const formatTitleCase = (text: string) => {
  return text
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

function RegistrarPractica({ apiUrl, practicaId, onPracticaSaved }: RegistrarPracticaProps) {
  
  const isEditing = practicaId !== null;

  const [nombreProfesor, setNombreProfesor] = useState('');
  const [noPractica, setNoPractica] = useState(1);
  const [fechaPractica, setFechaPractica] = useState(getTodayDate());
  const [horaInicio, setHoraInicio] = useState(getRoundedTime());
  const [horaFin, setHoraFin] = useState(getRoundedTimePlusTwo());
  
  const [carrera, setCarrera] = useState('Ingeniería Mecatrónica');
  const [semestre, setSemestre] = useState('Todos');
  const [asignaturaOptions, setAsignaturaOptions] = useState<Option[]>([]);
  const [asignatura, setAsignatura] = useState<SingleValue<Option>>(null);
  const [grupo, setGrupo] = useState('');
  const [noAlumnos, setNoAlumnos] = useState<number | string>(1);

  const [nombrePractica, setNombrePractica] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  const [equipoRequerido, setEquipoRequerido] = useState(''); 
  
  const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
  const [selectedMateriales, setSelectedMateriales] = useState<MultiValue<Option>>([]);
  
  const [productosApi, setProductosApi] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [solicitudUuidExistente, setSolicitudUuidExistente] = useState<string | null>(null);

  const [secciones, setSecciones] = useState({
    general: true,
    academico: true,
    detalles: true
  });

  const toggleSeccion = (seccion: keyof typeof secciones) => {
    setSecciones(prev => ({ ...prev, [seccion]: !prev[seccion] }));
  };
  
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

  useEffect(() => {
    const fetchInventario = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/inventario?public=true`);
        const data: Producto[] = await res.json();
        if (Array.isArray(data)) {
           setProductosApi(data);
           const options = data.map((item) => ({ label: item.nombre_equipo, value: item.nombre_equipo }));
           setMaterialOptions(options);
        }
      } catch (error) { console.error("Error al cargar inventario:", error); }
    };
    fetchInventario();
  }, [apiUrl]);

  useEffect(() => {
    if (isEditing && practicaId) {
      const fetchPracticaData = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${apiUrl}/api/practicas/${practicaId}`);
          if (!res.ok) throw new Error('No se pudo cargar la práctica');
          const data: PracticaData = await res.json();
          
          setNombreProfesor(data.nombre_profesor);
          setNoPractica(data.no_practica);
          setFechaPractica(data.fecha_practica.split('T')[0]);
          setHoraInicio(data.hora_inicio);
          setHoraFin(data.hora_fin);
          setCarrera(data.carrera);
          setSemestre('Todos'); 
          
          {
            const raw = data.asignatura;
            let asigStr = '';
            if (Array.isArray(raw)) {
              asigStr = raw.length > 0 ? raw[0] : '';
            } else if (typeof raw === 'string' && raw.trim() !== '') {
              asigStr = raw.split(',')[0].trim();
            }
            setAsignatura(asigStr ? { label: asigStr, value: asigStr } : null);
          }

          setGrupo(data.grupo);
          setNoAlumnos(data.no_alumnos);
          setNombrePractica(data.nombre_practica);
          setObjetivo(data.objetivo);
          setObservaciones(data.observaciones);
          
          if (data.equipos && data.equipos.length > 0) {
            setEquipoRequerido(data.equipos[0]);
          }
          
          setSelectedMateriales(data.materiales.map(m => ({ label: m, value: m })));
          setSolicitudUuidExistente(data.solicitud_uuid);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Error al cargar datos');
          onPracticaSaved(); 
        } finally {
          setLoading(false);
        }
      };
      fetchPracticaData();
    }
  }, [practicaId, isEditing, apiUrl, onPracticaSaved]);

  const handleProfesorBlur = async () => {
    if (!nombreProfesor.trim()) return;
    const nombreFormateado = formatTitleCase(nombreProfesor);
    setNombreProfesor(nombreFormateado);

    if (nombreFormateado && fechaPractica && horaInicio && horaFin) {
      setSecciones(s => ({ ...s, general: false }));
    }

    if (isEditing) return; 
    try {
      const res = await fetch(`${apiUrl}/api/profesor/${encodeURIComponent(nombreFormateado)}/ultima-practica`);
      if (res.ok) {
        const data = await res.json();
        setNoPractica((data.ultimo_no_practica || 0) + 1);
        toast(`Siguiente práctica: #${(data.ultimo_no_practica || 0) + 1}`, { icon: '🔢' });
      }
    } catch (error) { console.error(error); }
  };

  const handleCarreraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCarrera(e.target.value); 
    setAsignatura(null); 
    setSemestre('Todos'); 
  };

  const handleSemestreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSemestre(e.target.value);
    setAsignatura(null); 
  };
  
  const handleAlumnosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') { setNoAlumnos(''); return; }
    let num = parseInt(val);
    if (isNaN(num)) return;
    setNoAlumnos(Math.max(1, Math.min(30, num)));
  };

  const handleAlumnosBlur = () => {
    let num = parseInt(String(noAlumnos));
    if (isNaN(num) || num < 1) {
      num = 1;
      setNoAlumnos(1);
    }
    if (carrera && asignatura && num >= 1) {
      setSecciones(s => ({ ...s, academico: false }));
    }
  };

  const handleNombrePracticaBlur = () => {
    if (!nombrePractica.trim()) return;
    const nombreFormateado = formatTitleCase(nombrePractica);
    setNombrePractica(nombreFormateado);

    if (nombreFormateado && equipoRequerido) {
      setSecciones(s => ({ ...s, detalles: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombreProfesor || !fechaPractica || !horaInicio || !horaFin || !asignatura || !nombrePractica || !equipoRequerido) {
      toast.error("Completa todos los campos obligatorios."); return;
    }

    setLoading(true);
    const grupoFinal = grupo.trim() === '' ? '0A' : grupo.trim().toUpperCase();
    const materialesArray = selectedMateriales.map(option => option.value);
    const equiposArray = [equipoRequerido]; 
    const asignaturaString = asignatura.value;

    const nombreProfesorFinal = formatTitleCase(nombreProfesor.trim());
    const nombrePracticaFinal = formatTitleCase(nombrePractica.trim());
    const objetivoFinal = objetivo.trim();
    const observacionesFinal = observaciones.trim();

    let finalSolicitudUuid: string | null = null;
    const promesasDePrestamo: Promise<Response>[] = [];

    try {
      if (isEditing) {
        finalSolicitudUuid = solicitudUuidExistente; 
      } else if (materialesArray.length > 0) {
        finalSolicitudUuid = crypto.randomUUID(); 
      }

      if (!isEditing && materialesArray.length > 0) {
        for (const nombreMaterial of materialesArray) {
          const producto = productosApi.find(p => p.nombre_equipo === nombreMaterial);
          if (!producto || !producto.id) throw new Error(`ID no encontrado para: "${nombreMaterial}".`);
          
          promesasDePrestamo.push(fetch(`${apiUrl}/api/prestamos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              producto_id: producto.id,
              nombre_persona: nombreProfesorFinal,
              numero_de_control: null,
              integrantes: 1, cantidad: 1, 
              materia: asignaturaString, 
              grupo: grupoFinal,
              solicitud_uuid: finalSolicitudUuid, 
              nombre_profesor: nombreProfesorFinal
            })
          }));
        }
        const responses = await Promise.all(promesasDePrestamo);
        if (responses.some(res => !res.ok)) throw new Error('Error al crear préstamos.');
      }
      
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${apiUrl}/api/practicas/${practicaId}` : `${apiUrl}/api/practicas`;

      const practicaResponse = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({
          nombre_profesor: nombreProfesorFinal, 
          fecha_practica: fechaPractica, hora_inicio: horaInicio, hora_fin: horaFin,
          carrera: carrera, 
          asignatura: asignaturaString, 
          grupo: grupoFinal,
          no_practica: noPractica, no_alumnos: Number(noAlumnos),
          nombre_practica: nombrePracticaFinal, 
          objetivo: objetivoFinal, observaciones: observacionesFinal,
          equipo_requerido: equiposArray,
          material_utilizado: materialesArray,
          solicitud_uuid: finalSolicitudUuid,
          semestre: semestre === 'Todos' ? null : semestre
        }) 
      });

      const responseData = await practicaResponse.json();
      if (!practicaResponse.ok) throw new Error(responseData.err || responseData.message || 'Error al guardar práctica.');
      
      toast.success(isEditing ? '¡Modificación guardada!' : `¡Práctica #${noPractica} registrada!`);
      
      if (isEditing && responseData.uuid) {
        setSolicitudUuidExistente(responseData.uuid);
      }

      if (isEditing) {
        onPracticaSaved(); 
      } else {
        setNombrePractica(''); setObjetivo(''); setObservaciones(''); 
        setEquipoRequerido(''); 
        setSelectedMateriales([]); 
        setNoPractica(prev => prev + 1);
        setFechaPractica(getTodayDate());
        setHoraInicio(getRoundedTime());
        setHoraFin(getRoundedTimePlusTwo());
        setAsignatura(null); 
        setGrupo(''); setNoAlumnos(1);
        setSemestre('Todos');
        setSecciones({ general: true, academico: true, detalles: true });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally { setLoading(false); }
  };

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
    multiValue: (base: any) => ({ ...base, backgroundColor: '#004a7c' }),
    multiValueLabel: (base: any) => ({ ...base, color: '#fff', fontSize: '14px' }),
    input: (base: any) => ({ ...base, color: '#eee', fontSize: '16px' }),
    placeholder: (base: any) => ({ ...base, color: '#888', fontSize: '16px' }),
    singleValue: (base: any) => ({ ...base, color: '#eee', fontSize: '16px' }),
  };

  return (
    <div className={styles.appContainer}>
      <header>
        <h1>{isEditing ? `Modificar Práctica #${noPractica}` : 'Registrar Nueva Práctica'}</h1>
      </header>

      {loading && isEditing && <p>Cargando datos de la práctica...</p>}

      <form onSubmit={handleSubmit} className={styles.formularioPrestamo}>
        
        <div className={styles.accordionItem}>
          <h3 className={styles.accordionHeader} onClick={() => toggleSeccion('general')} style={{ padding: '15px', cursor: 'pointer' }}>
            1. Datos Generales
            <span style={{ transform: secciones.general ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <div className={`${styles.accordionContent} ${secciones.general ? styles.open : ''}`}>
            <fieldset>
              <div className={`${styles.formRow} ${styles.cols1}`}> 
                <div className={styles.formGroup}>
                  <label htmlFor="profesor">Nombre del Profesor:</label>
                  <input id="profesor" type="text" value={nombreProfesor} onChange={(e) => setNombreProfesor(e.target.value)} onBlur={handleProfesorBlur} placeholder="Ingrese su nombre completo" required disabled={isEditing} />
                </div>
              </div>
              <div className={`${styles.formRow} ${styles.cols3}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="fecha">Fecha:</label>
                  <input id="fecha" type="date" value={fechaPractica} onChange={(e) => setFechaPractica(e.target.value)} required disabled={isEditing} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="horaInicio">Hora Inicio:</label>
                  <input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required disabled={isEditing} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="horaFin">Hora Fin:</label>
                  <input id="horaFin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className={styles.accordionItem}>
          <h3 className={styles.accordionHeader} onClick={() => toggleSeccion('academico')} style={{ padding: '15px', cursor: 'pointer' }}>
            2. Datos Académicos
            <span style={{ transform: secciones.academico ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <div className={`${styles.accordionContent} ${secciones.academico ? styles.open : ''}`}>
            <fieldset>
              <div className={`${styles.formRow} ${styles.cols2}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="carrera">Carrera:</label>
                  <select id="carrera" value={carrera} onChange={handleCarreraChange} required disabled={isEditing}> 
                    {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)} 
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="semestre">Semestre:</label>
                  <select id="semestre" value={semestre} onChange={handleSemestreChange} disabled={carrera !== 'Ingeniería Mecatrónica'}>
                    <option value="Todos">Mostrar Todas</option>
                    <option value="1">1° Semestre</option>
                    <option value="2">2° Semestre</option>
                    <option value="3">3° Semestre</option>
                    <option value="4">4° Semestre</option>
                    <option value="5">5° Semestre</option>
                    <option value="6">6° Semestre</option>
                    <option value="7">7° Semestre</option>
                    <option value="8">8° Semestre</option>
                    <option value="9">9° Semestre</option>
                  </select>
                </div>
              </div>
              
              <div className={`${styles.formRow} ${styles.cols1}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="asignatura">Asignatura:</label>
                  <CreatableSelect 
                    options={asignaturaOptions} 
                    value={asignatura} 
                    onChange={(newValue) => setAsignatura(newValue)} 
                    placeholder="-- Selecciona Asignatura --" 
                    formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`} 
                    styles={reactSelectStyles} 
                  />
                </div>
              </div>

              <div className={`${styles.formRow} ${styles.cols2}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="grupo">Grupo:</label>
                  <input id="grupo" type="text" value={grupo} onChange={(e) => setGrupo(e.target.value.toUpperCase())} placeholder="Ej.0A" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="noAlumnos">No. Alumnos (1-30):</label>
                  <input id="noAlumnos" type="number" value={noAlumnos} onChange={handleAlumnosChange} onBlur={handleAlumnosBlur} min="1" max="30" inputMode="numeric" pattern="[0-9]*" required disabled={isEditing} />
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className={styles.accordionItem}>
          <h3 className={styles.accordionHeader} onClick={() => toggleSeccion('detalles')} style={{ padding: '15px', cursor: 'pointer' }}>
            3. Equipos, Materiales y Objetivos
            <span style={{ transform: secciones.detalles ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <div className={`${styles.accordionContent} ${secciones.detalles ? styles.open : ''}`}>
            <fieldset>
              <div className={`${styles.formRow} ${styles.cols1}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="nombrePractica">Nombre de la Práctica:</label>
                  <input id="nombrePractica" type="text" value={nombrePractica} onChange={(e) => setNombrePractica(e.target.value)} onBlur={handleNombrePracticaBlur} placeholder="Actividad a realizar..." required />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="equipoRequerido">Salón o Área de Uso:</label>
                  <select 
                    id="equipoRequerido" 
                    value={equipoRequerido} 
                    onChange={(e) => setEquipoRequerido(e.target.value)} 
                    required 
                  >
                    <option value="" disabled>-- Selecciona un Área --</option>
                    {AREAS_USO.map(area => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Material Utilizado (caseta):</label>
                  <CreatableSelect isMulti options={materialOptions} value={selectedMateriales} onChange={(newValue) => setSelectedMateriales(newValue)} placeholder="Material requerido de caseta..." formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`} styles={reactSelectStyles} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="objetivo">Objetivo:</label>
                  <textarea id="objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={3} placeholder="Describe el objetivo de la práctica..." />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="observaciones">Observaciones:</label>
                  <textarea id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} placeholder="Añade notas o comentarios adicionales, instalaciones dañadas o equipo faltante..." />
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '40px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button type="submit" className={styles.submitBtn} disabled={loading} style={{ width: '90%', padding: '15px', fontSize: '18px' }}>
            {loading ? (isEditing ? 'Modificando...' : 'Registrando...') : (isEditing ? 'Guardar Modificaciones' : 'Registrar Práctica')}
          </button>
        </div>

      </form>
    </div>
  );
}

export default RegistrarPractica;