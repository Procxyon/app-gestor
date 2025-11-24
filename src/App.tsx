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
  const [editingPracticaId, setEditingPracticaId] = useState<number | null>(null);
  const [editingPrestamoUuid, setEditingPrestamoUuid] = useState<string | null>(null);

  useEffect(() => {
    const adminLogueado = localStorage.getItem('admin_logged_in') === 'true'
    setIsAdmin(adminLogueado)
    if (!adminLogueado) {
      setVista('practica')
    } else {
       if (vista === 'login') setVista('inventario')
    }
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
    if (nuevaVista !== 'prestamos') {
      setEditingPrestamoUuid(null);
    }
    setMenuAbierto(false)
  }

  const handleModificarPractica = (id: number) => {
    setEditingPracticaId(id);
    setVista('practica');
  };
  
  const handlePracticaSaved = () => {
    setEditingPracticaId(null);
    setVista('historial-practicas');
  };

  const handleModificarPrestamo = (uuid: string) => {
    setEditingPrestamoUuid(uuid);
    setVista('registrar'); // Cambiamos a la vista de registro de préstamo
  };

  const handlePrestamoSaved = () => {
    setEditingPrestamoUuid(null);
    setVista('prestamos'); // Volvemos al historial
  };

  return (
    <>
      <Toaster 
        position="bottom-right" 
        reverseOrder={false}
        toastOptions={{ 
          style: { 
            background: '#1e222d', 
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 99999, 
          },
          success: {
            iconTheme: { primary: '#28a745', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc3545', secondary: '#fff' },
          },
        }} 
        containerStyle={{
           bottom: 40, /* Lo levantamos un poco para que no pegue al borde */
           right: 20,
        }}
      />

      {/* 2. CONTENEDOR PRINCIPAL DE LA APP */}
      <div className="admin-page-container">
        
        {/* BARRA DE NAVEGACIÓN SUPERIOR */}
        <nav className={`top-nav ${menuAbierto ? 'menu-abierto' : ''}`}>
          <div className="nav-title">
            <button
              className="menu-toggle-btn"
              onClick={() => setMenuAbierto((s) => !s)}
            >
              {menuAbierto ? '✖' : '☰'}
            </button>
            <span className="nav-title-text">
              Gestión Laboratorio
            </span>
          </div>

          <ul className="nav-links">
              
            {/* GRUPO 1: NUEVOS REGISTROS (Visible para todos) */}
            <li className="dropdown-container">
               <span className="dropdown-trigger">Nuevos Registros ▾</span>
               <div className="dropdown-menu">
                  <button onClick={() => cambiarVista('practica')} className={vista === 'practica' ? 'active' : ''}>
                      Práctica
                  </button>
                  <button onClick={() => cambiarVista('registrar')} className={vista === 'registrar' ? 'active' : ''}>
                      Préstamos
                  </button>
               </div>
            </li>

            {/* GRUPO 2: HISTORIAL (Solo Admin) */}
            {isAdmin && (
              <li className="dropdown-container">
                  <span className="dropdown-trigger">Historial ▾</span>
                  <div className="dropdown-menu">
                      <button onClick={() => cambiarVista('historial-practicas')} className={vista === 'historial-practicas' ? 'active' : ''}>
                          H. Prácticas
                      </button>
                      <button onClick={() => cambiarVista('prestamos')} className={vista === 'prestamos' ? 'active' : ''}>
                          H. Préstamos
                      </button>
                  </div>
              </li>
            )}

            {/* GRUPO 3: INVENTARIO (Solo Admin) */}
            {isAdmin && (
               <li className="dropdown-container">
                  <span className="dropdown-trigger">Inventario ▾</span>
                  <div className="dropdown-menu">
                      <button onClick={() => cambiarVista('inventario')} className={vista === 'inventario' ? 'active' : ''}>
                          Inventario General
                      </button>
                  </div>
              </li>
            )}

            {/* GRUPO 4: PERFIL / LOGIN */}
            <li className="dropdown-container profile-dropdown">
              <span className={`dropdown-trigger ${isAdmin ? 'admin-active' : ''}`}>
                  {isAdmin ? 'ADMIN ▾' : 'INGRESAR ▾'}
              </span>
              <div className="dropdown-menu right-aligned">
                  {!isAdmin ? (
                      <button onClick={() => cambiarVista('login')} className={vista === 'login' ? 'active' : ''}>
                          Ingresar
                      </button>
                  ) : (
                      <button onClick={handleLogout} className="logout-btn">
                          Salir
                      </button>
                  )}
              </div>
            </li>

          </ul>
        </nav>

        {/* ÁREA DE CONTENIDO PRINCIPAL */}
        <main className="content-admin-page">
          
          {/* Vista: Registro de Prácticas */}
          {vista === 'practica' && (
            <RegistrarPractica 
              apiUrl={API_URL} 
              practicaId={editingPracticaId} 
              onPracticaSaved={handlePracticaSaved} 
            />
          )}
          
          {/* Vista: Registro de Préstamos (Con modo edición) */}
          {vista === 'registrar' && (
              <RegistrarPrestamo 
                  apiUrl={API_URL} 
                  solicitudUuid={editingPrestamoUuid} 
                  onPrestamoSaved={handlePrestamoSaved} 
              />
          )}

          {/* Vista: Login */}
          {vista === 'login' && !isAdmin && <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />}
          
          {/* Vistas de Administrador */}
          {isAdmin && vista === 'inventario' && <Inventario apiUrl={API_URL} />}
          
          {isAdmin && vista === 'prestamos' && (
              <Prestamos 
                  apiUrl={API_URL} 
                  onModificar={handleModificarPrestamo} 
              />
          )}
          
          {isAdmin && vista === 'historial-practicas' && (
              <HistorialPracticas 
                  apiUrl={API_URL} 
                  onModificar={handleModificarPractica} 
              />
          )}
        </main>
      </div>
    </>
  )
}

export default App