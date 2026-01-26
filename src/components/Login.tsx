import React, { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './Login.module.css';

interface LoginProps {
  apiUrl: string;
    onLoginSuccess: (data: any) => void; 
}

export default function Login({ apiUrl, onLoginSuccess }: LoginProps) {
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
        body: JSON.stringify({ usuario, password }),
      });

      // 1. Leemos el JSON una sola vez aquí
      const data = await response.json(); 

      if (response.ok) {
        // 2. Eliminamos la segunda llamada a response.json() que causaba el error
        toast.success('¡Bienvenido!');
        onLoginSuccess(data); 
      } else {
        toast.error(data.err || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      toast.error('Error de conexión al intentar login');
      console.error('Login error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPageWrapper}>
      <div className={styles.loginCard} role="dialog" aria-labelledby="login-title">
        <h2 id="login-title" className={styles.loginTitle}>Acceso Administrativo</h2>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="user">Usuario</label>
            <input
              id="user"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pass">Contraseña</label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <button type="submit" className={styles.loginSubmit} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}