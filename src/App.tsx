import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo'
import RegistrarPractica from './components/RegistrarPractica'
import HistorialPracticas from './components/HistorialPracticas'
import Login from './components/Login'
import './App.css'

const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev'

type Vista = 'inventario' | 'prestamos' | 'historial-practicas' | 'registrar' | 'practica' | 'login'

function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [vista, setVista] = useState<Vista>('practica')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  
  // Estado para manejar la edición
  const [editingPracticaId, setEditingPracticaId] = useState<number | null>(null);

  useEffect(() => {
    const adminLogueado = localStorage.getItem('admin_logged_in') === 'true'
    setIsAdmin(adminLogueado)
    if (adminLogueado) {
      setVista('inventario') 
    } else {
      setVista('practica')
    }
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setMenuAbierto(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLoginSuccess = () => {
    setIsAdmin(true)
    localStorage.setItem('admin_logged_in', 'true')
    setVista('inventario')
  }

  const handleLogout = () => {
    setIsAdmin(false)
    localStorage.removeItem('admin_logged_in')
    setVista('practica')
  }

  const cambiarVista = (nuevaVista: Vista) => {
    setVista(nuevaVista)
    if (nuevaVista !== 'practica') {
      setEditingPracticaId(null);
    }
    if (window.innerWidth <= 768) { 
        setMenuAbierto(false)
    }
  }

  // Función para iniciar la edición
  const handleModificarPractica = (id: number) => {
    setEditingPracticaId(id);
    setVista('practica');
  };
  
  // Función para terminar la edición
  const handlePracticaSaved = () => {
    setEditingPracticaId(null);
    setVista('historial-practicas');
  };

  return (
    <div className="admin-page-container">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />

      <nav className={`top-nav ${menuAbierto ? 'menu-abierto' : ''}`}>
        <div className="nav-title">
          {window.innerWidth <= 768 && (
            <button
              className="menu-toggle-btn"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenuAbierto((s) => !s)}
            >
              {menuAbierto ? '✖' : '☰'}
            </button>
          )}
          <span className="nav-title-text">
            {vista === 'login'
              ? 'Acceso Administrativo'
              : isAdmin
              ? 'Panel de Administración'
              : 'Gestión de Laboratorio'} 
          </span>
        </div>

        <ul className="nav-links" role="menu">
          {isAdmin && (
            <>
              <li><button onClick={() => cambiarVista('inventario')} className={vista === 'inventario' ? 'active' : ''}>Inventario</button></li>
              <li><button onClick={() => cambiarVista('prestamos')} className={vista === 'prestamos' ? 'active' : ''}>Historial Préstamos</button></li>
              <li><button onClick={() => cambiarVista('historial-practicas')} className={vista === 'historial-practicas' ? 'active' : ''}>Historial Prácticas</button></li>
            </>
          )}
          <li><button onClick={() => cambiarVista('practica')} className={vista === 'practica' ? 'active' : ''}>
            {editingPracticaId ? 'Modificar Práctica' : 'Registrar Práctica'}
          </button></li>
          <li><button onClick={() => cambiarVista('registrar')} className={vista === 'registrar' ? 'active' : ''}>Registrar Préstamo</button></li>
          <li>
            {!isAdmin ? (
              <button onClick={() => cambiarVista('login')} className={`nav-login-button ${vista === 'login' ? 'active' : ''}`}>LOGIN</button>
            ) : (
              <button onClick={handleLogout} className="nav-logout-button">LOGOUT</button>
            )}
          </li>
        </ul>
      </nav>

      <main className="content-admin-page">
        {vista === 'practica' && (
          <RegistrarPractica 
            apiUrl={API_URL} 
            practicaId={editingPracticaId}
            onPracticaSaved={handlePracticaSaved}
          />
        )}
        
        {vista === 'registrar' && <RegistrarPrestamo apiUrl={API_URL} />}
        {vista === 'login' && !isAdmin && <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />}
        
        {isAdmin && vista === 'inventario' && <Inventario apiUrl={API_URL} />}
        {isAdmin && vista === 'prestamos' && <Prestamos apiUrl={API_URL} />}
        
        {isAdmin && vista === 'historial-practicas' && (
          <HistorialPracticas 
            apiUrl={API_URL} 
            onModificar={handleModificarPractica} 
          />
        )}
        
        {!isAdmin && (vista === 'inventario' || vista === 'prestamos' || vista === 'historial-practicas') && (
          <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />
        )}
      </main>
    </div>
  )
}

export default App