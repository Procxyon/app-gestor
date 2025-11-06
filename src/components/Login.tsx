import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface LoginProps {
  apiUrl: string;
  onLoginSuccess: () => void; // Función que se ejecutará cuando el login sea correcto
}

function Login({ apiUrl, onLoginSuccess }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      if (response.ok) {
        toast.success("¡Bienvenido Administrador!");
        onLoginSuccess(); // Avisa a App.tsx que ya entramos
      } else {
        toast.error("Usuario o contraseña incorrectos");
      }
    } catch (error) {
      toast.error("Error de conexión al intentar login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', backgroundColor: '#2a2a2a', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
      <h2 style={{ textAlign: 'center', color: '#00aaff', marginTop: 0 }}>Acceso Administrativo</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Usuario:</label>
          <input 
            type="text" 
            value={usuario} 
            onChange={(e) => setUsuario(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white' }}
          />
        </div>
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Contraseña:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white' }}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Verificando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}

export default Login;