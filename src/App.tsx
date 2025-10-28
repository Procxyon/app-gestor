import { useState } from 'react'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo'
import './App.css' // Importamos los estilos de App

// La URL de tu API
const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev'

// Definimos los 3 tipos de vistas
type Vista = 'inventario' | 'prestamos' | 'registrar'

function App() {
  // El estado ahora empieza en 'inventario' y tiene 3 opciones
  const [vista, setVista] = useState<Vista>('inventario')

  return (
    <div className="app-container">
      <nav>
        {/* Botón 1: Inventario */}
        <button 
          onClick={() => setVista('inventario')}
          className={vista === 'inventario' ? 'active' : ''}
        >
          Inventario
        </button>
        
        {/* Botón 2: Historial de Préstamos */}
        <button 
          onClick={() => setVista('prestamos')}
          className={vista === 'prestamos' ? 'active' : ''}
        >
          Historial Préstamos
        </button>
        
        {/* ¡NUEVO BOTÓN! Para el formulario */}
        <button 
          onClick={() => setVista('registrar')}
          className={vista === 'registrar' ? 'active' : ''}
        >
          Registrar Préstamo
        </button>
      </nav>

      <main>
        {/* Renderizado condicional de los 3 componentes */}
        {vista === 'inventario' && <Inventario apiUrl={API_URL} />}
        {vista === 'prestamos' && <Prestamos apiUrl={API_URL} />}
        {vista === 'registrar' && <RegistrarPrestamo apiUrl={API_URL} />}
      </main>
    </div>
  )
}



export default App