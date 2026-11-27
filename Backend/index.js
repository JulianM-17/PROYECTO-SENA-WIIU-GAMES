const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const pool = require("./db.js");

const app = express();
// Permitir CORS solo desde el origen del cliente (localhost)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Servir archivos estáticos del frontend
app.use((req, res, next) => {
  let requestPath;
  try {
    requestPath = req.path;
    while (/%[0-9a-f]{2}/i.test(requestPath)) {
      requestPath = decodeURIComponent(requestPath);
      if (/^\/backend\/backups(?:\/|$)/i.test(requestPath.replace(/\\/g, "/"))) {
        return res.sendStatus(404);
      }
    }
  } catch (error) {
    return res.sendStatus(400);
  }
  if (/^\/backend\/backups(?:\/|$)/i.test(requestPath.replace(/\\/g, "/"))) {
    return res.sendStatus(404);
  }
  return next();
});
app.use(express.static(path.join(__dirname, "..", "Frontend")));
app.use(express.static(path.join(__dirname, "..", "Frontend", "Pages")));
app.use("/Administrador", express.static(path.join(__dirname, "..", "Frontend", "Pages", "Administrador")));
app.use(express.static(path.join(__dirname, "..")));
const PORT = process.env.PORT || 3000;
const SESSION_TTL = 8 * 60 * 60 * 1000;
const sessions = new Map();
let warrantyRequestSchemaPromise;
let warrantyDetailIndexSchemaPromise;
let warrantyStatusSchemaPromise;
let automaticWarrantyCoveragePromise;
let legacyAppointmentSchemaPromise;
let backupSchemaPromise;
let customerPostalCodeSchemaPromise;
const BACKUP_DIR = path.join(__dirname, "backups");
const BACKUP_TABLE = "backup";
const LEGACY_BACKUP_TABLE = "wiiu_admin_backups";

async function ensureCustomerPostalCodeSchema() {
  if (!customerPostalCodeSchemaPromise) {
    customerPostalCodeSchemaPromise = (async () => {
      const [columns] = await pool.query(
        "SHOW COLUMNS FROM usuario LIKE 'codigo_postal'",
      );
      if (!columns.length) {
        await pool.query(
          "ALTER TABLE usuario ADD COLUMN codigo_postal VARCHAR(20) NULL AFTER direccion",
        );
      }
    })();
  }

  try {
    await customerPostalCodeSchemaPromise;
  } catch (error) {
    customerPostalCodeSchemaPromise = null;
    throw error;
  }
}

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function ensureBackupTable() {
  if (!backupSchemaPromise) {
    backupSchemaPromise = (async () => {
      const [columns] = await pool.query(
        `SHOW COLUMNS FROM ${quoteIdentifier(BACKUP_TABLE)} LIKE 'contenido'`,
      );
      if (!columns.length) {
        await pool.query(
          `ALTER TABLE ${quoteIdentifier(BACKUP_TABLE)} ` +
          "ADD COLUMN `contenido` LONGTEXT NULL AFTER `ruta_almacenamiento`",
        );
      }

      const [tableRows] = await pool.query("SHOW TABLES");
      const tableKey = Object.keys(tableRows[0] || {})[0];
      if (!tableKey || !tableRows.some((row) => row[tableKey] === LEGACY_BACKUP_TABLE)) {
        return;
      }

      const [legacyRows] = await pool.query(
        `SELECT legacy.filename, legacy.content, legacy.size, legacy.created_at
         FROM ${quoteIdentifier(LEGACY_BACKUP_TABLE)} legacy
         LEFT JOIN ${quoteIdentifier(BACKUP_TABLE)} target
           ON target.nombre_archivo = legacy.filename
         WHERE target.id_backup IS NULL`,
      );
      for (const row of legacyRows) {
        if (!isSafeBackupFilename(row.filename)) continue;
        const createdAt = new Date(row.created_at);
        const createdAtSql = Number.isNaN(createdAt.getTime())
          ? null
          : createdAt.toISOString().slice(0, 19).replace("T", " ");
        await pool.query(
          `INSERT INTO ${quoteIdentifier(BACKUP_TABLE)}
             (nombre_archivo, ruta_almacenamiento, peso, fecha_creacion, tipo, estado, contenido)
           VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), 'COMPLETO', 'EXITOSO', ?)`,
          [
            row.filename,
            path.join(BACKUP_DIR, row.filename),
            Number(row.size) || 0,
            createdAtSql,
            row.content,
          ],
        );
      }
    })();
  }

  try {
    await backupSchemaPromise;
  } catch (error) {
    backupSchemaPromise = null;
    throw error;
  }
}

async function readBackupContent(filename) {
  try {
    return await fs.readFile(path.join(BACKUP_DIR, filename), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await ensureBackupTable();
  const [rows] = await pool.query(
    `SELECT contenido FROM ${quoteIdentifier(BACKUP_TABLE)}
     WHERE nombre_archivo = ? AND contenido IS NOT NULL
     ORDER BY id_backup DESC LIMIT 1`,
    [filename],
  );
  if (!rows.length) {
    const error = new Error("El respaldo no existe.");
    error.code = "ENOENT";
    throw error;
  }
  return rows[0].contenido;
}

function isSafeBackupFilename(filename) {
  return /^[A-Za-z0-9_-]+\.json$/.test(filename);
}

function quoteIdentifier(identifier) {
  return "`" + String(identifier).replace(/`/g, "``") + "`";
}

function normalizeMysqlDate(value) {
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number) => String(number).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function serializeBackupValue(key, value) {
  const originalValue = this && key ? this[key] : value;
  if (Buffer.isBuffer(originalValue)) {
    return { $type: "Buffer", data: originalValue.toString("base64") };
  }
  if (originalValue instanceof Date) {
    return { $type: "Date", data: originalValue.toISOString() };
  }
  if (typeof value === "bigint") {
    return { $type: "BigInt", data: value.toString() };
  }
  return value;
}

function deserializeBackupValue(key, value) {
  if (
    value &&
    typeof value === "object" &&
    value.$type === "Buffer" &&
    typeof value.data === "string"
  ) {
    return Buffer.from(value.data, "base64");
  }
  if (
    value &&
    typeof value === "object" &&
    value.$type === "Date" &&
    typeof value.data === "string"
  ) {
    return normalizeMysqlDate(value.data);
  }
  if (
    value &&
    typeof value === "object" &&
    value.$type === "BigInt" &&
    typeof value.data === "string"
  ) {
    return BigInt(value.data);
  }
  return value;
}

function validateBackup(backup) {
  const invalidBackup = () => {
    const error = new Error("El archivo de respaldo no es válido.");
    error.statusCode = 400;
    return error;
  };
  if (
    !backup ||
    backup.version !== 1 ||
    !Array.isArray(backup.tables) ||
    !backup.tables.length
  ) {
    throw invalidBackup();
  }

  const tableNames = new Set();
  for (const table of backup.tables) {
    if (
      !table ||
      typeof table.name !== "string" ||
      !/^[A-Za-z0-9_$]+$/.test(table.name) ||
      tableNames.has(table.name) ||
      typeof table.createSql !== "string" ||
      !new RegExp(
        "^CREATE TABLE\\s+" +
          quoteIdentifier(table.name).replace(/\$/g, "\\$") +
          "\\s*\\(",
        "i",
      ).test(table.createSql.trim()) ||
      !Array.isArray(table.rows)
    ) {
      throw invalidBackup();
    }
    tableNames.add(table.name);

    let expectedColumns = null;
    for (const row of table.rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw invalidBackup();
      const columns = Object.keys(row);
      if (
        !columns.length ||
        columns.some((column) => !/^[A-Za-z0-9_$]+$/.test(column)) ||
        (expectedColumns && columns.join("\0") !== expectedColumns.join("\0"))
      ) {
        throw invalidBackup();
      }
      expectedColumns = columns;
    }
  }
}

async function readBackupTables(connection) {
  const [tableRows] = await connection.query("SHOW TABLES");
  if (!tableRows.length) {
    throw new Error("La base de datos no tiene tablas para respaldar.");
  }

  const tableKey = Object.keys(tableRows[0])[0];
  const tables = [];
  for (const tableRow of tableRows) {
    const tableName = tableRow[tableKey];
    if (typeof tableName !== "string" || !/^[A-Za-z0-9_$]+$/.test(tableName)) {
      throw new Error("Hay una tabla con un nombre que no se puede respaldar.");
    }
    if (tableName === BACKUP_TABLE || tableName === LEGACY_BACKUP_TABLE) continue;

    const [createRows] = await connection.query(`SHOW CREATE TABLE ${quoteIdentifier(tableName)}`);
    const createKey = Object.keys(createRows[0] || {}).find((key) =>
      /Create Table/i.test(key),
    );
    if (!createKey || typeof createRows[0][createKey] !== "string") {
      throw new Error(`No se pudo obtener la definición de la tabla ${tableName}.`);
    }
    const [dataRows] = await connection.query({
      sql: `SELECT * FROM ${quoteIdentifier(tableName)}`,
      dateStrings: true,
    });
    tables.push({
      name: tableName,
      createSql: createRows[0][createKey],
      rows: dataRows,
    });
  }
  if (!tables.length) {
    throw new Error("No hay tablas de la aplicación para respaldar.");
  }
  return tables;
}

async function writeBackupFile(tables, prefix) {
  await ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const filename = `${prefix}_${stamp}_${randomSuffix}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  const temporaryPath = path.join(BACKUP_DIR, `.${filename}.tmp`);
  const backup = {
    version: 1,
    database: process.env.DB_NAME || "",
    createdAt: new Date().toISOString(),
    tables,
  };
  const content = JSON.stringify(backup, serializeBackupValue, 2);

  try {
    await fs.writeFile(
      temporaryPath,
      content,
      { encoding: "utf8", flag: "wx" },
    );
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(temporaryPath);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("Error eliminando archivo temporal de respaldo:", cleanupError);
      }
    }
    throw error;
  }

  const stats = await fs.stat(filePath);
  return {
    backup,
    filename,
    content,
    size: stats.size,
    createdAt: backup.createdAt,
  };
}

async function createConsistentBackup(prefix, userId) {
  await ensureBackupTable();
  const connection = await pool.getConnection();
  let transactionOpen = false;
  let tables;
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
    transactionOpen = true;
    tables = await readBackupTables(connection);
    await connection.commit();
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error cerrando la transacción del respaldo:", rollbackError);
      }
    }
    throw error;
  } finally {
    connection.release();
  }

  const backupFile = await writeBackupFile(tables, prefix);
  try {
    await pool.query(
      `INSERT INTO ${quoteIdentifier(BACKUP_TABLE)}
         (id_encargado, nombre_archivo, ruta_almacenamiento, peso, tipo, estado, contenido)
       VALUES (?, ?, ?, ?, 'COMPLETO', 'EXITOSO', ?)`,
      [
        userId,
        backupFile.filename,
        path.join(BACKUP_DIR, backupFile.filename),
        backupFile.size,
        backupFile.content,
      ],
    );
  } catch (error) {
    try {
      await fs.unlink(path.join(BACKUP_DIR, backupFile.filename));
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("Error eliminando respaldo local incompleto:", cleanupError);
      }
    }
    throw error;
  }
  return backupFile;
}

async function applyBackup(connection, backup) {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const table of backup.tables) {
      if (table.name === BACKUP_TABLE || table.name === LEGACY_BACKUP_TABLE) continue;
      const tableIdentifier = quoteIdentifier(table.name);
      await connection.query(`DROP TABLE IF EXISTS ${tableIdentifier}`);
      await connection.query(table.createSql);

      for (let index = 0; index < table.rows.length; index += 100) {
        const rows = table.rows.slice(index, index + 100);
        const columns = Object.keys(rows[0]);
        const columnIdentifiers = columns.map(quoteIdentifier).join(", ");
        const placeholders = `(${columns.map(() => "?").join(", ")})`;
        const values = rows.flatMap((row) =>
          columns.map((column) => normalizeMysqlDate(row[column])),
        );
        const insertPlaceholders = rows.map(() => placeholders).join(", ");
        await connection.query(
          `INSERT INTO ${tableIdentifier} (${columnIdentifiers}) VALUES ${insertPlaceholders}`,
          values,
        );
      }
    }
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

function ensureWarrantyDetailIndexes() {
  if (!warrantyDetailIndexSchemaPromise) {
    warrantyDetailIndexSchemaPromise = (async () => {
      for (const [table, indexName] of [
        ["garantia", "uq_garantia_detalle_venta"],
        ["solicitud_garantia", "uq_solicitud_garantia_detalle_venta"],
      ]) {
        const [indexRows] = await pool.query(
          `SHOW INDEX FROM ${table}
           WHERE Column_name = 'id_detalle_venta' AND Non_unique = 0`,
        );
        if (indexRows.length) continue;

        const [duplicateRows] = await pool.query(
          `SELECT id_detalle_venta
           FROM ${table}
           GROUP BY id_detalle_venta
           HAVING COUNT(*) > 1
           LIMIT 1`,
        );
        if (duplicateRows.length) {
          console.warn(
            `No se agregó ${indexName}: hay registros duplicados en ${table}.`,
          );
          continue;
        }

        try {
          await pool.query(
            `ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} (id_detalle_venta)`,
          );
        } catch (error) {
          if (error.code === "ER_DUP_KEYNAME") continue;
          if (error.code === "ER_DUP_ENTRY") {
            const [newDuplicates] = await pool.query(
              `SELECT id_detalle_venta
               FROM ${table}
               GROUP BY id_detalle_venta
               HAVING COUNT(*) > 1
               LIMIT 1`,
            );
            if (newDuplicates.length) {
              console.warn(
                `No se agregó ${indexName}: hay registros duplicados en ${table}.`,
              );
              continue;
            }
          }
          throw error;
        }
      }
    })().catch((error) => {
      warrantyDetailIndexSchemaPromise = null;
      throw error;
    });
  }
  return warrantyDetailIndexSchemaPromise;
}

function ensureWarrantyRequestSchema() {
  if (!warrantyRequestSchemaPromise) {
    warrantyRequestSchemaPromise = pool
      .query(
        `CREATE TABLE IF NOT EXISTS solicitud_garantia (
           id_solicitud INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
           id_usuario INT NOT NULL,
           id_detalle_venta INT NOT NULL,
           descripcion TEXT NOT NULL,
           estado ENUM(
             'RECIBIDA',
             'EN_REVISION',
             'APROBADA',
             'RECHAZADA',
             'CERRADA'
           ) NOT NULL DEFAULT 'RECIBIDA',
           fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT fk_solicitud_garantia_usuario
             FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
           CONSTRAINT fk_solicitud_garantia_detalle
             FOREIGN KEY (id_detalle_venta)
             REFERENCES detalle_venta (id_detalle_venta),
           INDEX idx_solicitud_garantia_usuario_fecha
             (id_usuario, fecha_solicitud)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      )
      .then(async () => {
        const [legacySerialColumns] = await pool.query(
          "SHOW COLUMNS FROM solicitud_garantia LIKE 'numero_serie'",
        );
        if (
          legacySerialColumns.length &&
          legacySerialColumns[0].Null !== "YES"
        ) {
          await pool.query(
            "ALTER TABLE solicitud_garantia MODIFY numero_serie VARCHAR(25) NULL",
          );
        }
        await ensureWarrantyDetailIndexes();
      })
      .catch((error) => {
        warrantyRequestSchemaPromise = null;
        throw error;
      });
  }
  return warrantyRequestSchemaPromise;
}

function ensureWarrantyStatusSchema() {
  if (!warrantyStatusSchemaPromise) {
    warrantyStatusSchemaPromise = (async () => {
      const [columns] = await pool.query(
        "SHOW COLUMNS FROM garantia LIKE 'estado'",
      );
      if (!columns.length) {
        throw new Error("No se encontró la columna de estado de garantía.");
      }

      const statusType = String(columns[0].Type || "").toUpperCase();
      if (!statusType.includes("'SUSPENDIDA'")) {
        await pool.query(
          `ALTER TABLE garantia
           MODIFY estado
           ENUM('VIGENTE', 'VENCIDA', 'ANULADA', 'SUSPENDIDA')
           NOT NULL DEFAULT 'VIGENTE'`,
        );
      }
    })().catch((error) => {
      warrantyStatusSchemaPromise = null;
      throw error;
    });
  }
  return warrantyStatusSchemaPromise;
}

function ensureLegacyAppointmentSchema() {
  if (!legacyAppointmentSchemaPromise) {
    legacyAppointmentSchemaPromise = (async () => {
      const [columns] = await pool.query(
        "SHOW COLUMNS FROM cita LIKE 'id_cita_local'",
      );
      if (!columns.length) {
        await pool.query(
          "ALTER TABLE cita ADD COLUMN id_cita_local VARCHAR(80) NULL",
        );
      }

      const [indexes] = await pool.query(
        "SHOW INDEX FROM cita WHERE Key_name = 'uq_cita_usuario_local'",
      );
      if (!indexes.length) {
        await pool.query(
          "ALTER TABLE cita ADD UNIQUE KEY uq_cita_usuario_local (id_usuario, id_cita_local)",
        );
      }
    })().catch((error) => {
      legacyAppointmentSchemaPromise = null;
      throw error;
    });
  }
  return legacyAppointmentSchemaPromise;
}

async function insertAutomaticWarrantyCoverage(connection, detailId) {
  await connection.query(
    `INSERT INTO garantia
       (id_detalle_venta, fecha_inicio, fecha_fin, estado)
     SELECT
       dv.id_detalle_venta,
       DATE(v.fecha),
       DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH),
       CASE
         WHEN DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH) >= CURRENT_DATE()
           THEN 'VIGENTE'
         ELSE 'VENCIDA'
       END
     FROM detalle_venta dv
     INNER JOIN venta v ON v.id_venta = dv.id_venta
     LEFT JOIN garantia g
       ON g.id_detalle_venta = dv.id_detalle_venta
     WHERE dv.id_detalle_venta = ?
       AND v.estado = 'PAGADA'
       AND g.id_garantia IS NULL
     ON DUPLICATE KEY UPDATE
       id_garantia = LAST_INSERT_ID(garantia.id_garantia)`,
    [detailId],
  );
}

async function insertSaleUnitsWithWarranties(connection, saleId, line, notes) {
  const totalMicros = Math.round(line.subtotal * 1_000_000);
  const baseMicros = Math.floor(totalMicros / line.quantity);
  const extraMicros = totalMicros % line.quantity;

  for (let unitIndex = 0; unitIndex < line.quantity; unitIndex += 1) {
    const unitSubtotal =
      (baseMicros + (unitIndex < extraMicros ? 1 : 0)) / 1_000_000;
    const [detailResult] = await connection.query(
      `INSERT INTO detalle_venta
         (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas)
       VALUES (?, ?, 1, ?, ?, ?)`,
      [saleId, line.productId, line.unitPrice, unitSubtotal, notes],
    );
    await insertAutomaticWarrantyCoverage(connection, detailResult.insertId);
  }
}

function ensureAutomaticWarrantyCoverage() {
  if (!automaticWarrantyCoveragePromise) {
    automaticWarrantyCoveragePromise = (async () => {
      let connection;
      try {
        await ensureWarrantyRequestSchema();
        await ensureWarrantyStatusSchema();
        await ensureWarrantyDetailIndexes();
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [multiUnitDetails] = await connection.query(
          `SELECT
             dv.id_detalle_venta AS detailId,
             dv.id_venta AS saleId,
             dv.id_producto AS productId,
             dv.cantidad AS quantity,
             dv.precio_unitario AS unitPrice,
             dv.subtotal AS subtotal,
             dv.notas AS notes
           FROM detalle_venta dv
           INNER JOIN venta v ON v.id_venta = dv.id_venta
           WHERE v.estado = 'PAGADA' AND dv.cantidad > 1
           ORDER BY dv.id_detalle_venta
           FOR UPDATE`,
        );
        for (const detail of multiUnitDetails) {
          const quantity = Number(detail.quantity);
          const unitPrice = Number(detail.unitPrice);
          const totalMicros = Math.round(Number(detail.subtotal) * 1_000_000);
          const baseMicros = Math.floor(totalMicros / quantity);
          const extraMicros = totalMicros % quantity;
          const firstUnitSubtotal =
            (baseMicros + (extraMicros > 0 ? 1 : 0)) / 1_000_000;
          const [updateResult] = await connection.query(
            `UPDATE detalle_venta
             SET cantidad = 1, subtotal = ?
             WHERE id_detalle_venta = ? AND cantidad = ?`,
            [firstUnitSubtotal, detail.detailId, quantity],
          );
          if (!updateResult.affectedRows) {
            throw new Error(
              `No se pudo separar el detalle de venta ${detail.detailId}.`,
            );
          }

          for (let unitIndex = 1; unitIndex < quantity; unitIndex += 1) {
            const unitSubtotal =
              (baseMicros + (unitIndex < extraMicros ? 1 : 0)) / 1_000_000;
            await connection.query(
              `INSERT INTO detalle_venta
                 (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas)
               VALUES (?, ?, 1, ?, ?, ?)`,
              [
                detail.saleId,
                detail.productId,
                unitPrice,
                unitSubtotal,
                detail.notes,
              ],
            );
          }
        }
        await connection.query(
          `UPDATE garantia g
           INNER JOIN detalle_venta dv
             ON dv.id_detalle_venta = g.id_detalle_venta
           INNER JOIN venta v ON v.id_venta = dv.id_venta
           SET g.fecha_inicio = DATE(v.fecha),
               g.fecha_fin = DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH),
               g.estado = CASE
                 WHEN DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH)
                      >= CURRENT_DATE()
                   THEN 'VIGENTE'
                 ELSE 'VENCIDA'
               END
           WHERE v.estado = 'PAGADA'
             AND g.estado NOT IN ('ANULADA', 'SUSPENDIDA')`,
        );
        await connection.query(
          `INSERT INTO garantia
             (id_detalle_venta, fecha_inicio, fecha_fin, estado)
           SELECT
             dv.id_detalle_venta,
             DATE(v.fecha),
             DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH),
             CASE
               WHEN DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH)
                    >= CURRENT_DATE()
                 THEN 'VIGENTE'
               ELSE 'VENCIDA'
             END
           FROM detalle_venta dv
           INNER JOIN venta v ON v.id_venta = dv.id_venta
           LEFT JOIN garantia g
             ON g.id_detalle_venta = dv.id_detalle_venta
           WHERE v.estado = 'PAGADA'
             AND g.id_garantia IS NULL
           ON DUPLICATE KEY UPDATE
             id_garantia = LAST_INSERT_ID(garantia.id_garantia)`,
        );
        await connection.commit();
      } catch (error) {
        if (connection) {
          try {
            await connection.rollback();
          } catch (rollbackError) {
            console.error(
              "Error revirtiendo la sincronización de garantías:",
              rollbackError.message,
            );
          }
        }
        throw error;
      } finally {
        connection?.release();
      }
    })().catch((error) => {
      automaticWarrantyCoveragePromise = null;
      throw error;
    });
  }
  return automaticWarrantyCoveragePromise;
}

function requireUserSession(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res
      .status(401)
      .json({ ok: false, message: "Sesión no válida o vencida." });
  }

  req.userId = session.userId;
  req.sessionToken = token;
  return next();
}

function crearTokenSesion(userId) {
  const now = Date.now();
  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) sessions.delete(token);
  });

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: now + SESSION_TTL });
  return token;
}

function invalidarSesionesUsuario(userId) {
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}

function obtenerPerfil(userId) {
  return pool.query(
    `SELECT
       id_usuario AS id,
       nombre,
       apellido,
       tipo_doc AS tipoDocumento,
       num_doc AS documento,
       DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS nacimiento,
       telefono,
       telefono_secundario AS telefonoSecundario,
       departamento,
       ciudad,
       direccion,
       correo
     FROM usuario
     WHERE id_usuario = ? AND estado = 'ACTIVO'`,
    [userId],
  );
}

app.get("/api/profile", requireUserSession, async (req, res) => {
  try {
    const [rows] = await obtenerPerfil(req.userId);
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado." });
    }
    return res.json({ ok: true, profile: rows[0] });
  } catch (error) {
    console.error("Error al consultar perfil:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo cargar el perfil." });
  }
});

