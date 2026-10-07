require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de la conexión usando variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function probarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log('¡Conexión exitosa a la base de datos wiiu_gamesdb!');
    connection.release(); // Siempre libera la conexión de vuelta al pool
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
  }
}

probarConexion();

module.exports = pool;