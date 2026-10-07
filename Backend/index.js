const express = require('express');
const cors = require('cors');
const pool = require('./db.js'); // Ajusta la ruta al archivo donde creaste el pool

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Permitir a Express entender JSON (útil para POST/PUT más adelante)
app.use(express.json());

// --- RUTA: Obtener todos los productos activos ---
app.get('/api/productos', async (req, res) => {
  try {
    // pool.query devuelve un arreglo donde la posición 0 son los datos (rows)
    const [rows] = await pool.query(`
      SELECT id_producto, nombre, precio, stock 
      FROM producto 
      INNER JOIN inventario ON producto.id_producto = inventario.id_producto
      WHERE producto.estado = 'ACTIVO'
    `);
    
    // Respondemos al frontend con un estado 200 (OK) y los datos en JSON
    res.status(200).json(rows);
    
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});

// Endpoint para obtener todos los productos activos con stock
app.get('/api/productos', async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT 
        p.id_producto, 
        p.nombre, 
        p.precio, 
        p.imagen_url, 
        p.descripcion,
        m.nombre_marca,
        c.nombre_cat,
        COALESCE(SUM(i.stock), 0) AS stock_total
      FROM producto p
      INNER JOIN marca m ON p.id_marca = m.id_marca
      INNER JOIN categoria c ON p.id_categoria = c.id_categoria
      LEFT JOIN inventario i ON p.id_producto = i.id_producto
      WHERE p.estado = 'ACTIVO'
      GROUP BY p.id_producto
    `);
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para listar categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categoria WHERE estado = "ACTIVO"');
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Endpoint para listar marcas
app.get('/api/marcas', async (req, res) => {
  try {
    const [marcas] = await pool.query('SELECT * FROM marca WHERE estado = "ACTIVO"');
    res.json(marcas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});