async function obtenerFavoritosUsuario(userId) {
  const [favorites] = await pool.query(
    `SELECT
       p.id_producto AS id,
       p.nombre,
       c.nombre_cat AS categoria,
       p.precio,
       p.imagen_prin AS img,
       COALESCE(i.stock_total, 0) AS stock_total
     FROM favorito f
     INNER JOIN producto p ON p.id_producto = f.id_producto
     INNER JOIN categoria c ON c.id_categoria = p.id_categoria
     LEFT JOIN (
       SELECT i.id_producto, SUM(i.stock) AS stock_total
       FROM inventario i
       INNER JOIN sucursal s
         ON s.id_sucursal = i.id_sucursal
        AND s.estado = 'ACTIVO'
       WHERE i.estado = 'ACTIVO'
       GROUP BY i.id_producto
     ) i ON i.id_producto = p.id_producto
     WHERE f.id_usuario = ?
     ORDER BY f.fecha_agregado DESC, f.id_favorito DESC`,
    [userId],
  );
  return favorites;
}

app.get("/api/my-favorites", requireUserSession, async (req, res) => {
  try {
    const favorites = await obtenerFavoritosUsuario(req.userId);
    return res.json({ ok: true, favorites });
  } catch (error) {
    console.error("Error al consultar los favoritos:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudieron cargar tus favoritos." });
  }
});

app.post("/api/my-favorites", requireUserSession, async (req, res) => {
  const productId = Number(req.body?.productId);
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res
      .status(400)
      .json({ ok: false, message: "El producto solicitado no es válido." });
  }

  try {
    const [products] = await pool.query(
      "SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 'ACTIVO'",
      [productId],
    );
    if (!products.length) {
      return res
        .status(404)
        .json({ ok: false, message: "El producto no existe o no está disponible." });
    }

    await pool.query(
      `INSERT INTO favorito (id_usuario, id_producto)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id_favorito = id_favorito`,
      [req.userId, productId],
    );
    const favorites = await obtenerFavoritosUsuario(req.userId);
    return res.json({ ok: true, favorites });
  } catch (error) {
    console.error("Error al guardar un favorito:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo guardar el producto en favoritos." });
  }
});

app.delete("/api/my-favorites/:productId", requireUserSession, async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res
      .status(400)
      .json({ ok: false, message: "El producto solicitado no es válido." });
  }

  try {
    await pool.query(
      "DELETE FROM favorito WHERE id_usuario = ? AND id_producto = ?",
      [req.userId, productId],
    );
    const favorites = await obtenerFavoritosUsuario(req.userId);
    return res.json({ ok: true, favorites });
  } catch (error) {
    console.error("Error al eliminar un favorito:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo eliminar el producto de favoritos." });
  }
});

app.delete("/api/my-favorites", requireUserSession, async (req, res) => {
  try {
    await pool.query("DELETE FROM favorito WHERE id_usuario = ?", [req.userId]);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar los favoritos del usuario:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudieron eliminar tus favoritos." });
  }
});

async function obtenerPedidosCliente(userId) {
  const [rows] = await pool.query(
    `SELECT
       v.id_venta AS id,
       DATE_FORMAT(v.fecha, '%Y-%m-%dT%H:%i:%s') AS createdAt,
       v.metodo_pago AS paymentMethod,
       v.nro_pago AS paymentReference,
       v.numero_guia AS trackingNumber,
       v.estado AS status,
       v.notas AS notes,
       CONCAT('GAR-', g.id_garantia) AS warrantyCode,
       DATE_FORMAT(DATE(g.fecha_inicio), '%Y-%m-%d') AS warrantyStartsAt,
       DATE_FORMAT(
         DATE(g.fecha_fin),
         '%Y-%m-%d'
       ) AS warrantyExpiresAt,
       DATEDIFF(
         DATE(g.fecha_fin),
         CURRENT_DATE()
       ) AS warrantyDaysRemaining,
       g.estado AS warrantyStatus,
       dv.id_detalle_venta AS detailId,
       dv.id_producto AS productId,
       p.nombre AS productName,
       p.imagen_prin AS imageUrl,
       c.nombre_cat AS category,
       dv.cantidad AS quantity,
       dv.precio_unitario AS unitPrice,
       dv.subtotal AS lineSubtotal
     FROM venta v
     LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
     LEFT JOIN garantia g ON g.id_detalle_venta = dv.id_detalle_venta
     LEFT JOIN producto p ON p.id_producto = dv.id_producto
     LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
     WHERE v.id_usuario = ?
     ORDER BY v.fecha DESC, v.id_venta DESC, dv.id_detalle_venta`,
    [userId],
  );

  const ordersById = new Map();
  for (const row of rows) {
    let order = ordersById.get(row.id);
    if (!order) {
      const totalMatch = String(row.notes || "").match(
        /;\s*total\s+([\d.]+)\s+COP(?:\.|$)/i,
      );
      const recordedTotal = totalMatch ? Number(totalMatch[1]) : null;
      order = {
        id: row.id,
        number: row.paymentReference || `WG-${row.id}`,
        createdAt: row.createdAt,
        paymentMethod: row.paymentMethod,
        trackingNumber: row.trackingNumber,
        status: row.status,
        itemCount: 0,
        subtotal: 0,
        total: Number.isFinite(recordedTotal) ? recordedTotal : null,
        items: [],
      };
      ordersById.set(row.id, order);
    }

    if (row.detailId !== null) {
      const quantity = Number(row.quantity);
      const unitPrice = Number(row.unitPrice);
      const lineSubtotal = Number(row.lineSubtotal);
      order.itemCount += quantity;
      order.subtotal += lineSubtotal;
      order.items.push({
        detailId: row.detailId,
        productId: row.productId,
        name: row.productName || "Producto no disponible",
        imageUrl: row.imageUrl,
        category: row.category || "Sin categoría",
        warrantyStartsAt: row.warrantyStartsAt,
        warrantyExpiresAt: row.warrantyExpiresAt,
        warrantyCode: row.warrantyCode,
        warrantyDaysRemaining:
          row.warrantyDaysRemaining === null
            ? null
            : Number(row.warrantyDaysRemaining),
        warrantyStatus: row.warrantyStatus,
        warrantyActive:
          row.status === "PAGADA" &&
          row.warrantyStatus === "VIGENTE" &&
          row.warrantyDaysRemaining !== null &&
          Number(row.warrantyDaysRemaining) >= 0,
        quantity,
        unitPrice,
        subtotal: lineSubtotal,
      });
    }
  }

  return [...ordersById.values()].map((order) => {
    const unitCounts = new Map();
    for (const item of order.items) {
      const productId = String(item.productId);
      unitCounts.set(
        productId,
        (unitCounts.get(productId) || 0) + Number(item.quantity),
      );
    }

    const unitIndexes = new Map();
    for (const item of order.items) {
      const productId = String(item.productId);
      const unitNumber = (unitIndexes.get(productId) || 0) + 1;
      unitIndexes.set(productId, unitNumber);
      item.unitNumber = unitNumber;
      item.unitCount = unitCounts.get(productId);
    }

    return {
      ...order,
      subtotal: Number(order.subtotal.toFixed(2)),
      total: order.total ?? Number(order.subtotal.toFixed(2)),
    };
  });
}

app.get("/api/my-orders", requireUserSession, async (req, res) => {
  try {
    await ensureAutomaticWarrantyCoverage();
    const orders = await obtenerPedidosCliente(req.userId);
    return res.json({ ok: true, orders });
  } catch (error) {
    console.error("Error consultando pedidos del cliente:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar tus pedidos.",
    });
  }
});

app.get("/api/my-warranty-products", requireUserSession, async (req, res) => {
  try {
    await ensureWarrantyRequestSchema();
    await ensureAutomaticWarrantyCoverage();
    const orders = await obtenerPedidosCliente(req.userId);
    const purchaseRows = orders
      .filter((order) => order.status === "PAGADA")
      .flatMap((order) =>
        order.items.map((item) => ({
          detailId: item.detailId,
          saleId: order.id,
          orderNumber: order.number,
          unitReference: `${order.number}-U${item.detailId}`,
          unitNumber: item.unitNumber,
          unitCount: item.unitCount,
          purchasedAt: order.createdAt?.slice(0, 10) || "",
          warrantyCode: item.warrantyCode,
          unitNumber: item.unitNumber,
          unitCount: item.unitCount,
          quantity: item.quantity,
          productName: item.name,
          imageUrl: item.imageUrl,
          category: item.category,
          warrantyStartsAt: item.warrantyStartsAt,
          warrantyExpiresAt: item.warrantyExpiresAt,
          warrantyStatus: item.warrantyStatus,
          warrantyDaysRemaining: item.warrantyDaysRemaining,
          warrantyActive: item.warrantyActive,
        })),
      );
    const [requestRows] = await pool.query(
      `SELECT
         id_solicitud AS id,
         id_detalle_venta AS detailId,
         estado AS status,
         DATE_FORMAT(fecha_solicitud, '%Y-%m-%dT%H:%i:%s') AS requestedAt
       FROM solicitud_garantia
       WHERE id_usuario = ?
       ORDER BY fecha_solicitud DESC, id_solicitud DESC`,
      [req.userId],
    );
    const requestsByDetail = new Map();
    for (const request of requestRows) {
      const requests = requestsByDetail.get(request.detailId) || [];
      requests.push(request);
      requestsByDetail.set(request.detailId, requests);
    }

    const products = purchaseRows.map((purchase) => {
      const requests = requestsByDetail.get(purchase.detailId) || [];
      return {
        ...purchase,
        hasRequest: requests.length > 0,
        requestStatus: requests[0]?.status || "",
      };
    });
    return res.json({ ok: true, products });
  } catch (error) {
    console.error("Error consultando productos para garantía:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar tus productos comprados.",
    });
  }
});

app.get("/api/my-warranty-requests", requireUserSession, async (req, res) => {
  try {
    await ensureWarrantyRequestSchema();
    const [requests] = await pool.query(
      `SELECT
         sg.id_solicitud AS id,
         COALESCE(v.nro_pago, CONCAT('WG-', v.id_venta)) AS orderNumber,
         CONCAT('GAR-', g.id_garantia) AS warrantyCode,
         p.nombre AS productName,
         DATE_FORMAT(DATE(v.fecha), '%Y-%m-%d') AS warrantyStartsAt,
         DATE_FORMAT(
           DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH),
           '%Y-%m-%d'
         ) AS warrantyExpiresAt,
         DATE_FORMAT(sg.fecha_solicitud, '%Y-%m-%d %H:%i') AS requestedAt,
         sg.descripcion AS description,
         sg.estado AS status
       FROM solicitud_garantia sg
       INNER JOIN detalle_venta dv
         ON dv.id_detalle_venta = sg.id_detalle_venta
       LEFT JOIN garantia g ON g.id_detalle_venta = dv.id_detalle_venta
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       WHERE sg.id_usuario = ?
       ORDER BY sg.fecha_solicitud DESC, sg.id_solicitud DESC`,
      [req.userId],
    );
    return res.json({ ok: true, requests });
  } catch (error) {
    console.error("Error consultando solicitudes de garantía:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar tus solicitudes de garantía.",
    });
  }
});

app.post("/api/my-warranty-requests", requireUserSession, async (req, res) => {
  const detailId = Number(req.body?.detailId);
  const description = String(req.body?.description || "").trim();

  if (!Number.isSafeInteger(detailId) || detailId <= 0) {
    return res.status(400).json({
      ok: false,
      code: "INVALID_PURCHASE",
      message: "Selecciona un producto de una compra confirmada.",
    });
  }
  if (description.length < 15 || description.length > 2000) {
    return res.status(400).json({
      ok: false,
      code: "INVALID_DESCRIPTION",
      message: "Describe el problema con entre 15 y 2000 caracteres.",
    });
  }

  let connection;
  try {
    await ensureWarrantyRequestSchema();
    await ensureAutomaticWarrantyCoverage();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [purchaseRows] = await connection.query(
      `SELECT
         DATE_FORMAT(DATE(g.fecha_fin), '%Y-%m-%d') AS warrantyExpiresAt,
         DATEDIFF(DATE(g.fecha_fin), CURRENT_DATE()) AS warrantyDaysRemaining,
         g.estado AS warrantyStatus
       FROM detalle_venta dv
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN garantia g
         ON g.id_detalle_venta = dv.id_detalle_venta
       WHERE dv.id_detalle_venta = ?
         AND v.id_usuario = ?
         AND v.estado = 'PAGADA'
       FOR UPDATE`,
      [detailId, req.userId],
    );
    if (!purchaseRows.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        code: "INVALID_PURCHASE",
        message: "No encontramos esa compra confirmada en tu cuenta.",
      });
    }
    if (Number(purchaseRows[0].warrantyDaysRemaining) < 0) {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        code: "WARRANTY_EXPIRED",
        message: `El plazo de garantía de 6 meses venció el ${purchaseRows[0].warrantyExpiresAt}.`,
      });
    }
    if (purchaseRows[0].warrantyStatus !== "VIGENTE") {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        code: "WARRANTY_INACTIVE",
        message: "La garantía de esta compra no está activa para recibir solicitudes.",
      });
    }

    const [requestRows] = await connection.query(
      `SELECT id_solicitud
       FROM solicitud_garantia
       WHERE id_detalle_venta = ?
       FOR UPDATE`,
      [detailId],
    );
    if (requestRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        code: "REQUEST_ALREADY_EXISTS",
        message: "Ya existe una solicitud de garantía para este producto.",
      });
    }

    const [result] = await connection.query(
      `INSERT INTO solicitud_garantia
         (id_usuario, id_detalle_venta, descripcion)
       VALUES (?, ?, ?)`,
      [req.userId, detailId, description],
    );
    await connection.commit();
    return res.status(201).json({
      ok: true,
      message: "Solicitud enviada correctamente. Nuestro equipo la revisará y podrás consultar el estado desde la sección Garantías.",
      request: {
        id: result.insertId,
        detailId,
        status: "RECIBIDA",
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        code: "REQUEST_ALREADY_EXISTS",
        message: "Ya existe una solicitud de garantía para este producto.",
      });
    }
    console.error("Error registrando solicitud de garantía:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo registrar tu solicitud de garantía.",
    });
  } finally {
    connection?.release();
  }
});

app.put("/api/profile", requireUserSession, async (req, res) => {
  const profile = {
    nombre: String(req.body?.nombre || "").trim(),
    apellido: String(req.body?.apellido || "").trim(),
    correo: String(req.body?.correo || "")
      .trim()
      .toLowerCase(),
    telefono: String(req.body?.telefono || "").trim(),
    documento: String(req.body?.documento || "").trim(),
    nacimiento: String(req.body?.nacimiento || "").trim(),
  };
  const nombreValido = /^[\p{L}][\p{L}\s'-]*$/u;
  const fechaNacimiento = new Date(`${profile.nacimiento}T00:00:00Z`);
  const fechaValida =
    !profile.nacimiento ||
    (/^\d{4}-\d{2}-\d{2}$/.test(profile.nacimiento) &&
      !Number.isNaN(fechaNacimiento.getTime()) &&
      fechaNacimiento.toISOString().slice(0, 10) === profile.nacimiento &&
      profile.nacimiento <= new Date().toISOString().slice(0, 10));

  if (
    !nombreValido.test(profile.nombre) ||
    !nombreValido.test(profile.apellido) ||
    profile.nombre.length > 30 ||
    profile.apellido.length > 30 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.correo) ||
    profile.correo.length > 120 ||
    !/^[+\d()\s-]{7,20}$/.test(profile.telefono) ||
    !/^[\p{L}\p{N}.-]{4,20}$/u.test(profile.documento) ||
    !fechaValida
  ) {
    return res
      .status(400)
      .json({ ok: false, message: "Revisa los datos del perfil." });
  }

  try {
    await pool.query(
      `UPDATE usuario
       SET nombre = ?, apellido = ?, correo = ?, telefono = ?,
           num_doc = ?, fecha_nacimiento = ?
       WHERE id_usuario = ? AND estado = 'ACTIVO'`,
      [
        profile.nombre,
        profile.apellido,
        profile.correo,
        profile.telefono,
        profile.documento,
        profile.nacimiento || null,
        req.userId,
      ],
    );
    const [rows] = await obtenerPerfil(req.userId);
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado." });
    }
    return res.json({ ok: true, profile: rows[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "El correo o documento ya está registrado.",
      });
    }
    console.error("Error al actualizar perfil:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo guardar el perfil." });
  }
});

app.put("/api/profile/address", requireUserSession, async (req, res) => {
  const direccion = String(req.body?.direccion || "").trim();
  const departamento = String(req.body?.departamento || "").trim();
  const ciudad = String(req.body?.ciudad || "").trim();

  if (direccion && (direccion.length < 5 || direccion.length > 40)) {
    return res.status(400).json({
      ok: false,
      message: "Ingresa una dirección válida.",
    });
  }
  if (departamento && departamento.length > 30) {
    return res.status(400).json({
      ok: false,
      message: "El departamento no puede superar 30 caracteres.",
    });
  }
  if (ciudad && ciudad.length > 30) {
    return res.status(400).json({
      ok: false,
      message: "La ciudad no puede superar 30 caracteres.",
    });
  }

  try {
    await pool.query(
      `UPDATE usuario
       SET direccion = ?, departamento = COALESCE(NULLIF(?, ''), departamento),
           ciudad = COALESCE(NULLIF(?, ''), ciudad)
       WHERE id_usuario = ? AND estado = 'ACTIVO'`,
      [direccion || null, departamento, ciudad, req.userId],
    );
    const [rows] = await obtenerPerfil(req.userId);
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
    }
    return res.json({ ok: true, profile: rows[0] });
  } catch (error) {
    console.error("Error al actualizar dirección:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo guardar la dirección.",
    });
  }
});

app.put("/api/profile/password", requireUserSession, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (
    !currentPassword ||
    newPassword.length < 8 ||
    Buffer.byteLength(newPassword, "utf8") > 72
  ) {
    return res.status(400).json({
      ok: false,
      message: "La nueva contraseña debe tener entre 8 y 72 bytes.",
    });
  }

  try {
    const [rows] = await pool.query(
      "SELECT contrasena_hash FROM usuario WHERE id_usuario = ? AND estado = 'ACTIVO'",
      [req.userId],
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado." });
    }

    const storedPassword = rows[0].contrasena_hash || "";
    const currentPasswordMatches = storedPassword.startsWith("$2")
      ? await bcrypt.compare(currentPassword, storedPassword)
      : currentPassword === storedPassword;
    if (!currentPasswordMatches) {
      return res
        .status(400)
        .json({ ok: false, message: "La contraseña actual no es correcta." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE usuario SET contrasena_hash = ? WHERE id_usuario = ?",
      [passwordHash, req.userId],
    );
    return res.json({ ok: true, message: "Contraseña actualizada." });
  } catch (error) {
    console.error("Error al actualizar contraseña:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo actualizar la contraseña." });
  }
});

app.delete("/api/session", requireUserSession, (req, res) => {
  sessions.delete(req.sessionToken);
  return res.json({ ok: true });
});

app.get("/api/my-appointments", requireUserSession, async (req, res) => {
  try {
    const [appointments] = await pool.query(
      `SELECT
         id_cita AS id,
         equipo AS equipment,
         descripcion AS description,
         telefono AS phone,
         DATE_FORMAT(fecha, '%Y-%m-%d') AS appointmentDate,
         tipo_servicio AS serviceType,
         estado AS status
       FROM cita
       WHERE id_usuario = ?
       ORDER BY fecha ASC, fecha_creacion DESC`,
      [req.userId],
    );
    return res.json({ ok: true, appointments });
  } catch (error) {
    console.error("Error al consultar las citas del usuario:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudieron cargar tus citas." });
  }
});

app.post("/api/my-appointments/import-legacy", requireUserSession, async (req, res) => {
  const legacyAppointments = req.body?.appointments;
  if (!Array.isArray(legacyAppointments) || legacyAppointments.length > 100) {
    return res.status(400).json({
      ok: false,
      message: "La lista de citas antiguas no es válida.",
    });
  }

  const normalizeValue = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  const validStatuses = new Map([
    ["SOLICITUD RECIBIDA", "SOLICITUD RECIBIDA"],
    ["PENDIENTE", "SOLICITUD RECIBIDA"],
    ["CONFIRMADA", "CONFIRMADA"],
    ["EN PROCESO", "EN PROCESO"],
    ["COMPLETADA", "COMPLETADA"],
    ["COMPLETADO", "COMPLETADA"],
    ["FINALIZADA", "COMPLETADA"],
    ["FINALIZADO", "COMPLETADA"],
    ["CANCELADA", "CANCELADA"],
    ["CANCELADO", "CANCELADA"],
  ]);
  const validAppointments = [];
  const errors = [];

  legacyAppointments.forEach((legacyAppointment, index) => {
    const appointment =
      legacyAppointment && typeof legacyAppointment === "object"
        ? legacyAppointment
        : {};
    const localId = String(appointment.id ?? "").trim();
    const equipment = String(appointment.equipo || appointment.equipment || "").trim();
    const description = String(
      appointment.descripcion || appointment.description || "",
    ).trim();
    const phone = String(appointment.telefono || appointment.phone || "").trim();
    const appointmentDate = String(
      appointment.fecha || appointment.appointmentDate || "",
    ).trim();
    const serviceValue = normalizeValue(
      appointment.servicio || appointment.serviceType,
    );
    const statusValue = normalizeValue(
      appointment.estado || appointment.status || "SOLICITUD RECIBIDA",
    );
    const serviceType = serviceValue.includes("MANTENIMIENTO")
      ? "MANTENIMIENTO"
      : serviceValue.includes("REPARACION")
        ? "REPARACION"
        : null;
    const dateValue = new Date(`${appointmentDate}T00:00:00Z`);
    const status = validStatuses.get(statusValue);

    const validationErrors = [];
    if (!localId || localId.length > 80) {
      validationErrors.push("No tiene un identificador local válido.");
    }
    if (equipment.length < 2 || equipment.length > 100) {
      validationErrors.push("El equipo debe tener entre 2 y 100 caracteres.");
    }
    if (description.length > 1000) {
      validationErrors.push("La descripción supera los 1000 caracteres.");
    }
    if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      validationErrors.push("El teléfono no tiene un formato válido.");
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
      Number.isNaN(dateValue.getTime()) ||
      dateValue.toISOString().slice(0, 10) !== appointmentDate
    ) {
      validationErrors.push("La fecha no es válida.");
    }
    if (!serviceType) {
      validationErrors.push("El tipo de servicio no es válido.");
    }
    if (!status) {
      validationErrors.push("El estado no es compatible.");
    }

    if (validationErrors.length) {
      errors.push({ index: index + 1, localId, messages: validationErrors });
      return;
    }

    validAppointments.push({
      localId,
      equipment,
      description: description || null,
      phone,
      appointmentDate,
      serviceType,
      status,
    });
  });

  if (!validAppointments.length) {
    return res.json({
      ok: true,
      importedCount: 0,
      resolvedIds: [],
      errors,
    });
  }

  let connection;
  try {
    await ensureLegacyAppointmentSchema();
    const [userRows] = await pool.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO'
         AND r.nombre_rol IN ('Cliente', 'Administrador', 'Trabajador')
       LIMIT 1`,
      [req.userId],
    );
    if (!userRows.length) {
      return res.status(403).json({
        ok: false,
        message: "Solo una cuenta activa puede importar citas antiguas.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const resolvedIds = [];
    let importedCount = 0;
    for (const appointment of validAppointments) {
      const [existingRows] = await connection.query(
        `SELECT id_cita
         FROM cita
         WHERE id_usuario = ? AND id_cita_local = ?
         LIMIT 1`,
        [req.userId, appointment.localId],
      );
      if (!existingRows.length) {
        await connection.query(
          `INSERT INTO cita
             (id_usuario, equipo, descripcion, telefono, fecha, tipo_servicio, estado, id_cita_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.userId,
            appointment.equipment,
            appointment.description,
            appointment.phone,
            appointment.appointmentDate,
            appointment.serviceType,
            appointment.status,
            appointment.localId,
          ],
        );
        importedCount += 1;
      }
      resolvedIds.push(appointment.localId);
    }
    await connection.commit();
    return res.json({
      ok: true,
      importedCount,
      resolvedIds,
      errors,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error revirtiendo importación de citas antiguas:", rollbackError.message);
      }
    }
    console.error("Error importando citas antiguas:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron importar las citas antiguas.",
    });
  } finally {
    connection?.release();
  }
});

