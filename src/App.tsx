import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo'
import RegistrarPractica from './components/RegistrarPractica'
import HistorialPracticas from './components/HistorialPracticas'
import Login from './components/Login' // <-- IMPORTAMOS LOGIN
import './App.css'

const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev'

// Añadimos 'login' a las vistas posibles
type Vista = 'inventario' | 'prestamos' | 'historial-practicas' | 'registrar' | 'practica' | 'login'

function App() {
  // Estado de autenticación
  const [isAdmin, setIsAdmin] = useState(false);
  // La vista inicial por defecto ahora es 'practica' (para los profesores)
  const [vista, setVista] = useState<Vista>('practica');

  // Al cargar la app, revisamos si ya había iniciado sesión antes (persistencia)
  useEffect(() => {
    const adminLogueado = localStorage.getItem('admin_logged_in') === 'true';
    setIsAdmin(adminLogueado);
    // Si ya es admin, le mostramos el inventario por defecto, si no, la práctica
    if (adminLogueado) {
        setVista('inventario');
    }
  }, []);

  const handleLoginSuccess = () => {
      setIsAdmin(true);
      localStorage.setItem('admin_logged_in', 'true'); // Guardamos en el navegador
      setVista('inventario'); // Lo mandamos al inventario al entrar
  };

  const handleLogout = () => {
      setIsAdmin(false);
      localStorage.removeItem('admin_logged_in');
      setVista('practica'); // Lo regresamos a la vista pública
  };

  const cambiarVista = (nuevaVista: Vista) => {
    setVista(nuevaVista);
  }

  return (
    <div className="admin-panel">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>{isAdmin ? 'Panel Admin' : 'Laboratorio'}</h3>
        </div>
        
        <nav className="sidebar-nav">
          
          {/* --- MENÚ PARA ADMINISTRADORES (SOLO SE VE SI isAdmin es TRUE) --- */}
          {isAdmin && (
            <>
              <small style={{ color: '#888', marginTop: '15px', marginBottom: '5px' }}>ADMINISTRACIÓN</small>
              <button onClick={() => cambiarVista('inventario')} className={vista === 'inventario' ? 'active' : ''}>
              Inventario
              </button>
              <button onClick={() => cambiarVista('prestamos')} className={vista === 'prestamos' ? 'active' : ''}>
              Historial Préstamos
              </button>
              <button onClick={() => cambiarVista('historial-practicas')} className={vista === 'historial-practicas' ? 'active' : ''}>
              Historial Prácticas
              </button>
              <button onClick={() => cambiarVista('registrar')} className={vista === 'registrar' ? 'active' : ''}>
               Préstamo (Alumno)
              </button>
              
              <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #444', margin: '15px 0' }} />
            </>
          )}

          {/* --- MENÚ PÚBLICO (SIEMPRE VISIBLE) --- */}
          <small style={{ color: '#888', marginBottom: '5px' }}>PROFESORES</small>
          <button onClick={() => cambiarVista('practica')} className={vista === 'practica' ? 'active' : ''}>
          Registrar Práctica
          </button>

          {/* --- BOTÓN DE LOGIN / LOGOUT --- */}
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}> {/* Empuja hacia abajo */}
              {!isAdmin ? (
                  <button 
                    onClick={() => cambiarVista('login')} 
                    className={`login-btn ${vista === 'login' ? 'active' : ''}`}
                    style={{ backgroundColor: '#28a745', color: 'white', marginTop: '20px' }}
                  >
                  Iniciar Sesión Admin
                  </button>
              ) : (
                  <button 
                    onClick={handleLogout} 
                    style={{ backgroundColor: '#dc3545', color: 'white', marginTop: '20px' }}
                  >
                  Cerrar Sesión
                  </button>
              )}
          </div>

        </nav>
      </aside>

      <main className="content">
        {/* Renderizado condicional de vistas */}
        
        {/* Vistas PÚBLICAS */}
        {vista === 'practica' && <RegistrarPractica apiUrl={API_URL} />}
        {vista === 'login' && !isAdmin && <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />}

        {/* Vistas PRIVADAS (Solo si es Admin) */}
        {isAdmin && vista === 'inventario' && <Inventario apiUrl={API_URL} />}
        {isAdmin && vista === 'prestamos' && <Prestamos apiUrl={API_URL} />}
        {isAdmin && vista === 'historial-practicas' && <HistorialPracticas apiUrl={API_URL} />}
        {isAdmin && vista === 'registrar' && <RegistrarPrestamo apiUrl={API_URL} />}
        
        {/* Si intenta acceder a algo privado sin ser admin, lo redirige al login */}
        {!isAdmin && vista !== 'practica' && vista !== 'login' && (
            <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>
                <h2>Acceso Restringido</h2>
                <p>Por favor inicia sesión como administrador.</p>
            </div>
        )}

      </main>
      
    </div>
  )
}

export default App