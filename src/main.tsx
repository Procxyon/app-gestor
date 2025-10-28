import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// No importamos './index.css', ya que todos los estilos están en App.css
import './App.css' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)