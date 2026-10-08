require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: (process.env.DB_HOST || '').trim(),
  user: (process.env.DB_USER || '').trim(),
  password: (process.env.DB_PASSWORD || '').trim(),
  database: (process.env.DB_NAME || '').trim(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

async function probarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log(`¡Conexión exitosa a la base de datos ${dbConfig.database}!`);
    connection.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
  }
}

probarConexion();

module.exports = pool;