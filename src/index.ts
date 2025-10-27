import { Hono } from 'hono'
import { cors } from 'hono/cors' // Importante para permitir que tu Page llame al Worker

// Define el "tipo" de conexión a la DB que pusiste en wrangler.toml
export type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Añade CORS para permitir que tu app de Pages se conecte
app.use('/*', cors({
  origin: '*', // En producción, cambia esto a la URL de tu Page
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// --- RUTAS PARA INVENTARIO ---

// GET /api/inventario - Obtener todos los productos
app.get('/api/inventario', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM Inventario" // Asumiendo que tu tabla se llama Inventario
    ).all()
    return c.json(results)
  } catch (e) {
    return c.json({ err: e.message }, 500)
  }
})

// POST /api/inventario - Añadir un nuevo producto
app.post('/api/inventario', async (c) => {
  const { nombre_equipo, descripcion, unidades_totales } = await c.req.json()
  
  if (!nombre_equipo || !descripcion || !unidades_totales) {
    return c.json({ err: 'Faltan datos' }, 400)
  }

  try {
    const { success } = await c.env.DB.prepare(
      "INSERT INTO Inventario (nombre_equipo, descripcion, unidades_totales) VALUES (?, ?, ?)"
    ).bind(nombre_equipo, descripcion, unidades_totales).run()
    
    if (success) {
      return c.json({ message: 'Producto añadido' }, 201)
    } else {
      return c.json({ err: 'Error al añadir producto' }, 500)
    }
  } catch (e) {
    return c.json({ err: e.message }, 500)
  }
})

// --- RUTAS PARA PRESTAMOS ---

// GET /api/prestamos - Obtener todos los préstamos
app.get('/api/prestamos', async (c) => {
  try {
    // Un JOIN para obtener también el nombre del producto, no solo su ID
    const { results } = await c.env.DB.prepare(`
      SELECT 
        p.id, 
        p.nombre_persona, 
        p.fecha_prestamo, 
        p.fecha_devolucion, 
        i.nombre_equipo 
      FROM Prestamos p 
      JOIN Inventario i ON p.producto_id = i.id
    `).all()
    return c.json(results)
  } catch (e) {
    return c.json({ err: e.message }, 500)
  }
})

// POST /api/prestamos - Crear un nuevo préstamo
app.post('/api/prestamos', async (c) => {
  const { producto_id, nombre_persona } = await c.req.json()

  if (!producto_id || !nombre_persona) {
    return c.json({ err: 'Faltan datos' }, 400)
  }

  try {
    // La fecha_prestamo se pone automáticamente, fecha_devolucion es NULL al inicio
    const { success } = await c.env.DB.prepare(
      "INSERT INTO Prestamos (producto_id, nombre_persona, fecha_prestamo) VALUES (?, ?, datetime('now'))"
    ).bind(producto_id, nombre_persona).run()
    
    // Aquí también deberías restar 1 a 'unidades_disponibles' en la tabla Inventario (¡mejora futura!)

    if (success) {
      return c.json({ message: 'Préstamo registrado' }, 201)
    } else {
      return c.json({ err: 'Error al registrar préstamo' }, 500)
    }
  } catch (e) {
    return c.json({ err: e.message }, 500)
  }
})


export default app