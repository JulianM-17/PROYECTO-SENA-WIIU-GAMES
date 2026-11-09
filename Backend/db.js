require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// -----------------------------------------------------------------------------
// Configuración de la base de datos (usa variables del .env)
// -----------------------------------------------------------------------------
const dbConfig = {
  host: (process.env.DB_HOST || '').trim(),
  user: (process.env.DB_USER || '').trim(),
  password: (process.env.DB_PASSWORD || '').trim(),
  database: (process.env.DB_NAME || '').trim(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

/**
 * Verifica la conexión a la BD al iniciar la aplicación.
 * Si no puede conectar, muestra el error y termina el proceso
 * para que el usuario vea claramente que necesita levantar MySQL.
 */
async function probarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log(`¡Conexión exitosa a la base de datos ${dbConfig.database}!`);
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    // Salir con código de error para que el proceso sea visible al usuario
    // process.exit(1); // Removed to prevent server crash on DB connection failure
  }
}

/**
 * Crea el rol "Administrador" y un usuario admin por defecto si no existen.
 * Se ejecuta una sola vez al iniciar el servidor.
 */
async function initAdmin() {
  try {
    // 1️⃣ Asegurar que el rol exista
    await pool.query(
      `INSERT IGNORE INTO rol (nombre_rol, descripcion_rol, estado)
       VALUES ('Administrador','Admin total','ACTIVO')`
    );
    const [roleRows] = await pool.query(
      `SELECT id_rol FROM rol WHERE nombre_rol = 'Administrador'`
    );
    const adminRolId = roleRows[0]?.id_rol;
    if (!adminRolId) return;

    // 2️⃣ Crear el usuario admin si aún no está
    const adminEmail = 'admin@tusitio.com';
    const adminPassword = 'admin123'; // <-- cambiar en producción
    const hash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT IGNORE INTO usuario 
        (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, correo, contrasena_hash, estado)
       VALUES (?, 'Admin', 'User', 'CC', 'ADM001', '123456', ?, ?, 'ACTIVO')`,
      [adminRolId, adminEmail, hash]
    );
    console.log('✅ Usuario administrador asegurado en la base de datos');
  } catch (e) {
    console.error('❌ Error inicializando admin:', e.message);
    // process.exit(1); // Removed to prevent server crash on DB connection failure
  }
}

// Ejecutar al cargar el módulo
probarConexion();
initAdmin();

module.exports = pool;
