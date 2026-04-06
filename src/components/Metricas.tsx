import { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';
import styles from './Metricas.module.css';

interface MetricasProps { apiUrl: string; }

const CATEGORIAS_MAP: { [key: number]: string } = {
  1: 'Consumibles', 2: 'Herramientas', 3: 'Seguridad',
  11: 'NMLC1', 12: 'NMLC2', 13: 'NMPR', 14: 'NMLE', 15: 'ELECTROMEC',
  16: 'PLC', 17: 'PROYECTOS', 18: 'AREA 1', 19: 'AREA 2', 20: 'AREA 3', 0: 'No Linkeado'
};

const COLORES = ['#00aaff', '#8a2be2', '#00ff88', '#ffaa00', '#ff00ff', '#ff4d4d', '#ffff00'];

const Metricas = ({ apiUrl }: MetricasProps) => {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/metricas/dashboard`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json.err) throw new Error(json.err);
        
        const catFormateadas = (json.categorias || []).map((c: any) => ({
           nombre: CATEGORIAS_MAP[c.categoria] || `Cat ${c.categoria}`,
           total: c.total
        }));

        const dispFormateada = (json.disponibilidad || []).map((d: any) => ({
           nombre: CATEGORIAS_MAP[d.categoria] || `Cat ${d.categoria}`,
           Disponibles: d.disponibles,
           Prestadas: d.prestadas
        }));

        setData({
           top10: json.top10 || [],
           categorias: catFormateadas,
           consumibles: json.consumibles || [],
           disponibilidad: dispFormateada,
           fechas: json.fechas || []
        });
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [apiUrl]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipLabel}>{label || payload[0].name}</div>
          {payload.map((entry: any, index: number) => (
            <p key={index} className={styles.tooltipData} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (cargando) return <div className={styles.loader}>Compilando analíticas del laboratorio...</div>;
  if (error) return <div className={styles.errorBox}>Error de conexión: {error}</div>;
  if (!data) return null;

  return (
    <div className={styles.appContainer}>
      <header>
        <div className={styles.headerIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <h2>Panel de Analíticas</h2>
      </header>

      <div className={styles.dashboardGrid}>
        
        {/* 1. GRÁFICO DE DONA */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Distribución del Inventario</h3>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={100}>
              <PieChart>
                <Pie data={data.categorias} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="total" nameKey="nombre" stroke="none">
                  {data.categorias.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#ccc', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. BATERÍAS DE ESTADO (Consumibles) */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Niveles de Consumibles Críticos</h3>
          <div className={styles.chartArea} style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            {data.consumibles.length === 0 ? (
              <p style={{color: '#888', textAlign: 'center'}}>No hay consumibles registrados.</p>
            ) : (
              data.consumibles.map((item: any, i: number) => {
                const disponible = item.total - item.prestadas;
                const porcentaje = item.total > 0 ? (disponible / item.total) * 100 : 0;
                let colorClass = styles.batteryGreen;
                if (porcentaje <= 20) colorClass = styles.batteryRed;
                else if (porcentaje <= 50) colorClass = styles.batteryYellow;

                return (
                  <div key={i} className={styles.batteryRow}>
                    <div className={styles.batteryHeader}>
                      <span title={item.nombre}>{item.nombre.length > 25 ? item.nombre.substring(0,25)+'...' : item.nombre}</span>
                      <span>{disponible} / {item.total}</span>
                    </div>
                    <div className={styles.batteryTrack}>
                      <div className={`${styles.batteryFill} ${colorClass}`} style={{ width: `${porcentaje}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. BARRAS HORIZONTALES */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top 10 Materiales Más Solicitados</h3>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={100}>
              <BarChart data={data.top10} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={12} />
                <YAxis dataKey="nombre" type="category" stroke="#888" fontSize={11} width={120} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="usos" name="Total de Préstamos" fill="#00aaff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. BARRAS APILADAS */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Disponibilidad Física (Excluye Consumibles)</h3>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={100}>
              <BarChart data={data.disponibilidad} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="nombre" stroke="#888" fontSize={11} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#ccc', fontSize: '0.85rem' }}/>
                <Bar dataKey="Disponibles" stackId="a" fill="#00ff88" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Prestadas" stackId="a" fill="#ffaa00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. GRÁFICO DE ÁREA */}
        <div className={`${styles.chartCard} ${styles.cardWide}`}>
          <h3 className={styles.chartTitle}>Frecuencia de Préstamos (Últimos 14 días activos)</h3>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={100}>
              <AreaChart data={data.fechas} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActividad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8a2be2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="fecha" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cantidad" name="Préstamos" stroke="#8a2be2" strokeWidth={3} fillOpacity={1} fill="url(#colorActividad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Metricas;