app.patch("/api/my-appointments/:id/cancel", requireUserSession, async (req, res) => {
  const appointmentId = Number(req.params.id);
  if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({ ok: false, message: "La cita solicitada no es válida." });
  }

  try {
    const [result] = await pool.query(
      `UPDATE cita
       SET estado = 'CANCELADA'
       WHERE id_cita = ? AND id_usuario = ?
         AND estado IN ('SOLICITUD RECIBIDA', 'CONFIRMADA')`,
      [appointmentId, req.userId],
    );
    if (!result.affectedRows) {
      const [appointments] = await pool.query(
        "SELECT estado FROM cita WHERE id_cita = ? AND id_usuario = ?",
        [appointmentId, req.userId],
      );
      if (!appointments.length) {
        return res.status(404).json({ ok: false, message: "No se encontró la cita solicitada." });
      }
      return res.status(409).json({
        ok: false,
        message: "La cita ya no se puede cancelar porque está en proceso o ya fue finalizada/cancelada.",
      });
    }

    return res.json({ ok: true, message: "Tu cita fue cancelada correctamente." });
  } catch (error) {
    console.error("Error al cancelar la cita del usuario:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo cancelar la cita." });
  }
});

app.post("/api/appointments", requireUserSession, async (req, res) => {
  const equipment = String(req.body?.equipment || "").trim();
  const description = String(req.body?.description || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const appointmentDate = String(req.body?.date || "").trim();
  const serviceType = String(req.body?.serviceType || "");
  const validServiceTypes = ["MANTENIMIENTO", "REPARACION"];
  const dateValue = new Date(`${appointmentDate}T00:00:00Z`);
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (
    equipment.length < 2 ||
    equipment.length > 100 ||
    description.length < 10 ||
    description.length > 1000 ||
    !/^\d{10}$/.test(phone) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
    Number.isNaN(dateValue.getTime()) ||
    dateValue.toISOString().slice(0, 10) !== appointmentDate ||
    appointmentDate < today ||
    !validServiceTypes.includes(serviceType)
  ) {
    return res.status(400).json({
      ok: false,
      message: "Revisa el equipo, descripción, teléfono, fecha y tipo de servicio.",
    });
  }

  try {
    const [userRows] = await pool.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO'
         AND r.nombre_rol IN ('Cliente', 'Administrador', 'Trabajador')
       LIMIT 1`,
      [req.userId],
    );
    if (!userRows.length) {
      return res.status(403).json({
        ok: false,
        message: "Solo una cuenta activa puede agendar citas.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO cita (id_usuario, equipo, descripcion, telefono, fecha, tipo_servicio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.userId, equipment, description, phone, appointmentDate, serviceType],
    );
    return res.status(201).json({
      ok: true,
      message: "Tu cita quedó registrada correctamente.",
      appointment: {
        id: result.insertId,
        equipment,
        description,
        phone,
        appointmentDate,
        serviceType,
        status: "SOLICITUD RECIBIDA",
      },
    });
  } catch (error) {
    console.error("Error al registrar la cita:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar la cita." });
  }
});

async function obtenerSucursalInventarioAdmin(branchId) {
  const parsedBranchId = Number(branchId);
  if (!Number.isSafeInteger(parsedBranchId) || parsedBranchId < 1) return null;

  const [rows] = await pool.query(
    "SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? AND estado = 'ACTIVO'",
    [parsedBranchId],
  );
  return rows[0] || null;
}

app.get("/api/dashboard/admin", requireAdmin, async (req, res) => {
  try {
    await ensureWarrantyRequestSchema();
    await ensureAutomaticWarrantyCoverage();
    const salesPeriod = req.query.period === undefined ? 7 : Number(req.query.period);
    if (![7, 15, 30].includes(salesPeriod)) {
      return res.status(400).json({
        ok: false,
        message: "El rango de ventas debe ser de 7, 15 o 30 días.",
      });
    }
    const [productsCountRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM producto WHERE estado = 'ACTIVO'",
    );
    const [clientsCountRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Cliente' AND u.estado = 'ACTIVO'`,
    );
    const [ordersCountRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM venta WHERE estado = 'PAGADA'",
    );
    const [salesTotalRows] = await pool.query(
      `SELECT COALESCE(SUM(dv.subtotal), 0) AS total
       FROM detalle_venta dv
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       WHERE v.estado = 'PAGADA'`,
    );
    const [monthlyIncomeRows] = await pool.query(
      `SELECT
         DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AS month,
         COUNT(DISTINCT v.id_venta) AS transactions,
         COALESCE(SUM(dv.subtotal), 0) AS total
       FROM venta v
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       WHERE v.estado = 'PAGADA'
         AND v.fecha >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
         AND v.fecha < DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)`,
    );
    const [monthlyExpenseRows] = await pool.query(
      `SELECT
         COUNT(DISTINCT c.id_compra) AS transactions,
         COALESCE(SUM(dc.subtotal), 0) AS total
       FROM compra c
       LEFT JOIN detalle_compra dc ON dc.id_compra = c.id_compra
       WHERE c.estado = 'PAGADA'
         AND c.fecha >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
         AND c.fecha < DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)`,
    );
    const monthlyIncome = Number(monthlyIncomeRows[0]?.total || 0);
    const monthlyExpenses = Number(monthlyExpenseRows[0]?.total || 0);
    const monthlyResult = monthlyIncome - monthlyExpenses;
    const [topProductsRows] = await pool.query(
      `SELECT p.nombre, p.imagen_prin AS imagen_url, SUM(dv.cantidad) AS cantidad, SUM(dv.subtotal) AS total
       FROM detalle_venta dv
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       WHERE p.estado = 'ACTIVO'
       GROUP BY p.id_producto, p.nombre, p.imagen_prin
       ORDER BY cantidad DESC, total DESC
       LIMIT 3`,
    );
    const [salesTrendRows] = await pool.query(
      `SELECT
         DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n.n DAY), '%Y-%m-%d') AS sale_date,
         COALESCE(SUM(dv.subtotal), 0) AS total
       FROM (
         SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
         UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
         UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
         UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
         UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
         UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
       ) n
       LEFT JOIN venta v
         ON DATE(v.fecha) = DATE_SUB(CURDATE(), INTERVAL n.n DAY)
        AND v.estado = 'PAGADA'
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       WHERE n.n < ?
       GROUP BY n.n, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n.n DAY), '%Y-%m-%d')
       ORDER BY n.n`,
      [salesPeriod],
    );
    const [ordersRows] = await pool.query(
      `SELECT
         v.id_venta,
         v.id_usuario AS clientId,
         COALESCE(v.nro_pago, CONCAT('WG-', v.id_venta)) AS orderNumber,
         u.nombre,
         u.apellido,
         DATE_FORMAT(v.fecha, '%Y-%m-%d %H:%i') AS orderDate,
         v.estado,
         COALESCE(SUM(dv.subtotal), 0) AS subtotal,
         MAX(v.notas) AS notes
       FROM venta v
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       GROUP BY
         v.id_venta, v.id_usuario, v.nro_pago, u.nombre, u.apellido, v.fecha, v.estado
       ORDER BY v.fecha DESC, v.id_venta DESC`,
    );
    const [branchRows] = await pool.query(
      `SELECT id_sucursal AS id, nombre_suc AS name
       FROM sucursal
       WHERE estado = 'ACTIVO'
       ORDER BY id_sucursal`,
    );
    if (!branchRows.length) {
      return res.status(409).json({
        ok: false,
        message: "No hay sucursales activas para consultar el inventario.",
      });
    }

    const requestedBranchId = Number(req.query.branchId);
    const selectedBranch = branchRows.find(
      (branch) => Number(branch.id) === requestedBranchId,
    ) || branchRows[0];
    const selectedBranchId = Number(selectedBranch.id);

    const [inventoryRows] = await pool.query(
      `SELECT
         p.id_producto AS id,
         p.nombre AS name,
         CONCAT('PRD-', p.id_producto) AS sku,
         c.nombre_cat AS category,
         p.precio AS price,
         COALESCE(i.stock_total, 0) AS stock,
         COALESCE((
           SELECT SUM(bi.stock)
           FROM inventario bi
           WHERE bi.id_producto = p.id_producto
             AND bi.id_sucursal = ?
             AND bi.estado = 'ACTIVO'
         ), 0) AS branchStock,
         3 AS minStock,
         'Nuevo Sellado' AS productCondition,
         '12 Meses' AS warranty,
         p.imagen_prin AS imageUrl,
         p.imagen_2 AS imageUrl2,
         p.imagen_3 AS imageUrl3,
         p.imagen_4 AS imageUrl4,
         p.descripcion AS description,
         'Original' AS platform,
         m.nombre_marca AS publisher,
         p.estado AS status
       FROM producto p
       INNER JOIN categoria c ON c.id_categoria = p.id_categoria
       INNER JOIN marca m ON m.id_marca = p.id_marca
       LEFT JOIN (
          SELECT i.id_producto, SUM(i.stock) AS stock_total
          FROM inventario i
          INNER JOIN sucursal s
            ON s.id_sucursal = i.id_sucursal
           AND s.estado = 'ACTIVO'
          WHERE i.estado = 'ACTIVO'
          GROUP BY i.id_producto
       ) i ON i.id_producto = p.id_producto
       ORDER BY p.nombre`,
      [selectedBranchId],
    );
    const [clientsRows] = await pool.query(
      `SELECT
         u.id_usuario AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS name,
         u.telefono AS phone,
         u.correo AS email,
         COALESCE(SUM(dv.subtotal), 0) AS totalSpent,
         MAX(v.fecha) AS lastVisit,
         CASE
           WHEN COALESCE(SUM(dv.subtotal), 0) >= 500000 THEN 'VIP'
           WHEN COALESCE(SUM(dv.subtotal), 0) >= 150000 THEN 'Frecuente'
           ELSE 'Nuevo'
         END AS level
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       LEFT JOIN venta v ON v.id_usuario = u.id_usuario AND v.estado = 'PAGADA'
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       WHERE r.nombre_rol = 'Cliente' AND u.estado = 'ACTIVO'
       GROUP BY u.id_usuario, u.nombre, u.apellido, u.telefono, u.correo
       ORDER BY totalSpent DESC, u.nombre`,
    );
    const [usersRows] = await pool.query(
      `SELECT
         u.id_usuario AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS name,
         u.telefono AS phone,
         u.correo AS email,
         u.departamento AS department,
         u.ciudad AS city,
         u.direccion AS address,
         DATE_FORMAT(u.fecha_ingreso, '%Y-%m-%d') AS createdAt,
         u.estado AS status,
         r.id_rol AS roleId,
         r.nombre_rol AS role,
         COALESCE(SUM(dv.subtotal), 0) AS totalSpent,
         MAX(v.fecha) AS lastVisit
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       LEFT JOIN venta v ON v.id_usuario = u.id_usuario AND v.estado = 'PAGADA'
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       GROUP BY
         u.id_usuario, u.nombre, u.apellido, u.telefono, u.correo,
         u.departamento, u.ciudad, u.direccion, u.fecha_ingreso,
         u.estado, r.id_rol, r.nombre_rol
       ORDER BY u.nombre, u.apellido`,
    );
    const [roleRows] = await pool.query(
      `SELECT id_rol AS id, nombre_rol AS name
       FROM rol
       WHERE estado = 'ACTIVO'
       ORDER BY id_rol`,
    );
    const [technicianRows] = await pool.query(
      `SELECT
         u.id_usuario AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS name
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Trabajador' AND u.estado = 'ACTIVO'
       ORDER BY u.nombre, u.apellido`,
    );
    const [warrantyRows] = await pool.query(
      `SELECT
         CONCAT('GAR-', g.id_garantia) AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         p.nombre AS product,
         dv.cantidad AS quantity,
         DATE(v.fecha) AS buyDate,
         DATE(g.fecha_fin) AS expDate,
         DATE(g.fecha_fin) >= CURRENT_DATE() AS canChangeStatus,
         CASE
           WHEN DATE(g.fecha_fin) < CURRENT_DATE() THEN 'Vencida'
           WHEN g.estado IN ('ANULADA', 'SUSPENDIDA') THEN 'Suspendida'
           WHEN g.estado = 'VIGENTE' THEN 'Activa'
           ELSE 'Vencida'
         END AS status
       FROM garantia g
       INNER JOIN detalle_venta dv ON dv.id_detalle_venta = g.id_detalle_venta
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       WHERE v.estado = 'PAGADA'
       ORDER BY v.fecha DESC, g.id_garantia DESC`,
    );
    const [warrantyRequestRows] = await pool.query(
      `SELECT
         sg.id_solicitud AS id,
         CONCAT('SOL-', sg.id_solicitud) AS reference,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         COALESCE(v.nro_pago, CONCAT('WG-', v.id_venta)) AS orderNumber,
         p.nombre AS product,
         DATE_FORMAT(sg.fecha_solicitud, '%Y-%m-%d %H:%i') AS requestedAt,
         DATE_FORMAT(
           DATE_ADD(DATE(v.fecha), INTERVAL 6 MONTH),
           '%Y-%m-%d'
         ) AS warrantyExpiresAt,
         sg.descripcion AS description,
         sg.estado AS status
       FROM solicitud_garantia sg
       INNER JOIN usuario u ON u.id_usuario = sg.id_usuario
       INNER JOIN detalle_venta dv
         ON dv.id_detalle_venta = sg.id_detalle_venta
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       ORDER BY sg.fecha_solicitud DESC, sg.id_solicitud DESC`,
    );
    const [maintenanceRows] = await pool.query(
      `SELECT
         s.id_servicio AS id,
         CONCAT('MNT-', s.id_servicio) AS maintenanceOrder,
         COALESCE(e.descripcion, e.tipo) AS equipment,
         e.tipo AS equipmentType,
         e.marca AS brand,
         e.numero_serial AS serialNumber,
         s.descripcion AS workRequested,
         COALESCE(ds.details, 'Pendiente de diagnóstico') AS details,
         CONCAT(uCliente.nombre, ' ', uCliente.apellido) AS client,
         s.id_encargado AS technicianId,
         CONCAT(uEncargado.nombre, ' ', uEncargado.apellido) AS tech,
         COALESCE(ds.cost, 0) AS cost,
         DATE_FORMAT(s.fecha_creacion, '%Y-%m-%d %H:%i') AS createdAt,
         s.estado AS statusCode,
         CASE
           WHEN s.estado = 'PENDIENTE' THEN 'En Taller'
           WHEN s.estado = 'EN PROCESO' THEN 'En Diagnóstico'
           WHEN s.estado = 'COMPLETO' THEN 'Listo para Entrega'
           ELSE 'Cancelado'
         END AS status
       FROM servicio s
       INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
       INNER JOIN equipo e ON e.id_equipo = s.id_equipo
       INNER JOIN usuario uCliente ON uCliente.id_usuario = s.id_usuario
       INNER JOIN usuario uEncargado ON uEncargado.id_usuario = s.id_encargado
       LEFT JOIN (
         SELECT
           id_servicio,
           SUM(subtotal) AS cost,
           GROUP_CONCAT(DISTINCT NULLIF(descripcion, '') SEPARATOR ' · ') AS details
         FROM detalle_servicio
         GROUP BY id_servicio
       ) ds ON ds.id_servicio = s.id_servicio
       WHERE ts.nombre = 'Mantenimiento preventivo' AND ts.estado = 'ACTIVO'
       ORDER BY s.fecha_creacion DESC
       LIMIT 10`,
    );
    const [repairRows] = await pool.query(
      `SELECT
         s.id_servicio AS id,
         CONCAT('REP-', s.id_servicio) AS ticket,
         COALESCE(e.descripcion, e.tipo) AS device,
         e.tipo AS equipmentType,
         e.marca AS brand,
         e.numero_serial AS serialNumber,
         s.descripcion AS defect,
         COALESCE(ds.details, 'Pendiente de diagnóstico') AS details,
         CONCAT(uCliente.nombre, ' ', uCliente.apellido) AS client,
         s.id_encargado AS technicianId,
         CONCAT(uEncargado.nombre, ' ', uEncargado.apellido) AS tech,
         COALESCE(ds.cost, 0) AS price,
         DATE_FORMAT(s.fecha_creacion, '%Y-%m-%d %H:%i') AS createdAt,
         s.estado AS statusCode,
         CASE
           WHEN s.estado = 'PENDIENTE' THEN 'En Taller'
           WHEN s.estado = 'EN PROCESO' THEN 'En Reparación'
           WHEN s.estado = 'COMPLETO' THEN 'Completada'
           ELSE 'Cancelada'
         END AS status
       FROM servicio s
       INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
       INNER JOIN equipo e ON e.id_equipo = s.id_equipo
       INNER JOIN usuario uCliente ON uCliente.id_usuario = s.id_usuario
       INNER JOIN usuario uEncargado ON uEncargado.id_usuario = s.id_encargado
       LEFT JOIN (
         SELECT
           id_servicio,
           SUM(subtotal) AS cost,
           GROUP_CONCAT(DISTINCT NULLIF(descripcion, '') SEPARATOR ' · ') AS details
         FROM detalle_servicio
         GROUP BY id_servicio
       ) ds ON ds.id_servicio = s.id_servicio
       WHERE ts.nombre = 'Reparacion'
       ORDER BY s.fecha_creacion DESC
       LIMIT 10`,
    );
    const [appointmentRows] = await pool.query(
      `SELECT
         c.id_cita AS id,
         CONCAT('CIT-', c.id_cita) AS reference,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         c.id_tecnico AS technicianId,
         CONCAT(uTecnico.nombre, ' ', uTecnico.apellido) AS tech,
         c.equipo AS equipment,
         c.descripcion AS description,
         c.telefono AS phone,
         DATE_FORMAT(c.fecha, '%Y-%m-%d') AS appointmentDate,
         c.precio AS price,
         c.tipo_servicio AS serviceType,
         c.estado AS status
       FROM cita c
       INNER JOIN usuario u ON u.id_usuario = c.id_usuario
       LEFT JOIN usuario uTecnico ON uTecnico.id_usuario = c.id_tecnico
       ORDER BY c.fecha ASC, c.fecha_creacion DESC`,
    );
    const [discountRows] = await pool.query(
      `SELECT
         CONCAT('PROM-', pr.id_promocion) AS code,
         pr.descripcion AS discountDescription,
         CONCAT(ROUND(((p.precio - pr.precio) / NULLIF(p.precio, 0)) * 100), '%') AS percent,
         DATE_FORMAT(pr.fecha_fin, '%d/%m/%Y') AS expires,
         CASE WHEN pr.estado = 'ACTIVO' THEN 'Activo' ELSE 'Inactivo' END AS status
       FROM promocion pr
       INNER JOIN producto p ON p.id_producto = pr.id_producto
       WHERE pr.estado = 'ACTIVO'
       ORDER BY pr.fecha_fin DESC`,
    );

    const [categoryRows] = await pool.query(
      "SELECT id_categoria, nombre_cat, descripcion_cat FROM categoria WHERE estado = 'ACTIVO' ORDER BY nombre_cat",
    );
    const [brandRows] = await pool.query(
      "SELECT id_marca, nombre_marca, descripcion_marca FROM marca WHERE estado = 'ACTIVO' ORDER BY nombre_marca",
    );

    const [reviewRows] = await pool.query(
      `SELECT s.id_sugerencia AS id, CONCAT(u.nombre, ' ', u.apellido) AS client, 'Atención al Cliente' AS product, '5 estrellas' AS rating, s.mensaje AS comment, DATE_FORMAT(s.fecha_envio, '%Y-%m-%d') AS date
       FROM sugerencia s
       LEFT JOIN usuario u ON u.id_usuario = s.id_usuario
       ORDER BY s.fecha_envio DESC
       LIMIT 10`
    );

    const orders = (ordersRows || []).map((row) => {
      const totalMatch = String(row.notes || "").match(
        /;\s*total\s+([\d.]+)\s+COP(?:\.|$)/i,
      );
      const recordedTotal = totalMatch ? Number(totalMatch[1]) : null;
      return {
        id_venta: row.id_venta,
        clientId: row.clientId,
        orderNumber: row.orderNumber,
        nombre: row.nombre,
        apellido: row.apellido,
        date: row.orderDate,
        estado: row.estado,
        total: Number.isFinite(recordedTotal)
          ? recordedTotal
          : Number(row.subtotal || 0),
      };
    });

    res.json({
      ok: true,
      summary: {
        productsCount: Number(productsCountRows[0]?.total || 0),
        clientsCount: Number(clientsCountRows[0]?.total || 0),
        ordersCount: Number(ordersCountRows[0]?.total || 0),
        salesTotal: Number(salesTotalRows[0]?.total || 0),
        monthlyFinancial: {
          month: monthlyIncomeRows[0]?.month,
          income: monthlyIncome,
          expenses: monthlyExpenses,
          result: monthlyResult,
          marginPercent: monthlyIncome > 0
            ? (monthlyResult / monthlyIncome) * 100
            : 0,
          salesCount: Number(monthlyIncomeRows[0]?.transactions || 0),
          purchasesCount: Number(monthlyExpenseRows[0]?.transactions || 0),
        },
      },
      topProducts: topProductsRows || [],
      salesTrend: (salesTrendRows || []).map((point) => ({
        date: point.sale_date,
        value: Number(point.total || 0),
      })),
      orders,
      inventory: inventoryRows || [],
      branches: branchRows,
      selectedBranchId,
      clients: clientsRows || [],
      users: usersRows || [],
      roles: roleRows || [],
      currentAdminId: req.userId,
      technicians: technicianRows || [],
      warranties: warrantyRows || [],
      warrantyRequests: warrantyRequestRows || [],
      maintenance: maintenanceRows || [],
      repairs: repairRows || [],
      appointments: appointmentRows || [],
      discounts: discountRows || [],
      categories: categoryRows || [],
      brands: brandRows || [],
      reviews: reviewRows || [],
    });
  } catch (error) {
    console.error("Error cargando dashboard del administrador:", error.message, error.stack);
    res.status(500).json({
      ok: false,
      message: "No se pudo cargar el dashboard del administrador.",
      error: error.message,
    });
  }
});

app.get("/api/admin/ventas/:id", requireAdmin, async (req, res) => {
  const saleId = Number(req.params.id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return res.status(400).json({ ok: false, message: "ID de venta inválido." });
  }

  try {
    const [saleRows] = await pool.query(
      `SELECT
         v.id_venta AS id,
         COALESCE(v.nro_pago, CONCAT('WG-', v.id_venta)) AS reference,
         CONCAT(u.nombre, ' ', u.apellido) AS clientName,
         u.nombre AS clientFirstName,
         u.apellido AS clientLastName,
         u.correo AS clientEmail,
         v.id_usuario AS clientId,
         COALESCE(v.telefono, u.telefono) AS phone,
         DATE_FORMAT(v.fecha, '%Y-%m-%d %H:%i') AS date,
         v.estado AS status,
         v.metodo_pago AS paymentMethod,
         v.tipo_venta AS saleType,
         v.ciudad AS city,
         v.direccion_entrega AS address,
         v.numero_guia AS trackingNumber,
         v.comprobante AS receipt,
         s.nombre_suc AS branchName,
         v.notas AS notes
       FROM venta v
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       INNER JOIN sucursal s ON s.id_sucursal = v.id_sucursal
       WHERE v.id_venta = ?
       LIMIT 1`,
      [saleId],
    );
    if (!saleRows.length) {
      return res.status(404).json({ ok: false, message: "No se encontró la venta solicitada." });
    }

    const [itemRows] = await pool.query(
      `SELECT
         dv.id_detalle_venta AS id,
         dv.id_producto AS productId,
         p.nombre AS productName,
         dv.cantidad AS quantity,
         dv.precio_unitario AS unitPrice,
         dv.subtotal AS subtotal
       FROM detalle_venta dv
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       WHERE dv.id_venta = ?
       ORDER BY dv.id_detalle_venta`,
      [saleId],
    );
    const sale = saleRows[0];
    const totalMatch = String(sale.notes || "").match(
      /;\s*total\s+([\d.]+)\s+COP(?:\.|$)/i,
    );
    const recordedTotal = totalMatch ? Number(totalMatch[1]) : null;
    const itemSubtotal = itemRows.reduce(
      (total, item) => total + Number(item.subtotal || 0),
      0,
    );

    return res.json({
      ok: true,
      sale: {
        id: sale.id,
        reference: sale.reference,
        clientName: sale.clientName,
        clientFirstName: sale.clientFirstName,
        clientLastName: sale.clientLastName,
        clientEmail: sale.clientEmail,
        clientId: sale.clientId,
        phone: sale.phone,
        date: sale.date,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        saleType: sale.saleType,
        city: sale.city,
        address: sale.address,
        trackingNumber: sale.trackingNumber,
        receipt: sale.receipt,
        branchName: sale.branchName,
        total: Number.isFinite(recordedTotal) ? recordedTotal : itemSubtotal,
      },
      items: itemRows.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    });
  } catch (error) {
    console.error("Error consultando detalle de venta:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo cargar el detalle de la venta.",
    });
  }
});

