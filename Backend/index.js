const express = require('express');
const cors = require('cors');
const pool = require('./db.js');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Obtener productos activos y su stock total en todas las sucursales.
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
        COALESCE(i.stock_total, 0) AS stock_total
      FROM producto p
      INNER JOIN marca m ON p.id_marca = m.id_marca
      INNER JOIN categoria c ON p.id_categoria = c.id_categoria
      LEFT JOIN (
        SELECT id_producto, SUM(stock) AS stock_total
        FROM inventario
        WHERE estado = 'ACTIVO'
        GROUP BY id_producto
      ) i ON p.id_producto = i.id_producto
      WHERE p.estado = 'ACTIVO'
      ORDER BY p.nombre
    `);
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Endpoint para listar categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categoria WHERE estado = "ACTIVO"');
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error.message);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Endpoint para listar marcas
app.get('/api/marcas', async (req, res) => {
  try {
    const [marcas] = await pool.query('SELECT * FROM marca WHERE estado = "ACTIVO"');
    res.json(marcas);
  } catch (error) {
    console.error('Error al obtener marcas:', error.message);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Iniciar el servidor después de registrar todas las rutas.
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});