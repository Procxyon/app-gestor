import { useState } from 'react'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'

// Pon la URL de tu Worker aquí
const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev' // <--- ¡CAMBIA ESTO!

function App() {
  const [vista, setVista] = useState<'inventario' | 'prestamos'>('inventario')

  return (
    <div className="app-container">
      <nav>
        {/* Esto simula tu primera imagen */}
        <button 
          onClick={() => setVista('inventario')}
          className={vista === 'inventario' ? 'active' : ''}
        >
          Inventario
        </button>
        <button 
          onClick={() => setVista('prestamos')}
          className={vista === 'prestamos' ? 'active' : ''}
        >
          Prestamos
        </button>
      </nav>

      <main>
        {vista === 'inventario' && <Inventario apiUrl={API_URL} />}
        {vista === 'prestamos' && <Prestamos apiUrl={API_URL} />}
      </main>
    </div>
  )
}

export default App