app.put("/api/admin/ventas/:id", requireAdmin, async (req, res) => {
  const saleId = Number(req.params.id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return res.status(400).json({ ok: false, message: "ID de venta inválido." });
  }

  const firstName = String(req.body?.firstName || "").normalize("NFC").trim();
  const lastName = String(req.body?.lastName || "").normalize("NFC").trim();
  const phone = req.body?.phone;
  const city = req.body?.city;
  const address = req.body?.address;
  const trackingNumber = req.body?.trackingNumber;
  const status = req.body?.status;
  const total = req.body?.total;
  const dateInput = req.body?.date;
  const dateMatch =
    typeof dateInput === "string" &&
    dateInput.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  const parsedDate = dateMatch
    ? new Date(Date.UTC(
        Number(dateMatch[1]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[3]),
        Number(dateMatch[4]),
        Number(dateMatch[5]),
      ))
    : null;
  const validDate = Boolean(
    dateMatch &&
    Number(dateMatch[1]) >= 1000 &&
    Number(dateMatch[2]) >= 1 &&
    Number(dateMatch[2]) <= 12 &&
    Number(dateMatch[3]) >= 1 &&
    Number(dateMatch[4]) <= 23 &&
    Number(dateMatch[5]) <= 59 &&
    parsedDate.getUTCFullYear() === Number(dateMatch[1]) &&
    parsedDate.getUTCMonth() + 1 === Number(dateMatch[2]) &&
    parsedDate.getUTCDate() === Number(dateMatch[3]) &&
    parsedDate.getUTCHours() === Number(dateMatch[4]) &&
    parsedDate.getUTCMinutes() === Number(dateMatch[5]),
  );
  const validName = /^[\p{L}][\p{L}\s'-]*$/u;
  const validTotal =
    typeof total === "number" &&
    Number.isFinite(total) &&
    total >= 0 &&
    total <= 99999999.999999;
  if (
    !validName.test(firstName) ||
    firstName.length > 30 ||
    !validName.test(lastName) ||
    lastName.length > 30 ||
    typeof phone !== "string" ||
    phone.trim().length > 20 ||
    typeof city !== "string" ||
    city.trim().length > 100 ||
    typeof address !== "string" ||
    address.trim().length > 180 ||
    typeof trackingNumber !== "string" ||
    trackingNumber.trim().length > 30 ||
    !validDate ||
    !["PAGADA", "ANULADA"].includes(status) ||
    !validTotal
  ) {
    return res.status(400).json({
      ok: false,
      message: "Revisa el nombre, la fecha, el estado, el total y los datos de contacto.",
    });
  }

  const totalMicros = Math.round(total * 1000000);
  const formatMicros = (value) => {
    const whole = Math.floor(value / 1000000);
    const fraction = String(value % 1000000).padStart(6, "0");
    return `${whole}.${fraction}`;
  };
  const formatNoteTotal = (value) => {
    const [whole, fraction] = formatMicros(value).split(".");
    return `${whole}.${fraction.replace(/0+$/, "")}`.replace(/\.$/, "");
  };
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [saleRows] = await connection.query(
      `SELECT id_usuario, tipo_venta, notas
       FROM venta
       WHERE id_venta = ?
       LIMIT 1
       FOR UPDATE`,
      [saleId],
    );
    if (!saleRows.length) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: "No se encontró la venta solicitada." });
    }

    const [detailRows] = await connection.query(
      `SELECT id_detalle_venta, cantidad, subtotal
       FROM detalle_venta
       WHERE id_venta = ?
       ORDER BY id_detalle_venta
       FOR UPDATE`,
      [saleId],
    );
    const currentNotes = String(saleRows[0].notas || "");
    const recordedTotalMatch = currentNotes.match(
      /;\s*total\s+([\d.]+)\s+COP(?:\.|$)/i,
    );
    const currentTotal = recordedTotalMatch
      ? Number(recordedTotalMatch[1])
      : detailRows.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    let updatedNotes = saleRows[0].notas;

    if (Math.round(currentTotal * 1000000) !== totalMicros) {
      if (!detailRows.length) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          message: "No se puede cambiar el total de una venta sin productos asociados.",
        });
      }

      const currentSubtotalMicros = detailRows.map((item) =>
        Math.max(0, Math.round(Number(item.subtotal || 0) * 1000000)),
      );
      const subtotalWeight = currentSubtotalMicros.reduce((sum, value) => sum + value, 0);
      const quantityWeight = detailRows.reduce(
        (sum, item) => sum + Number(item.cantidad),
        0,
      );
      let allocatedMicros = 0;
      for (let index = 0; index < detailRows.length; index += 1) {
        const detail = detailRows[index];
        const weight = subtotalWeight > 0
          ? currentSubtotalMicros[index]
          : Number(detail.cantidad);
        const weightTotal = subtotalWeight > 0 ? subtotalWeight : quantityWeight;
        const subtotalMicros = index === detailRows.length - 1
          ? totalMicros - allocatedMicros
          : Math.round(totalMicros * weight / weightTotal);
        allocatedMicros += subtotalMicros;
        const unitPriceMicros = Math.round(subtotalMicros / Number(detail.cantidad));
        await connection.query(
          `UPDATE detalle_venta
           SET precio_unitario = ?, subtotal = ?
           WHERE id_detalle_venta = ?`,
          [
            formatMicros(unitPriceMicros),
            formatMicros(subtotalMicros),
            detail.id_detalle_venta,
          ],
        );
      }

      if (recordedTotalMatch) {
        updatedNotes = currentNotes.replace(
          /(; *total +)[0-9.]+( +COP(?:[.]|$))/i,
          `$1${formatNoteTotal(totalMicros)}$2`,
        );
        if (updatedNotes.length > 300) {
          await connection.rollback();
          return res.status(400).json({
            ok: false,
            message: "El total nuevo no cabe en las notas registradas de la venta.",
          });
        }
      }
    }

    const mysqlDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}:00`;
    await connection.query(
      `UPDATE usuario
       SET nombre = ?, apellido = ?
       WHERE id_usuario = ?`,
      [firstName, lastName, saleRows[0].id_usuario],
    );
    await connection.query(
      `UPDATE venta
       SET fecha = ?, estado = ?, telefono = ?, notas = ?,
           ciudad = IF(tipo_venta = 'DOMICILIO', ?, ciudad),
           direccion_entrega = IF(tipo_venta = 'DOMICILIO', ?, direccion_entrega),
           numero_guia = IF(tipo_venta = 'DOMICILIO', ?, numero_guia)
       WHERE id_venta = ?`,
      [
        mysqlDate,
        status,
        phone.trim() || null,
        updatedNotes,
        city.trim() || null,
        address.trim() || null,
        trackingNumber.trim() || null,
        saleId,
      ],
    );
    await connection.commit();
    return res.json({ ok: true, message: "Datos de la venta actualizados correctamente." });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error revirtiendo la edición de la venta:", rollbackError.message);
      }
    }
    console.error("Error actualizando datos de venta:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron actualizar los datos de la venta.",
    });
  } finally {
    connection?.release();
  }
});

function obtenerRutasPorRol(rol) {
  const rutas = {
    Administrador: "Administrador/index.html",
    Cliente: "panel_usuario.html",
    Trabajador: "Empleado/index.html",
    Proveedor: "panel_usuario.html",
  };

  return rutas[rol] || "panel_usuario.html";
}

app.post("/api/login", async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Correo y contraseña son obligatorios." });
    }

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.contrasena_hash, r.nombre_rol
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.correo = ? AND u.estado = 'ACTIVO'`,
      [email],
    );

    if (!rows.length) {
      return res.status(401).json({
        ok: false,
        message: "No existe ninguna cuenta registrada con este correo.",
      });
    }

    const usuario = rows[0];
    const hashGuardado = usuario.contrasena_hash || "";
    let passwordMatches = false;

    if (hashGuardado && hashGuardado.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, hashGuardado);
    } else {
      passwordMatches = hashGuardado === password;
    }

    if (!passwordMatches) {
      return res
        .status(401)
        .json({ ok: false, message: "La contraseña ingresada es incorrecta." });
    }

    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();
    return res.json({
      ok: true,
      sessionToken: crearTokenSesion(usuario.id_usuario),
      user: {
        id: usuario.id_usuario,
        email: usuario.correo,
        nombre: nombreCompleto,
        rol: usuario.nombre_rol,
      },
      redirectTo: obtenerRutasPorRol(usuario.nombre_rol),
    });
  } catch (error) {
    console.error("Error en login:", error.message);
    return res
      .status(500)
      .json({ ok: false, message: "Ocurrió un error al iniciar sesión." });
  }
});

app.post("/api/purchases", requireUserSession, async (req, res) => {
  const paymentMethods = {
    tarjeta: "TARJETA",
    pse: "TRANSFERENCIA",
    billetera: "TRANSFERENCIA",
    efectivo: "EFECTIVO",
    transferencia: "TRANSFERENCIA",
  };
  const paymentMethod = Object.hasOwn(paymentMethods, req.body?.method)
    ? paymentMethods[req.body.method]
    : null;
  const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const items = new Map();

  if (requestedItems.length > 50) {
    return res.status(400).json({
      ok: false,
      message: "El pedido no puede contener más de 50 productos.",
    });
  }

  for (const item of requestedItems) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        ok: false,
        message: "Hay un producto o una cantidad inválida en el pedido.",
      });
    }
    items.set(productId, (items.get(productId) || 0) + quantity);
  }

  if (
    !paymentMethod ||
    !items.size ||
    items.size > 50 ||
    [...items.values()].some((quantity) => !Number.isSafeInteger(quantity))
  ) {
    return res.status(400).json({
      ok: false,
      message: "El pedido requiere productos y un método de pago válido.",
    });
  }

  let connection;
  try {
    await ensureWarrantyRequestSchema();
    await ensureWarrantyDetailIndexes();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [customerRows] = await connection.query(
      `SELECT u.telefono, u.departamento, u.ciudad, u.direccion
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO'
         AND r.nombre_rol IN ('Cliente', 'Administrador', 'Trabajador')
       FOR UPDATE`,
      [req.userId],
    );
    if (!customerRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(403).json({
        ok: false,
        message: "Solo una cuenta activa puede realizar compras.",
      });
    }
    if (!String(customerRows[0].direccion || "").trim()) {
      await revertirTransaccionEmpleado(connection);
      return res.status(409).json({
        ok: false,
        message: "Agrega una dirección de envío a tu perfil antes de realizar la compra.",
      });
    }

    const [branchRows] = await connection.query(
      `SELECT id_sucursal
       FROM sucursal
       WHERE estado = 'ACTIVO'
       ORDER BY id_sucursal
       LIMIT 1`,
    );
    if (!branchRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa para registrar la venta.",
      });
    }

    const saleLines = [];
    for (const [productId, quantity] of [...items].sort(
      ([leftId], [rightId]) => leftId - rightId,
    )) {
      const [productRows] = await connection.query(
        `SELECT id_producto, nombre, precio
         FROM producto
         WHERE id_producto = ? AND estado = 'ACTIVO'
         FOR UPDATE`,
        [productId],
      );
      if (!productRows.length) {
        await revertirTransaccionEmpleado(connection);
        return res.status(409).json({
          ok: false,
          message: "Uno de los productos ya no está disponible.",
        });
      }

      const [inventoryRows] = await connection.query(
        `SELECT i.id_sucursal AS branchId, i.stock
         FROM inventario i
         INNER JOIN sucursal s
           ON s.id_sucursal = i.id_sucursal
          AND s.estado = 'ACTIVO'
         WHERE i.id_producto = ? AND i.estado = 'ACTIVO'
         ORDER BY i.id_sucursal
         FOR UPDATE`,
        [productId],
      );
      const totalStock = inventoryRows.reduce(
        (sum, inventory) => sum + Number(inventory.stock),
        0,
      );
      if (totalStock < quantity) {
        await revertirTransaccionEmpleado(connection);
        return res.status(409).json({
          ok: false,
          message: `No hay existencias suficientes de ${productRows[0].nombre}.`,
        });
      }

      const unitPrice = Number(productRows[0].precio);
      saleLines.push({
        productId,
        name: productRows[0].nombre,
        quantity,
        unitPrice,
        subtotal: Number((unitPrice * quantity).toFixed(2)),
        inventoryRows,
      });
    }

    const subtotal = Number(
      saleLines.reduce((sum, line) => sum + line.subtotal, 0).toFixed(2),
    );
    const requestedDiscountCode = String(req.body?.discountCode || "")
      .trim()
      .toUpperCase();
    let discount = null;
    if (requestedDiscountCode) {
      const codeMatch = /^PROM-(\d+)$/.exec(requestedDiscountCode);
      if (!codeMatch) {
        await revertirTransaccionEmpleado(connection);
        return res.status(400).json({
          ok: false,
          message: "El código de descuento no es válido o ya venció.",
        });
      }

      const [promotionRows] = await connection.query(
        `SELECT
           CONCAT('PROM-', pr.id_promocion) AS code,
           ROUND(((p.precio - pr.precio) / NULLIF(p.precio, 0)) * 100) AS percent
         FROM promocion pr
         INNER JOIN producto p ON p.id_producto = pr.id_producto
         WHERE pr.id_promocion = ?
           AND pr.estado = 'ACTIVO'
         FOR UPDATE`,
        [Number(codeMatch[1])],
      );
      const promotion = promotionRows[0];
      const percent = Number(promotion?.percent);
      if (!promotion || promotion.code !== requestedDiscountCode ||
          !Number.isInteger(percent) || percent < 1 || percent > 99) {
        await revertirTransaccionEmpleado(connection);
        return res.status(400).json({
          ok: false,
          message: "El código de descuento no es válido o ya venció.",
        });
      }
      discount = { code: promotion.code, percent };
    }

    const subtotalCents = Math.round(subtotal * 100);
    const discountCents = discount
      ? Math.round(subtotalCents * discount.percent / 100)
      : 0;
    let remainingDiscountCents = discountCents;
    let remainingSubtotalCents = subtotalCents;
    saleLines.forEach((line, index) => {
      const lineCents = Math.round(line.subtotal * 100);
      const lineDiscountCents = index === saleLines.length - 1
        ? remainingDiscountCents
        : remainingSubtotalCents
          ? Math.round(remainingDiscountCents * lineCents / remainingSubtotalCents)
          : 0;
      line.subtotal = (lineCents - lineDiscountCents) / 100;
      remainingDiscountCents -= lineDiscountCents;
      remainingSubtotalCents -= lineCents;
    });

    const discountAmount = discountCents / 100;
    const discountedSubtotal = (subtotalCents - discountCents) / 100;
    const shipping = 25000;
    const taxes = Number((discountedSubtotal * 0.19).toFixed(2));
    const total = Number((discountedSubtotal + shipping + taxes).toFixed(2));
    const paymentReference = `DEMO-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const notes =
      `Compra web - pago de demostración. Subtotal ${subtotal}; ` +
      `descuento ${
        discount ? `${discount.code} (${discount.percent}%) ${discountAmount}` : "ninguno"
      }; envío ${shipping}; ` +
      `IVA ${taxes}; total ${total} COP.`;

    const [saleResult] = await connection.query(
      `INSERT INTO venta
         (id_usuario, id_sucursal, metodo_pago, nro_pago, telefono,
          tipo_venta, ciudad, direccion_entrega, notas, estado)
       VALUES (?, ?, ?, ?, ?, 'SUCURSAL', ?, ?, ?, 'PAGADA')`,
      [
        req.userId,
        branchRows[0].id_sucursal,
        paymentMethod,
        paymentReference,
        customerRows[0].telefono,
        customerRows[0].ciudad,
        customerRows[0].direccion,
        notes,
      ],
    );

    for (const line of saleLines) {
      await insertSaleUnitsWithWarranties(
        connection,
        saleResult.insertId,
        line,
        "Compra web de demostración",
      );

      let remainingQuantity = line.quantity;
      for (const inventory of line.inventoryRows) {
        if (remainingQuantity === 0) break;
        const quantityToDeduct = Math.min(
          Number(inventory.stock),
          remainingQuantity,
        );
        if (quantityToDeduct <= 0) continue;

        const [inventoryResult] = await connection.query(
          `UPDATE inventario
           SET stock = stock - ?
           WHERE id_producto = ? AND id_sucursal = ?
             AND estado = 'ACTIVO' AND stock >= ?`,
          [
            quantityToDeduct,
            line.productId,
            inventory.branchId,
            quantityToDeduct,
          ],
        );
        if (!inventoryResult.affectedRows) {
          throw new Error("No se pudo descontar el stock del producto.");
        }
        remainingQuantity -= quantityToDeduct;
      }
      if (remainingQuantity > 0) {
        throw new Error("El stock cambió durante el registro de la compra.");
      }
    }

    await connection.commit();
    return res.status(201).json({
      ok: true,
      purchase: {
        id: saleResult.insertId,
        orderNumber: paymentReference,
        createdAt: new Date().toISOString(),
        method: req.body.method,
        status: "PAGADA",
        items: saleLines.map(({ name, quantity, unitPrice }) => ({
          name,
          quantity,
          unitPrice,
        })),
        discount: discount
          ? { ...discount, amount: discountAmount }
          : null,
        totals: {
          subtotal,
          discount: discountAmount,
          shipping,
          taxes,
          total,
        },
        shippingAddress: {
          address: customerRows[0].direccion,
          city: customerRows[0].ciudad,
          department: customerRows[0].departamento,
        },
      },
    });
  } catch (error) {
    if (connection) await revertirTransaccionEmpleado(connection);
    console.error("Error registrando compra web:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo registrar la compra. Intenta nuevamente.",
    });
  } finally {
    connection?.release();
  }
});

// Obtener productos activos y su stock total en todas las sucursales.
app.get("/api/productos", async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT 
        p.id_producto, 
        p.nombre, 
        p.precio, 
        p.imagen_prin AS imagen_url,
        p.imagen_2 AS imagen_url_2,
        p.imagen_3 AS imagen_url_3,
        p.imagen_4 AS imagen_url_4,
        p.descripcion,
        m.nombre_marca,
        c.nombre_cat,
        COALESCE(i.stock_total, 0) AS stock_total
      FROM producto p
      INNER JOIN marca m ON p.id_marca = m.id_marca
      INNER JOIN categoria c ON p.id_categoria = c.id_categoria
      LEFT JOIN (
        SELECT i.id_producto, SUM(i.stock) AS stock_total
        FROM inventario i
        INNER JOIN sucursal s
          ON s.id_sucursal = i.id_sucursal
         AND s.estado = 'ACTIVO'
        WHERE i.estado = 'ACTIVO'
        GROUP BY i.id_producto
      ) i ON p.id_producto = i.id_producto
      WHERE p.estado = 'ACTIVO'
      ORDER BY p.nombre
    `);
    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error.message);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Endpoint para listar categorías
