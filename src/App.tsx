import { useState, useEffect, useRef } from 'react'
import { Toaster } from 'react-hot-toast'
import Inventario from './components/Inventario'
import Prestamos from './components/Prestamos'
import RegistrarPrestamo from './components/RegistrarPrestamo'
import RegistrarPractica from './components/RegistrarPractica'
import HistorialPracticas from './components/HistorialPracticas'
import Login from './components/Login'
import './App.css'
import Metricas from './components/Metricas'

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

type Vista = 'inventario' | 'prestamos' | 'historial-practicas' | 'registrar' | 'practica' | 'login' | 'config-perfil' | 'metricas'
type Seccion = 'registros' | 'historiales' | 'gestion' | 'config'

function App() {
  // --- ESTADOS ---
  const [usuario, setUsuario] = useState<Perfil | null>(null)
  const [vista, setVista] = useState<Vista>('practica')
  const [seccionActiva, setSeccionActiva] = useState<Seccion>('registros') 
  
  // Estados de Edición
  const [editingPracticaId, setEditingPracticaId] = useState<number | null>(null)
  const [editingPrestamoUuid, setEditingPrestamoUuid] = useState<string | null>(null)

  // Estados UI
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [dropdownSettingsOpen, setDropdownSettingsOpen] = useState(false)
  const [expandirPerfiles, setExpandirPerfiles] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const listaPerfiles: Perfil[] = [
    { username: 'admin_itq', rol: 'admin', name: 'Administrador General', email: 'admin@itq.edu.mx', phone: '4421234567' },
    { username: 'ayudante_lab', rol: 'ayudante', name: 'Auxiliar de Laboratorio', email: 'ayudante@itq.edu.mx', phone: '4429876543' }
  ]
    
  useEffect(() => {
    const userLogueado = localStorage.getItem('logged_user')
    const rolLogueado = localStorage.getItem('logged_user_role') as Rol

    if (userLogueado && rolLogueado) {
      const p = listaPerfiles.find(x => x.username === userLogueado)
      setUsuario(p ? { ...p, rol: rolLogueado } : {
        username: userLogueado, rol: rolLogueado, name: userLogueado, email: 'S/D', phone: 'S/D'
      })
    }
    // Listener para cerrar settings al hacer click fuera
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setDropdownSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- LÓGICA DE NAVEGACIÓN Y PERMISOS ---
  const cambiarSeccion = (seccion: Seccion) => {
    // Si NO hay usuario y trata de ir a secciones protegidas, forzamos registros
    if (!usuario && (seccion === 'historiales' || seccion === 'gestion')) {
       setSeccionActiva('registros');
       setVista('practica');
       return;
    }

    setSeccionActiva(seccion)
    setEditingPracticaId(null)
    setEditingPrestamoUuid(null)
    setMenuAbierto(false)
    
    // Lógica de vista por defecto según rol
    switch (seccion) {
      case 'registros':
        setVista('practica')
        break;
      case 'historiales':
        // --- CAMBIO APLICADO AQUÍ: El default ahora es 'prestamos' (Material) ---
        setVista('prestamos')
        break;
      case 'gestion':
        // Lógica inteligente: Si es Ayudante, NO puede ver inventario, va a Métricas
        if (usuario?.rol === 'admin') {
            setVista('inventario')
        } else {
            setVista('metricas')
        }
        break;
    }
  }

  // --- LÓGICA STANDBY ---
  const abrirSettings = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setDropdownSettingsOpen(true)
  }

  const cerrarSettingsConDelay = () => {
    timerRef.current = setTimeout(() => {
      setDropdownSettingsOpen(false)
      setExpandirPerfiles(false)
    }, 800)
  }

  const toggleSettingsClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setDropdownSettingsOpen(!dropdownSettingsOpen)
  }

  // --- HANDLERS ---
  const handleLoginSuccess = (data: any) => { 
    if (!data || !data.username) return;
    const perfilLocal = listaPerfiles.find(x => x.username === data.username);
    const usuarioFinal: Perfil = perfilLocal ? { ...perfilLocal, rol: data.rol } : {
        username: data.username, rol: data.rol, name: data.username, email: 'S/D', phone: 'S/D'
    };
    setUsuario(usuarioFinal);
    localStorage.setItem('logged_user', usuarioFinal.username);
    localStorage.setItem('logged_user_role', usuarioFinal.rol); 
    setVista('practica');
    setSeccionActiva('registros');
  };

  const handleLogout = () => { 
    setUsuario(null)
    localStorage.removeItem('logged_user')
    localStorage.removeItem('logged_user_role')
    
    // Al salir, forzamos ir a la vista pública
    setVista('practica')
    setSeccionActiva('registros')
    setDropdownSettingsOpen(false)
  }

  const handleModificarPractica = (id: number) => { 
    setEditingPracticaId(id); 
    setSeccionActiva('registros'); 
    setVista('practica'); 
  }
  const handlePracticaSaved = () => { 
    setEditingPracticaId(null); 
    setSeccionActiva('historiales'); 
    setVista('historial-practicas'); 
  }
  const handleModificarPrestamo = (uuid: string) => { 
    setEditingPrestamoUuid(uuid); 
    setSeccionActiva('registros');
    setVista('registrar'); 
  }
  const handlePrestamoSaved = () => { 
    setEditingPrestamoUuid(null); 
    setSeccionActiva('historiales');
    setVista('prestamos'); 
  }

 return (
    <>
      <Toaster position="bottom-right" />
      <div className="admin-page-container">
        
        {/* --- HEADER PRINCIPAL --- */}
        <nav className={`top-nav-pill ${menuAbierto ? 'menu-abierto' : ''}`}>
          <div className="nav-left">
            <button className="menu-toggle-btn" onClick={() => setMenuAbierto(!menuAbierto)}>
              {menuAbierto ? '✖' : '☰'}
            </button>
            <img src="/itq.png" alt="Logo ITQ" className="nav-logo" />
            <span className="nav-brand">Laboratorio (MCT)</span>
          </div>

          <ul className="nav-center">
            {/* 1. REGISTROS: Visible para TODOS (Guest, Ayudante, Admin) */}
            <li>
              <button 
                className={`nav-btn ${seccionActiva === 'registros' ? 'active-section' : ''}`}
                onClick={() => cambiarSeccion('registros')}>
                Registros
              </button>
            </li>

            {/* 2. HISTORIALES: Solo visible si hay sesión iniciada (Ayudante o Admin) */}
            {usuario && (
              <li>
                <button 
                  className={`nav-btn ${seccionActiva === 'historiales' ? 'active-section' : ''}`}
                  onClick={() => cambiarSeccion('historiales')}>
                  Historiales
                </button>
              </li>
            )}

            {/* 3. GESTIÓN: Solo visible si hay sesión iniciada (Ayudante o Admin) */}
            {usuario && (
              <li>
                <button 
                  className={`nav-btn ${seccionActiva === 'gestion' ? 'active-section' : ''}`}
                  onClick={() => cambiarSeccion('gestion')}>
                  Gestión
                </button>
              </li>
            )}
          </ul>

          <div className="nav-right">
            <div className="settings-wrapper" ref={settingsRef} onMouseEnter={abrirSettings} onMouseLeave={cerrarSettingsConDelay}>
              <button className={`settings-gear-btn ${dropdownSettingsOpen ? 'active-gear' : ''}`} onClick={toggleSettingsClick}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {dropdownSettingsOpen && (
                <div className="settings-dropdown">
                  {usuario ? (
                    <>
                      <div className="settings-user-info">
                        <span className="user-role-label">MODO {usuario.rol.toUpperCase()}</span>
                        <h4 className="user-name-text">{usuario.username}</h4>
                      </div>
                      <div className="settings-divider"></div>
                      <button onClick={() => { setVista('config-perfil'); setSeccionActiva('config'); }} className="settings-item">Configuración de Perfil</button>
                      <div className="accounts-switcher">
                        <button className="settings-item item-flex" onClick={(e) => { e.stopPropagation(); setExpandirPerfiles(!expandirPerfiles); }}>
                          Cambiar de cuenta <span>{expandirPerfiles ? '▲' : '▼'}</span>
                        </button>
                        {expandirPerfiles && (
                          <div className="accounts-list">
                            {listaPerfiles.map((p, i) => (
                              <div key={i} className={`acc-option ${p.username === usuario.username ? 'active-acc' : ''}`} onClick={() => { setUsuario(p); setExpandirPerfiles(false); }}>
                                 <div className="acc-meta"><strong>{p.username}</strong><small>{p.email}</small></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="settings-divider"></div>
                      <button onClick={handleLogout} className="logout-item">Cerrar Sesión</button>
                    </>
                  ) : (
                    <button onClick={() => { setVista('login'); setSeccionActiva('config'); }} className="settings-item">Ingresar</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* --- SUB-NAV SLIDER --- */}
        {/* Solo mostramos el slider si NO estamos en config Y el menú está cerrado */}
        {seccionActiva !== 'config' && !menuAbierto && (
           <div className="sub-nav-slider-container">
             <div className="slider-wrapper">
                
                {/* 1. REGISTROS (Visible para todos) */}
                {seccionActiva === 'registros' && (
                  <>
                    <button className={`slider-btn ${vista === 'practica' ? 'active-slide' : ''}`} onClick={() => setVista('practica')}>
                      Práctica
                    </button>
                    <button className={`slider-btn ${vista === 'registrar' ? 'active-slide' : ''}`} onClick={() => setVista('registrar')}>
                      Material
                    </button>
                  </>
                )}

                {/* 2. HISTORIALES (Protegido por lógica de visualización del padre) */}
                {seccionActiva === 'historiales' && usuario && (
                  <>
                    {/* --- CAMBIO APLICADO AQUÍ: Botón de Préstamos (Material) puesto en primer lugar --- */}
                    <button className={`slider-btn ${vista === 'prestamos' ? 'active-slide' : ''}`} onClick={() => setVista('prestamos')}>
                      Préstamos
                    </button>
                    <button className={`slider-btn ${vista === 'historial-practicas' ? 'active-slide' : ''}`} onClick={() => setVista('historial-practicas')}>
                      Prácticas
                    </button>
                  </>
                )}

                {/* 3. GESTIÓN (Protegido y LIMITADO para ayudantes) */}
                {seccionActiva === 'gestion' && usuario && (
                  <>
                    {/* INVENTARIO: Solo Admin */}
                    {usuario.rol === 'admin' && (
                      <button className={`slider-btn ${vista === 'inventario' ? 'active-slide' : ''}`} onClick={() => setVista('inventario')}>
                        Inventario
                      </button>
                    )}
                    
                    {/* MÉTRICAS: Ayudante y Admin */}
                    <button className={`slider-btn ${vista === 'metricas' ? 'active-slide' : ''}`} onClick={() => setVista('metricas')}>
                      Métricas
                    </button>
                  </>
                )}

             </div>
           </div>
        )}

        <main className="content-admin-page">
          {vista === 'practica' && (<RegistrarPractica apiUrl={API_URL} practicaId={editingPracticaId} onPracticaSaved={handlePracticaSaved} />)}
          {vista === 'registrar' && (<RegistrarPrestamo apiUrl={API_URL} solicitudUuid={editingPrestamoUuid} onPrestamoSaved={handlePrestamoSaved} />)}
          {vista === 'login' && !usuario && <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />}
          
          {/* Protección de Vistas en el Renderizado Main */}
          {usuario?.rol === 'admin' && vista === 'inventario' && <Inventario apiUrl={API_URL} />}
          
          {usuario && vista === 'metricas' && (
            <Metricas apiUrl={API_URL} />
          )}

          {usuario && vista === 'prestamos' && (<Prestamos apiUrl={API_URL} onModificar={handleModificarPrestamo} />)}
          {usuario && vista === 'historial-practicas' && (<HistorialPracticas apiUrl={API_URL} onModificar={handleModificarPractica} />)}
          
          {vista === 'config-perfil' && usuario && (
            <div className="profile-config-page">
              <div className="profile-card">
                <h3>Información de Perfil</h3>
                <div className="profile-field"><label>NOMBRE COMPLETO</label><p>{usuario.name}</p></div>
                <div className="profile-field"><label>CORREO INSTITUCIONAL</label><p>{usuario.email}</p></div>
                <div className="profile-field"><label>CELULAR</label><p>{usuario.phone}</p></div>
                <button className="back-btn" onClick={() => { setVista('practica'); setSeccionActiva('registros'); }}>Volver al Tablero</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
export default App