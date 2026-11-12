const express = require("express");
const router = express.Router();
const pool = require("../db"); // tu pool de mysql2/promise

const CATEGORIAS = [
  "Procesador",
  "Tarjeta gráfica",
  "Memoria",
  "Almacenamiento",
  "Refrigeración",
];

router.get("/componentes", async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT p.id, p.nombre, p.precio, p.fps_puntos, c.nombre AS categoria
         FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
        WHERE c.nombre IN (?) AND p.stock > 0
        ORDER BY c.nombre, p.precio`,
      [CATEGORIAS],
    );

    // agrupar por categoría
    const salida = {};
    for (const f of filas) {
      (salida[f.categoria] ||= []).push({
        id: f.id,
        nombre: f.nombre,
        precio: Number(f.precio),
        fps: f.fps_puntos || 0,
      });
    }
    res.json(salida);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudieron cargar los componentes" });
  }
});

module.exports = router;
