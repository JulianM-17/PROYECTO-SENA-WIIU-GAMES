const mysql = require('mysql2/promise');

// Configuración de la conexión
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Julian117',
  database: '`wiiu_gamesdb`',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function probarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log('¡Conexión exitosa a la base de datos!');
    connection.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
  }
}

probarConexion();

module.exports = pool;