app.get("/api/categorias", async (req, res) => {
  try {
    const [categorias] = await pool.query(
      'SELECT * FROM categoria WHERE estado = "ACTIVO"',
    );
    res.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías:", error.message);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

// Endpoint para listar marcas
app.get("/api/marcas", async (req, res) => {
  try {
    const [marcas] = await pool.query(
      'SELECT * FROM marca WHERE estado = "ACTIVO"',
    );
    res.json(marcas);
  } catch (error) {
    console.error("Error al obtener marcas:", error.message);
    res.status(500).json({ error: "Error al obtener marcas" });
  }
});

// ==================== ENDPOINTS CRUD PARA EL PANEL ADMIN ====================

async function obtenerSucursalEmpleado(userId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT id_sucursal, nombre_suc, departamento, ciudad
     FROM sucursal
     WHERE encargado = ? AND estado = 'ACTIVO'
     ORDER BY id_sucursal
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function revertirTransaccionEmpleado(connection) {
  try {
    await connection.rollback();
  } catch (error) {
    console.error("Error revirtiendo transacción de empleado:", error.message);
  }
}

app.get("/api/employee/dashboard", requireEmployee, async (req, res) => {
  try {
    await ensureAutomaticWarrantyCoverage();
    const branch = await obtenerSucursalEmpleado(req.userId);
    if (!branch) {
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa asignada a este empleado.",
      });
    }

    const [products, clients, warranties, workshopOrders] = await Promise.all([
        pool.query(
          `SELECT
             p.id_producto AS id,
             p.nombre AS name,
             CONCAT('PRD-', p.id_producto) AS sku,
             c.nombre_cat AS category,
             p.precio AS price,
             COALESCE(i.stock_total, 0) AS stock,
             p.imagen_prin AS imageUrl
           FROM producto p
           INNER JOIN categoria c ON c.id_categoria = p.id_categoria
           LEFT JOIN (
             SELECT i.id_producto, SUM(i.stock) AS stock_total
             FROM inventario i
             INNER JOIN sucursal s
               ON s.id_sucursal = i.id_sucursal
              AND s.estado = 'ACTIVO'
             WHERE i.estado = 'ACTIVO'
             GROUP BY i.id_producto
           ) i ON i.id_producto = p.id_producto
           WHERE p.estado = 'ACTIVO'
           ORDER BY p.nombre`,
        ),
        pool.query(
          `SELECT
             u.id_usuario AS id,
             CONCAT(u.nombre, ' ', u.apellido) AS name,
             u.telefono AS phone,
             u.correo AS email,
             COALESCE(SUM(CASE WHEN v.estado = 'PAGADA' THEN dv.subtotal ELSE 0 END), 0) AS totalSpent,
             CASE
               WHEN COALESCE(SUM(CASE WHEN v.estado = 'PAGADA' THEN dv.subtotal ELSE 0 END), 0) >= 500000 THEN 'VIP'
               WHEN COALESCE(SUM(CASE WHEN v.estado = 'PAGADA' THEN dv.subtotal ELSE 0 END), 0) >= 150000 THEN 'Frecuente'
               ELSE 'Nuevo'
             END AS level
           FROM usuario u
           INNER JOIN rol r ON r.id_rol = u.id_rol
           LEFT JOIN venta v ON v.id_usuario = u.id_usuario
           LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
           WHERE r.nombre_rol = 'Cliente' AND u.estado = 'ACTIVO'
           GROUP BY u.id_usuario, u.nombre, u.apellido, u.telefono, u.correo
           ORDER BY u.nombre, u.apellido`,
        ),
        pool.query(
          `SELECT
             g.id_garantia AS id,
             CONCAT(u.nombre, ' ', u.apellido) AS client,
             p.nombre AS product,
             dv.cantidad AS quantity,
             DATE_FORMAT(v.fecha, '%Y-%m-%d') AS buyDate,
             DATE_FORMAT(g.fecha_fin, '%Y-%m-%d') AS expDate,
             DATE(g.fecha_fin) >= CURRENT_DATE() AS canChangeStatus,
             CASE
               WHEN DATE(g.fecha_fin) < CURRENT_DATE() THEN 'Vencida'
               WHEN g.estado IN ('ANULADA', 'SUSPENDIDA') THEN 'Suspendida'
               WHEN g.estado = 'VIGENTE' THEN 'Activa'
               ELSE 'Vencida'
             END AS status
           FROM garantia g
           INNER JOIN detalle_venta dv ON dv.id_detalle_venta = g.id_detalle_venta
           INNER JOIN venta v ON v.id_venta = dv.id_venta
           INNER JOIN usuario u ON u.id_usuario = v.id_usuario
           INNER JOIN producto p ON p.id_producto = dv.id_producto
           WHERE v.id_sucursal = ? AND v.estado = 'PAGADA'
           ORDER BY g.fecha_inicio DESC`,
          [branch.id_sucursal],
        ),
        pool.query(
          `SELECT
             s.id_servicio AS id,
             s.id_tipo_servicio AS serviceTypeId,
             ts.nombre AS serviceType,
             CASE
               WHEN ts.nombre = 'Reparacion' THEN CONCAT('REP-', s.id_servicio)
               ELSE CONCAT('MNT-', s.id_servicio)
             END AS ticket,
             COALESCE(e.descripcion, e.tipo) AS equipment,
             s.descripcion AS defect,
             CONCAT(u.nombre, ' ', u.apellido) AS client,
             COALESCE(ds.cost, 0) AS cost,
             CASE
               WHEN s.estado = 'PENDIENTE' THEN 'Pendiente'
               WHEN s.estado = 'EN PROCESO' THEN 'En proceso'
               WHEN s.estado = 'COMPLETO' THEN 'Completado'
               ELSE 'Cancelado'
             END AS status
           FROM servicio s
           INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
           INNER JOIN equipo e ON e.id_equipo = s.id_equipo
           INNER JOIN usuario u ON u.id_usuario = s.id_usuario
           LEFT JOIN (
             SELECT id_servicio, SUM(subtotal) AS cost
             FROM detalle_servicio
             GROUP BY id_servicio
           ) ds ON ds.id_servicio = s.id_servicio
           WHERE s.id_encargado = ?
           ORDER BY s.fecha_creacion DESC`,
          [req.userId],
        ),
      ]);

    return res.json({
      ok: true,
      branch: {
        id: branch.id_sucursal,
        name: branch.nombre_suc,
        city: branch.ciudad,
      },
      products: products[0],
      clients: clients[0],
      warranties: warranties[0],
      workshopOrders: workshopOrders[0],
    });
  } catch (error) {
    console.error("Error cargando el panel de empleado:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo cargar la información del panel de empleado.",
    });
  }
});

app.post("/api/employee/clients", requireEmployee, async (req, res) => {
  const legacyName = String(req.body?.name || "").normalize("NFC").trim().replace(/\s+/g, " ");
  const legacyNameParts = legacyName.split(/\s+/);
  const firstName =
    String(req.body?.firstName || legacyNameParts.shift() || "")
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ");
  const lastName =
    String(req.body?.lastName || legacyNameParts.join(" ") || "")
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ");
  const birthDate = String(req.body?.birthDate || "").trim();
  const documentType = String(req.body?.documentType || "CC").trim().toUpperCase();
  const documentNumber = String(req.body?.documentNumber || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const secondaryPhone = String(req.body?.secondaryPhone || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const confirmEmail = String(req.body?.confirmEmail || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const confirmPassword = String(req.body?.confirmPassword || "");
  const department = String(req.body?.department || "").trim();
  const city = String(req.body?.city || "").trim();
  const address = String(req.body?.address || "").trim();
  const postalCode = String(req.body?.postalCode || "").trim();
  const namePattern = /^[\p{L}][\p{L}\s'-]*$/u;
  const validDocumentTypes = ["CC", "TI", "PAS", "NIT", "CE"];
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const birthValid =
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    !Number.isNaN(birth.getTime()) &&
    birth.toISOString().slice(0, 10) === birthDate &&
    birthDate >= "1940-01-01" &&
    birthDate <= new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().slice(0, 10);

  if (
    firstName.length < 2 ||
    firstName.length > 30 ||
    lastName.length < 2 ||
    lastName.length > 30 ||
    !namePattern.test(firstName) ||
    !namePattern.test(lastName)
  ) {
    return res.status(400).json({ ok: false, message: "Ingresa un nombre y apellido válidos." });
  }
  if (!birthValid) {
    return res.status(400).json({ ok: false, message: "Selecciona una fecha de nacimiento válida." });
  }
  if (!validDocumentTypes.includes(documentType)) {
    return res.status(400).json({ ok: false, message: "Selecciona un tipo de documento válido." });
  }
  const validDocumentNumber =
    documentType === "PAS"
      ? /^[A-Za-z0-9-]{5,20}$/.test(documentNumber)
      : /^[0-9]{6,20}$/.test(documentNumber);
  if (!validDocumentNumber) {
    return res.status(400).json({
      ok: false,
      message: documentType === "PAS"
        ? "El pasaporte debe tener entre 5 y 20 caracteres alfanuméricos."
        : "El documento seleccionado debe contener solo números.",
    });
  }
  const phoneDigits = phone.replace(/\D/g, "");
  const secondaryPhoneDigits = secondaryPhone.replace(/\D/g, "");
  if (!/^[+\d()\s-]{7,20}$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return res.status(400).json({ ok: false, message: "Ingresa un teléfono válido de 7 a 15 dígitos." });
  }
  if (secondaryPhone && (!/^[+\d()\s-]{7,20}$/.test(secondaryPhone) || secondaryPhoneDigits.length < 7 || secondaryPhoneDigits.length > 15)) {
    return res.status(400).json({ ok: false, message: "Ingresa un teléfono secundario válido." });
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 120 ||
    email !== confirmEmail
  ) {
    return res.status(400).json({ ok: false, message: "Ingresa correos electrónicos válidos y coincidentes." });
  }
  if (password.length < 8 || password.length > 128 || password !== confirmPassword) {
    return res.status(400).json({ ok: false, message: "La contraseña debe tener entre 8 y 128 caracteres y coincidir." });
  }
  if (!department || !city || department.length > 30 || city.length > 30) {
    return res.status(400).json({ ok: false, message: "Selecciona departamento y municipio." });
  }
  if (address.length < 5 || address.length > 40) {
    return res.status(400).json({ ok: false, message: "Ingresa una dirección válida." });
  }
  if (postalCode.length > 20) {
    return res.status(400).json({ ok: false, message: "El código postal no puede superar 20 caracteres." });
  }
  if (req.body?.acceptedTerms !== true) {
    return res.status(400).json({
      ok: false,
      message: "El cliente debe aceptar los términos y la política de datos.",
    });
  }

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const branch = await obtenerSucursalEmpleado(req.userId);
    if (!branch) {
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa asignada a este empleado.",
      });
    }
    const [roleRows] = await pool.query(
      "SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente' AND estado = 'ACTIVO' LIMIT 1",
    );
    if (!roleRows.length) {
      return res.status(500).json({ ok: false, message: "No se encontró el rol de cliente." });
    }
    const [emailRows] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
      [email],
    );
    if (emailRows.length) {
      return res.status(409).json({ ok: false, message: "El correo ya está registrado." });
    }
    const [documentRows] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE num_doc = ? LIMIT 1",
      [documentNumber],
    );
    if (documentRows.length) {
      return res.status(409).json({ ok: false, message: "El número de documento ya está registrado." });
    }

    await ensureCustomerPostalCodeSchema();
    const [result] = await pool.query(
      `INSERT INTO usuario
         (id_rol, nombre, apellido, tipo_doc, num_doc, fecha_nacimiento,
          telefono, telefono_secundario, departamento, ciudad, direccion, codigo_postal,
          correo, contrasena_hash, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        roleRows[0].id_rol,
        firstName,
        lastName,
        documentType,
        documentNumber,
        birthDate,
        phone,
        secondaryPhone || null,
        department,
        city,
        address,
        postalCode || null,
        email,
        passwordHash,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Cliente registrado.",
      client: {
        id: result.insertId,
        name: fullName,
        phone,
        email,
        totalSpent: 0,
        level: "Nuevo",
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese correo.",
      });
    }
    console.error("Error registrando cliente desde panel de empleado:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar el cliente." });
  }
});

app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
  try {
    await ensureLegacyAppointmentSchema();
    await ensureWarrantyRequestSchema();
    const [sales] = await pool.query(
      `SELECT
         v.id_venta AS id,
         COALESCE(v.nro_pago, CONCAT('WG-', v.id_venta)) AS orderNumber,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         v.estado AS status,
         DATE_FORMAT(v.fecha, '%Y-%m-%d %H:%i:%s') AS createdAt,
         COALESCE(SUM(dv.subtotal), 0) AS total
       FROM (
         SELECT id_venta, id_usuario, estado, fecha
           , nro_pago
         FROM venta
           WHERE estado = 'PAGADA'
         ORDER BY fecha DESC, id_venta DESC
         LIMIT 50
       ) v
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       GROUP BY v.id_venta, v.nro_pago, u.nombre, u.apellido, v.estado, v.fecha
       ORDER BY v.fecha DESC, v.id_venta DESC`,
    );
    const [appointments] = await pool.query(
      `SELECT
         c.id_cita AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         c.tipo_servicio AS serviceType,
         c.estado AS status,
         c.equipo AS equipment,
         DATE_FORMAT(c.fecha_creacion, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM cita c
       INNER JOIN usuario u ON u.id_usuario = c.id_usuario
       WHERE c.id_cita_local IS NULL
       ORDER BY c.fecha_creacion DESC, c.id_cita DESC
       LIMIT 50`,
    );
    const [warrantyRequests] = await pool.query(
      `SELECT
         sg.id_solicitud AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         p.nombre AS product,
         sg.descripcion AS description,
         sg.estado AS status,
         COALESCE(v.nro_pago, CONCAT('WG-', v.id_venta)) AS orderNumber,
         DATE_FORMAT(sg.fecha_solicitud, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM solicitud_garantia sg
       INNER JOIN usuario u ON u.id_usuario = sg.id_usuario
       INNER JOIN detalle_venta dv
         ON dv.id_detalle_venta = sg.id_detalle_venta
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       ORDER BY sg.fecha_solicitud DESC, sg.id_solicitud DESC
       LIMIT 50`,
    );
    return res.json({ ok: true, sales, appointments, warrantyRequests });
  } catch (error) {
    console.error("Error al consultar notificaciones del administrador:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar las notificaciones.",
    });
  }
});

app.post("/api/employee/workshop-orders", requireEmployee, async (req, res) => {
  const customerId = Number(req.body?.customerId);
  const device = String(req.body?.device || "").trim();
  const defect = String(req.body?.defect || "").trim();
  const equipmentType = String(req.body?.equipmentType || "");
  const serviceType = String(req.body?.serviceType || "");
  const cost = Number(req.body?.cost);
  const validEquipmentTypes = ["Portatil", "Torre", "Consola", "Control", "All in one"];
  const validServiceTypes = ["Reparacion", "Mantenimiento preventivo"];

  if (
    !Number.isSafeInteger(customerId) ||
    customerId <= 0 ||
    device.length < 3 ||
    device.length > 100 ||
    defect.length < 3 ||
    defect.length > 100 ||
    !validEquipmentTypes.includes(equipmentType) ||
    !validServiceTypes.includes(serviceType) ||
    !Number.isSafeInteger(cost) ||
    cost <= 0 ||
    cost > 99999999
  ) {
    return res.status(400).json({ ok: false, message: "Revisa los datos de la orden de taller." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const branch = await obtenerSucursalEmpleado(req.userId, connection);
    if (!branch) {
      await revertirTransaccionEmpleado(connection);
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa asignada a este empleado.",
      });
    }

    const [clientRows] = await connection.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Cliente'
       LIMIT 1`,
      [customerId],
    );
    if (!clientRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(404).json({ ok: false, message: "No se encontró el cliente seleccionado." });
    }

    const [serviceTypeRows] = await connection.query(
      "SELECT id_tipo_servicio FROM tipo_servicio WHERE nombre = ? AND estado = 'ACTIVO' LIMIT 1",
      [serviceType],
    );
    if (!serviceTypeRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(409).json({ ok: false, message: "El tipo de servicio no está disponible." });
    }

    const serial = `EMP-${req.userId}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const [equipmentResult] = await connection.query(
      `INSERT INTO equipo
         (id_usuario, id_sucursal, tipo, marca, numero_serial, descripcion, estado)
       VALUES (?, ?, ?, 'No especificada', ?, ?, 'ACTIVO')`,
      [customerId, branch.id_sucursal, equipmentType, serial, device],
    );
    const [serviceResult] = await connection.query(
      `INSERT INTO servicio
         (nombre, descripcion, id_usuario, id_encargado, id_tipo_servicio, id_equipo, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [
        `${serviceType}: ${device}`.substring(0, 100),
        defect,
        customerId,
        req.userId,
        serviceTypeRows[0].id_tipo_servicio,
        equipmentResult.insertId,
      ],
    );
    await connection.query(
      `INSERT INTO detalle_servicio
         (id_servicio, id_producto, descripcion, cantidad, precio_unitario, estado)
       VALUES (?, NULL, ?, 1, ?, 'PENDIENTE')`,
      [serviceResult.insertId, defect, cost],
    );
    await connection.commit();

    return res.status(201).json({
      ok: true,
      message: "Orden de taller registrada.",
      workshopOrder: {
        id: serviceResult.insertId,
        ticket: serviceType === "Reparacion"
          ? `REP-${serviceResult.insertId}`
          : `MNT-${serviceResult.insertId}`,
        serviceType,
        equipment: device,
        defect,
        cost,
        status: "Pendiente",
      },
    });
  } catch (error) {
    if (connection) await revertirTransaccionEmpleado(connection);
    console.error("Error registrando orden de taller:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar la orden de taller." });
  } finally {
    connection?.release();
  }
});

app.patch("/api/employee/workshop-orders/:id", requireEmployee, async (req, res) => {
  const serviceId = Number(req.params.id);
  const requestedStatus = String(req.body?.status || "");
  const statusLabels = {
    "EN PROCESO": "En proceso",
    COMPLETO: "Completado",
  };
  const previousStatusByTransition = {
    "EN PROCESO": "PENDIENTE",
    COMPLETO: "EN PROCESO",
  };
  if (
    !Number.isSafeInteger(serviceId) ||
    serviceId <= 0 ||
    !Object.hasOwn(statusLabels, requestedStatus)
  ) {
    return res.status(400).json({ ok: false, message: "El estado solicitado no es válido." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const previousStatus = previousStatusByTransition[requestedStatus];
    const [result] = await connection.query(
      `UPDATE servicio
       SET estado = ?
       WHERE id_servicio = ? AND id_encargado = ? AND estado = ?`,
      [requestedStatus, serviceId, req.userId, previousStatus],
    );
    if (!result.affectedRows) {
      await revertirTransaccionEmpleado(connection);
      return res.status(404).json({ ok: false, message: "No se encontró una orden activa asignada." });
    }

    await connection.query(
      `UPDATE detalle_servicio
       SET estado = ?
       WHERE id_servicio = ? AND estado <> 'CANCELADO'`,
      [requestedStatus, serviceId],
    );
    await connection.commit();
    return res.json({
      ok: true,
      message: "Estado de la orden actualizado.",
      status: statusLabels[requestedStatus],
    });
  } catch (error) {
    if (connection) await revertirTransaccionEmpleado(connection);
    console.error("Error actualizando orden de taller:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar la orden." });
  } finally {
    connection?.release();
  }
});

app.post("/api/employee/sales", requireEmployee, async (req, res) => {
  const paymentMethods = {
    Efectivo: "EFECTIVO",
    Nequi: "TRANSFERENCIA",
    Tarjeta: "TARJETA",
  };
  const paymentMethod = paymentMethods[req.body?.paymentMethod];
  const customerId =
    req.body?.customerId === null || req.body?.customerId === ""
      ? null
      : Number(req.body?.customerId);
  const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const items = new Map();

  for (const item of requestedItems) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({ ok: false, message: "Hay un producto o cantidad inválida en la venta." });
    }
    items.set(productId, (items.get(productId) || 0) + quantity);
  }

  if (
    !paymentMethod ||
    !items.size ||
    items.size > 50 ||
    [...items.values()].some((quantity) => !Number.isSafeInteger(quantity))
  ) {
    return res.status(400).json({ ok: false, message: "La venta requiere productos y un método de pago válido." });
  }
  if (customerId !== null && (!Number.isSafeInteger(customerId) || customerId <= 0)) {
    return res.status(400).json({ ok: false, message: "El cliente seleccionado no es válido." });
  }

  let connection;
  try {
    await ensureWarrantyRequestSchema();
    await ensureWarrantyDetailIndexes();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const branch = await obtenerSucursalEmpleado(req.userId, connection);
    if (!branch) {
      await revertirTransaccionEmpleado(connection);
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa asignada a este empleado.",
      });
    }

    let saleCustomerId = customerId;
    let customerPhone = null;
    if (saleCustomerId === null) {
      const walkInDocument = `MOSTRADOR-${branch.id_sucursal}`;
      const [walkInRows] = await connection.query(
        "SELECT id_usuario, telefono FROM usuario WHERE num_doc = ? LIMIT 1",
        [walkInDocument],
      );
      if (walkInRows.length) {
        saleCustomerId = walkInRows[0].id_usuario;
        customerPhone = walkInRows[0].telefono;
      } else {
        const [roleRows] = await connection.query(
          "SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente' AND estado = 'ACTIVO' LIMIT 1",
        );
        if (!roleRows.length) {
          await revertirTransaccionEmpleado(connection);
          return res.status(500).json({ ok: false, message: "No se encontró el rol de cliente." });
        }
        const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
        const [walkInResult] = await connection.query(
          `INSERT INTO usuario
             (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, departamento,
              ciudad, direccion, correo, contrasena_hash, estado)
           VALUES (?, 'Cliente', 'Mostrador', 'CC', ?, '0000000', ?, ?, ?, ?, ?, 'ACTIVO')`,
          [
            roleRows[0].id_rol,
            walkInDocument,
            branch.departamento,
            branch.ciudad,
            branch.nombre_suc,
            `mostrador-${branch.id_sucursal}@wiiu.local`,
            passwordHash,
          ],
        );
        saleCustomerId = walkInResult.insertId;
        customerPhone = "0000000";
      }
    } else {
      const [customerRows] = await connection.query(
        `SELECT u.id_usuario, u.telefono
         FROM usuario u
         INNER JOIN rol r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Cliente'
         LIMIT 1`,
        [saleCustomerId],
      );
      if (!customerRows.length) {
        await revertirTransaccionEmpleado(connection);
        return res.status(404).json({ ok: false, message: "No se encontró el cliente seleccionado." });
      }
      customerPhone = customerRows[0].telefono;
    }

    const saleLines = [];
    for (const [productId, quantity] of [...items].sort(
      ([leftId], [rightId]) => leftId - rightId,
    )) {
      const [productRows] = await connection.query(
        `SELECT nombre, precio
         FROM producto
         WHERE id_producto = ? AND estado = 'ACTIVO'
         FOR UPDATE`,
        [productId],
      );
      if (!productRows.length) {
        await revertirTransaccionEmpleado(connection);
        return res.status(404).json({
          ok: false,
          message: "Uno de los productos ya no está disponible.",
        });
      }
      const product = productRows[0];
      const [inventoryRows] = await connection.query(
        `SELECT i.id_sucursal AS branchId, i.stock
         FROM inventario i
         INNER JOIN sucursal s
           ON s.id_sucursal = i.id_sucursal
          AND s.estado = 'ACTIVO'
         WHERE i.id_producto = ? AND i.estado = 'ACTIVO'
         ORDER BY i.id_sucursal
         FOR UPDATE`,
        [productId],
      );
      const totalStock = inventoryRows.reduce(
        (sum, inventory) => sum + Number(inventory.stock),
        0,
      );
      if (totalStock < quantity) {
        await revertirTransaccionEmpleado(connection);
        return res.status(409).json({
          ok: false,
          message: `Stock global insuficiente para ${product.nombre}.`,
        });
      }
      const prioritizedInventoryRows = [...inventoryRows].sort((left, right) => {
        const leftIsBranch = Number(left.branchId) === Number(branch.id_sucursal);
        const rightIsBranch = Number(right.branchId) === Number(branch.id_sucursal);
        return Number(rightIsBranch) - Number(leftIsBranch) ||
          Number(left.branchId) - Number(right.branchId);
      });
      const unitPrice = Number(product.precio);
      saleLines.push({
        productId,
        quantity,
        unitPrice,
        subtotal: Number((unitPrice * quantity).toFixed(2)),
        inventoryRows: prioritizedInventoryRows,
      });
    }

    const total = Number(
      saleLines.reduce((sum, line) => sum + line.subtotal, 0).toFixed(2),
    );
    const [saleResult] = await connection.query(
      `INSERT INTO venta
         (id_usuario, id_empleado, id_sucursal, metodo_pago, telefono,
          tipo_venta, notas, estado)
       VALUES (?, ?, ?, ?, ?, 'SUCURSAL', 'Venta desde POS de empleado', 'PAGADA')`,
      [
        saleCustomerId,
        req.userId,
        branch.id_sucursal,
        paymentMethod,
        customerPhone,
      ],
    );

    for (const line of saleLines) {
      await insertSaleUnitsWithWarranties(
        connection,
        saleResult.insertId,
        line,
        "Venta desde POS de empleado",
      );
      let remainingQuantity = line.quantity;
      for (const inventory of line.inventoryRows) {
        if (remainingQuantity === 0) break;
        const quantityToDeduct = Math.min(
          Number(inventory.stock),
          remainingQuantity,
        );
        if (quantityToDeduct <= 0) continue;

        const [inventoryResult] = await connection.query(
          `UPDATE inventario
           SET stock = stock - ?
           WHERE id_producto = ? AND id_sucursal = ?
             AND estado = 'ACTIVO' AND stock >= ?`,
          [
            quantityToDeduct,
            line.productId,
            inventory.branchId,
            quantityToDeduct,
          ],
        );
        if (!inventoryResult.affectedRows) {
          throw new Error("No se pudo descontar el stock global del producto.");
        }
        remainingQuantity -= quantityToDeduct;
      }

      if (remainingQuantity > 0) {
        throw new Error("El stock global cambió durante el registro de la venta.");
      }
    }

    await connection.commit();
    return res.status(201).json({
      ok: true,
      message: "Venta registrada.",
      sale: {
        id: saleResult.insertId,
        total,
        paymentMethod: req.body.paymentMethod,
      },
    });
  } catch (error) {
    if (connection) await revertirTransaccionEmpleado(connection);
    console.error("Error registrando venta desde POS:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo completar la venta." });
  } finally {
    connection?.release();
  }
});

// ---------- PRODUCTOS ----------

