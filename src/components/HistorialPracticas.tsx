import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

// Interfaz que coincide con la estructura que creamos en el backend
interface Practica {
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
  equipos: string[];    // Array de strings
  materiales: string[]; // Array de strings
}

interface HistorialPracticasProps {
  apiUrl: string;
}

function HistorialPracticas({ apiUrl }: HistorialPracticasProps) {
  const [practicas, setPracticas] = useState<Practica[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProfesor, setFiltroProfesor] = useState('');

  // --- Cargar Datos ---
  const fetchPracticas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/practicas`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setPracticas(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el historial de prácticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPracticas();
  }, [apiUrl]);

  // --- Borrar Práctica ---
  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de borrar este registro de práctica?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/practicas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al borrar');
      toast.success('Registro eliminado');
      fetchPracticas(); // Recargar lista
    } catch (error) {
      toast.error('Error al eliminar el registro');
    }
  };

  // --- Exportar a Excel ---
  const handleExport = () => {
    if (practicas.length === 0) return toast.error("No hay datos para exportar");
    
    // Aplanamos los datos para que se vean bien en Excel
    const dataToExport = practicas.map(p => ({
      ID: p.id,
      Profesor: p.nombre_profesor,
      "No. Práctica": p.no_practica,
      Nombre: p.nombre_practica,
      Fecha: p.fecha_practica,
      Horario: `${p.hora_inicio} - ${p.hora_fin}`,
      Carrera: p.carrera,
      Asignatura: p.asignatura,
      Grupo: p.grupo,
      Alumnos: p.no_alumnos,
      // Unimos los arrays con comas para que quepan en una celda de Excel
      "Equipos Solicitados": p.equipos.join(', '),
      "Materiales Usados": p.materiales.join(', '),
      Objetivo: p.objetivo,
      Observaciones: p.observaciones
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Prácticas");
    XLSX.writeFile(wb, "historial_practicas.xlsx");
    toast.success("Historial exportado");
  };

  // --- Filtrado ---
  const practicasFiltradas = practicas.filter(p => 
    p.nombre_profesor.toLowerCase().includes(filtroProfesor.toLowerCase())
  );

  if (loading) return <p>Cargando historial...</p>;

  return (
    <div className="lista-prestamos-container"> {/* Reusamos el contenedor de estilos */}
      <h2>Historial de Prácticas de Laboratorio</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Filtrar por Profesor..." 
          value={filtroProfesor}
          onChange={(e) => setFiltroProfesor(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#eee', width: '300px' }}
        />
        <button onClick={handleExport} className="export-btn">Exportar a Excel</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Profesor</th>
              <th>Práctica</th>
              <th>Fecha / Hora</th>
              <th>Grupo / Asig.</th>
              <th>Equipos</th>
              <th>Materiales</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {practicasFiltradas.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  <strong>{p.nombre_profesor}</strong><br/>
                  <small>(No. {p.no_practica})</small>
                </td>
                <td title={p.objetivo}>{p.nombre_practica}</td>
                <td>
                  {new Date(p.fecha_practica).toLocaleDateString()}<br/>
                  <small>{p.hora_inicio} - {p.hora_fin}</small>
                </td>
                <td>
                  {p.asignatura}<br/>
                  <small>{p.carrera} ({p.grupo})</small>
                </td>
                
                {/* Mostramos los items como pequeñas listas o contadores */}
                <td>
                  <details>
                    <summary>{p.equipos.length} Equipos</summary>
                    <ul style={{textAlign: 'left', margin: '5px 0 0 15px', padding: 0, fontSize: '0.9em'}}>
                      {p.equipos.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                </td>
                <td>
                  <details>
                    <summary>{p.materiales.length} Materiales</summary>
                    <ul style={{textAlign: 'left', margin: '5px 0 0 15px', padding: 0, fontSize: '0.9em'}}>
                       {p.materiales.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </details>
                </td>

                <td>
                  <button 
                    onClick={() => handleDelete(p.id)} 
                    className="delete-all-btn" 
                    style={{ padding: '5px 10px', fontSize: '0.8em' }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistorialPracticas;