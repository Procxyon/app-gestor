import { useState } from 'react'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo' 
import './App.css' // Importamos los estilos

// La URL de tu API
const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev'

// Definimos los 3 tipos de vistas
type Vista = 'inventario' | 'prestamos' | 'registrar'

function App() {
  // El estado ahora empieza en 'inventario' y tiene 3 opciones
  const [vista, setVista] = useState<Vista>('inventario')

  // Función para cambiar de vista (la usaremos en los botones)
  const cambiarVista = (nuevaVista: Vista) => {
    setVista(nuevaVista);
  }

  return (
    // Contenedor principal del panel
    <div className="admin-panel">
      
      {/* --- 1. BARRA LATERAL (SIDEBAR) --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Panel de Admin</h3>
        </div>
        <nav className="sidebar-nav">
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
            onClick={() => cambiarVista('registrar')}
            className={vista === 'registrar' ? 'active' : ''}
          >
            Registrar Préstamo
          </button>
        </nav>
      </aside>

      {/* --- 2. CONTENIDO PRINCIPAL --- */}
      <main className="content">
        {/* El contenido cambia según la vista seleccionada */}
        {vista === 'inventario' && <Inventario apiUrl={API_URL} />}
        {vista === 'prestamos' && <Prestamos apiUrl={API_URL} />}
        {vista === 'registrar' && <RegistrarPrestamo apiUrl={API_URL} />}
      </main>
      
    </div>
  )
}

export default App