const productImageTypes = new Map([
  ["image/jpeg", { extension: "jpg", signature: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ["image/png", { extension: "png", signature: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: "webp", signature: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" }],
  ["image/gif", { extension: "gif", signature: (buffer) => buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6)) }],
]);
const parseProductImage = express.raw({
  type: Array.from(productImageTypes.keys()),
  limit: "5mb",
});
const productImageDirectory = path.join(__dirname, "..", "Frontend", "Assets", "uploads");

app.post(
  "/api/admin/product-images",
  requireAdmin,
  (req, res, next) => {
    parseProductImage(req, res, (error) => {
      if (!error) return next();
      if (error.status === 413) {
        return res.status(413).json({ ok: false, message: "La imagen no puede superar 5 MB." });
      }
      return next(error);
    });
  },
  async (req, res) => {
    const mimeType = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const imageType = productImageTypes.get(mimeType);
    const imageBuffer = req.body;
    if (!imageType || !Buffer.isBuffer(imageBuffer) || !imageBuffer.length) {
      return res.status(400).json({ ok: false, message: "Selecciona un archivo de imagen válido." });
    }
    if (!imageType.signature(imageBuffer)) {
      return res.status(415).json({ ok: false, message: "El contenido del archivo no coincide con su formato de imagen." });
    }

    const fileName = `${crypto.randomBytes(16).toString("hex")}.${imageType.extension}`;
    try {
      await fs.mkdir(productImageDirectory, { recursive: true });
      await fs.writeFile(path.join(productImageDirectory, fileName), imageBuffer, { flag: "wx" });
      return res.status(201).json({
        ok: true,
        imageUrl: `../Assets/uploads/${fileName}`,
        message: "Imagen subida correctamente.",
      });
    } catch (error) {
      console.error("Error al guardar la imagen del producto:", error.message);
      return res.status(500).json({ ok: false, message: "No se pudo guardar la imagen." });
    }
  },
);

// Crear producto
app.post("/api/admin/productos", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      publisher,
      price,
      stock,
      imageUrl,
      imageUrl2,
      imageUrl3,
      imageUrl4,
      description,
    } = req.body;
    const branch = await obtenerSucursalInventarioAdmin(req.body?.branchId);
    if (!branch) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona una sucursal activa para el inventario.",
        errors: { branchId: "Selecciona una sucursal activa." },
      });
    }

    const nameValue = String(name || "").trim();
    const categoryValue = String(category || "").trim();
    const publisherValue = String(publisher || "").trim();
    const priceValue = Number(price);
    const stockValue = Number(stock);
    const imageValue = String(imageUrl || "").trim();
    const descriptionValue = String(description || "").trim();
    const errors = {};
    if (nameValue.length < 3 || nameValue.length > 100) {
      errors.name = "El nombre debe tener entre 3 y 100 caracteres.";
    }
    if (!categoryValue || categoryValue.length > 40) {
      errors.category = "Selecciona una categoría de máximo 40 caracteres.";
    }
    if (!publisherValue || publisherValue.length > 20) {
      errors.publisher = "Selecciona una marca de máximo 20 caracteres.";
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0 || priceValue > 99999999.999999) {
      errors.price = "Ingresa un precio mayor a 0 y dentro del límite permitido.";
    }
    if (!Number.isSafeInteger(stockValue) || stockValue < 0 || stockValue > 2147483647) {
      errors.stock = "Ingresa una cantidad entera entre 0 y 2.147.483.647.";
    }
    if (!imageValue || imageValue.length > 255) {
      errors.imageUrl = "La imagen principal es obligatoria y no puede superar 255 caracteres.";
    }
    for (const field of ["imageUrl2", "imageUrl3", "imageUrl4"]) {
      if (String(req.body?.[field] || "").trim().length > 255) {
        errors[field] = "La ruta o URL no puede superar 255 caracteres.";
      }
    }
    if (!descriptionValue || descriptionValue.length > 100) {
      errors.description = "La descripción es obligatoria y debe tener máximo 100 caracteres.";
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({
        ok: false,
        message: "Revisa los campos obligatorios del producto.",
        errors,
      });
    }

    // Buscar o crear marca
    const publisherName = publisherValue;
    let [marcaRows] = await pool.query(
      "SELECT id_marca FROM marca WHERE nombre_marca = ? AND estado = 'ACTIVO'",
      [publisherName],
    );
    let marcaId;
    if (marcaRows.length > 0) {
      marcaId = marcaRows[0].id_marca;
    } else {
      const [insertMarca] = await pool.query(
        "INSERT INTO marca (nombre_marca, descripcion_marca, estado) VALUES (?, ?, 'ACTIVO')",
        [publisherName.substring(0, 20), `Marca ${publisherName}`],
      );
      marcaId = insertMarca.insertId;
    }

    // Buscar o crear categoría
    const categoryName = categoryValue;
    let [catRows] = await pool.query(
      "SELECT id_categoria FROM categoria WHERE nombre_cat = ? AND estado = 'ACTIVO'",
      [categoryName],
    );
    let catId;
    if (catRows.length > 0) {
      catId = catRows[0].id_categoria;
    } else {
      const [insertCat] = await pool.query(
        "INSERT INTO categoria (nombre_cat, descripcion_cat, estado) VALUES (?, ?, 'ACTIVO')",
        [categoryName.substring(0, 40), `Categoría ${categoryName}`],
      );
      catId = insertCat.insertId;
    }

    const [insertProduct] = await pool.query(
      `INSERT INTO producto
         (id_marca, id_categoria, nombre, imagen_prin, imagen_2, imagen_3, imagen_4, descripcion, precio, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        marcaId,
        catId,
        nameValue.substring(0, 100),
        imageValue.substring(0, 255),
        String(imageUrl2 || "").trim().substring(0, 255) || null,
        String(imageUrl3 || "").trim().substring(0, 255) || null,
        String(imageUrl4 || "").trim().substring(0, 255) || null,
        descriptionValue.substring(0, 100),
        priceValue,
      ],
    );

    const productId = insertProduct.insertId;

    // Agregar el stock inicial a la sucursal seleccionada.
    const stockVal = stockValue;
    if (stockVal > 0) {
      await pool.query(
        `INSERT INTO inventario (id_sucursal, id_producto, stock, estado)
         VALUES (?, ?, ?, 'ACTIVO')
         ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)`,
        [branch.id_sucursal, productId, stockVal],
      );
    }

    return res.status(201).json({
      ok: true,
      message: "Producto creado exitosamente.",
      productId,
    });
  } catch (error) {
    console.error("Error al crear producto:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo crear el producto." });
  }
});

// Actualizar producto
app.put("/api/admin/productos/:id", requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const {
      name,
      category,
      publisher,
      price,
      stock,
      imageUrl,
      imageUrl2,
      imageUrl3,
      imageUrl4,
      description,
    } = req.body;
    const branch = await obtenerSucursalInventarioAdmin(req.body?.branchId);
    if (!branch) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona una sucursal activa para el inventario.",
        errors: { branchId: "Selecciona una sucursal activa." },
      });
    }

    if (!Number.isSafeInteger(productId) || productId < 1) {
      return res.status(400).json({ ok: false, message: "Producto inválido." });
    }
    const nameValue = String(name || "").trim();
    const categoryValue = String(category || "").trim();
    const publisherValue = String(publisher || "").trim();
    const priceValue = Number(price);
    const stockValue = Number(stock);
    const imageValue = String(imageUrl || "").trim();
    const descriptionValue = String(description || "").trim();
    const errors = {};
    if (nameValue.length < 3 || nameValue.length > 100) {
      errors.name = "El nombre debe tener entre 3 y 100 caracteres.";
    }
    if (!categoryValue || categoryValue.length > 40) {
      errors.category = "Selecciona una categoría de máximo 40 caracteres.";
    }
    if (!publisherValue || publisherValue.length > 20) {
      errors.publisher = "Selecciona una marca de máximo 20 caracteres.";
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0 || priceValue > 99999999.999999) {
      errors.price = "Ingresa un precio mayor a 0 y dentro del límite permitido.";
    }
    if (!Number.isSafeInteger(stockValue) || stockValue < 0 || stockValue > 2147483647) {
      errors.stock = "Ingresa una cantidad entera entre 0 y 2.147.483.647.";
    }
    if (!imageValue || imageValue.length > 255) {
      errors.imageUrl = "La imagen principal es obligatoria y no puede superar 255 caracteres.";
    }
    for (const field of ["imageUrl2", "imageUrl3", "imageUrl4"]) {
      if (String(req.body?.[field] || "").trim().length > 255) {
        errors[field] = "La ruta o URL no puede superar 255 caracteres.";
      }
    }
    if (!descriptionValue || descriptionValue.length > 100) {
      errors.description = "La descripción es obligatoria y debe tener máximo 100 caracteres.";
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({
        ok: false,
        message: "Revisa los campos obligatorios del producto.",
        errors,
      });
    }

    const [existingProductRows] = await pool.query(
      "SELECT id_producto FROM producto WHERE id_producto = ? AND estado = 'ACTIVO'",
      [productId],
    );
    if (!existingProductRows.length) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado." });
    }

    let catId = null;
    if (category && String(category).trim().length > 0) {
      const categoryName = String(category).trim();
      const [catRows] = await pool.query(
        "SELECT id_categoria FROM categoria WHERE nombre_cat = ? AND estado = 'ACTIVO'",
        [categoryName],
      );
      if (catRows.length > 0) {
        catId = catRows[0].id_categoria;
      } else {
        const [insertCat] = await pool.query(
          "INSERT INTO categoria (nombre_cat, descripcion_cat, estado) VALUES (?, ?, 'ACTIVO')",
          [categoryName.substring(0, 40), `Categoría ${categoryName}`],
        );
        catId = insertCat.insertId;
      }
    }

    let brandId = null;
    if (publisher && String(publisher).trim().length > 0) {
      const publisherName = String(publisher).trim();
      const [brandRows] = await pool.query(
        "SELECT id_marca FROM marca WHERE nombre_marca = ? AND estado = 'ACTIVO'",
        [publisherName],
      );
      if (brandRows.length > 0) {
        brandId = brandRows[0].id_marca;
      } else {
        const [insertBrand] = await pool.query(
          "INSERT INTO marca (nombre_marca, descripcion_marca, estado) VALUES (?, ?, 'ACTIVO')",
          [publisherName.substring(0, 20), `Marca ${publisherName}`],
        );
        brandId = insertBrand.insertId;
      }
    }

    const updates = ["nombre = ?", "precio = ?", "descripcion = ?"];
    const updateValues = [
      nameValue.substring(0, 100),
      priceValue,
      descriptionValue.substring(0, 100),
    ];
    const imageFields = [
      ["imageUrl", "imagen_prin"],
      ["imageUrl2", "imagen_2"],
      ["imageUrl3", "imagen_3"],
      ["imageUrl4", "imagen_4"],
    ];
    imageFields.forEach(([bodyField, column]) => {
      if (!Object.prototype.hasOwnProperty.call(req.body, bodyField)) return;
      const imagePath = String(req.body[bodyField] || "").trim();
      if (column === "imagen_prin" && !imagePath) return;
      updates.push(`${column} = ?`);
      updateValues.push(imagePath || null);
    });
    if (catId) {
      updates.push("id_categoria = ?");
      updateValues.push(catId);
    }
    if (brandId) {
      updates.push("id_marca = ?");
      updateValues.push(brandId);
    }
    updateValues.push(productId);
    await pool.query(
      `UPDATE producto
       SET ${updates.join(", ")}
       WHERE id_producto = ? AND estado = 'ACTIVO'`,
      updateValues,
    );

    // Actualizar el stock de la sucursal seleccionada.
    const stockVal = stockValue;
    await pool.query(
      `INSERT INTO inventario (id_sucursal, id_producto, stock, estado)
       VALUES (?, ?, ?, 'ACTIVO')
       ON DUPLICATE KEY UPDATE stock = ?, estado = 'ACTIVO'`,
      [branch.id_sucursal, productId, stockVal, stockVal],
    );

    return res.json({ ok: true, message: "Producto actualizado." });
  } catch (error) {
    console.error("Error al actualizar producto:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar el producto." });
  }
});

app.patch("/api/admin/productos/:id/estado", requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const status = String(req.body?.status || "");
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res.status(400).json({ ok: false, message: "ID de producto inválido." });
  }
  if (!["ACTIVO", "INACTIVO"].includes(status)) {
    return res.status(400).json({ ok: false, message: "Estado de producto inválido." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [productRows] = await connection.query(
      "SELECT id_producto FROM producto WHERE id_producto = ? FOR UPDATE",
      [productId],
    );
    if (!productRows.length) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: "Producto no encontrado." });
    }

    await connection.query(
      "UPDATE producto SET estado = ? WHERE id_producto = ?",
      [status, productId],
    );
    await connection.query(
      "UPDATE inventario SET estado = ? WHERE id_producto = ?",
      [status, productId],
    );
    await connection.commit();
    return res.json({
      ok: true,
      message: status === "INACTIVO" ? "Producto suspendido." : "Producto reactivado.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error revirtiendo suspensión de producto:", rollbackError.message);
      }
    }
    console.error("Error cambiando estado del producto:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo cambiar el estado del producto.",
    });
  } finally {
    connection?.release();
  }
});

// Eliminar producto (soft delete)
app.delete("/api/admin/productos/:id", requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    await pool.query(
      "UPDATE producto SET estado = 'INACTIVO' WHERE id_producto = ?",
      [productId],
    );
    await pool.query(
      "UPDATE inventario SET estado = 'INACTIVO' WHERE id_producto = ?",
      [productId],
    );
    return res.json({ ok: true, message: "Producto eliminado." });
  } catch (error) {
    console.error("Error al eliminar producto:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo eliminar el producto." });
  }
});

// ---------- CLIENTES ----------

// Registro de usuarios (público)
app.post("/api/usuarios", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const apellido = String(req.body?.apellido || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const telefono = String(req.body?.telefono || "").trim();
    const telefonoSecundario = String(req.body?.telefono_secundario || "").trim();
    const direccion = String(req.body?.direccion || "").trim();
    const codigoPostal = String(req.body?.codigoPostal || "").trim();
    const departamento = String(req.body?.departamento || "").trim();
    const ciudad = String(req.body?.ciudad || "").trim();
    const nacimiento = String(req.body?.nacimiento || "").trim();
    const tipoDocumento = String(req.body?.tipoDocumento || "CC").trim().toUpperCase();
    const numeroDocumento = String(req.body?.numeroDocumento || "").trim();

    if (!nombre || !apellido || !email || !password || !tipoDocumento || !numeroDocumento) {
      return res.status(400).json({ ok: false, message: "Datos obligatorios faltantes." });
    }
    const nombreValido = /^[\p{L}][\p{L}\s'-]*$/u;
    if (
      nombre.length < 2 ||
      nombre.length > 30 ||
      apellido.length < 2 ||
      apellido.length > 30 ||
      !nombreValido.test(nombre) ||
      !nombreValido.test(apellido)
    ) {
      return res.status(400).json({ ok: false, message: "Ingresa un nombre y apellido válidos." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      return res.status(400).json({ ok: false, message: "Formato de correo inválido." });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ ok: false, message: "La contraseña debe tener entre 8 y 128 caracteres." });
    }
    if (!/^[+\d()\s-]{7,20}$/.test(telefono) || !/\d{7,}/.test(telefono.replace(/\D/g, ""))) {
      return res.status(400).json({ ok: false, message: "Ingresa un teléfono válido." });
    }
    if (telefonoSecundario && (!/^[+\d()\s-]{7,20}$/.test(telefonoSecundario) || !/\d{7,}/.test(telefonoSecundario.replace(/\D/g, "")))) {
      return res.status(400).json({ ok: false, message: "Ingresa un teléfono secundario válido." });
    }
    if (direccion.length < 5 || direccion.length > 40) {
      return res.status(400).json({ ok: false, message: "Ingresa una dirección válida." });
    }
    if (codigoPostal.length > 20) {
      return res.status(400).json({ ok: false, message: "El código postal no puede superar 20 caracteres." });
    }
    if (!departamento || !ciudad || departamento.length > 30 || ciudad.length > 30) {
      return res.status(400).json({ ok: false, message: "Selecciona departamento y municipio." });
    }
    const fechaNacimiento = new Date(`${nacimiento}T00:00:00Z`);
    const fechaValida =
      /^\d{4}-\d{2}-\d{2}$/.test(nacimiento) &&
      !Number.isNaN(fechaNacimiento.getTime()) &&
      fechaNacimiento.toISOString().slice(0, 10) === nacimiento &&
      nacimiento >= "1940-01-01" &&
      nacimiento <= new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().slice(0, 10);
    if (!fechaValida) {
      return res.status(400).json({ ok: false, message: "Selecciona una fecha de nacimiento válida." });
    }
    const tiposDocumentoValidos = ["CC", "TI", "PAS", "NIT", "CE"];
    if (!tiposDocumentoValidos.includes(tipoDocumento)) {
      return res.status(400).json({ ok: false, message: "Selecciona un tipo de documento válido." });
    }
    const documentoValido = tipoDocumento === "PAS"
      ? /^[A-Za-z0-9-]{5,20}$/.test(numeroDocumento)
      : /^[0-9]{6,20}$/.test(numeroDocumento);
    if (!documentoValido) {
      return res.status(400).json({
        ok: false,
        message: tipoDocumento === "PAS"
          ? "El pasaporte debe tener entre 5 y 20 caracteres alfanuméricos."
          : "El documento seleccionado debe contener entre 6 y 20 números.",
      });
    }
    const [documentoExistente] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE num_doc = ? LIMIT 1",
      [numeroDocumento],
    );
    if (documentoExistente.length) {
      return res.status(409).json({ ok: false, message: "El número de documento ya está registrado." });
    }

    const [roleRows] = await pool.query(
      "SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente' AND estado = 'ACTIVO' LIMIT 1",
    );
    if (!roleRows.length) {
      return res.status(500).json({ ok: false, message: "No se encontró el rol de cliente." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await ensureCustomerPostalCodeSchema();
    const [result] = await pool.query(
      `INSERT INTO usuario
         (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, telefono_secundario,
          departamento, ciudad, direccion, codigo_postal, fecha_nacimiento,
          correo, contrasena_hash, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        roleRows[0].id_rol,
        nombre,
        apellido,
        tipoDocumento,
        numeroDocumento,
        telefono.substring(0, 20),
        telefonoSecundario.substring(0, 20) || null,
        departamento,
        ciudad,
        direccion,
        codigoPostal || null,
        nacimiento || null,
        email,
        passwordHash,
      ],
    );
    return res.status(201).json({ ok: true, message: "Usuario registrado exitosamente.", userId: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, message: "El correo ya está registrado." });
    }
    console.error("Error al registrar usuario:", error.message);
    return res.status(500).json({ ok: false, message: "Error interno al registrar usuario." });
  }
});

