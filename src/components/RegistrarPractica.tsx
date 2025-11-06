import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select'; // <-- ¡CORRECCIÓN AQUÍ! (Añadido 'type')
import toast from 'react-hot-toast';

// --- DATOS ESTÁTICOS (CARRERAS Y ASIGNATURAS) ---
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
interface RegistrarPracticaProps { apiUrl: string; }

function RegistrarPractica({ apiUrl }: RegistrarPracticaProps) {
  const [nombreProfesor, setNombreProfesor] = useState('');
  const [fechaPractica, setFechaPractica] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [carrera, setCarrera] = useState('Ingeniería Mecatrónica');
  const [asignatura, setAsignatura] = useState('');
  const [grupo, setGrupo] = useState('0A');
  const [noPractica, setNoPractica] = useState(1);
  const [noAlumnos, setNoAlumnos] = useState(1);
  const [nombrePractica, setNombrePractica] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [equipoOptions, setEquipoOptions] = useState<Option[]>([]);
  const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
  const [selectedEquipos, setSelectedEquipos] = useState<MultiValue<Option>>([]);
  const [selectedMateriales, setSelectedMateriales] = useState<MultiValue<Option>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInventario = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/inventario?public=true`);
        const data = await res.json();
        if (Array.isArray(data)) {
           const options = data.map((item: any) => ({ label: item.nombre_equipo, value: item.nombre_equipo }));
           setEquipoOptions(options); setMaterialOptions(options);
        }
      } catch (error) { console.error("Error al cargar inventario para sugerencias:", error); }
    };
    fetchInventario();
  }, [apiUrl]);

  const handleProfesorBlur = async () => {
    if (!nombreProfesor.trim()) return;
    const nombreMayus = nombreProfesor.toUpperCase();
    setNombreProfesor(nombreMayus);
    try {
      const res = await fetch(`${apiUrl}/api/profesor/${encodeURIComponent(nombreMayus)}/ultima-practica`);
      if (res.ok) {
        const data = await res.json();
        setNoPractica((data.ultimo_no_practica || 0) + 1);
        toast(`Siguiente práctica: #${(data.ultimo_no_practica || 0) + 1}`, { icon: '🔢' });
      }
    } catch (error) { console.error("Error al obtener última práctica:", error); }
  };

  const handleCarreraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCarrera(e.target.value); setAsignatura('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreProfesor || !fechaPractica || !horaInicio || !horaFin || !asignatura || !nombrePractica) {
      toast.error("Completa todos los campos obligatorios."); return;
    }
    if (selectedEquipos.length === 0 && selectedMateriales.length === 0) {
      toast.error("Añade al menos un Equipo o Material."); return;
    }

    setLoading(true);
    const formData = {
      nombre_profesor: nombreProfesor.toUpperCase().trim(), fecha_practica: fechaPractica, hora_inicio: horaInicio, hora_fin: horaFin, carrera: carrera, asignatura: asignatura, grupo: grupo, no_practica: noPractica, no_alumnos: noAlumnos, nombre_practica: nombrePractica.trim(), objetivo: objetivo.trim(), observaciones: observaciones.trim(),
      equipo_requerido: selectedEquipos.map(option => option.value), material_utilizado: selectedMateriales.map(option => option.value)
    };

    try {
      const response = await fetch(`${apiUrl}/api/practicas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.err || 'Error al registrar'); }
      
      toast.success("¡Práctica registrada con éxito!");
      setNombrePractica(''); setObjetivo(''); setObservaciones(''); setSelectedEquipos([]); setSelectedMateriales([]); setNoPractica(prev => prev + 1);
    } catch (error) {
      console.error("Error al enviar:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="formulario-container">
      <h2>Registrar Nueva Práctica</h2>
      <form onSubmit={handleSubmit} className="formulario-prestamo">
        <fieldset>
          <legend>Datos Generales</legend>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nombre del Profesor:</label>
              <input type="text" value={nombreProfesor} onChange={(e) => setNombreProfesor(e.target.value)} onBlur={handleProfesorBlur} placeholder="NOMBRE COMPLETO" required style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label>No. Práctica:</label>
              <input type="number" value={noPractica} onChange={(e) => setNoPractica(parseInt(e.target.value) || 1)} min="1" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"> <label>Fecha:</label> <input type="date" value={fechaPractica} onChange={(e) => setFechaPractica(e.target.value)} required /> </div>
            <div className="form-group"> <label>Hora Inicio:</label> <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required /> </div>
            <div className="form-group"> <label>Hora Fin:</label> <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required /> </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Datos Académicos</legend>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Carrera:</label>
              <select value={carrera} onChange={handleCarreraChange} required> {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)} </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Asignatura:</label>
              <select value={asignatura} onChange={(e) => setAsignatura(e.target.value)} required> <option value="">-- Selecciona Asignatura --</option> {(ASIGNATURAS[carrera] || []).map(asig => ( <option key={asig} value={asig}>{asig}</option> ))} </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"> <label>Grupo:</label> <select value={grupo} onChange={(e) => setGrupo(e.target.value)}> <option value="0A">0A</option> <option value="0B">0B</option> <option value="0C">0C</option> </select> </div>
            <div className="form-group"> <label>No. Alumnos:</label> <input type="number" value={noAlumnos} onChange={(e) => setNoAlumnos(parseInt(e.target.value) || 1)} min="1" required /> </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Detalles de la Práctica</legend>
          <div> <label>Nombre de la Práctica:</label> <input type="text" value={nombrePractica} onChange={(e) => setNombrePractica(e.target.value)} required /> </div>
          <div style={{ marginBottom: '15px' }}> <label>Equipo Requerido (Escribe para buscar o crear nuevo):</label> <CreatableSelect isMulti options={equipoOptions} value={selectedEquipos} onChange={(newValue) => setSelectedEquipos(newValue)} placeholder="Selecciona o escribe..." formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`} styles={{ control: (base) => ({ ...base, backgroundColor: '#333', borderColor: '#555', color: '#eee' }), menu: (base) => ({ ...base, backgroundColor: '#333', color: '#eee' }), option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#007bff' : '#333', color: '#eee' }), multiValue: (base) => ({ ...base, backgroundColor: '#004a7c' }), multiValueLabel: (base) => ({ ...base, color: '#eee' }), input: (base) => ({ ...base, color: '#eee' }), }} /> </div>
          <div style={{ marginBottom: '15px' }}> <label>Material Utilizado:</label> <CreatableSelect isMulti options={materialOptions} value={selectedMateriales} onChange={(newValue) => setSelectedMateriales(newValue)} placeholder="Selecciona o escribe..." formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`} styles={{ control: (base) => ({ ...base, backgroundColor: '#333', borderColor: '#555', color: '#eee' }), menu: (base) => ({ ...base, backgroundColor: '#333', color: '#eee' }), option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#007bff' : '#333', color: '#eee' }), multiValue: (base) => ({ ...base, backgroundColor: '#004a7c' }), multiValueLabel: (base) => ({ ...base, color: '#eee' }), input: (base) => ({ ...base, color: '#eee' }), }} /> </div>
          <div> <label>Objetivo:</label> <textarea value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#eee', border: '1px solid #555', borderRadius: '4px' }} /> </div>
          <div> <label>Observaciones:</label> <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#eee', border: '1px solid #555', borderRadius: '4px' }} /> </div>
        </fieldset>
        <button type="submit" className="submit-btn" disabled={loading}> {loading ? 'Registrando...' : 'Registrar Práctica'} </button>
      </form>
    </div>
  );
}

export default RegistrarPractica;