import React, { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './Login.module.css'; // 1. Importa el Módulo de CSS

interface LoginProps {
  apiUrl: string;
  onLoginSuccess: () => void;
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

      if (response.ok) {
        toast.success('¡Bienvenido Administrador!');
        onLoginSuccess();
      } else {
        let msg = 'Usuario o contraseña incorrectos';
        try {
          const json = await response.json();
          if (json?.message) msg = json.message;
        } catch {}
        toast.error(msg);
      }
    } catch (err) {
      toast.error('Error de conexión al intentar login');
      console.error('Login error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 2. Usa los estilos del módulo
    <div className={styles.loginPageWrapper}>
      <div className={styles.loginCard} role="dialog" aria-labelledby="login-title">
        <h2 id="login-title" className={styles.loginTitle}>
          Acceso Administrativo
        </h2>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="user">Usuario</label>
            <input
              id="user"
              name="user"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder=""
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="pass">Contraseña</label>
            <input
              id="pass"
              name="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.loginSubmit}
            aria-busy={loading}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}