app.post("/api/admin/clientes", requireAdmin, async (req, res) => {
  try {
    const nombre = String(req.body?.firstName || "").normalize("NFC").trim().replace(/\s+/g, " ");
    const apellido = String(req.body?.lastName || "").normalize("NFC").trim().replace(/\s+/g, " ");
    const nacimiento = String(req.body?.birthDate || "").trim();
    const tipoDocumento = String(req.body?.documentType || "").trim().toUpperCase();
    const numeroDocumento = String(req.body?.documentNumber || "").trim();
    const correo = String(req.body?.email || "").trim().toLowerCase();
    const confirmarCorreo = String(req.body?.confirmEmail || "").trim().toLowerCase();
    const contrasena = String(req.body?.password || "");
    const confirmarContrasena = String(req.body?.confirmPassword || "");
    const telefono = String(req.body?.phone || "").trim();
    const telefonoSecundario = String(req.body?.secondaryPhone || "").trim();
    const departamento = String(req.body?.department || "").trim();
    const ciudad = String(req.body?.city || "").trim();
    const direccion = String(req.body?.address || "").trim();
    const codigoPostal = String(req.body?.postalCode || "").trim();
    const errors = {};

    const namePattern = /^[\p{L}][\p{L}\s'-]*$/u;
    if (nombre.length < 2 || nombre.length > 30 || !namePattern.test(nombre)) {
      errors.firstName = "Ingresa un nombre válido de 2 a 30 caracteres.";
    }
    if (apellido.length < 2 || apellido.length > 30 || !namePattern.test(apellido)) {
      errors.lastName = "Ingresa un apellido válido de 2 a 30 caracteres.";
    }

    const fechaNacimiento = new Date(`${nacimiento}T00:00:00Z`);
    const fechaLimiteEdad = new Date();
    fechaLimiteEdad.setFullYear(fechaLimiteEdad.getFullYear() - 10);
    const fechaMaxima = [
      fechaLimiteEdad.getFullYear(),
      String(fechaLimiteEdad.getMonth() + 1).padStart(2, "0"),
      String(fechaLimiteEdad.getDate()).padStart(2, "0"),
    ].join("-");
    const fechaNacimientoValida =
      /^\d{4}-\d{2}-\d{2}$/.test(nacimiento) &&
      !Number.isNaN(fechaNacimiento.getTime()) &&
      fechaNacimiento.toISOString().slice(0, 10) === nacimiento &&
      nacimiento >= "1940-01-01" &&
      nacimiento <= fechaMaxima;
    if (!fechaNacimientoValida) {
      errors.birthDate = "Selecciona una fecha válida entre 1940 y la fecha límite permitida (mínimo 10 años).";
    }
    const tiposDocumentoValidos = ["CC", "TI", "CE", "PAS", "NIT"];
    if (!tiposDocumentoValidos.includes(tipoDocumento)) {
      errors.documentType = "Selecciona un tipo de documento válido.";
    }
    const documentoValido = tipoDocumento === "PAS"
      ? /^[A-Za-z0-9-]{5,20}$/.test(numeroDocumento)
      : /^[0-9]{6,20}$/.test(numeroDocumento);
    if (!documentoValido) {
      errors.documentNumber = tipoDocumento === "PAS"
        ? "El pasaporte debe tener entre 5 y 20 caracteres alfanuméricos."
        : "El documento debe contener entre 6 y 20 números.";
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (correo.length > 120 || !formatoCorreo.test(correo)) {
      errors.email = "Ingresa un correo electrónico válido de máximo 120 caracteres.";
    }
    if (!confirmarCorreo || confirmarCorreo !== correo) {
      errors.confirmEmail = "Los correos electrónicos deben coincidir.";
    }
    if (contrasena.length < 8 || contrasena.length > 128) {
      errors.password = "La contraseña debe tener entre 8 y 128 caracteres.";
    }
    if (!confirmarContrasena || confirmarContrasena !== contrasena) {
      errors.confirmPassword = "Las contraseñas deben coincidir.";
    }

    const phoneDigits = telefono.replace(/\D/g, "");
    const secondaryPhoneDigits = telefonoSecundario.replace(/\D/g, "");
    if (
      !/^[+\d()\s-]{7,20}$/.test(telefono) ||
      phoneDigits.length < 7
    ) {
      errors.phone = "Ingresa un teléfono válido con al menos 7 dígitos.";
    }
    if (
      telefonoSecundario &&
      (!/^[+\d()\s-]{7,20}$/.test(telefonoSecundario) ||
        secondaryPhoneDigits.length < 7)
    ) {
      errors.secondaryPhone = "Ingresa un teléfono secundario válido con al menos 7 dígitos.";
    }
    if (!departamento || departamento.length > 30) {
      errors.department = "Selecciona un departamento válido.";
    }
    if (!ciudad || ciudad.length > 30) {
      errors.city = "Selecciona un municipio o ciudad válido.";
    }
    if (direccion.length < 5 || direccion.length > 40) {
      errors.address = "Ingresa una dirección de 5 a 40 caracteres.";
    }
    if (codigoPostal.length > 20) {
      errors.postalCode = "El código postal no puede superar 20 caracteres.";
    }
    if (req.body?.acceptedTerms !== true) {
      errors.acceptedTerms = "Debes confirmar la aceptación de los términos y la política de datos.";
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({
        ok: false,
        message: "Revisa los datos del cliente antes de guardarlos.",
        errors,
      });
    }

    const [roleRows] = await pool.query(
      "SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente' AND estado = 'ACTIVO' LIMIT 1",
    );
    if (!roleRows.length) {
      return res.status(500).json({ ok: false, message: "No se encontró el rol de cliente activo." });
    }

    const passwordHash = await bcrypt.hash(contrasena, 12);
    await ensureCustomerPostalCodeSchema();

    const [correoExistente] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
      [correo],
    );
    if (correoExistente.length) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario registrado con este correo.",
        errors: { email: "Ya existe un usuario registrado con este correo." },
      });
    }
    const [documentoExistente] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE num_doc = ? LIMIT 1",
      [numeroDocumento],
    );
    if (documentoExistente.length) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario registrado con este número de documento.",
        errors: { documentNumber: "El número de documento ya está registrado." },
      });
    }

    const [result] = await pool.query(
      `INSERT INTO usuario
         (id_rol, nombre, apellido, tipo_doc, num_doc, fecha_nacimiento,
          telefono, telefono_secundario, departamento, ciudad, direccion,
          codigo_postal, correo, contrasena_hash, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        roleRows[0].id_rol,
        nombre,
        apellido,
          tipoDocumento,
        numeroDocumento,
        nacimiento,
        telefono,
        telefonoSecundario || null,
        departamento,
        ciudad,
        direccion,
        codigoPostal || null,
        correo,
        passwordHash,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Cliente registrado exitosamente.",
      clientId: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario registrado con este correo.",
        errors: { email: "Ya existe un usuario registrado con este correo." },
      });
    }
    console.error("Error al crear cliente:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar el cliente." });
  }
});

app.put("/api/admin/usuarios/:id", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const fullName = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const department = String(req.body?.department || "").trim();
  const city = String(req.body?.city || "").trim();
  const address = String(req.body?.address || "").trim();
  const roleId = Number(req.body?.roleId);
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ ok: false, message: "ID de usuario inválido." });
  }
  if (
    !/^[\p{L}\s'-]{3,60}$/u.test(fullName) ||
    firstName.length > 30 ||
    lastName.length < 1 ||
    lastName.length > 30
  ) {
    return res.status(400).json({
      ok: false,
      message: "Ingresa un nombre y apellido válidos.",
      errors: { name: "Ingresa nombre y apellido válidos (máximo 30 caracteres cada uno)." },
    });
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (
    !/^[0-9+\-\s()]{7,20}$/.test(phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  ) {
    return res.status(400).json({
      ok: false,
      message: "Teléfono inválido.",
      errors: { phone: "Ingresa un teléfono válido con 7 a 15 dígitos." },
    });
  }
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      ok: false,
      message: "Correo inválido.",
      errors: { email: "Ingresa un correo electrónico válido (máximo 120 caracteres)." },
    });
  }
  if (!department || department.length > 30 || city.length > 30 || address.length > 40) {
    const errors = {};
    if (!department || department.length > 30) errors.department = "El departamento es obligatorio y debe tener máximo 30 caracteres.";
    if (city.length > 30) errors.city = "La ciudad no puede superar 30 caracteres.";
    if (address.length > 40) errors.address = "La dirección no puede superar 40 caracteres.";
    return res.status(400).json({
      ok: false,
      message: "Revisa los datos de ubicación del usuario.",
      errors,
    });
  }
  if (!Number.isSafeInteger(roleId) || roleId < 1) {
    return res.status(400).json({
      ok: false,
      message: "Selecciona un rol válido.",
      errors: { roleId: "Selecciona un rol válido." },
    });
  }

  try {
    const [userRows] = await pool.query(
      "SELECT id_rol FROM usuario WHERE id_usuario = ?",
      [userId],
    );
    if (!userRows.length) {
      return res.status(404).json({ ok: false, message: "El usuario no existe." });
    }
    if (userId === req.userId && Number(userRows[0].id_rol) !== roleId) {
      return res.status(409).json({
        ok: false,
        message: "No puedes cambiar el rol de tu propia cuenta.",
      });
    }

    const [roleRows] = await pool.query(
      "SELECT id_rol FROM rol WHERE id_rol = ? AND estado = 'ACTIVO'",
      [roleId],
    );
    if (!roleRows.length) {
      return res.status(400).json({
        ok: false,
        message: "El rol seleccionado no está disponible.",
        errors: { roleId: "El rol seleccionado ya no está disponible." },
      });
    }

    await pool.query(
      `UPDATE usuario
       SET nombre = ?, apellido = ?, telefono = ?, correo = ?,
           departamento = ?, ciudad = ?, direccion = ?, id_rol = ?
       WHERE id_usuario = ?`,
      [
        firstName,
        lastName,
        phone,
        email,
        department,
        city || null,
        address || null,
        roleId,
        userId,
      ],
    );
    if (Number(userRows[0].id_rol) !== roleId) {
      invalidarSesionesUsuario(userId);
    }
    return res.json({ ok: true, message: "Datos del usuario actualizados correctamente." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "El correo ya está registrado por otro usuario.",
        errors: { email: "Este correo ya está registrado por otro usuario." },
      });
    }
    console.error("Error al actualizar usuario:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar el usuario." });
  }
});

app.patch("/api/admin/usuarios/:id/estado", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const status = String(req.body?.status || "");
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ ok: false, message: "ID de usuario inválido." });
  }
  if (!["ACTIVO", "INACTIVO"].includes(status)) {
    return res.status(400).json({ ok: false, message: "Estado de usuario inválido." });
  }
  if (userId === req.userId && status === "INACTIVO") {
    return res.status(409).json({ ok: false, message: "No puedes suspender tu propia cuenta." });
  }

  try {
    const [userRows] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE id_usuario = ?",
      [userId],
    );
    if (!userRows.length) {
      return res.status(404).json({ ok: false, message: "El usuario no existe." });
    }
    await pool.query(
      "UPDATE usuario SET estado = ? WHERE id_usuario = ?",
      [status, userId],
    );
    if (status === "INACTIVO") {
      invalidarSesionesUsuario(userId);
    }
    return res.json({
      ok: true,
      message: status === "INACTIVO" ? "Usuario suspendido correctamente." : "Usuario reactivado correctamente.",
    });
  } catch (error) {
    console.error("Error al cambiar el estado del usuario:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo cambiar el estado del usuario." });
  }
});

// ---------- GARANTÍAS ----------

app.patch(
  "/api/admin/warranty-requests/:id/status",
  requireAdmin,
  async (req, res) => {
    const requestId = Number(req.params.id);
    const status = String(req.body?.status || "");
    const allowedStatuses = [
      "RECIBIDA",
      "EN_REVISION",
      "APROBADA",
      "RECHAZADA",
      "CERRADA",
    ];

    if (!Number.isSafeInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "La solicitud de garantía seleccionada no es válida.",
      });
    }
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona un estado válido para la solicitud.",
      });
    }

    try {
      await ensureWarrantyRequestSchema();
      const [existingRows] = await pool.query(
        `SELECT id_solicitud
         FROM solicitud_garantia
         WHERE id_solicitud = ?`,
        [requestId],
      );
      if (!existingRows.length) {
        return res.status(404).json({
          ok: false,
          message: "No encontramos la solicitud de garantía.",
        });
      }

      await pool.query(
        `UPDATE solicitud_garantia
         SET estado = ?
         WHERE id_solicitud = ?`,
        [status, requestId],
      );

      return res.json({
        ok: true,
        message: "El estado de la solicitud se actualizó correctamente.",
        request: { id: requestId, status },
      });
    } catch (error) {
      console.error("Error actualizando solicitud de garantía:", error.message);
      return res.status(500).json({
        ok: false,
        message: "No se pudo actualizar el estado de la solicitud.",
      });
    }
  },
);

// ---------- MANTENIMIENTOS ----------

async function crearOrdenServicioAdmin(req, res, nombreTipoServicio, prefijo) {
  const equipment = String(req.body?.equipment || "").trim();
  const equipmentType = String(req.body?.equipmentType || "");
  const brand = String(req.body?.brand || "").trim();
  const serialNumber = String(req.body?.serialNumber || "").trim();
  const serviceDescription = String(req.body?.serviceDescription || "").trim();
  const diagnosis = String(req.body?.diagnosis || "").trim();
  const clientId = Number(req.body?.clientId);
  const technicianId = Number(req.body?.technicianId);
  const cost = Number(req.body?.cost);
  const validEquipmentTypes = ["Portatil", "Torre", "Consola", "Control", "All in one"];
  const errors = {};

  if (equipment.length < 3 || equipment.length > 100) {
    errors.equipment = "El equipo debe tener entre 3 y 100 caracteres.";
  }
  if (!validEquipmentTypes.includes(equipmentType)) {
    errors.equipmentType = "Selecciona un tipo de equipo válido.";
  }
  if (brand.length < 1 || brand.length > 20) {
    errors.brand = "La marca es obligatoria y debe tener máximo 20 caracteres.";
  }
  if (serialNumber.length > 40) {
    errors.serialNumber = "El número de serie no puede superar 40 caracteres.";
  }
  if (serviceDescription.length < 3 || serviceDescription.length > 100) {
    errors.serviceDescription = "El detalle debe tener entre 3 y 100 caracteres.";
  }
  if (diagnosis.length > 100) {
    errors.diagnosis = "El diagnóstico no puede superar 100 caracteres.";
  }
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    errors.clientId = "Selecciona un cliente válido.";
  }
  if (!Number.isSafeInteger(technicianId) || technicianId <= 0) {
    errors.technicianId = "Selecciona un técnico válido.";
  }
  if (!Number.isSafeInteger(cost) || cost <= 0 || cost > 99999999) {
    errors.cost = "Ingresa un costo entero entre 1 y 99.999.999.";
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({
      ok: false,
      message: "Revisa los datos del equipo, cliente, técnico, detalle y presupuesto.",
      errors,
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [clientRows] = await connection.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Cliente'
       LIMIT 1`,
      [clientId],
    );
    if (!clientRows.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        message: "No se encontró el cliente seleccionado.",
        errors: { clientId: "El cliente seleccionado no está activo o ya no existe." },
      });
    }

    const [technicianRows] = await connection.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Trabajador'
       LIMIT 1`,
      [technicianId],
    );
    if (!technicianRows.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        message: "No se encontró el técnico seleccionado.",
        errors: { technicianId: "El técnico seleccionado no está activo o ya no existe." },
      });
    }

    const [serviceTypeRows] = await connection.query(
      "SELECT id_tipo_servicio FROM tipo_servicio WHERE nombre = ? AND estado = 'ACTIVO' LIMIT 1",
      [nombreTipoServicio],
    );
    if (!serviceTypeRows.length) {
      await connection.rollback();
      return res.status(409).json({ ok: false, message: "El tipo de servicio no está disponible." });
    }

    const serial = serialNumber || `SN-${prefijo}-${crypto.randomBytes(10).toString("hex").toUpperCase()}`;
    let existingEquipmentRows = [];
    if (serialNumber) {
      [existingEquipmentRows] = await connection.query(
        "SELECT id_equipo, id_usuario FROM equipo WHERE numero_serial = ? LIMIT 1",
        [serial],
      );
    }
    let equipmentId;
    if (existingEquipmentRows.length) {
      if (Number(existingEquipmentRows[0].id_usuario) !== clientId) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          message: "El número de serie pertenece a otro cliente.",
          errors: { serialNumber: "Este número de serie ya está asociado a otro cliente." },
        });
      }
      equipmentId = existingEquipmentRows[0].id_equipo;
      await connection.query(
        `UPDATE equipo SET tipo = ?, marca = ?, descripcion = ?, estado = 'ACTIVO'
         WHERE id_equipo = ?`,
        [equipmentType, brand, equipment, equipmentId],
      );
    } else {
      const [branchRows] = await connection.query(
        "SELECT id_sucursal FROM sucursal WHERE estado = 'ACTIVO' ORDER BY id_sucursal LIMIT 1",
      );
      if (!branchRows.length) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          message: "No hay una sucursal activa para registrar el equipo.",
        });
      }
      const [equipmentResult] = await connection.query(
        `INSERT INTO equipo
           (id_usuario, id_sucursal, tipo, marca, numero_serial, descripcion, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
        [clientId, branchRows[0].id_sucursal, equipmentType, brand, serial, equipment],
      );
      equipmentId = equipmentResult.insertId;
    }

    const [serviceResult] = await connection.query(
      `INSERT INTO servicio
         (nombre, descripcion, id_usuario, id_encargado, id_tipo_servicio, id_equipo, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [
        `${nombreTipoServicio}: ${equipment}`.substring(0, 100),
        serviceDescription,
        clientId,
        technicianId,
        serviceTypeRows[0].id_tipo_servicio,
        equipmentId,
      ],
    );
    await connection.query(
      `INSERT INTO detalle_servicio
         (id_servicio, id_producto, descripcion, cantidad, precio_unitario, estado)
       VALUES (?, NULL, ?, 1, ?, 'PENDIENTE')`,
      [serviceResult.insertId, diagnosis || "Pendiente de diagnóstico", cost],
    );
    await connection.commit();

    return res.status(201).json({
      ok: true,
      message: `${nombreTipoServicio} registrado correctamente.`,
      order: {
        id: serviceResult.insertId,
        ticket: `${prefijo}-${serviceResult.insertId}`,
        equipment,
        serviceDescription,
        diagnosis: diagnosis || "Pendiente de diagnóstico",
        cost,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error al revertir el registro del servicio:", rollbackError.message);
      }
    }
    console.error(`Error al registrar ${nombreTipoServicio}:`, error.message);
    return res.status(500).json({ ok: false, message: `No se pudo registrar ${nombreTipoServicio.toLowerCase()}.` });
  } finally {
    connection?.release();
  }
}

app.post("/api/admin/mantenimientos", (req, res) =>
  crearOrdenServicioAdmin(req, res, "Mantenimiento preventivo", "MNT"),
);

// ---------- REPARACIONES ----------

app.post("/api/admin/reparaciones", (req, res) =>
  crearOrdenServicioAdmin(req, res, "Reparacion", "REP"),
);

async function actualizarEstadoServicioAdmin(req, res, nombreTipoServicio) {
  const serviceId = Number(req.params.id);
  const status = String(req.body?.status || "");
  const validStatuses = ["PENDIENTE", "EN PROCESO", "COMPLETO", "CANCELADO"];
  if (
    !Number.isSafeInteger(serviceId) ||
    serviceId <= 0 ||
    !validStatuses.includes(status)
  ) {
    return res.status(400).json({ ok: false, message: "El estado solicitado no es válido." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [serviceRows] = await connection.query(
      `SELECT s.id_servicio
       FROM servicio s
       INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
       WHERE s.id_servicio = ? AND ts.nombre = ?
       FOR UPDATE`,
      [serviceId, nombreTipoServicio],
    );
    if (!serviceRows.length) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: "No se encontró la orden solicitada." });
    }

    await connection.query(
      "UPDATE servicio SET estado = ? WHERE id_servicio = ?",
      [status, serviceId],
    );
    await connection.query(
      "UPDATE detalle_servicio SET estado = ? WHERE id_servicio = ?",
      [status, serviceId],
    );
    await connection.commit();
    return res.json({ ok: true, message: "Estado de la orden actualizado." });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error revirtiendo el cambio de estado:", rollbackError.message);
      }
    }
    console.error("Error al actualizar el estado de la orden:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar el estado de la orden." });
  } finally {
    connection?.release();
  }
}

app.patch(
  "/api/admin/mantenimientos/:id/estado",
  requireAdmin,
  (req, res) => actualizarEstadoServicioAdmin(req, res, "Mantenimiento preventivo"),
);
app.patch(
  "/api/admin/reparaciones/:id/estado",
  requireAdmin,
  (req, res) => actualizarEstadoServicioAdmin(req, res, "Reparacion"),
);

async function actualizarOrdenServicioAdmin(req, res, nombreTipoServicio) {
  const serviceId = Number(req.params.id);
  const serviceDescription = String(req.body?.serviceDescription || "").trim();
  const diagnosis = String(req.body?.diagnosis || "").trim();
  const technicianId = Number(req.body?.technicianId);
  const cost = Number(req.body?.cost);
  const status = String(req.body?.status || "");
  const validStatuses = ["PENDIENTE", "EN PROCESO", "COMPLETO", "CANCELADO"];
  if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
    return res.status(400).json({ ok: false, message: "El número de la orden no es válido." });
  }
  if (serviceDescription.length < 3 || serviceDescription.length > 100) {
    return res.status(400).json({
      ok: false,
      message: "La descripción del trabajo debe tener entre 3 y 100 caracteres.",
    });
  }
  if (diagnosis.length < 1 || diagnosis.length > 100) {
    return res.status(400).json({
      ok: false,
      message: "El diagnóstico u observación debe tener entre 1 y 100 caracteres.",
    });
  }
  if (!Number.isSafeInteger(technicianId) || technicianId <= 0) {
    return res.status(400).json({ ok: false, message: "Selecciona un técnico responsable." });
  }
  if (!Number.isFinite(cost) || cost < 0 || cost > 99999999.99) {
    return res.status(400).json({
      ok: false,
      message: "El precio total debe ser un número entre 0 y 99.999.999,99.",
    });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ ok: false, message: "Selecciona un estado válido para la orden." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [serviceRows] = await connection.query(
      `SELECT s.id_servicio
       FROM servicio s
       INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
       WHERE s.id_servicio = ? AND ts.nombre = ?
       FOR UPDATE`,
      [serviceId, nombreTipoServicio],
    );
    if (!serviceRows.length) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: "No se encontró la orden solicitada." });
    }

    const [technicianRows] = await connection.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Trabajador'
       LIMIT 1`,
      [technicianId],
    );
    if (!technicianRows.length) {
      await connection.rollback();
      return res.status(400).json({ ok: false, message: "Selecciona un técnico activo registrado." });
    }

    const [detailRows] = await connection.query(
      `SELECT id_detalle_servicio, id_producto, cantidad, subtotal
       FROM detalle_servicio
       WHERE id_servicio = ?
       ORDER BY id_detalle_servicio
       FOR UPDATE`,
      [serviceId],
    );
    const primaryLaborRow = detailRows.find((row) => row.id_producto === null);
    const fixedCost = detailRows.reduce((total, row) => {
      return row.id_detalle_servicio === primaryLaborRow?.id_detalle_servicio
        ? total
        : total + Number(row.subtotal || 0);
    }, 0);
    const laborCost = Number((cost - fixedCost).toFixed(6));
    if (laborCost < 0) {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        message: "El precio no puede ser menor al valor de los repuestos registrados.",
      });
    }

    await connection.query(
      `UPDATE servicio
       SET descripcion = ?, id_encargado = ?, estado = ?
       WHERE id_servicio = ?`,
      [serviceDescription, technicianId, status, serviceId],
    );

    if (primaryLaborRow) {
      await connection.query(
        `UPDATE detalle_servicio
         SET descripcion = ?, cantidad = 1, precio_unitario = ?, estado = ?
         WHERE id_detalle_servicio = ?`,
        [diagnosis, laborCost, status, primaryLaborRow.id_detalle_servicio],
      );
    } else {
      await connection.query(
        `INSERT INTO detalle_servicio
           (id_servicio, id_producto, descripcion, cantidad, precio_unitario, estado)
         VALUES (?, NULL, ?, 1, ?, ?)`,
        [serviceId, diagnosis, laborCost, status],
      );
    }
    await connection.query(
      "UPDATE detalle_servicio SET estado = ? WHERE id_servicio = ?",
      [status, serviceId],
    );
    await connection.commit();
    return res.json({ ok: true, message: "Orden actualizada correctamente." });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error revirtiendo la edición de la orden:", rollbackError.message);
      }
    }
    console.error("Error al editar la orden:", error.message);
    const mensajesError = {
      ER_DATA_TOO_LONG: "Uno de los datos supera la longitud permitida.",
      ER_TRUNCATED_WRONG_VALUE: "Uno de los datos tiene un formato que la base de datos no acepta.",
      ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: "Uno de los datos tiene un formato que la base de datos no acepta.",
      ER_NO_REFERENCED_ROW_2: "El técnico seleccionado ya no existe o no está disponible.",
      ER_LOCK_DEADLOCK: "La orden está siendo modificada en este momento. Intenta nuevamente.",
      ER_LOCK_WAIT_TIMEOUT: "La orden está tardando en actualizarse. Intenta nuevamente.",
      ER_BAD_NULL_ERROR: "Falta un dato obligatorio para guardar la orden.",
      ER_DUP_ENTRY: "Hay un dato duplicado que impide guardar la orden.",
    };
    const detalle = mensajesError[error.code] ||
      (typeof error.message === "string" ? error.message.replace(/\s+/g, " ").trim().slice(0, 240) : "");
    return res.status(500).json({
      ok: false,
      message: detalle
        ? `No se pudo actualizar la orden. Motivo: ${detalle}`
        : "No se pudo actualizar la orden por un error interno. Intenta nuevamente.",
    });
  } finally {
    connection?.release();
  }
}

app.patch("/api/admin/mantenimientos/:id", requireAdmin, (req, res) =>
  actualizarOrdenServicioAdmin(req, res, "Mantenimiento preventivo"),
);
app.patch("/api/admin/reparaciones/:id", requireAdmin, (req, res) =>
  actualizarOrdenServicioAdmin(req, res, "Reparacion"),
);

app.patch("/api/admin/appointments/:id", requireAdmin, async (req, res) => {
  const appointmentId = Number(req.params.id);
  const equipment = String(req.body?.equipment || "").trim();
  const description = String(req.body?.description || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const appointmentDate = String(req.body?.appointmentDate || "").trim();
  const requestedTechnicianId = req.body?.technicianId;
  const technicianId =
    requestedTechnicianId === null || requestedTechnicianId === ""
      ? null
      : Number(requestedTechnicianId);
  const requestedPrice = req.body?.price;
  const price =
    requestedPrice === null || requestedPrice === ""
      ? null
      : Number(requestedPrice);
  const status = String(req.body?.status || "");
  const dateValue = new Date(`${appointmentDate}T00:00:00Z`);
  const validStatuses = [
    "SOLICITUD RECIBIDA",
    "CONFIRMADA",
    "EN PROCESO",
    "COMPLETADA",
    "CANCELADA",
  ];

  if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({ ok: false, message: "El identificador de la cita no es válido." });
  }

  const validationErrors = {};
  if (equipment.length < 2 || equipment.length > 100) {
    validationErrors.equipment = "El equipo debe tener entre 2 y 100 caracteres.";
  }
  if (description.length < 10 || description.length > 1000) {
    validationErrors.description = "La descripción debe tener entre 10 y 1000 caracteres.";
  }
  if (!/^\d{10}$/.test(phone)) {
    validationErrors.phone = "El teléfono debe contener exactamente 10 dígitos.";
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
    Number.isNaN(dateValue.getTime()) ||
    dateValue.toISOString().slice(0, 10) !== appointmentDate
  ) {
    validationErrors.appointmentDate = "Selecciona una fecha válida para la cita.";
  }
  if (
    technicianId !== null &&
    (!Number.isSafeInteger(technicianId) || technicianId <= 0)
  ) {
    validationErrors.technicianId = "Selecciona un técnico válido o deja la cita sin asignar.";
  }
  if (
    price !== null &&
    (!Number.isFinite(price) || price < 0 || price > 999999999999.99)
  ) {
    validationErrors.price = "El precio debe estar entre 0 y 999.999.999.999,99.";
  }
  if (!validStatuses.includes(status)) {
    validationErrors.status = "Selecciona un estado válido.";
  }
  if (Object.keys(validationErrors).length) {
    return res.status(400).json({
      ok: false,
      message: "Corrige los campos marcados para guardar la cita.",
      errors: validationErrors,
    });
  }

  try {
    const [appointmentRows] = await pool.query(
      "SELECT id_cita FROM cita WHERE id_cita = ?",
      [appointmentId],
    );
    if (!appointmentRows.length) {
      return res.status(404).json({ ok: false, message: "No se encontró la cita solicitada." });
    }

    if (technicianId !== null) {
      const [technicianRows] = await pool.query(
        `SELECT u.id_usuario
         FROM usuario u
         INNER JOIN rol r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Trabajador'
         LIMIT 1`,
        [technicianId],
      );
      if (!technicianRows.length) {
        return res.status(400).json({
          ok: false,
          message: "Corrige el técnico seleccionado para guardar la cita.",
          errors: {
            technicianId: "El técnico seleccionado no está activo o no está registrado.",
          },
        });
      }
    }

    await pool.query(
      `UPDATE cita
       SET equipo = ?, descripcion = ?, telefono = ?, fecha = ?,
           id_tecnico = ?, precio = ?, estado = ?
       WHERE id_cita = ?`,
      [
        equipment,
        description,
        phone,
        appointmentDate,
        technicianId,
        price,
        status,
        appointmentId,
      ],
    );
    return res.json({ ok: true, message: "Cita actualizada correctamente." });
  } catch (error) {
    console.error("Error al editar la cita:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar la cita." });
  }
});

app.patch("/api/admin/appointments/:id/status", requireAdmin, async (req, res) => {
  const appointmentId = Number(req.params.id);
  const status = String(req.body?.status || "");
  const validStatuses = [
    "SOLICITUD RECIBIDA",
    "CONFIRMADA",
    "EN PROCESO",
    "COMPLETADA",
    "CANCELADA",
  ];
  if (
    !Number.isSafeInteger(appointmentId) ||
    appointmentId <= 0 ||
    !validStatuses.includes(status)
  ) {
    return res.status(400).json({ ok: false, message: "El estado solicitado no es válido." });
  }

  try {
    const [appointmentRows] = await pool.query(
      "SELECT id_cita FROM cita WHERE id_cita = ?",
      [appointmentId],
    );
    if (!appointmentRows.length) {
      return res.status(404).json({ ok: false, message: "No se encontró la cita solicitada." });
    }

    await pool.query(
      "UPDATE cita SET estado = ? WHERE id_cita = ?",
      [status, appointmentId],
    );
    return res.json({ ok: true, message: "Estado de la cita actualizado." });
  } catch (error) {
    console.error("Error al actualizar el estado de la cita:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar el estado de la cita." });
  }
});

