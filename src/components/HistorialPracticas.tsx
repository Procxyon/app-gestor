import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import styles from './HistorialPracticas.module.css';

// ... (Interfaz de Practica sin cambios) ...
interface Practica {
  id: number;
  nombre_profesor: string;
  fecha_practica: string;
  hora_inicio: string;
  hora_fin: string | null;
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

interface HistorialPracticasProps {
  apiUrl: string;
  onModificar: (id: number) => void;
}

function HistorialPracticas({ apiUrl, onModificar }: HistorialPracticasProps) {
  const [practicas, setPracticas] = useState<Practica[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProfesor, setFiltroProfesor] = useState('');
  const menuRefs = useRef<Map<number, HTMLDetailsElement>>(new Map());

// --- Cargar Datos (CORREGIDO PARA EVITAR CACHÉ) ---
  const fetchPracticas = async () => {
    setLoading(true);
    try {
      // AGREGAMOS ESTAS OPCIONES PARA EVITAR QUE EL NAVEGADOR MUESTRE DATOS VIEJOS
      const res = await fetch(`${apiUrl}/api/practicas`, {
        cache: 'no-store', // Le dice al navegador: "No guardes esto, pídelo de nuevo siempre"
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
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

  // --- Entregar Material ---
  const handleEntregarMateriales = async (uuid: string | null) => {
    if (!uuid) {
      toast.error("Esta práctica no tiene un préstamo de material asociado.");
      return;
    }
    if (!window.confirm("¿Confirmar la devolución de TODO el material de esta práctica?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/solicitud/${uuid}/devolver`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.err || data.message || 'Error en el servidor');
      }
      toast.success(data.message || '¡Material devuelto con éxito!');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`No se pudo devolver el material: ${msg}`);
    }
  };

  // --- Modificar ---
  const handleModificar = (id: number) => {
    onModificar(id);
  };

  // --- Borrar Uno ---
  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de borrar este registro de práctica?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/practicas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al borrar');
      toast.success('Registro eliminado');
      fetchPracticas();
    } catch (error) {
      toast.error('Error al eliminar el registro');
    }
  };
  
  // --- CORRECCIÓN EN HistorialPracticas.tsx ---

 const handleDeleteAllPracticas = async () => {
    if (!window.confirm("¿ESTÁS SEGURO DE QUE QUIERES BORRAR TODO EL HISTORIAL DE PRÁCTICAS?")) return;
    if (!window.confirm("¡¡ADVERTENCIA FINAL!! Esta acción es irreversible. ¿Deseas continuar?")) return;
    
    const toastId = toast.loading('Borrando historial...');

    try {
      // --- CAMBIO AQUÍ: USAR LA NUEVA RUTA ---
      const res = await fetch(`${apiUrl}/api/reset/practicas`, { 
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.err || 'Error al borrar historial');
      }

      setPracticas([]); 
      toast.success('Historial de prácticas borrado', { id: toastId });
      fetchPracticas(); 

    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, { id: toastId });
    }
  };

  // --- Manejo de Menús ---
  const setMenuRef = (id: number, el: HTMLDetailsElement | null) => {
    if (el) { menuRefs.current.set(id, el); } 
    else { menuRefs.current.delete(id); }
  };
  const handleMenuClick = (id: number) => {
    menuRefs.current.forEach((el, key) => {
      if (key !== id && el.open) {
        el.open = false;
      }
    });
  };
  
// --- Exportar a Excel (COMPLETO CON TODOS LOS DATOS) ---
  const handleExport = () => {
    if (practicas.length === 0) { toast.error("No hay datos para exportar."); return; }
    
    const dataToExport = practicas.map(p => ({
        "ID Registro": p.id,
        "Folio Solicitud (UUID)": p.solicitud_uuid || 'Sin Material', // Dato técnico vital para cruzar con préstamos
        "No. Práctica": p.no_practica,
        "Profesor": p.nombre_profesor,
        "Práctica": p.nombre_practica,
        "Fecha": new Date(p.fecha_practica).toLocaleDateString(),
        "Hora Inicio": p.hora_inicio,
        "Hora Fin": p.hora_fin || 'N/A',
        "Carrera": p.carrera,
        "Asignatura": p.asignatura,
        "Grupo": p.grupo,
        "No. Alumnos": p.no_alumnos,
        "Equipos (Salones/Mesas)": p.equipos.join(', '),
        "Materiales (Inventario)": p.materiales.join(', '),
        "Objetivo": p.objetivo,
        "Observaciones": p.observaciones
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    // Ajustamos anchos de columna para que se lea bien
    ws['!cols'] = [
      { wch: 10 }, // ID
      { wch: 30 }, // UUID
      { wch: 12 }, // No Practica
      { wch: 30 }, // Profesor
      { wch: 30 }, // Nombre Practica
      { wch: 12 }, // Fecha
      { wch: 10 }, // Hora I
      { wch: 10 }, // Hora F
      { wch: 25 }, // Carrera
      { wch: 25 }, // Asignatura
      { wch: 10 }, // Grupo
      { wch: 12 }, // Alumnos
      { wch: 40 }, // Equipos
      { wch: 40 }, // Materiales
      { wch: 50 }, // Objetivo
      { wch: 50 }  // Observaciones
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Completo");
    XLSX.writeFile(wb, `Historial_Practicas_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };
  
  // --- Filtrado ---
  const practicasFiltradas = practicas.filter(p => 
    p.nombre_profesor.toLowerCase().includes(filtroProfesor.toLowerCase())
  );

  if (loading) return <p>Cargando historial...</p>;

  return (
    <div className={styles.appContainer}>
      <header>
        <h2>Historial de Prácticas de Laboratorio</h2>
      </header>
      
      <div className={styles.controls}>
        <input 
          type="text" 
          placeholder="Filtrar por Profesor..." 
          value={filtroProfesor}
          onChange={(e) => setFiltroProfesor(e.target.value)}
        />
        <div className={styles.buttonGroup}>
          <button onClick={handleExport} className={styles.exportBtn}>Exportar a Excel</button>
          <button onClick={handleDeleteAllPracticas} className={styles.deleteAllBtn}>
            Borrar Historial
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              {/* COLUMNA ID ELIMINADA VISUALMENTE */}
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
                {/* CELDA ID ELIMINADA VISUALMENTE */}
                <td>
                  <strong>{p.nombre_profesor}</strong><br/>
                  <small>(No. {p.no_practica})</small>
                </td>
                <td title={p.objetivo}>{p.nombre_practica}</td>
                <td>
                  {new Date(p.fecha_practica).toLocaleDateString()}<br/>
                  <small>{p.hora_inicio} - {p.hora_fin || 'N/A'}</small>
                </td>
                <td>
                  {p.asignatura}<br/>
                  <small>{p.carrera} ({p.grupo})</small>
                </td>
                <td>
                  <details>
                    <summary>{p.equipos.length} Equipos</summary>
                    <ul>
                      {p.equipos.length > 0 ? (
                        p.equipos.map((e, i) => <li key={i}>{e}</li>)
                      ) : ( <li>N/A</li> )}
                    </ul>
                  </details>
                </td>
                <td>
                  <details>
                    <summary>{p.materiales.length} Materiales</summary>
                    <ul>
                      {p.materiales.length > 0 ? (
                        p.materiales.map((m, i) => <li key={i}>{m}</li>)
                      ) : ( <li>N/A</li> )}
                    </ul>
                  </details>
                </td>
                <td className={styles.actionsCell}>
                  <details 
                    className={styles.actionsMenu}
                    ref={(el) => setMenuRef(p.id, el)}
                    onClick={() => handleMenuClick(p.id)}
                  >
                    <summary className={styles.menuToggle}>☰</summary>
                    <div className={styles.menuDropdown}>
                      <button 
                        className={styles.menuButton}
                        onClick={() => handleEntregarMateriales(p.solicitud_uuid)}
                        disabled={!p.solicitud_uuid}
                        title={!p.solicitud_uuid ? "No hay material de préstamo" : "Devolver material"}
                      >
                        Entregar Material
                      </button>
                      <button 
                        className={styles.menuButton}
                        onClick={() => handleModificar(p.id)}
                      >
                        Modificar
                      </button>
                      <button 
                        className={`${styles.menuButton} ${styles.delete}`}
                        onClick={() => handleDelete(p.id)}
                      >
                        Borrar
                      </button>
                    </div>
                  </details>
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