import { useEffect, useState } from 'react';
import styles from './Metricas.module.css';

interface MetricaItem {
  nombre_equipo: string;
  total_usos: number;
}

interface MetricasProps {
  apiUrl: string;
}

const Metricas = ({ apiUrl }: MetricasProps) => {
  const [datos, setDatos] = useState<MetricaItem[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/metricas/objetos-populares`)
      .then((res) => res.json())
      .then((data) => {
        setDatos(data);
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error cargando métricas:", err);
        setCargando(false);
      });
  }, [apiUrl]);

  if (cargando) return <div className={styles.loader}>Cargando estadísticas...</div>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>📊 Objetos más Solicitados</h2>
      <div className={styles.chartContainer}>
        {datos.map((item, index) => (
          <div key={index} className={styles.barRow}>
            <span className={styles.label}>{item.nombre_equipo}</span>
            <div className={styles.barWrapper}>
              <div 
                className={styles.bar} 
                style={{ width: `${(item.total_usos / datos[0].total_usos) * 100}%` }}
              >
                <span className={styles.value}>{item.total_usos}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Metricas;