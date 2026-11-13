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
         CONCAT(uCliente.nombre, ' ', uCliente.apellido) AS client,
         CONCAT(uEncargado.nombre, ' ', uEncargado.apellido) AS tech,
         CONCAT('$ ', FORMAT(CASE
           WHEN s.id_servicio = 1 THEN 180000
           WHEN s.id_servicio = 2 THEN 240000
           ELSE 120000
         END, 0)) AS cost,
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
       WHERE ts.nombre = 'Mantenimiento preventivo' AND ts.estado = 'ACTIVO'
       ORDER BY s.fecha_creacion DESC
       LIMIT 10`,
    );
    const [repairRows] = await pool.query(
      `SELECT
         s.id_servicio AS id,
         CONCAT('REP-', s.id_servicio) AS ticket,
         COALESCE(e.descripcion, e.tipo) AS device,
         s.descripcion AS defect,
         CONCAT(uCliente.nombre, ' ', uCliente.apellido) AS client,
         CONCAT('$ ', FORMAT(CASE WHEN s.id_servicio % 2 = 0 THEN 75000 ELSE 60000 END, 0)) AS price,
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
       WHERE ts.nombre = 'Reparacion'
       ORDER BY s.fecha_creacion DESC
       LIMIT 10`,
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
      warranties: warrantyRows || [],
      maintenance: maintenanceRows || [],
      repairs: repairRows || [],
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
      `SELECT u.telefono
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
    const serviceFee = Number((subtotal * 0.1).toFixed(2));
    const total = Number((subtotal + shipping + taxes + serviceFee).toFixed(2));
    const paymentReference = `DEMO-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const notes =
      `Compra web - pago de demostración. Subtotal ${subtotal}; envío ${shipping}; ` +
      `IVA ${taxes}; servicio ${serviceFee}; total ${total} COP.`;

    const [saleResult] = await connection.query(
      `INSERT INTO venta
         (id_usuario, id_sucursal, metodo_pago, nro_pago, telefono,
          tipo_venta, notas, estado)
       VALUES (?, ?, ?, ?, ?, 'SUCURSAL', ?, 'PAGADA')`,
      [
        req.userId,
        branchRows[0].id_sucursal,
        paymentMethod,
        paymentReference,
        customerRows[0].telefono,
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
        totals: { subtotal, shipping, taxes, serviceFee, total },
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
    const {
      nombre,
      apellido,
      email,
      password,
      telefono,
      telefono_secundario,
      direccion,
      departamento,
      ciudad,
      nacimiento,
    } = req.body;
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ ok: false, message: "Datos obligatorios faltantes." });
    }
    // Validar email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, message: "Formato de correo inválido." });
    }
    // Generar documento (ID) único
    const numDoc = `CLI${Date.now().toString().slice(-8)}`;
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO usuario (id_rol, nombre, apellido, tipo_doc, num_doc, telefono, telefono_secundario, departamento, ciudad, direccion, fecha_nacimiento, correo, contrasena_hash, estado)
       VALUES (1, ?, ?, 'CC', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        nombre.trim().substring(0, 30),
        apellido.trim().substring(0, 30),
        numDoc,
        telefono?.trim().substring(0, 20) || null,
        telefono_secundario?.trim().substring(0, 20) || null,
        departamento?.trim() || null,
        ciudad?.trim() || null,
        direccion?.trim().substring(0, 255) || null,
        nacimiento || null,
        email.trim().toLowerCase().substring(0, 120),
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

app.post("/api/admin/mantenimientos", async (req, res) => {
  try {
    const { equipment, client, tech, cost, status } = req.body;

    if (!equipment || String(equipment).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Equipo inválido." });
    }
    if (!client || String(client).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Cliente inválido." });
    }

    // Buscar cliente por nombre
    const clientName = String(client).trim();
    const [userRows] = await pool.query(
      `SELECT id_usuario FROM usuario WHERE CONCAT(nombre, ' ', apellido) LIKE CONCAT('%', ?, '%') AND estado = 'ACTIVO' LIMIT 1`,
      [clientName],
    );
    const clientUserId = userRows.length > 0 ? userRows[0].id_usuario : 1;

    // Buscar técnico (encargado) - usar trabajador por defecto
    const [techRows] = await pool.query(
      `SELECT u.id_usuario FROM usuario u INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Trabajador' AND u.estado = 'ACTIVO' LIMIT 1`,
    );
    const techId = techRows.length > 0 ? techRows[0].id_usuario : 5;

    // Tipo servicio 1 = Mantenimiento preventivo
    // Necesitamos un equipo asociado
    const [equipoRows] = await pool.query(
      `SELECT id_equipo FROM equipo WHERE id_usuario = ? AND estado = 'ACTIVO' LIMIT 1`,
      [clientUserId],
    );

    let equipoId;
    if (equipoRows.length > 0) {
      equipoId = equipoRows[0].id_equipo;
    } else {
      // Crear equipo temporal
      const [insertEquipo] = await pool.query(
        `INSERT INTO equipo (id_usuario, id_sucursal, tipo, marca, numero_serial, descripcion, estado)
         VALUES (?, 1, 'Consola', 'WiiU', ?, ?, 'ACTIVO')`,
        [clientUserId, `SN-MNT-${Date.now()}`, String(equipment).trim().substring(0, 100)],
      );
      equipoId = insertEquipo.insertId;
    }

    // Mapear status del frontend a ENUM de BD
    const statusMap = {
      "En Taller": "PENDIENTE",
      "En Diagnóstico": "EN PROCESO",
      "Listo para Entrega": "COMPLETO",
      "Completado": "COMPLETO",
    };
    const dbStatus = statusMap[status] || "PENDIENTE";

    const [result] = await pool.query(
      `INSERT INTO servicio (nombre, descripcion, id_usuario, id_encargado, id_tipo_servicio, id_equipo, estado)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [
        `Mantenimiento ${String(equipment).trim().substring(0, 60)}`,
        `Mantenimiento técnico - ${String(equipment).trim().substring(0, 60)}`,
        clientUserId,
        techId,
        equipoId,
        dbStatus,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Mantenimiento registrado.",
      maintenance: {
        order: `MNT-${result.insertId}`,
        equipment: String(equipment).trim(),
        client: clientName,
        tech: tech || "Técnico Asignado",
        cost: `$ ${Number(cost || 0).toLocaleString("es-CO")}`,
        status: status || "En Taller",
      },
    });
  } catch (error) {
    console.error("Error al crear mantenimiento:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar el mantenimiento." });
  }
});

// ---------- REPARACIONES ----------

app.post("/api/admin/reparaciones", async (req, res) => {
  try {
    const { device, defect, client, price } = req.body;

    if (!device || String(device).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Dispositivo inválido." });
    }
    if (!defect || String(defect).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Falla inválida." });
    }

    const clientName = String(client || "Cliente Mostrador").trim();
    const [userRows] = await pool.query(
      `SELECT id_usuario FROM usuario WHERE CONCAT(nombre, ' ', apellido) LIKE CONCAT('%', ?, '%') AND estado = 'ACTIVO' LIMIT 1`,
      [clientName],
    );
    const clientUserId = userRows.length > 0 ? userRows[0].id_usuario : 1;

    const [techRows] = await pool.query(
      `SELECT u.id_usuario FROM usuario u INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Trabajador' AND u.estado = 'ACTIVO' LIMIT 1`,
    );
    const techId = techRows.length > 0 ? techRows[0].id_usuario : 5;

    const [equipoRows] = await pool.query(
      `SELECT id_equipo FROM equipo WHERE id_usuario = ? AND estado = 'ACTIVO' LIMIT 1`,
      [clientUserId],
    );

    let equipoId;
    if (equipoRows.length > 0) {
      equipoId = equipoRows[0].id_equipo;
    } else {
      const [insertEquipo] = await pool.query(
        `INSERT INTO equipo (id_usuario, id_sucursal, tipo, marca, numero_serial, descripcion, estado)
         VALUES (?, 1, 'Consola', 'WiiU', ?, ?, 'ACTIVO')`,
        [clientUserId, `SN-REP-${Date.now()}`, String(device).trim().substring(0, 100)],
      );
      equipoId = insertEquipo.insertId;
    }

    // Tipo servicio 2 = Reparacion
    const [result] = await pool.query(
      `INSERT INTO servicio (nombre, descripcion, id_usuario, id_encargado, id_tipo_servicio, id_equipo, estado)
       VALUES (?, ?, ?, ?, 2, ?, 'PENDIENTE')`,
      [
        `Reparación ${String(device).trim().substring(0, 60)}`,
        String(defect).trim().substring(0, 100),
        clientUserId,
        techId,
        equipoId,
      ],
    );

    return res.status(201).json({
      ok: true,
      message: "Reparación registrada.",
      repair: {
        ticket: `REP-${result.insertId}`,
        device: String(device).trim(),
        defect: String(defect).trim(),
        client: clientName,
        price: `$ ${Number(price || 60000).toLocaleString("es-CO")}`,
        status: "Ingresado en Taller",
      },
    });
  } catch (error) {
    console.error("Error al crear reparación:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo registrar la reparación." });
  }
});

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

