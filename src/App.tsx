import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo'
import RegistrarPractica from './components/RegistrarPractica'
import HistorialPracticas from './components/HistorialPracticas'
import './App.css'

const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev'

// Definimos todas las vistas posibles
type Vista = 'inventario' | 'prestamos' | 'historial-practicas' | 'registrar' | 'practica'

function App() {
  const [vista, setVista] = useState<Vista>('inventario')

  const cambiarVista = (nuevaVista: Vista) => {
    setVista(nuevaVista);
  }

  return (
    <div className="admin-panel">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Panel de Admin</h3>
        </div>
        
        <nav className="sidebar-nav">
          {/* --- SECCIÓN 1: CONSULTAS --- */}
          <small style={{ color: '#888', marginTop: '15px', marginBottom: '5px' }}>CONSULTAS</small>
          
          <button 
            onClick={() => cambiarVista('inventario')}
            className={vista === 'inventario' ? 'active' : ''}
          >
          Inventario
          </button>
          <button 
            onClick={() => cambiarVista('prestamos')}
            className={vista === 'prestamos' ? 'active' : ''}
          >
          Historial Préstamos
          </button>
          <button 
            onClick={() => cambiarVista('historial-practicas')}
            className={vista === 'historial-practicas' ? 'active' : ''}
          >
          Historial Prácticas
          </button>

          {/* Separador visual */}
          <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #444', margin: '15px 0' }} />

          {/* --- SECCIÓN 2: REGISTROS --- */}
          <small style={{ color: '#888', marginBottom: '5px' }}>NUEVOS REGISTROS</small>
          
          <button 
            onClick={() => cambiarVista('registrar')}
            className={vista === 'registrar' ? 'active' : ''}
          >
            ➕ Préstamo (Alumno)
          </button>
          <button 
            onClick={() => cambiarVista('practica')}
            className={vista === 'practica' ? 'active' : ''}
          >
            ➕ Práctica (Profesor)
          </button>
        </nav>
      </aside>

      <main className="content">
        {vista === 'inventario' && <Inventario apiUrl={API_URL} />}
        {vista === 'prestamos' && <Prestamos apiUrl={API_URL} />}
        {vista === 'historial-practicas' && <HistorialPracticas apiUrl={API_URL} />}
        {vista === 'registrar' && <RegistrarPrestamo apiUrl={API_URL} />}
        {vista === 'practica' && <RegistrarPractica apiUrl={API_URL} />}
      </main>
      
    </div>
  )
}

export default App