app.patch("/api/admin/appointments/:id/technician", requireAdmin, async (req, res) => {
  const appointmentId = Number(req.params.id);
  const requestedTechnicianId = req.body?.technicianId;
  const technicianId =
    requestedTechnicianId === null || requestedTechnicianId === ""
      ? null
      : Number(requestedTechnicianId);
  if (
    !Number.isSafeInteger(appointmentId) ||
    appointmentId <= 0 ||
    (technicianId !== null &&
      (!Number.isSafeInteger(technicianId) || technicianId <= 0))
  ) {
    return res.status(400).json({ ok: false, message: "El técnico o la cita no son válidos." });
  }

  try {
    const [appointmentRows] = await pool.query(
      "SELECT id_cita FROM cita WHERE id_cita = ?",
      [appointmentId],
    );
    if (!appointmentRows.length) {
      return res.status(404).json({ ok: false, message: "No se encontró la cita solicitada." });
    }

    if (technicianId !== null) {
      const [technicianRows] = await pool.query(
        `SELECT u.id_usuario
         FROM usuario u
         INNER JOIN rol r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Trabajador'
         LIMIT 1`,
        [technicianId],
      );
      if (!technicianRows.length) {
        return res.status(400).json({
          ok: false,
          message: "Selecciona un técnico activo registrado.",
        });
      }
    }

    await pool.query(
      "UPDATE cita SET id_tecnico = ? WHERE id_cita = ?",
      [technicianId, appointmentId],
    );
    return res.json({ ok: true, message: "Técnico asignado a la cita." });
  } catch (error) {
    console.error("Error al asignar técnico a la cita:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo asignar el técnico a la cita." });
  }
});

// ---------- DESCUENTOS / PROMOCIONES ----------
app.get("/api/promotions", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         CONCAT('PROM-', pr.id_promocion) AS code,
         pr.descripcion AS description,
         ROUND(((p.precio - pr.precio) / NULLIF(p.precio, 0)) * 100) AS percent,
         DATE_FORMAT(pr.fecha_fin, '%Y-%m-%d') AS expires
       FROM promocion pr
       INNER JOIN producto p ON p.id_producto = pr.id_producto
       WHERE pr.estado = 'ACTIVO'
       ORDER BY pr.fecha_fin ASC`
    );
    return res.json({
      ok: true,
      checkoutDiscounts: true,
      promotions: rows || [],
    });
  } catch (error) {
    console.error("Error consultando promociones:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron consultar los descuentos disponibles.",
    });
  }
});

app.post("/api/admin/descuentos", async (req, res) => {
  try {
    const { percent, limit: useLimit, desc } = req.body;
    const percentValue = Number(percent);
    const descriptionValue = String(desc || "").trim();
    const errors = {};

    if (!Number.isInteger(percentValue) || percentValue < 1 || percentValue > 99) {
      errors.percent = "El porcentaje debe ser un entero entre 1 y 99.";
    }
    if (descriptionValue.length < 3 || descriptionValue.length > 150) {
      errors.desc = "La descripción debe tener entre 3 y 150 caracteres.";
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({
        ok: false,
        message: "Revisa los datos obligatorios del descuento.",
        errors,
      });
    }

    // Obtener primer producto activo para asociar la promoción
    const [prodRows] = await pool.query(
      "SELECT id_producto, precio FROM producto WHERE estado = 'ACTIVO' ORDER BY id_producto LIMIT 1",
    );
    if (!prodRows.length) {
      return res.status(400).json({
        ok: false,
        message: "No hay productos activos para asociar el descuento.",
      });
    }

    const productId = prodRows[0].id_producto;
    const originalPrice = Number(prodRows[0].precio);
    const discountedPrice = originalPrice * (1 - percentValue / 100);

    // Obtener admin (encargado)
    const [adminRows] = await pool.query(
      `SELECT u.id_usuario FROM usuario u INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Administrador' AND u.estado = 'ACTIVO' LIMIT 1`,
    );
    const adminId = adminRows.length > 0 ? adminRows[0].id_usuario : 3;

    const now = new Date();
    const fechaFin = new Date(now);
    fechaFin.setMonth(fechaFin.getMonth() + 3);

    const [result] = await pool.query(
      `INSERT INTO promocion (id_producto, id_encargado, precio, descripcion, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        productId,
        adminId,
        discountedPrice,
        descriptionValue.substring(0, 150),
        now,
        fechaFin,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Cupón de descuento creado.",
      discount: {
        code: `PROM-${result.insertId}`,
        desc: descriptionValue,
        percent: `${percentValue}%`,
        expires: `${fechaFin.getDate().toString().padStart(2, "0")}/${(fechaFin.getMonth() + 1).toString().padStart(2, "0")}/${fechaFin.getFullYear()}`,
        uses: `0 / ${useLimit || 100}`,
        status: "Activo",
      },
    });
  } catch (error) {
    console.error("Error al crear descuento:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo crear el descuento." });
  }
});

// ---------- RESEÑAS / SUGERENCIAS ----------

app.post("/api/admin/resenas", async (req, res) => {
  try {
    const clientId = Number(req.body?.clientId);
    const productOrService = String(req.body?.productOrService || "").trim();
    const rating = String(req.body?.rating || "").trim();
    const comment = String(req.body?.comment || "").trim();
    const validRatings = ["5 estrellas", "4 estrellas", "3 estrellas"];
    const errors = {};
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      errors.clientId = "Selecciona un cliente válido.";
    }
    if (productOrService.length < 3 || productOrService.length > 100) {
      errors.productOrService = "El producto o servicio debe tener entre 3 y 100 caracteres.";
    }
    if (!validRatings.includes(rating)) {
      errors.rating = "Selecciona una calificación válida.";
    }
    if (comment.length < 5 || comment.length > 300) {
      errors.comment = "El comentario debe tener entre 5 y 300 caracteres.";
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({
        ok: false,
        message: "Revisa los datos obligatorios de la reseña.",
        errors,
      });
    }

    const [userRows] = await pool.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Cliente'
       LIMIT 1`,
      [clientId],
    );
    if (!userRows.length) {
      return res.status(404).json({
        ok: false,
        message: "El cliente seleccionado no está activo o ya no existe.",
        errors: { clientId: "Selecciona un cliente activo." },
      });
    }
    const mensaje = `[${rating}] ${productOrService}: ${comment}`;

    const [result] = await pool.query(
      `INSERT INTO sugerencia (mensaje, id_usuario, fecha_envio) VALUES (?, ?, NOW())`,
      [mensaje, userRows[0].id_usuario],
    );

    return res.status(201).json({
      ok: true,
      message: "Reseña registrada en la base de datos.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error al crear reseña:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar la reseña." });
  }
});

// ---------- PEDIDOS / VENTAS ----------

app.post("/api/admin/pedidos", requireAdmin, async (req, res) => {
  let connection;
  try {
    const clientId = Number(req.body?.clientId);
    const totalVal = Number(req.body?.total);
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona un cliente válido para el pedido.",
        errors: { clientId: "Selecciona un cliente válido." },
      });
    }
    if (
      !Number.isFinite(totalVal) ||
      totalVal < 1000 ||
      totalVal > 99999999.999999 ||
      totalVal % 500 !== 0
    ) {
      return res.status(400).json({
        ok: false,
        message: "Ingresa un total desde $1.000, en incrementos de $500.",
        errors: { total: "El total debe ser desde $1.000 y avanzar en incrementos de $500." },
      });
    }

    await ensureWarrantyRequestSchema();
    await ensureWarrantyDetailIndexes();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [userRows] = await connection.query(
      `SELECT u.id_usuario
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Cliente'
       LIMIT 1`,
      [clientId],
    );
    if (!userRows.length) {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        message: "El cliente seleccionado no está activo o no existe.",
        errors: { clientId: "Selecciona un cliente activo." },
      });
    }

    const [prodRows] = await connection.query(
      "SELECT id_producto, precio FROM producto WHERE estado = 'ACTIVO' ORDER BY id_producto LIMIT 1"
    );
    if (!prodRows.length) {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        message: "No hay productos activos para registrar el pedido.",
      });
    }

    const [resultVenta] = await connection.query(
      `INSERT INTO venta (id_usuario, id_empleado, id_sucursal, fecha, metodo_pago, tipo_venta, ciudad, direccion_entrega, estado)
       VALUES (?, 5, 1, NOW(), 'EFECTIVO', 'SUCURSAL', 'Sogamoso', 'Tienda WiiU', 'PAGADA')`,
      [clientId]
    );
    const ventaId = resultVenta.insertId;

    const [detailResult] = await connection.query(
      `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas)
       VALUES (?, ?, 1, ?, ?, 'Venta manual desde panel')`,
      [ventaId, prodRows[0].id_producto, totalVal, totalVal]
    );
    await insertAutomaticWarrantyCoverage(connection, detailResult.insertId);
    await connection.commit();

    return res.status(201).json({
      ok: true,
      message: "Pedido registrado en la base de datos.",
      orderId: ventaId,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error revirtiendo pedido manual:", rollbackError.message);
      }
    }
    console.error("Error al crear pedido:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar el pedido." });
  } finally {
    connection?.release();
  }
});

app.patch(
  "/api/admin/garantias/:id/estado",
  requireAdmin,
  async (req, res) => {
    const warrantyId = Number(req.params.id);
    const requestedStatus = String(req.body?.status || "").toUpperCase();
    if (!Number.isInteger(warrantyId) || warrantyId <= 0) {
      return res.status(400).json({ ok: false, message: "ID de garantía inválido." });
    }
    if (!["VIGENTE", "SUSPENDIDA"].includes(requestedStatus)) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona un estado válido para la garantía.",
      });
    }

    try {
      await ensureAutomaticWarrantyCoverage();
      const [warranties] = await pool.query(
        `SELECT estado, DATE(fecha_fin) >= CURRENT_DATE() AS canChangeStatus
         FROM garantia
         WHERE id_garantia = ?`,
        [warrantyId],
      );
      if (!warranties.length) {
        return res.status(404).json({
          ok: false,
          message: "La garantía no existe.",
        });
      }

      const warranty = warranties[0];
      if (Number(warranty.canChangeStatus) !== 1) {
        return res.status(409).json({
          ok: false,
          message: "No se puede cambiar el estado de una garantía vencida.",
        });
      }
      const currentStatus = warranty.estado;
      const isSuspended = ["ANULADA", "SUSPENDIDA"].includes(currentStatus);
      if (
        (requestedStatus === "SUSPENDIDA" && isSuspended) ||
        (requestedStatus === "VIGENTE" && currentStatus === "VIGENTE")
      ) {
        return res.status(409).json({
          ok: false,
          message: "La garantía ya tiene ese estado.",
        });
      }
      if (
        (requestedStatus === "SUSPENDIDA" && currentStatus !== "VIGENTE") ||
        (requestedStatus === "VIGENTE" && !isSuspended)
      ) {
        return res.status(409).json({
          ok: false,
          message: "No se puede realizar ese cambio de estado.",
        });
      }

      const [result] = await pool.query(
        `UPDATE garantia
         SET estado = ?
         WHERE id_garantia = ?
           AND estado = ?
           AND fecha_fin >= CURRENT_DATE()`,
        [requestedStatus, warrantyId, currentStatus],
      );
      if (!result.affectedRows) {
        return res.status(409).json({
          ok: false,
          message: "La garantía cambió de estado. Actualiza la tabla e inténtalo de nuevo.",
        });
      }

      return res.json({
        ok: true,
        message: requestedStatus === "SUSPENDIDA"
          ? "Cobertura suspendida. El registro de garantía se conservó."
          : "Cobertura reactivada correctamente.",
      });
    } catch (error) {
      console.error("Error actualizando estado de garantía:", error.message);
      return res.status(500).json({
        ok: false,
        message: "No se pudo actualizar el estado de la garantía.",
      });
    }
  },
);

// ---------- ELIMINACIONES GENÉRICAS DEL PANEL ----------

app.delete("/api/admin/backups/:filename", requireAdmin, async (req, res) => {
  const filename = req.params.filename;
  if (!isSafeBackupFilename(filename)) {
    return res.status(400).json({ ok: false, message: "Nombre de respaldo inválido." });
  }
  try {
    await ensureBackupTable();
    let deletedLocally = false;
    try {
      await fs.unlink(path.join(BACKUP_DIR, filename));
      deletedLocally = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const [result] = await pool.query(
      `DELETE FROM ${quoteIdentifier(BACKUP_TABLE)} WHERE nombre_archivo = ?`,
      [filename],
    );
    if (!deletedLocally && !result.affectedRows) {
      return res.status(404).json({ ok: false, message: "El respaldo no existe." });
    }
    return res.json({ ok: true, message: "Respaldo eliminado correctamente." });
  } catch (error) {
    console.error("Error eliminando respaldo:", error);
    return res.status(500).json({ ok: false, message: "No se pudo eliminar el respaldo." });
  }
});

app.delete("/api/admin/:recurso/:id", requireAdmin, async (req, res) => {
  const { recurso, id } = req.params;
  try {
    const numId = Number(id);

    if (isNaN(numId)) {
      return res.status(400).json({ ok: false, message: "ID inválido." });
    }
    if (recurso === "pedidos" && (!Number.isSafeInteger(numId) || numId <= 0)) {
      return res.status(400).json({ ok: false, message: "ID de venta inválido." });
    }

    if (recurso === "garantias") {
      return res.status(405).json({
        ok: false,
        message: "Las garantías no se eliminan; suspende la cobertura.",
      });
    } else if (recurso === "mantenimientos" || recurso === "reparaciones") {
      await pool.query("UPDATE servicio SET estado = 'CANCELADO' WHERE id_servicio = ?", [numId]);
    } else if (recurso === "descuentos") {
      await pool.query("UPDATE promocion SET estado = 'INACTIVO' WHERE id_promocion = ?", [numId]);
    } else if (recurso === "clientes") {
      if (numId === req.userId) {
        return res.status(409).json({ ok: false, message: "No puedes suspender tu propia cuenta." });
      }
      const [userRows] = await pool.query(
        "SELECT id_usuario FROM usuario WHERE id_usuario = ?",
        [numId],
      );
      if (!userRows.length) {
        return res.status(404).json({ ok: false, message: "El usuario no existe." });
      }
      await pool.query("UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = ?", [numId]);
      invalidarSesionesUsuario(numId);
    } else if (recurso === "pedidos") {
      const [saleRows] = await pool.query(
        "SELECT estado FROM venta WHERE id_venta = ? LIMIT 1",
        [numId],
      );
      if (!saleRows.length) {
        return res.status(404).json({ ok: false, message: "No se encontró la venta solicitada." });
      }
      if (saleRows[0].estado === "ANULADA") {
        return res.status(409).json({ ok: false, message: "La venta ya está anulada." });
      }
      await pool.query("UPDATE venta SET estado = 'ANULADA' WHERE id_venta = ?", [numId]);
    } else if (recurso === "resenas") {
      await pool.query("DELETE FROM sugerencia WHERE id_sugerencia = ?", [numId]);
    } else if (recurso === "productos") {
      await pool.query("UPDATE producto SET estado = 'INACTIVO' WHERE id_producto = ?", [numId]);
    }

    return res.json({
      ok: true,
      message: recurso === "clientes"
        ? "Usuario suspendido correctamente."
        : recurso === "pedidos"
          ? "Venta anulada correctamente."
          : "Registro eliminado de la base de datos.",
    });
  } catch (error) {
    console.error("Error al eliminar registro:", error.message);
    return res.status(500).json({
      ok: false,
      message: recurso === "pedidos"
        ? "No se pudo anular la venta."
        : "No se pudo eliminar el registro.",
    });
  }
});

// Helper to get user role
function obtenerRol(userId) {
  return pool.query(
    `SELECT r.nombre_rol
     FROM usuario u
     INNER JOIN rol r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.estado = 'ACTIVO'`,
    [userId]
  );
}

async function requireEmployee(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({
      ok: false,
      message: "La sesión del empleado no es válida o venció.",
    });
  }

  try {
    const [rows] = await obtenerRol(session.userId);
    if (rows[0]?.nombre_rol !== "Trabajador") {
      return res.status(403).json({
        ok: false,
        message: "Esta operación está disponible solo para empleados.",
      });
    }

    req.userId = session.userId;
    req.sessionToken = token;
    req.userRol = "Trabajador";
    return next();
  } catch (error) {
    console.error("Error verificando rol de empleado:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo verificar el acceso del empleado.",
    });
  }
}

app.get("/api/admin/backups", requireAdmin, async (req, res) => {
  try {
    await ensureBackupDir();
    await ensureBackupTable();
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    const backupsByName = new Map();
    const [databaseRows] = await pool.query(
      `SELECT id_backup, nombre_archivo, peso, fecha_creacion,
              contenido IS NOT NULL AS has_content
       FROM ${quoteIdentifier(BACKUP_TABLE)}
       ORDER BY id_backup DESC`,
    );
    for (const row of databaseRows) {
      if (!isSafeBackupFilename(row.nombre_archivo) || backupsByName.has(row.nombre_archivo)) continue;
      const createdAt = new Date(row.fecha_creacion);
      backupsByName.set(row.nombre_archivo, {
        id: row.id_backup,
        filename: row.nombre_archivo,
        size: Number(row.peso),
        createdAt: Number.isNaN(createdAt.getTime())
          ? String(row.fecha_creacion || "")
          : createdAt.toISOString(),
        storedLocally: false,
        storedInDatabase: Boolean(row.has_content),
      });
    }

    for (const entry of entries) {
      if (!entry.isFile() || !isSafeBackupFilename(entry.name)) continue;
      const filePath = path.join(BACKUP_DIR, entry.name);
      const stats = await fs.stat(filePath);
      let backupRecord = backupsByName.get(entry.name);
      if (!backupRecord || !backupRecord.storedInDatabase) {
        const content = await fs.readFile(filePath, "utf8");
        let backupCreatedAt = stats.birthtime.toISOString();
        let validBackup = false;
        try {
          const parsedBackup = JSON.parse(content, deserializeBackupValue);
          validateBackup(parsedBackup);
          if (
            typeof parsedBackup.createdAt === "string" &&
            !Number.isNaN(new Date(parsedBackup.createdAt).getTime())
          ) {
            backupCreatedAt = parsedBackup.createdAt;
          }
          validBackup = true;
        } catch (validationError) {
          if (!(validationError instanceof SyntaxError) && validationError.statusCode !== 400) {
            throw validationError;
          }
          console.warn("No se pudo sincronizar un respaldo local con MySQL:", entry.name, validationError.message);
        }

        if (validBackup) {
          const createdAtSql = new Date(backupCreatedAt).toISOString().slice(0, 19).replace("T", " ");
          if (backupRecord) {
            await pool.query(
              `UPDATE ${quoteIdentifier(BACKUP_TABLE)}
               SET ruta_almacenamiento = ?, peso = ?, fecha_creacion = ?,
                   tipo = 'COMPLETO', estado = 'EXITOSO', contenido = ?
               WHERE id_backup = ?`,
              [filePath, stats.size, createdAtSql, content, backupRecord.id],
            );
          } else {
            const [result] = await pool.query(
              `INSERT INTO ${quoteIdentifier(BACKUP_TABLE)}
                 (id_encargado, nombre_archivo, ruta_almacenamiento, peso, fecha_creacion, tipo, estado, contenido)
               VALUES (?, ?, ?, ?, ?, 'COMPLETO', 'EXITOSO', ?)`,
              [req.userId, entry.name, filePath, stats.size, createdAtSql, content],
            );
            backupRecord = {
              id: result.insertId,
              filename: entry.name,
              size: stats.size,
              createdAt: backupCreatedAt,
              storedInDatabase: true,
            };
            backupsByName.set(entry.name, backupRecord);
          }
        }
        if (!backupRecord) {
          backupRecord = {
            filename: entry.name,
            size: stats.size,
            createdAt: backupCreatedAt,
            storedInDatabase: false,
          };
          backupsByName.set(entry.name, backupRecord);
        }
        backupRecord.storedInDatabase = validBackup;
        backupRecord.createdAt = backupCreatedAt;
      }
      backupRecord.storedLocally = true;
      backupRecord.size = stats.size;
    }
    const backups = Array.from(backupsByName.values()).filter(
      (backup) => backup.storedInDatabase || backup.storedLocally,
    );
    backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json({ ok: true, backups });
  } catch (error) {
    console.error("Error listando respaldos:", error);
    return res.status(500).json({ ok: false, message: "No se pudieron listar los respaldos." });
  }
});

app.post("/api/admin/backups", requireAdmin, async (req, res) => {
  try {
    const backup = await createConsistentBackup("backup_wiiu", req.userId);
    return res.status(201).json({
      ok: true,
      message: "Copia de seguridad creada correctamente.",
      backup: {
        filename: backup.filename,
        size: backup.size,
        createdAt: backup.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creando respaldo:", error);
    return res.status(500).json({ ok: false, message: "No se pudo crear el respaldo." });
  }
});

app.get("/api/admin/backups/:filename/download", requireAdmin, async (req, res) => {
  const filename = req.params.filename;
  if (!isSafeBackupFilename(filename)) {
    return res.status(400).json({ ok: false, message: "Nombre de respaldo inválido." });
  }
  try {
    const content = await readBackupContent(filename);
    return res.type("application/json").attachment(filename).send(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ ok: false, message: "El respaldo no existe." });
    }
    console.error("Error descargando respaldo:", error);
    return res.status(500).json({ ok: false, message: "No se pudo descargar el respaldo." });
  }
});

app.post("/api/admin/backups/:filename/restore", requireAdmin, async (req, res) => {
  const filename = req.params.filename;
  if (!isSafeBackupFilename(filename)) {
    return res.status(400).json({ ok: false, message: "Nombre de respaldo inválido." });
  }

  let connection;
  let recoveryBackup;
  try {
    const rawBackup = await readBackupContent(filename);
    const backup = JSON.parse(rawBackup, deserializeBackupValue);
    validateBackup(backup);
    recoveryBackup = await createConsistentBackup("backup_pre_restore", req.userId);
    connection = await pool.getConnection();
    try {
      await applyBackup(connection, backup);
    } catch (restoreError) {
      let recovered = false;
      try {
        const recoveryTableNames = new Set(
          recoveryBackup.backup.tables.map((table) => table.name),
        );
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        try {
          for (const table of backup.tables) {
            if (
              table.name !== BACKUP_TABLE &&
              table.name !== LEGACY_BACKUP_TABLE &&
              !recoveryTableNames.has(table.name)
            ) {
              await connection.query(`DROP TABLE IF EXISTS ${quoteIdentifier(table.name)}`);
            }
          }
        } finally {
          await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        }
        await applyBackup(connection, recoveryBackup.backup);
        recovered = true;
      } catch (recoveryError) {
        console.error("Error recuperando la base de datos tras fallar la restauración:", recoveryError);
      }
      const message = recovered
        ? `La restauración falló y se recuperó el estado anterior. El respaldo preventivo quedó guardado como ${recoveryBackup.filename}.`
        : `La restauración falló. El respaldo preventivo quedó guardado como ${recoveryBackup.filename}; la recuperación automática no se completó.`;
      return res.status(500).json({
        ok: false,
        message,
        details: restoreError.message,
        recoveryBackup: recoveryBackup.filename,
        rollbackRestored: recovered,
      });
    }

    return res.json({
      ok: true,
      message: `Copia de seguridad restaurada correctamente. Respaldo preventivo: ${recoveryBackup.filename}.`,
      recoveryBackup: recoveryBackup.filename,
    });
  } catch (error) {
    console.error("Error restaurando respaldo:", error);
    if (error.code === "ENOENT") {
      return res.status(404).json({ ok: false, message: "El respaldo no existe." });
    }
    if (error instanceof SyntaxError) {
      return res.status(400).json({
        ok: false,
        message: "El archivo de respaldo no es válido.",
      });
    }
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode === 400
        ? error.message
        : "No se pudo restaurar el respaldo.",
      details: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Middleware to ensure the user is an administrator
async function requireAdmin(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({
      ok: false,
      message: "La sesión del administrador no es válida o venció.",
    });
  }

  try {
    const [rows] = await obtenerRol(session.userId);
    const rol = rows[0]?.nombre_rol;
    if (rol !== "Administrador") {
      return res.status(403).json({
        ok: false,
        message: "Esta operación está disponible solo para administradores.",
      });
    }

    req.userId = session.userId;
    req.sessionToken = token;
    req.userRol = rol;
    return next();
  } catch (error) {
    console.error("Error verificando rol de administrador:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudo verificar el acceso del administrador.",
    });
  }
}

// Iniciar el servidor después de registrar todas las rutas.
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});