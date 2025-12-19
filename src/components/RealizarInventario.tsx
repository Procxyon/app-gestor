import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import styles from './Inventario.module.css';

// --- MISMAS CATEGORÍAS QUE EN INVENTARIO ---
const CATEGORIAS: { [key: number]: string } = {
    // 1-10: CASETA
    1: 'Consumibles',
    2: 'Herramientas',
    3: 'Equipo de Seguridad',
    
    // 11-20: LABORATORIO
    11: 'NMLC1',
    12: 'NMLC2',
    13: 'NMPR',
    14: 'NMLE',
    15: 'ELECTROMECANICA',
    16: 'PLC',
    17: 'PROYECTOS',
    18: 'AREA 1',
    19: 'AREA 2',
    20: 'AREA 3'
};

interface ItemConteo {
  id: number;
  nombre_equipo: string;
  unidades_totales: number; 
  fisico?: number;          
}

interface Props {
  apiUrl: string;
  onVolver: () => void;
}

export default function RealizarInventario({ apiUrl, onVolver }: Props) {
  const [fase, setFase] = useState<1 | 2 | 3>(1); 
  const [cargando, setCargando] = useState(false);
  
  // 0 = Laboratorio, 1 = Caseta
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number>(1); // Default a Caseta
  const [catSeleccionada, setCatSeleccionada] = useState<number | ''>(''); 
  
  const [items, setItems] = useState<ItemConteo[]>([]);
  const [filtro, setFiltro] = useState('');
  
  // Filtrar categorías para el dropdown de configuración
  const categoriasDisponibles = Object.entries(CATEGORIAS).filter(([k, v]) => {
      const catId = Number(k);
      if (tipoSeleccionado === 1) return catId >= 1 && catId <= 10; // Caseta
      return catId >= 11 && catId <= 20; // Laboratorio
  });

  // --- FASE 1: INICIAR ---
  const handleIniciar = async () => {
    if (catSeleccionada === '') return;
    setCargando(true);
    try {
      // Nota: Enviamos '0' si la categoría es especial "Todas", pero aquí forzamos selección
      const res = await fetch(`${apiUrl}/api/inventario/filtrar?tipo=${tipoSeleccionado}&categoria=${catSeleccionada}`);
      if (!res.ok) throw new Error('Error al obtener datos');
      const data = await res.json();
      
      if (data.length === 0) {
        toast.error("No se encontraron productos con esos filtros");
        setCargando(false);
        return;
      }

      setItems(data.map((d: any) => ({ ...d, fisico: '' }))); 
      setFase(2);
      setFiltro(''); 
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  // --- FASE 2: CONTEO ---
  const handleConteoChange = (id: number, valorStr: string) => {
    const valor = valorStr === '' ? '' : parseInt(valorStr, 10);
    if (typeof valor === 'number' && valor < 0) return; 

    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, fisico: valor as number } : item
    ));
  };

  const itemsContados = items.filter(i => i.fisico !== '' && i.fisico !== undefined).length;
  const totalItems = items.length;
  const porcentaje = totalItems > 0 ? Math.round((itemsContados / totalItems) * 100) : 0;
  const esCompleto = porcentaje === 100;

  const itemsFiltrados = items.filter(item => 
    item.nombre_equipo.toLowerCase().includes(filtro.toLowerCase()) ||
    item.id.toString().includes(filtro)
  );

  const validarTerminar = () => {
    return items.every(i => i.fisico !== undefined && i.fisico !== '' && !isNaN(Number(i.fisico)));
  };

  const handleTerminar = () => {
    if (!validarTerminar()) {
      toast.error("Debes contar TODOS los items antes de terminar.");
      return;
    }
    setFase(3);
  };

  // --- FASE 3: RESULTADOS ---
  const itemsConDiferencia = items.filter(i => {
    const sis = i.unidades_totales;
    const fis = Number(i.fisico);
    return (fis - sis) !== 0; 
  });

  const handleDescargarReporte = () => {
    const dataExport = itemsConDiferencia.map(i => ({
      ID: i.id,
      Nombre: i.nombre_equipo,
      Sistema: i.unidades_totales,
      Fisico: i.fisico,
      Diferencia: Number(i.fisico) - i.unidades_totales,
      Estado: (Number(i.fisico) - i.unidades_totales) < 0 ? 'PERDIDA' : 'SOBRANTE'
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Diferencias Inventario");
    XLSX.writeFile(wb, `Reporte_Diferencias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleEnviarAjuste = async () => {
    if(!window.confirm("¿Seguro? Esto actualizará el inventario y pondrá prestados en 0.")) return;
    
    setCargando(true);
    try {
        const payload = {
            ajustes: items.map(i => ({ id: i.id, fisico: Number(i.fisico) }))
        };

        const res = await fetch(`${apiUrl}/api/inventario/ajuste-masivo`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if(!res.ok) throw new Error('Fallo al actualizar');
        
        handleDescargarReporte();
        toast.success("Inventario ajustado correctamente");
        onVolver(); 
    } catch (error) {
        console.error(error);
        toast.error("Error al actualizar la base de datos");
    } finally {
        setCargando(false);
    }
  };

  return (
    <div className={styles.appContainer}>
      
      <div className={styles.inventarioHeader}>
        <button onClick={onVolver} className={styles.backBtn}>
          ← Volver
        </button>
        <h2 style={{margin: 0, color: 'white'}}>Inventario Físico</h2>
      </div>

      {/* --- FASE 1: CONFIGURACIÓN --- */}
      {fase === 1 && (
        <div className={styles.configPanel}>
          <div className={styles.formGroup}>
            <label>Tipo</label>
            <select 
                className={styles.selectInput}
                value={tipoSeleccionado} 
                onChange={e => {
                    setTipoSeleccionado(Number(e.target.value));
                    setCatSeleccionada(''); // Resetear al cambiar de tipo
                }}
            >
                <option value={1}>CASETA</option>
                <option value={0}>LABORATORIO</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Categoría</label>
            <select 
                className={styles.selectInput}
                value={catSeleccionada} 
                onChange={e => setCatSeleccionada(Number(e.target.value))}
            >
                <option value="" disabled>-- Selecciona --</option>
                {categoriasDisponibles.map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                ))}
            </select>
          </div>

          <button 
            onClick={handleIniciar} 
            disabled={catSeleccionada === '' || cargando}
            className={`${styles.actionBtn} ${catSeleccionada === '' ? styles.btnDisabled : styles.btnPrimary}`}
          >
            {cargando ? 'Cargando...' : 'INICIAR CONTEO'}
          </button>
        </div>
      )}

      {/* --- FASE 2: CONTEO --- */}
      {fase === 2 && (
        <div>
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
              <div style={{flex: 1, paddingRight: '20px'}}>
                  <p style={{color: '#ccc', margin: '0 0 5px 0', fontSize: '0.9em'}}>
                      Progreso de Conteo
                  </p>
                  
                  <div className={styles.progressWrapper}>
                      <div 
                          className={`${styles.progressBar} ${esCompleto ? styles.completed : ''}`} 
                          style={{width: `${porcentaje}%`}}
                      />
                      <span className={styles.progressText}>
                          {porcentaje}% Completado ({itemsContados} / {totalItems})
                      </span>
                  </div>
              </div>

              <button 
                onClick={handleTerminar}
                disabled={!validarTerminar()}
                className={`${styles.actionBtn} ${!validarTerminar() ? styles.btnDisabled : styles.btnSuccess}`}
                style={{height: 'fit-content'}}
              >
                TERMINAR Y COMPARAR
              </button>
           </div>
           
           <input 
              type="text" 
              placeholder="🔍 Buscar item por nombre o ID..." 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className={styles.searchBarInternal}
           />

           <div className={styles.conteoContainer}>
             <table style={{width: '100%', borderCollapse: 'collapse'}}>
               <thead style={{position:'sticky', top:0, background: '#1e222d', zIndex: 10}}>
                 <tr>
                   <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #444'}}>ID</th>
                   <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #444'}}>Nombre</th>
                   <th style={{padding: '12px', textAlign: 'center', borderBottom: '1px solid #444'}}>Conteo Físico</th>
                 </tr>
               </thead>
               <tbody>
                 {itemsFiltrados.length > 0 ? (
                    itemsFiltrados.map(item => {
                      const hasValue = item.fisico !== '' && item.fisico !== undefined;
                      return (
                        <tr key={item.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                          <td style={{padding: '12px'}}>{item.id}</td>
                          <td style={{padding: '12px'}}>{item.nombre_equipo}</td>
                          <td style={{padding: '12px', textAlign:'center'}}>
                            <input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={item.fisico === undefined ? '' : item.fisico}
                              onChange={(e) => handleConteoChange(item.id, e.target.value)}
                              className={`${styles.inputConteo} ${hasValue ? styles.filled : ''}`}
                            />
                          </td>
                        </tr>
                      )
                    })
                 ) : (
                    <tr>
                      <td colSpan={3} style={{padding: '20px', textAlign: 'center', color: '#888'}}>
                        No hay coincidencias con "{filtro}"
                      </td>
                    </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* --- FASE 3: RESULTADOS --- */}
      {fase === 3 && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
            <div className={styles.resultadosBox}>
                <h3>Resultados del Inventario</h3>
                <p>Se encontraron <strong style={{color: itemsConDiferencia.length > 0 ? '#ff4d4d' : '#4ade80', fontSize: '1.2em'}}>{itemsConDiferencia.length}</strong> discrepancias.</p>
                <p style={{fontSize:'0.9em', color:'#aaa', marginTop: '10px'}}>
                    Al confirmar, se actualizará el stock y se descargarán las diferencias.
                </p>
            </div>

            {itemsConDiferencia.length === 0 ? (
                <div className={styles.successMessage}>
                    <h2>¡Inventario Perfecto!</h2>
                    <p>No existen diferencias.</p>
                </div>
            ) : (
                <div className={styles.conteoContainer} style={{maxHeight: '400px'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: 'rgba(255,255,255,0.05)'}}>
                                <th style={{padding: '10px', textAlign: 'left'}}>Nombre</th>
                                <th style={{padding: '10px', textAlign: 'center'}}>Sistema</th>
                                <th style={{padding: '10px', textAlign: 'center'}}>Físico</th>
                                <th style={{padding: '10px', textAlign: 'center'}}>Diferencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsConDiferencia.map(item => {
                                const diff = Number(item.fisico) - item.unidades_totales;
                                return (
                                    <tr key={item.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                        <td style={{padding: '10px'}}>{item.nombre_equipo}</td>
                                        <td style={{padding: '10px', textAlign:'center', opacity: 0.7}}>{item.unidades_totales}</td>
                                        <td style={{padding: '10px', textAlign:'center', fontWeight: 'bold'}}>{item.fisico}</td>
                                        <td style={{padding: '10px', textAlign:'center'}}>
                                            <span className={`${styles.diffBadge} ${diff > 0 ? styles.diffPos : styles.diffNeg}`}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{marginTop: '30px', display:'flex', justifyContent: 'center'}}>
                <button onClick={handleEnviarAjuste} disabled={cargando} className={`${styles.actionBtn} ${styles.btnDanger}`}>
                    {cargando ? 'Procesando...' : 'CONFIRMAR AJUSTE DE INVENTARIO'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}