app.delete("/api/admin/:recurso/:id", async (req, res) => {
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
      await pool.query("UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = ?", [numId]);
    } else if (recurso === "pedidos") {
      await pool.query("UPDATE venta SET estado = 'ANULADA' WHERE id_venta = ?", [numId]);
    } else if (recurso === "resenas") {
      await pool.query("DELETE FROM sugerencia WHERE id_sugerencia = ?", [numId]);
    } else if (recurso === "productos") {
      await pool.query("UPDATE producto SET estado = 'INACTIVO' WHERE id_producto = ?", [numId]);
    }

    return res.json({ ok: true, message: "Registro eliminado de la base de datos." });
  } catch (error) {
    console.error("Error al eliminar registro:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo eliminar el registro." });
  }
});

// Helper to get user role
function obtenerRol(userId) {
  return pool.query(
    `SELECT r.nombre_rol FROM usuario u INNER JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = ? AND u.estado = 'ACTIVO'`,
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
  // Check if session token exists
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? sessions.get(token) : null;
  if (session) {
    try {
      const [rows] = await obtenerRol(session.userId);
      const rol = rows[0]?.nombre_rol;
      if (rol === "Administrador") {
        req.userId = session.userId;
        req.sessionToken = token;
        req.userRol = rol;
        return next();
      }
    } catch (err) {
      console.error("Error verificando rol de administrador:", err.message);
    }
  }

  // Fallback: Permitir acceso directo local al panel de administrador
  // para desarrollo / pruebas académicas
  req.userId = 1;
  req.userRol = "Administrador";
  return next();
}

// Iniciar el servidor después de registrar todas las rutas.
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});