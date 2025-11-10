import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';
import toast from 'react-hot-toast';
import styles from './RegistrarPractica.module.css';


// --- DATOS ESTÁTICOS ---
const CARRERAS = [
  'Ingeniería Mecatrónica', 'Arquitectura', 'Ingeniería Eléctrica', 'Ingeniería Electrónica',
  'Ingeniería Industrial', 'Ingeniería Logística', 'Ingeniería en Materiales',
  'Ingeniería Mecánica', 'Sistemas Computacionales',
];

const ASIGNATURAS: { [key: string]: string[] } = {
  'Ingeniería Mecatrónica': [
    'Química', 'Dibujo Asistido Computadora', 'Programación Básica', 'Ciencia e Ing Materiales',
    'Metrología y Normalización', 'Estado y Control de Calidad', 'Fundamentos de investigación',
    'Procesos de Fabricación', 'Mecánica de Materiales', 'Dinámica', 'Electromagnetismo',
    'Análisis de Fluidos', 'Electrónica Digital', 'Mecanismos', 'Analisis de Circuitos',
    'Programación Avanzada', 'Electrónica Analógica', 'Microcontroladores', 'Dinámica de Sistemas',
    'Circuitos Hidraulicos y Neumáticos', 'Máquinas Eléctricas', 'Electrónica Potencia Aplicada',
    'Mantenimiento', 'Control', 'Instrumentación', 'Manufactura Avanzada', 'Vibraciones Mecánicas',
    'Tópicos Avanzados de Diseño', 'Robótica', 'Controladores Lógicos Programables',
    'Innovación Tecnológica', 'Introducción a Redes de Comp.', 'Lean Manufacturing',
    'Inteligencia Artificial', 'Manufactura Aditiva'
  ],
  'Arquitectura': [], 'Ingeniería Eléctrica': [], 'Ingeniería Electrónica': [],
  'Ingeniería Industrial': [], 'Ingeniería Logística': [], 'Ingeniería en Materiales': [],
  'Ingeniería Mecánica': [], 'Sistemas Computacionales': [],
};

// --- INTERFACES ---
interface Option { label: string; value: string; }
interface Producto { id: number; nombre_equipo: string; }
type Seccion = 'general' | 'academico' | 'detalles' | '';

// --- NUEVAS PROPS ---
interface RegistrarPracticaProps { 
  apiUrl: string;
  practicaId: number | null; // ID para editar (o null si es nueva)
  onPracticaSaved: () => void; // Función para llamar al guardar/modificar
}

// --- Tipo para la data de Práctica (de la API) ---
interface PracticaData {
  id: number;
  nombre_profesor: string;
  fecha_practica: string;
  hora_inicio: string;
  hora_fin: string;
  carrera: string;
  asignatura: string;
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

// --- Funciones Helper para Fecha/Hora ---
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
  if (minutes >= 50) {
    hours = (hours + 1) % 24;
  }
  const hh = String(hours).padStart(2, '0');
  return `${hh}:00`;
};
const getRoundedTimePlusTwo = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  if (minutes >= 50) {
    hours = (hours + 1) % 24;
  }
  const endHours = (hours + 2) % 24;
  const hh = String(endHours).padStart(2, '0');
  return `${hh}:00`;
};

