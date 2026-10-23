const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("./db.js");

const app = express();
app.use(cors());
app.use(express.json());
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

app.get("/api/dashboard/admin", async (req, res) => {
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
    const [inventoryRows] = await pool.query(
      `SELECT
         p.id_producto AS id,
         p.nombre AS name,
         CONCAT('PRD-', p.id_producto) AS sku,
         c.nombre_cat AS category,
         p.precio AS price,
         COALESCE(SUM(i.stock), 0) AS stock,
         3 AS minStock,
         'Nuevo Sellado' AS productCondition,
         '12 Meses' AS warranty,
         p.imagen_prin AS imageUrl,
         p.descripcion AS description,
         'Original' AS platform,
         m.nombre_marca AS publisher
       FROM producto p
       INNER JOIN categoria c ON c.id_categoria = p.id_categoria
       INNER JOIN marca m ON m.id_marca = p.id_marca
       LEFT JOIN inventario i ON i.id_producto = p.id_producto AND i.estado = 'ACTIVO'
       WHERE p.estado = 'ACTIVO'
       GROUP BY p.id_producto, p.nombre, c.nombre_cat, m.nombre_marca, p.precio, p.imagen_prin, p.descripcion
       ORDER BY p.nombre`,
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
         CONCAT('MNT-', s.id_servicio) AS maintenanceOrder,
         COALESCE(e.descripcion, e.tipo) AS equipment,
         CONCAT(uCliente.nombre, ' ', uCliente.apellido) AS client,
         CONCAT(uEncargado.nombre, ' ', uEncargado.apellido) AS tech,
         CONCAT('$ ', FORMAT(CASE
           WHEN s.id_servicio = 1 THEN 180000
           WHEN s.id_servicio = 2 THEN 240000
           ELSE 120000
         END, 0)) AS cost,
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
       WHERE ts.estado = 'ACTIVO'
       ORDER BY s.fecha_creacion DESC
       LIMIT 10`,
    );
    const [repairRows] = await pool.query(
      `SELECT
         CONCAT('REP-', s.id_servicio) AS ticket,
         COALESCE(e.descripcion, e.tipo) AS device,
         s.descripcion AS defect,
         CONCAT(uCliente.nombre, ' ', uCliente.apellido) AS client,
         CONCAT('$ ', FORMAT(CASE WHEN s.id_servicio % 2 = 0 THEN 75000 ELSE 60000 END, 0)) AS price,
         CASE
           WHEN s.estado IN ('PENDIENTE', 'EN PROCESO') THEN 'En Reparación'
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
      clients: clientsRows || [],
      warranties: warrantyRows || [],
      maintenance: maintenanceRows || [],
      repairs: repairRows || [],
      discounts: discountRows || [],
      categories: categoryRows || [],
      brands: brandRows || [],
      reviews: [],
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
    Administrador: "Administrador/index_admin.html",
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

// Obtener productos activos y su stock total en todas las sucursales.
app.get("/api/productos", async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT 
        p.id_producto, 
        p.nombre, 
        p.precio, 
        p.imagen_prin AS imagen_url, -- Cambiado de p.imagen_url a p.imagen_prin
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

// ---------- PRODUCTOS ----------

// Crear producto
app.post("/api/admin/productos", async (req, res) => {
  try {
    const { name, category, publisher, price, stock, imageUrl, description } = req.body;

    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre de producto inválido." });
    }
    if (isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ ok: false, message: "Precio inválido." });
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
      `INSERT INTO producto (id_marca, id_categoria, nombre, imagen_prin, descripcion, precio, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        marcaId,
        catId,
        String(name).trim().substring(0, 100),
        String(imageUrl || "img/productos/default.jpg").trim().substring(0, 255),
        String(description || "").trim().substring(0, 100),
        Number(price),
      ],
    );

    const productId = insertProduct.insertId;

    // Agregar stock al inventario (sucursal 1 por defecto)
    const stockVal = Math.max(0, Math.floor(Number(stock) || 0));
    if (stockVal > 0) {
      await pool.query(
        `INSERT INTO inventario (id_sucursal, id_producto, stock, estado)
         VALUES (1, ?, ?, 'ACTIVO')
         ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)`,
        [productId, stockVal],
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
app.put("/api/admin/productos/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { name, price, stock, imageUrl, description } = req.body;

    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Nombre de producto inválido." });
    }

    await pool.query(
      `UPDATE producto
       SET nombre = ?, precio = ?, imagen_prin = ?, descripcion = ?
       WHERE id_producto = ? AND estado = 'ACTIVO'`,
      [
        String(name).trim().substring(0, 100),
        Number(price) || 0,
        String(imageUrl || "").trim().substring(0, 255),
        String(description || "").trim().substring(0, 100),
        productId,
      ],
    );

    // Actualizar stock en inventario
    const stockVal = Math.max(0, Math.floor(Number(stock) || 0));
    await pool.query(
      `INSERT INTO inventario (id_sucursal, id_producto, stock, estado)
       VALUES (1, ?, ?, 'ACTIVO')
       ON DUPLICATE KEY UPDATE stock = ?`,
      [productId, stockVal, stockVal],
    );

    return res.json({ ok: true, message: "Producto actualizado." });
  } catch (error) {
    console.error("Error al actualizar producto:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar el producto." });
  }
});

// Eliminar producto (soft delete)
app.delete("/api/admin/productos/:id", async (req, res) => {
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

app.post("/api/admin/clientes", async (req, res) => {
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

// Iniciar el servidor después de registrar todas las rutas.
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
