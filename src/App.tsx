import { useState, useEffect, useRef } from 'react'
import { Toaster } from 'react-hot-toast'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo'
import RegistrarPractica from './components/RegistrarPractica'
import HistorialPracticas from './components/HistorialPracticas'
import Login from './components/Login'
import './App.css'

const API_URL = 'https://api-inventario.dejesus-ramirez-josue.workers.dev'

// --- DEFINICIÓN DE TIPOS ---
type Rol = 'admin' | 'ayudante' | 'ninguno'
interface Perfil { 
  username: string; 
  rol: Rol; 
  name: string; 
  email: string; 
  phone: string; 
}

type Vista = 'inventario' | 'prestamos' | 'historial-practicas' | 'registrar' | 'practica' | 'login' | 'config-perfil'

function App() {
  // Estado de Usuario y Sesión
  const [usuario, setUsuario] = useState<Perfil | null>(null)
  const [vista, setVista] = useState<Vista>('practica') 
  const [menuAbierto, setMenuAbierto] = useState(false)
  
  // Estados de Edición Originales
  const [editingPracticaId, setEditingPracticaId] = useState<number | null>(null)
  const [editingPrestamoUuid, setEditingPrestamoUuid] = useState<string | null>(null)

  // Estados de UI y Thresholds (Tiempos)
  const [showSettings, setShowSettings] = useState(false)
  const [expandirPerfiles, setExpandirPerfiles] = useState(false)
  const openTimer = useRef<NodeJS.Timeout | null>(null)
  const closeTimer = useRef<NodeJS.Timeout | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Lista de Perfiles Fijos para datos complementarios
  const listaPerfiles: Perfil[] = [
    { username: 'admin_itq', rol: 'admin', name: 'Administrador General', email: 'admin@itq.edu.mx', phone: '4421234567' },
    { username: 'ayudante_lab', rol: 'ayudante', name: 'Auxiliar de Laboratorio', email: 'ayudante@itq.edu.mx', phone: '4429876543' }
  ]

  useEffect(() => {
    // Verificación de sesión al cargar recuperando el ROL guardado
    const userLogueado = localStorage.getItem('logged_user')
    const rolLogueado = localStorage.getItem('logged_user_role') as Rol

    if (userLogueado && rolLogueado) {
      const p = listaPerfiles.find(x => x.username === userLogueado)
      if (p) {
        setUsuario({ ...p, rol: rolLogueado })
      } else {
        // Si no está en la lista fija, reconstruimos el perfil con el rol de la sesión
        setUsuario({
          username: userLogueado,
          rol: rolLogueado,
          name: userLogueado,
          email: 'S/D',
          phone: 'S/D'
        })
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
        if (closeTimer.current) clearTimeout(closeTimer.current)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- LÓGICA DE SETTINGS ---
  const handleMouseEnterSettings = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (!showSettings) {
      openTimer.current = setTimeout(() => setShowSettings(true), 1500)
    }
  }

  const handleMouseLeaveSettings = () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (showSettings) {
      closeTimer.current = setTimeout(() => {
        setShowSettings(false)
        setExpandirPerfiles(false)
      }, 3000)
    }
  }

  const handleSettingsClick = () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setShowSettings(!showSettings)
  }

  // --- HANDLERS DE LOGUEO Y NAVEGACIÓN ---
  const handleLoginSuccess = (data: any) => { 
    if (!data || !data.username) {
        console.error("Respuesta de servidor incompleta", data);
        return;
    }

    // Buscamos datos extra en la lista local, pero el ROL lo define el servidor
    const perfilLocal = listaPerfiles.find(x => x.username === data.username);
    
    const usuarioFinal: Perfil = perfilLocal ? {
        ...perfilLocal,
        rol: data.rol 
    } : {
        username: data.username,
        rol: data.rol, 
        name: data.username,
        email: 'S/D',
        phone: 'S/D'
    };

    setUsuario(usuarioFinal);
    localStorage.setItem('logged_user', usuarioFinal.username);
    localStorage.setItem('logged_user_role', usuarioFinal.rol); 
    setVista('practica');
  };

  const handleLogout = () => { 
    setUsuario(null)
    localStorage.removeItem('logged_user')
    localStorage.removeItem('logged_user_role')
    setVista('practica')
    setShowSettings(false)
  }

  const cambiarVista = (nuevaVista: Vista) => { 
    setVista(nuevaVista)
    if (nuevaVista !== 'practica') setEditingPracticaId(null)
    if (nuevaVista !== 'prestamos') setEditingPrestamoUuid(null)
    setMenuAbierto(false)
    setShowSettings(false)
  }

  const handleModificarPractica = (id: number) => { setEditingPracticaId(id); setVista('practica'); }
  const handlePracticaSaved = () => { setEditingPracticaId(null); setVista('historial-practicas'); }
  const handleModificarPrestamo = (uuid: string) => { setEditingPrestamoUuid(uuid); setVista('registrar'); }
  const handlePrestamoSaved = () => { setEditingPrestamoUuid(null); setVista('prestamos'); }

  return (
    <>
      <Toaster position="bottom-right" />

      <div className="admin-page-container">
        
        <nav className={`top-nav-pill ${menuAbierto ? 'menu-abierto' : ''}`}>
          
          <div className="nav-left">
            <button className="menu-toggle-btn" onClick={() => setMenuAbierto(!menuAbierto)}>
              {menuAbierto ? '✖' : '☰'}
            </button>
            <img src="/itq.png" alt="Logo ITQ" className="nav-logo" />
            <span className="nav-brand">Laboratorio (MCT)</span>
          </div>

          <ul className="nav-center">
            <li className="dropdown-container">
               <span className="dropdown-trigger">Registros ▾</span>
               <div className="dropdown-menu">
                  <button onClick={() => cambiarVista('practica')} className={vista === 'practica' ? 'active' : ''}>Práctica</button>
                  <button onClick={() => cambiarVista('registrar')} className={vista === 'registrar' ? 'active' : ''}>Préstamos</button>
               </div>
            </li>

            {usuario && (
              <li className="dropdown-container">
                  <span className="dropdown-trigger">Gestión ▾</span>
                  <div className="dropdown-menu">
                      <button onClick={() => cambiarVista('historial-practicas')} className={vista === 'historial-practicas' ? 'active' : ''}>Historial</button>
                      <button onClick={() => cambiarVista('prestamos')} className={vista === 'prestamos' ? 'active' : ''}>Préstamos</button>
                      {usuario.rol === 'admin' && (
                        <button onClick={() => cambiarVista('inventario')} className={vista === 'inventario' ? 'active' : ''}>Inventario</button>
                      )}
                  </div>
              </li>
            )}
          </ul>

          <div className="nav-right">
            <div className="settings-wrapper" ref={settingsRef} onMouseEnter={handleMouseEnterSettings} onMouseLeave={handleMouseLeaveSettings}>
              <button className={`settings-gear-btn ${showSettings ? 'active-gear' : ''}`} onClick={handleSettingsClick}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {showSettings && (
                <div className="settings-dropdown">
                  {usuario ? (
                    <>
                      <div className="settings-user-info">
                        <span className="user-role-label">MODO {usuario.rol.toUpperCase()}</span>
                        <h4 className="user-name-text">{usuario.username}</h4>
                      </div>
                      <div className="settings-divider"></div>
                      <button onClick={() => cambiarVista('config-perfil')} className="settings-item">Configuración de Perfil</button>
                      
                      <div className="accounts-switcher">
                        <button className="settings-item item-flex" onClick={(e) => { e.stopPropagation(); setExpandirPerfiles(!expandirPerfiles); }}>
                          Cambiar de cuenta <span>{expandirPerfiles ? '▲' : '▼'}</span>
                        </button>
                        {expandirPerfiles && (
                          <div className="accounts-list">
                            {listaPerfiles.map((p, i) => (
                              <div key={i} className={`acc-option ${p.username === usuario.username ? 'active-acc' : ''}`} onClick={() => { setUsuario(p); setExpandirPerfiles(false); }}>
                                 <div className="acc-meta">
                                    <strong>{p.username}</strong>
                                    <small>{p.email}</small>
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="settings-divider"></div>
                      <button onClick={handleLogout} className="logout-item">Cerrar Sesión</button>
                    </>
                  ) : (
                    <button onClick={() => cambiarVista('login')} className="settings-item">Ingresar</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="content-admin-page">
          {vista === 'practica' && (<RegistrarPractica apiUrl={API_URL} practicaId={editingPracticaId} onPracticaSaved={handlePracticaSaved} />)}
          {vista === 'registrar' && (<RegistrarPrestamo apiUrl={API_URL} solicitudUuid={editingPrestamoUuid} onPrestamoSaved={handlePrestamoSaved} />)}
          {vista === 'login' && !usuario && <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />}
          {usuario?.rol === 'admin' && vista === 'inventario' && <Inventario apiUrl={API_URL} />}
          {usuario && vista === 'prestamos' && (<Prestamos apiUrl={API_URL} onModificar={handleModificarPrestamo} />)}
          {usuario && vista === 'historial-practicas' && (<HistorialPracticas apiUrl={API_URL} onModificar={handleModificarPractica} />)}
          
          {vista === 'config-perfil' && usuario && (
            <div className="profile-config-page">
              <div className="profile-card">
                <h3>Información de Perfil</h3>
                <div className="profile-field">
                  <label>NOMBRE COMPLETO</label>
                  <p>{usuario.name}</p>
                </div>
                <div className="profile-field">
                  <label>CORREO INSTITUCIONAL</label>
                  <p>{usuario.email}</p>
                </div>
                <div className="profile-field">
                  <label>CELULAR DE CONTACTO</label>
                  <p>{usuario.phone}</p>
                </div>
                <button className="back-btn" onClick={() => setVista('practica')}>Volver al Tablero</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

export default App