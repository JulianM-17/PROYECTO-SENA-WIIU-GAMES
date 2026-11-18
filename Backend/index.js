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
app.use(express.static(path.join(__dirname, "..", "Frontend")));
app.use(express.static(path.join(__dirname, "..", "Frontend", "Pages")));
app.use("/Administrador", express.static(path.join(__dirname, "..", "Frontend", "Pages", "Administrador")));
app.use(express.static(path.join(__dirname, "..")));
const PORT = process.env.PORT || 3000;
const SESSION_TTL = 8 * 60 * 60 * 1000;
const sessions = new Map();

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

app.get("/api/my-orders", requireUserSession, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         v.id_venta AS id,
         DATE_FORMAT(v.fecha, '%Y-%m-%dT%H:%i:%s') AS createdAt,
         v.metodo_pago AS paymentMethod,
         v.nro_pago AS paymentReference,
         v.numero_guia AS trackingNumber,
         v.estado AS status,
         v.notas AS notes,
         dv.id_detalle_venta AS detailId,
         dv.id_producto AS productId,
         p.nombre AS productName,
         p.imagen_prin AS imageUrl,
         dv.cantidad AS quantity,
         dv.precio_unitario AS unitPrice,
         dv.subtotal AS lineSubtotal
       FROM venta v
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       LEFT JOIN producto p ON p.id_producto = dv.id_producto
       WHERE v.id_usuario = ?
       ORDER BY v.fecha DESC, v.id_venta DESC, dv.id_detalle_venta`,
      [req.userId],
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
          productId: row.productId,
          name: row.productName || "Producto no disponible",
          imageUrl: row.imageUrl,
          quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
      }
    }

    const orders = [...ordersById.values()].map((order) => ({
      ...order,
      subtotal: Number(order.subtotal.toFixed(2)),
      total: order.total ?? Number(order.subtotal.toFixed(2)),
    }));
    return res.json({ ok: true, orders });
  } catch (error) {
    console.error("Error consultando pedidos del cliente:", error.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar tus pedidos.",
    });
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
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO' AND r.nombre_rol = 'Cliente'
       LIMIT 1`,
      [req.userId],
    );
    if (!userRows.length) {
      return res.status(403).json({
        ok: false,
        message: "Solo una cuenta de cliente activa puede agendar citas.",
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
    const [topProductsRows] = await pool.query(
      `SELECT p.nombre, p.imagen_prin AS imagen_url, SUM(dv.cantidad) AS cantidad, SUM(dv.subtotal) AS total
       FROM detalle_venta dv
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       GROUP BY p.id_producto, p.nombre, p.imagen_prin
       ORDER BY cantidad DESC, total DESC
       LIMIT 3`,
    );
    const [salesTrendRows] = await pool.query(
      `SELECT
         DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n.n DAY), '%a') AS day_name,
         COALESCE(SUM(dv.subtotal), 0) AS total
       FROM (
         SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
       ) n
       LEFT JOIN venta v
         ON DATE(v.fecha) = DATE_SUB(CURDATE(), INTERVAL n.n DAY)
        AND v.estado = 'PAGADA'
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       GROUP BY n.n, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n.n DAY), '%a')
       ORDER BY n.n`,
    );
    const [recentOrdersRows] = await pool.query(
      `SELECT v.id_venta, u.nombre, u.apellido, v.fecha, v.estado, COALESCE(SUM(dv.subtotal), 0) AS total
       FROM venta v
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       GROUP BY v.id_venta, u.nombre, u.apellido, v.fecha, v.estado
       ORDER BY v.fecha DESC
       LIMIT 5`,
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
         m.nombre_marca AS publisher
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
       WHERE p.estado = 'ACTIVO'
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
         DATE(v.fecha) AS buyDate,
         DATE(g.fecha_fin) AS expDate,
         CASE WHEN g.estado = 'VIGENTE' THEN 'Activa' ELSE 'En Revisión' END AS status
       FROM garantia g
       INNER JOIN detalle_venta dv ON dv.id_detalle_venta = g.id_detalle_venta
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       ORDER BY g.fecha_fin DESC
       LIMIT 10`,
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

    res.json({
      ok: true,
      summary: {
        productsCount: Number(productsCountRows[0]?.total || 0),
        clientsCount: Number(clientsCountRows[0]?.total || 0),
        ordersCount: Number(ordersCountRows[0]?.total || 0),
        salesTotal: Number(salesTotalRows[0]?.total || 0),
      },
      topProducts: topProductsRows || [],
      salesTrend: (salesTrendRows || []).map((point) => ({
        label: String(point.day_name || "").slice(0, 3),
        value: Number(point.total || 0),
      })),
      recentOrders: recentOrdersRows || [],
      inventory: inventoryRows || [],
      branches: branchRows,
      selectedBranchId,
      clients: clientsRows || [],
      users: usersRows || [],
      roles: roleRows || [],
      currentAdminId: req.userId,
      technicians: technicianRows || [],
      warranties: warrantyRows || [],
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
    const password = String(req.body?.password || "").trim();

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
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [customerRows] = await connection.query(
      `SELECT u.telefono, u.departamento, u.ciudad, u.direccion
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? AND u.estado = 'ACTIVO'
         AND r.nombre_rol = 'Cliente'
       FOR UPDATE`,
      [req.userId],
    );
    if (!customerRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(403).json({
        ok: false,
        message: "Solo una cuenta de cliente activa puede realizar compras.",
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
    const shipping = 25000;
    const taxes = Number((subtotal * 0.19).toFixed(2));
    const total = Number((subtotal + shipping + taxes).toFixed(2));
    const paymentReference = `DEMO-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const notes =
      `Compra web - pago de demostración. Subtotal ${subtotal}; envío ${shipping}; ` +
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
      await connection.query(
        `INSERT INTO detalle_venta
           (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas)
         VALUES (?, ?, ?, ?, ?, 'Compra web de demostración')`,
        [
          saleResult.insertId,
          line.productId,
          line.quantity,
          line.unitPrice,
          line.subtotal,
        ],
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
        totals: { subtotal, shipping, taxes, total },
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
    const branch = await obtenerSucursalEmpleado(req.userId);
    if (!branch) {
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa asignada a este empleado.",
      });
    }

    const [products, clients, warranties, warrantyPurchases, workshopOrders] =
      await Promise.all([
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
             DATE_FORMAT(v.fecha, '%Y-%m-%d') AS buyDate,
             DATE_FORMAT(g.fecha_fin, '%Y-%m-%d') AS expDate,
             CASE
               WHEN g.estado = 'VIGENTE' AND g.fecha_fin >= CURDATE() THEN 'Activa'
               WHEN g.estado = 'ANULADA' THEN 'Anulada'
               ELSE 'Vencida'
             END AS status
           FROM garantia g
           INNER JOIN detalle_venta dv ON dv.id_detalle_venta = g.id_detalle_venta
           INNER JOIN venta v ON v.id_venta = dv.id_venta
           INNER JOIN usuario u ON u.id_usuario = v.id_usuario
           INNER JOIN producto p ON p.id_producto = dv.id_producto
           WHERE v.id_sucursal = ?
           ORDER BY g.fecha_inicio DESC`,
          [branch.id_sucursal],
        ),
        pool.query(
          `SELECT
             dv.id_detalle_venta AS detailId,
             u.id_usuario AS clientId,
             CONCAT(u.nombre, ' ', u.apellido) AS client,
             p.nombre AS product,
             DATE_FORMAT(v.fecha, '%Y-%m-%d') AS buyDate
           FROM detalle_venta dv
           INNER JOIN venta v ON v.id_venta = dv.id_venta
           INNER JOIN usuario u ON u.id_usuario = v.id_usuario
           INNER JOIN producto p ON p.id_producto = dv.id_producto
           LEFT JOIN garantia g ON g.id_detalle_venta = dv.id_detalle_venta
           WHERE v.id_sucursal = ?
             AND v.estado = 'PAGADA'
             AND g.id_garantia IS NULL
           ORDER BY v.fecha DESC`,
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
      warrantyPurchases: warrantyPurchases[0],
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
  const fullName = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const namePattern = /^[\p{L}][\p{L}\s'-]*$/u;
  const nameParts = fullName.split(/\s+/);

  if (
    fullName.length < 3 ||
    fullName.length > 61 ||
    !namePattern.test(fullName) ||
    nameParts.some((part) => part.length > 30)
  ) {
    return res.status(400).json({ ok: false, message: "Ingresa un nombre válido." });
  }
  if (!/^[+\d()\s-]{7,20}$/.test(phone) || !/\d{7,}/.test(phone.replace(/\D/g, ""))) {
    return res.status(400).json({ ok: false, message: "Ingresa un teléfono válido." });
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 120
  ) {
    return res.status(400).json({ ok: false, message: "Ingresa un correo válido." });
  }

  const firstName = nameParts.shift();
  const lastName = nameParts.join(" ") || "Sin apellido";
  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const documentNumber = `CLI${Date.now()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  try {
    const branch = await obtenerSucursalEmpleado(req.userId);
    if (!branch) {
      return res.status(409).json({
        ok: false,
        message: "No hay una sucursal activa asignada a este empleado.",
      });
    }
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

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

    const [result] = await pool.query(
      `INSERT INTO usuario
         (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, departamento,
          ciudad, direccion, correo, contrasena_hash, estado)
       VALUES (?, ?, ?, 'CC', ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        roleRows[0].id_rol,
        firstName,
        lastName,
        documentNumber,
        phone,
        branch.departamento,
        branch.ciudad,
        branch.nombre_suc,
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
      temporaryPassword,
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

app.post("/api/employee/warranties", requireEmployee, async (req, res) => {
  const detailId = Number(req.body?.detailId);
  const durationMonths = Number(req.body?.durationMonths);
  if (
    !Number.isSafeInteger(detailId) ||
    detailId <= 0 ||
    ![3, 6, 12, 24].includes(durationMonths)
  ) {
    return res.status(400).json({ ok: false, message: "La compra o duración de garantía no es válida." });
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

    const [purchaseRows] = await connection.query(
      `SELECT
         dv.id_detalle_venta AS detailId,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         p.nombre AS product,
         DATE_FORMAT(v.fecha, '%Y-%m-%d') AS buyDate
       FROM detalle_venta dv
       INNER JOIN venta v ON v.id_venta = dv.id_venta
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       WHERE dv.id_detalle_venta = ?
         AND v.id_sucursal = ?
         AND v.estado = 'PAGADA'
       FOR UPDATE`,
      [detailId, branch.id_sucursal],
    );
    if (!purchaseRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(404).json({
        ok: false,
        message: "No se encontró una compra válida en esta sucursal.",
      });
    }

    const [existingRows] = await connection.query(
      "SELECT id_garantia FROM garantia WHERE id_detalle_venta = ? LIMIT 1",
      [detailId],
    );
    if (existingRows.length) {
      await revertirTransaccionEmpleado(connection);
      return res.status(409).json({
        ok: false,
        message: "Esta compra ya tiene una garantía registrada.",
      });
    }

    const buyDate = purchaseRows[0].buyDate;
    const endDate = new Date(`${buyDate}T00:00:00`);
    const dayOfMonth = endDate.getDate();
    endDate.setDate(1);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    const lastDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      0,
    ).getDate();
    endDate.setDate(Math.min(dayOfMonth, lastDay));
    const expDate = [
      endDate.getFullYear(),
      String(endDate.getMonth() + 1).padStart(2, "0"),
      String(endDate.getDate()).padStart(2, "0"),
    ].join("-");

    const [result] = await connection.query(
      `INSERT INTO garantia (id_detalle_venta, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, 'VIGENTE')`,
      [detailId, `${buyDate} 00:00:00`, `${expDate} 00:00:00`],
    );
    await connection.commit();

    return res.status(201).json({
      ok: true,
      message: "Garantía registrada.",
      warranty: {
        id: result.insertId,
        ...purchaseRows[0],
        expDate,
        status: "Activa",
      },
    });
  } catch (error) {
    if (connection) await revertirTransaccionEmpleado(connection);
    console.error("Error registrando garantía desde panel de empleado:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar la garantía." });
  } finally {
    connection?.release();
  }
});

app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const [sales] = await pool.query(
      `SELECT
         v.id_venta AS id,
         CONCAT(u.nombre, ' ', u.apellido) AS client,
         v.estado AS status,
         DATE_FORMAT(v.fecha, '%Y-%m-%d %H:%i:%s') AS createdAt,
         COALESCE(SUM(dv.subtotal), 0) AS total
       FROM (
         SELECT id_venta, id_usuario, estado, fecha
         FROM venta
         ORDER BY fecha DESC, id_venta DESC
         LIMIT 50
       ) v
       INNER JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       GROUP BY v.id_venta, u.nombre, u.apellido, v.estado, v.fecha
       ORDER BY v.fecha DESC, v.id_venta DESC
       LIMIT 10`,
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
       ORDER BY c.fecha_creacion DESC, c.id_cita DESC
       LIMIT 50`,
    );
    return res.json({ ok: true, sales, appointments });
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
    !Number.isFinite(cost) ||
    cost <= 0
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
    PENDIENTE: "Pendiente",
    "EN PROCESO": "En proceso",
    COMPLETO: "Completado",
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
    const [result] = await connection.query(
      `UPDATE servicio
       SET estado = ?
       WHERE id_servicio = ? AND id_encargado = ? AND estado <> 'CANCELADO'`,
      [requestedStatus, serviceId, req.userId],
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
      await connection.query(
        `INSERT INTO detalle_venta
           (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas)
         VALUES (?, ?, ?, ?, ?, 'Venta desde POS de empleado')`,
        [
          saleResult.insertId,
          line.productId,
          line.quantity,
          line.unitPrice,
          line.subtotal,
        ],
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
      });
    }

    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre de producto inválido." });
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ ok: false, message: "Precio inválido." });
    }
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ ok: false, message: "Stock inválido." });
    }

    // Buscar o crear marca
    const publisherName = String(publisher || "General").trim();
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
    const categoryName = String(category || "General").trim();
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
        String(name).trim().substring(0, 100),
        String(imageUrl || "../Assets/lenovolegion.webp").trim().substring(0, 255),
        String(imageUrl2 || "").trim().substring(0, 255) || null,
        String(imageUrl3 || "").trim().substring(0, 255) || null,
        String(imageUrl4 || "").trim().substring(0, 255) || null,
        String(description || "").trim().substring(0, 100),
        Number(price),
      ],
    );

    const productId = insertProduct.insertId;

    // Agregar el stock inicial a la sucursal seleccionada.
    const stockVal = Math.max(0, Math.floor(Number(stock) || 0));
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
      });
    }

    if (!Number.isSafeInteger(productId) || productId < 1) {
      return res.status(400).json({ ok: false, message: "Producto inválido." });
    }
    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre de producto inválido." });
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ ok: false, message: "Precio inválido." });
    }
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ ok: false, message: "Stock inválido." });
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
      String(name).trim().substring(0, 100),
      Number(price),
      String(description || "").trim().substring(0, 100),
    ];
    const imageFields = [
      ["imageUrl", "imagen_prin"],
      ["imageUrl2", "imagen_2"],
      ["imageUrl3", "imagen_3"],
      ["imageUrl4", "imagen_4"],
    ];
    imageFields.forEach(([bodyField, column]) => {
      if (!Object.prototype.hasOwnProperty.call(req.body, bodyField)) return;
      const imagePath = String(req.body[bodyField] || "").trim().substring(0, 255);
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
    const stockVal = Number(stock);
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
    const departamento = String(req.body?.departamento || "").trim();
    const ciudad = String(req.body?.ciudad || "").trim();
    const nacimiento = String(req.body?.nacimiento || "").trim();

    if (!nombre || !apellido || !email || !password) {
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

    const [roleRows] = await pool.query(
      "SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente' AND estado = 'ACTIVO' LIMIT 1",
    );
    if (!roleRows.length) {
      return res.status(500).json({ ok: false, message: "No se encontró el rol de cliente." });
    }

    // Generar documento (ID) único
    const numDoc = `CLI${Date.now().toString().slice(-8)}`;
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO usuario (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, telefono_secundario, departamento, ciudad, direccion, fecha_nacimiento, correo, contrasena_hash, estado)
       VALUES (?, ?, ?, 'CC', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        roleRows[0].id_rol,
        nombre,
        apellido,
        numDoc,
        telefono.substring(0, 20),
        telefonoSecundario.substring(0, 20) || null,
        departamento,
        ciudad,
        direccion,
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
    const { name, phone, email } = req.body;
    const fullName = String(name || "").trim();
    const parts = fullName.split(/\s+/);
    const nombre = parts[0] || "Cliente";
    const apellido = parts.slice(1).join(" ") || "Nuevo";
    const correo = String(email || "").trim().toLowerCase();
    const telefono = String(phone || "").trim();

    if (fullName.length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre inválido." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ ok: false, message: "Correo inválido." });
    }
    if (!/^[0-9\+\-\s\(\)]{7,20}$/.test(telefono)) {
      return res.status(400).json({ ok: false, message: "Teléfono inválido." });
    }

    // Rol 1 = Cliente
    const numDoc = `CLI${Date.now().toString().slice(-8)}`;
    const defaultPassword = "Cliente123";

    const [result] = await pool.query(
      `INSERT INTO usuario (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, departamento, correo, contrasena_hash, estado)
       VALUES (1, ?, ?, 'CC', ?, ?, 'Cundinamarca', ?, ?, 'ACTIVO')`,
      [nombre.substring(0, 30), apellido.substring(0, 30), numDoc, telefono.substring(0, 20), correo.substring(0, 120), defaultPassword],
    );

    return res.status(201).json({
      ok: true,
      message: "Cliente registrado exitosamente.",
      clientId: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, message: "El correo o documento ya está registrado." });
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
    return res.status(400).json({ ok: false, message: "Ingresa un nombre y apellido válidos." });
  }
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    return res.status(400).json({ ok: false, message: "Teléfono inválido." });
  }
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Correo inválido." });
  }
  if (!department || department.length > 30 || city.length > 30 || address.length > 40) {
    return res.status(400).json({ ok: false, message: "Revisa los datos de ubicación del usuario." });
  }
  if (!Number.isSafeInteger(roleId) || roleId < 1) {
    return res.status(400).json({ ok: false, message: "Selecciona un rol válido." });
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
      return res.status(400).json({ ok: false, message: "El rol seleccionado no está disponible." });
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
      return res.status(409).json({ ok: false, message: "El correo ya está registrado por otro usuario." });
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

app.post("/api/admin/garantias", async (req, res) => {
  try {
    const { client, product, buyDate, duration } = req.body;

    if (!client || String(client).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Cliente inválido." });
    }
    if (!product || String(product).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Producto inválido." });
    }

    // Calcular fecha fin según duración
    const fechaInicio = buyDate ? new Date(buyDate) : new Date();
    const fechaFin = new Date(fechaInicio);
    const dur = String(duration || "3 Meses");
    if (dur.includes("1 Mes")) fechaFin.setMonth(fechaFin.getMonth() + 1);
    else if (dur.includes("6 Meses")) fechaFin.setMonth(fechaFin.getMonth() + 6);
    else if (dur.includes("1 Año") || dur.includes("12")) fechaFin.setFullYear(fechaFin.getFullYear() + 1);
    else fechaFin.setMonth(fechaFin.getMonth() + 3);

    // Buscar detalle_venta más reciente del producto para asociar la garantía
    const [dvRows] = await pool.query(
      `SELECT dv.id_detalle_venta
       FROM detalle_venta dv
       INNER JOIN producto p ON p.id_producto = dv.id_producto
       WHERE p.nombre LIKE CONCAT('%', ?, '%')
       ORDER BY dv.id_detalle_venta DESC
       LIMIT 1`,
      [String(product).trim().substring(0, 50)],
    );

    let garantiaId;
    if (dvRows.length > 0) {
      const [result] = await pool.query(
        `INSERT INTO garantia (id_detalle_venta, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, ?, 'VIGENTE')`,
        [dvRows[0].id_detalle_venta, fechaInicio, fechaFin],
      );
      garantiaId = result.insertId;
    } else {
      // Sin detalle_venta asociable – retornar garantía "virtual" solo en frontend
      garantiaId = null;
    }

    return res.status(201).json({
      ok: true,
      message: garantiaId
        ? "Garantía registrada en la base de datos."
        : "Garantía registrada (sin venta asociada en BD).",
      garantiaId,
      warranty: {
        id: garantiaId ? `GAR-${garantiaId}` : `GAR-${Date.now().toString().slice(-4)}`,
        client: String(client).trim(),
        product: String(product).trim(),
        buyDate: fechaInicio.toISOString().split("T")[0],
        expDate: fechaFin.toISOString().split("T")[0],
        status: "Activa",
      },
    });
  } catch (error) {
    console.error("Error al crear garantía:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar la garantía." });
  }
});

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

  if (
    equipment.length < 3 ||
    equipment.length > 100 ||
    !validEquipmentTypes.includes(equipmentType) ||
    brand.length < 1 ||
    brand.length > 20 ||
    serialNumber.length > 40 ||
    serviceDescription.length < 3 ||
    serviceDescription.length > 100 ||
    diagnosis.length > 100 ||
    !Number.isSafeInteger(clientId) ||
    clientId <= 0 ||
    !Number.isSafeInteger(technicianId) ||
    technicianId <= 0 ||
    !Number.isSafeInteger(cost) ||
    cost <= 0 ||
    cost > 99999999
  ) {
    return res.status(400).json({
      ok: false,
      message: "Revisa los datos del equipo, cliente, técnico, detalle y presupuesto.",
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
      return res.status(404).json({ ok: false, message: "No se encontró el cliente seleccionado." });
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
      return res.status(404).json({ ok: false, message: "No se encontró el técnico seleccionado." });
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
        return res.status(409).json({ ok: false, message: "El número de serie pertenece a otro cliente." });
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
        return res.status(409).json({ ok: false, message: "No hay una sucursal activa para registrar el equipo." });
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

app.post("/api/admin/descuentos", async (req, res) => {
  try {
    const { code, percent, limit: useLimit, desc } = req.body;

    if (!code || String(code).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Código de cupón inválido." });
    }
    const percentVal = parseInt(percent);
    if (isNaN(percentVal) || percentVal < 1 || percentVal > 100) {
      return res.status(400).json({ ok: false, message: "Porcentaje inválido." });
    }

    // Obtener primer producto activo para asociar la promoción
    const [prodRows] = await pool.query(
      "SELECT id_producto, precio FROM producto WHERE estado = 'ACTIVO' ORDER BY id_producto LIMIT 1",
    );
    if (!prodRows.length) {
      return res.status(400).json({ ok: false, message: "No hay productos activos para asociar." });
    }

    const productId = prodRows[0].id_producto;
    const originalPrice = Number(prodRows[0].precio);
    const discountedPrice = originalPrice * (1 - percentVal / 100);

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
        String(desc || `Cupón ${code}`).trim().substring(0, 150),
        now,
        fechaFin,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Cupón de descuento creado.",
      discount: {
        code: String(code).toUpperCase().trim(),
        desc: String(desc || `Cupón ${code}`).trim(),
        percent: `${percentVal}%`,
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
    const { client, comment } = req.body;
    const clientName = String(client || "Cliente").trim();
    const mensaje = String(comment || "Excelente servicio").trim();

    const [userRows] = await pool.query(
      `SELECT id_usuario FROM usuario WHERE CONCAT(nombre, ' ', apellido) LIKE CONCAT('%', ?, '%') AND estado = 'ACTIVO' LIMIT 1`,
      [clientName]
    );
    const userId = userRows.length > 0 ? userRows[0].id_usuario : 1;

    const [result] = await pool.query(
      `INSERT INTO sugerencia (mensaje, id_usuario, fecha_envio) VALUES (?, ?, NOW())`,
      [mensaje, userId]
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

app.post("/api/admin/pedidos", async (req, res) => {
  try {
    const { client, total } = req.body;
    const clientName = String(client || "Cliente").trim();
    const totalVal = Number(total || 0);

    const [userRows] = await pool.query(
      `SELECT id_usuario FROM usuario WHERE CONCAT(nombre, ' ', apellido) LIKE CONCAT('%', ?, '%') AND estado = 'ACTIVO' LIMIT 1`,
      [clientName]
    );
    const userId = userRows.length > 0 ? userRows[0].id_usuario : 1;

    // Crear venta
    const [resultVenta] = await pool.query(
      `INSERT INTO venta (id_usuario, id_empleado, id_sucursal, fecha, metodo_pago, tipo_venta, ciudad, direccion_entrega, estado)
       VALUES (?, 5, 1, NOW(), 'EFECTIVO', 'SUCURSAL', 'Sogamoso', 'Tienda WiiU', 'PAGADA')`,
      [userId]
    );
    const ventaId = resultVenta.insertId;

    // Asociar a un detalle de venta para que sume a ventas
    const [prodRows] = await pool.query(
      "SELECT id_producto, precio FROM producto WHERE estado = 'ACTIVO' ORDER BY id_producto LIMIT 1"
    );
    if (prodRows.length > 0) {
      await pool.query(
        `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas)
         VALUES (?, ?, 1, ?, ?, 'Venta manual desde panel')`,
        [ventaId, prodRows[0].id_producto, totalVal, totalVal]
      );
    }

    return res.status(201).json({
      ok: true,
      message: "Pedido registrado en la base de datos.",
      orderId: ventaId,
    });
  } catch (error) {
    console.error("Error al crear pedido:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar el pedido." });
  }
});

// ---------- ELIMINACIONES GENÉRICAS DEL PANEL ----------

app.delete("/api/admin/:recurso/:id", requireAdmin, async (req, res) => {
  try {
    const { recurso, id } = req.params;
    const numId = Number(id);

    if (isNaN(numId)) {
      return res.status(400).json({ ok: false, message: "ID inválido." });
    }

    if (recurso === "garantias") {
      await pool.query("UPDATE garantia SET estado = 'ANULADA' WHERE id_garantia = ?", [numId]);
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
        : "Registro eliminado de la base de datos.",
    });
  } catch (error) {
    console.error("Error al eliminar registro:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo eliminar el registro." });
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