// --- COMPONENTE PRINCIPAL ---
function RegistrarPractica({ apiUrl, practicaId, onPracticaSaved }: RegistrarPracticaProps) {
  
  // --- ESTADO DE EDICIÓN ---
  const isEditing = practicaId !== null;

  // --- ESTADOS ---
  const [nombreProfesor, setNombreProfesor] = useState('');
  const [noPractica, setNoPractica] = useState(1);
  const [fechaPractica, setFechaPractica] = useState(getTodayDate());
  const [horaInicio, setHoraInicio] = useState(getRoundedTime());
  const [horaFin, setHoraFin] = useState(getRoundedTimePlusTwo());
  
  const [carrera, setCarrera] = useState('Ingeniería Mecatrónica');
  const [asignatura, setAsignatura] = useState('');
  const [grupo, setGrupo] = useState('');
  const [noAlumnos, setNoAlumnos] = useState<number | string>(1);

  const [nombrePractica, setNombrePractica] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  const [equipoOptions, setEquipoOptions] = useState<Option[]>([]);
  const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
  const [selectedEquipos, setSelectedEquipos] = useState<MultiValue<Option>>([]);
  const [selectedMateriales, setSelectedMateriales] = useState<MultiValue<Option>>([]);
  
  const [productosApi, setProductosApi] = useState<Producto[]>([]);

  const [loading, setLoading] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState<Seccion>('general');
  
  // --- LÓGICA DE CARGA DE INVENTARIO ---
  useEffect(() => {
    const fetchInventario = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/inventario?public=true`);
        const data: Producto[] = await res.json();
        if (Array.isArray(data)) {
           setProductosApi(data);
           const options = data.map((item) => ({ label: item.nombre_equipo, value: item.nombre_equipo }));
           setEquipoOptions(options); 
           setMaterialOptions(options);
        }
      } catch (error) { console.error("Error al cargar inventario para sugerencias:", error); }
    };
    fetchInventario();
  }, [apiUrl]);

  // --- USEEFFECT (Para cargar datos en modo Edición) ---
  useEffect(() => {
    if (isEditing && practicaId) {
      const fetchPracticaData = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${apiUrl}/api/practicas/${practicaId}`);
          if (!res.ok) throw new Error('No se pudo cargar la práctica a editar');
          const data: PracticaData = await res.json();
          
          // Rellena el formulario
          setNombreProfesor(data.nombre_profesor);
          setNoPractica(data.no_practica);
          setFechaPractica(data.fecha_practica.split('T')[0]);
          setHoraInicio(data.hora_inicio);
          setHoraFin(data.hora_fin);
          setCarrera(data.carrera);
          setAsignatura(data.asignatura);
          setGrupo(data.grupo);
          setNoAlumnos(data.no_alumnos);
          setNombrePractica(data.nombre_practica);
          setObjetivo(data.objetivo);
          setObservaciones(data.observaciones);
          
          setSelectedEquipos(data.equipos.map(e => ({ label: e, value: e })));
          setSelectedMateriales(data.materiales.map(m => ({ label: m, value: m })));
          
          setSeccionAbierta('general');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Error al cargar datos');
          onPracticaSaved(); // Regresa al historial si falla
        } finally {
          setLoading(false);
        }
      };
      fetchPracticaData();
    }
  }, [practicaId, isEditing, apiUrl, onPracticaSaved]);

  // --- LÓGICA DE AUTO-INCREMENTO (Deshabilitada en modo edición) ---
  const handleProfesorBlur = async () => {
    if (isEditing) return; // No auto-incrementar si estamos editando
    if (!nombreProfesor.trim()) return;
    const nombreMayus = nombreProfesor.toUpperCase();
    setNombreProfesor(nombreMayus);
    try {
      const res = await fetch(`${apiUrl}/api/profesor/${encodeURIComponent(nombreMayus)}/ultima-practica`);
      if (res.ok) {
        const data = await res.json();
        const siguientePractica = (data.ultimo_no_practica || 0) + 1;
        setNoPractica(siguientePractica);
        toast(`Siguiente práctica: #${siguientePractica}`, { icon: '🔢' });
      }
    } catch (error) { console.error("Error al obtener última práctica:", error); }
  };

  // --- OTROS MANEJADORES ---
  const handleCarreraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCarrera(e.target.value); setAsignatura('');
  };
  const handleNext = (next: Seccion) => {
    setSeccionAbierta(next);
  };
  const handleAlumnosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') { setNoAlumnos(''); return; }
    let num = parseInt(val);
    if (isNaN(num)) return;
    if (num > 30) num = 30;
    if (num < 1) num = 1;
    setNoAlumnos(num);
  };
  const handleAlumnosBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseInt(String(noAlumnos));
    if (isNaN(num) || num < 1) {
      setNoAlumnos(1);
    }
  };

 // --- FUNCIÓN DE ENVÍO (CORREGIDA PARA SER SECUENCIAL) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones (sin cambios)
    if (!nombreProfesor || !fechaPractica || !horaInicio || !horaFin || !asignatura || !nombrePractica) {
      toast.error("Completa todos los campos obligatorios."); return;
    }
    if (selectedEquipos.length === 0 && selectedMateriales.length === 0) {
      toast.error("Debes añadir al menos un Equipo o un Material a la práctica."); 
      setSeccionAbierta('detalles');
      return;
    }

    setLoading(true);

    const grupoFinal = grupo.trim() === '' ? '0A' : grupo.trim().toUpperCase();
    const materialesArray = selectedMateriales.map(option => option.value);
    const equiposArray = selectedEquipos.map(option => option.value);

    let solicitud_uuid: string | null = null;
    const promesasDePrestamo: Promise<Response>[] = [];

    try {
      // --- PASO 1: Crear los Préstamos (si existen) PRIMERO ---
      if (materialesArray.length > 0) {
        solicitud_uuid = crypto.randomUUID();
        
        for (const nombreMaterial of materialesArray) {
          const producto = productosApi.find(p => p.nombre_equipo === nombreMaterial);
          if (!producto || !producto.id) {
            throw new Error(`ID no encontrado para: "${nombreMaterial}".`);
          }
          const prestamoBody = {
            producto_id: producto.id,
            nombre_persona: nombreProfesor.toUpperCase().trim(),
            numero_de_control: null,
            integrantes: 1, 
            cantidad: 1, 
            materia: asignatura,
            grupo: grupoFinal,
            solicitud_uuid: solicitud_uuid,
            nombre_profesor: nombreProfesor.toUpperCase().trim()
          };
          promesasDePrestamo.push(
            fetch(`${apiUrl}/api/prestamos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(prestamoBody)
            })
          );
        }
        
        // Esperamos a que TODOS los préstamos se completen
        const prestamoResponses = await Promise.all(promesasDePrestamo);
        const prestamoFallo = prestamoResponses.some(res => !res.ok);
        
        if (prestamoFallo) {
          const failedResponse = prestamoResponses.find(res => !res.ok);
          let errorMsg = 'No se pudieron crear los préstamos de material.';
          if (failedResponse) {
            try {
              const errorData = await failedResponse.json();
              errorMsg = errorData.err || errorData.message || errorMsg;
            } catch (e) {}
          }
          throw new Error(errorMsg);
        }
      }
      
      // --- PASO 2: Crear la Práctica (AHORA que los préstamos existen) ---
      const formData = {
        nombre_profesor: nombreProfesor.toUpperCase().trim(), 
        fecha_practica: fechaPractica, 
        hora_inicio: horaInicio, 
        hora_fin: horaFin,
        carrera: carrera, 
        asignatura: asignatura, 
        grupo: grupoFinal,
        no_practica: noPractica, 
        no_alumnos: Number(noAlumnos),
        nombre_practica: nombrePractica.trim(), 
        objetivo: objetivo.trim(), 
        observaciones: observaciones.trim(),
        equipo_requerido: equiposArray,
        material_utilizado: materialesArray,
        solicitud_uuid: solicitud_uuid // Se usa el UUID generado en el Paso 1
      };

      const practicaResponse = await fetch(`${apiUrl}/api/practicas`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });

      if (!practicaResponse.ok) {
        let errorMsg = 'Error al registrar la práctica.';
        try {
          const errorData = await practicaResponse.json();
          errorMsg = errorData.err || errorData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      // --- PASO 3: Éxito ---
      toast.success(`¡Práctica #${noPractica} registrada! ${promesasDePrestamo.length > 0 ? `(${promesasDePrestamo.length} préstamos)` : ''}`);
      
      // Reseteo
      setNombrePractica(''); setObjetivo(''); setObservaciones(''); 
      setSelectedEquipos([]); setSelectedMateriales([]); 
      setNoPractica(prev => prev + 1);
      setFechaPractica(getTodayDate());
      setHoraInicio(getRoundedTime());
      setHoraFin(getRoundedTimePlusTwo());
      setAsignatura(''); setGrupo(''); setNoAlumnos(1);
      setSeccionAbierta('general');

    } catch (error) {
      console.error("Error al enviar:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally { 
      setLoading(false); 
    }
  };

  // --- ESTILOS DE REACT-SELECT (Sin cambios) ---
  const reactSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderColor: state.isFocused ? 'rgba(0, 170, 255, 0.18)' : 'rgba(255, 255, 255, 0.16)',
      boxShadow: state.isFocused ? '0 6px 20px rgba(0, 170, 255, 0.06)' : 'none',
      color: '#eee',
      padding: '5px 6px',
      borderRadius: '8px',
      minHeight: '48px',
      '&:hover': {
        borderColor: 'rgba(0, 170, 255, 0.18)',
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: '#1e222d',
      border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.14))',
      color: '#eee',
      borderRadius: '8px',
      overflow: 'hidden',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
      color: '#eee',
    }),
    multiValue: (base: any) => ({ 
        ...base, 
        backgroundColor: '#004a7c',
    }),
    multiValueLabel: (base: any) => ({ ...base, color: '#fff' }),
    input: (base: any) => ({ ...base, color: '#eee' }),
    placeholder: (base: any) => ({ ...base, color: '#888' }),
    singleValue: (base: any) => ({ ...base, color: '#eee' }),
  };

  return (
    <div className={styles.appContainer}>
      <header>
        {/* Título dinámico */}
        <h1>{isEditing ? `Modificar Práctica #${noPractica}` : 'Registrar Nueva Práctica'}</h1>
      </header>

      {/* Muestra un spinner si está cargando datos para editar */}
      {loading && isEditing && <p>Cargando datos de la práctica...</p>}

      <form onSubmit={handleSubmit} className={styles.formularioPrestamo}>
        
        {/* --- SECCIÓN 1: DATOS GENERALES --- */}
        <div className={styles.accordionItem}>
          <h3 className={styles.accordionHeader} onClick={() => setSeccionAbierta('general')}>
            1. Datos Generales (Profesor, Fecha)
            <span style={{ transform: seccionAbierta === 'general' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <div className={`${styles.accordionContent} ${seccionAbierta === 'general' ? styles.open : ''}`}>
            <fieldset>
              
              <div className={`${styles.formRow} ${styles.cols1}`}> 
                <div className={styles.formGroup}>
                  <label htmlFor="profesor">Nombre del Profesor:</label>
                  {/* Deshabilitado en modo edición */}
                  <input id="profesor" type="text" value={nombreProfesor} onChange={(e) => setNombreProfesor(e.target.value)} onBlur={handleProfesorBlur} placeholder="NOMBRE COMPLETO" required disabled={isEditing} style={{ textTransform: 'uppercase' }} />
                </div>
              </div>

              <div className={`${styles.formRow} ${styles.cols3}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="fecha">Fecha:</label>
                  {/* Deshabilitado en modo edición */}
                  <input id="fecha" type="date" value={fechaPractica} onChange={(e) => setFechaPractica(e.target.value)} required disabled={isEditing} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="horaInicio">Hora Inicio:</label>
                  {/* Deshabilitado en modo edición */}
                  <input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required disabled={isEditing} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="horaFin">Hora Fin (Auto):</label>
                  {/* PERMITIDO en modo edición */}
                  <input id="horaFin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
                </div>
              </div>

              <button type="button" className={styles.nextBtn} onClick={() => handleNext('academico')}>
                Siguiente ▼
              </button>
            </fieldset>
          </div>
        </div>

        {/* --- SECCIÓN 2: DATOS ACADÉMICOS --- */}
        <div className={styles.accordionItem}>
          <h3 className={styles.accordionHeader} onClick={() => setSeccionAbierta('academico')}>
            2. Datos Académicos (Carrera, Asignatura)
            <span style={{ transform: seccionAbierta === 'academico' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <div className={`${styles.accordionContent} ${seccionAbierta === 'academico' ? styles.open : ''}`}>
            <fieldset>
              <div className={`${styles.formRow} ${styles.cols2}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="carrera">Carrera:</label>
                  {/* Deshabilitado en modo edición */}
                  <select id="carrera" value={carrera} onChange={handleCarreraChange} required disabled={isEditing}> {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)} </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="asignatura">Asignatura:</label>
                  {/* PERMITIDO en modo edición */}
                  <select id="asignatura" value={asignatura} onChange={(e) => setAsignatura(e.target.value)} required> <option value="">-- Selecciona Asignatura --</option> {(ASIGNATURAS[carrera] || []).map(asig => ( <option key={asig} value={asig}>{asig}</option> ))} </select>
                </div>
              </div>
              <div className={`${styles.formRow} ${styles.cols2}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="grupo">Grupo:</label>
                  {/* PERMITIDO en modo edición */}
                  <input id="grupo" type="text" value={grupo} onChange={(e) => setGrupo(e.target.value.toUpperCase())} placeholder="Ej. 5M1 (default: 0A)" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="noAlumnos">No. Alumnos (1-30):</label>
                  {/* Deshabilitado en modo edición */}
                  <input id="noAlumnos" type="number" value={noAlumnos} onChange={handleAlumnosChange} onBlur={handleAlumnosBlur} min="1" max="30" inputMode="numeric" pattern="[0-9]*" required disabled={isEditing} />
                </div>
              </div>
              <button type="button" className={styles.nextBtn} onClick={() => handleNext('detalles')}>
                Siguiente ▼
              </button>
            </fieldset>
          </div>
        </div>

        {/* --- SECCIÓN 3: DETALLES DE LA PRÁCTICA --- */}
        <div className={styles.accordionItem}>
          <h3 className={styles.accordionHeader} onClick={() => setSeccionAbierta('detalles')}>
            3. Equipos, Materiales y Objetivos
            <span style={{ transform: seccionAbierta === 'detalles' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <div className={`${styles.accordionContent} ${seccionAbierta === 'detalles' ? styles.open : ''}`}>
            <fieldset>
              <div className={`${styles.formRow} ${styles.cols1}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="nombrePractica">Nombre de la Práctica:</label>
                  {/* PERMITIDO en modo edición */}
                  <input id="nombrePractica" type="text" value={nombrePractica} onChange={(e) => setNombrePractica(e.target.value)} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Equipo Requerido (de Inventario):</label>
                  {/* PERMITIDO en modo edición */}
                  <CreatableSelect isMulti options={equipoOptions} value={selectedEquipos} onChange={(newValue) => setSelectedEquipos(newValue)} placeholder="Selecciona o escribe..." formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`} styles={reactSelectStyles} />
                </div>
                <div className={styles.formGroup}>
                  <label>Material Utilizado (de Inventario):</label>
                  {/* PERMITIDO en modo edición */}
                  <CreatableSelect isMulti options={materialOptions} value={selectedMateriales} onChange={(newValue) => setSelectedMateriales(newValue)} placeholder="Selecciona o escribe..." formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`} styles={reactSelectStyles} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="objetivo">Objetivo:</label>
                  {/* PERMITIDO en modo edición */}
                  <textarea id="objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={3} placeholder="Describe el objetivo de la práctica..." />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="observaciones">Observaciones:</label>
                  {/* PERMITIDO en modo edición */}
                  <textarea id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} placeholder="Añade notas o comentarios adicionales..." />
                </div>
              </div>

              {/* Botón dinámico */}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (isEditing ? 'Modificando...' : 'Registrando...') : (isEditing ? 'Guardar Modificaciones' : 'Registrar Práctica')}
              </button>
            </fieldset>
          </div>
        </div>
      </form>
    </div>
  );
}

export default RegistrarPractica;