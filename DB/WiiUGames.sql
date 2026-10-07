DROP DATABASE IF EXISTS wiiu_gamesdb;
CREATE DATABASE wiiu_gamesdb;
USE wiiu_gamesdb;

-- --------------Rol-----------------

CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    nombre_rol VARCHAR(20) NOT NULL,
    descripcion_rol VARCHAR(100) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- --------------Usuario-----------------

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_rol INT,
    FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol),
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    tipo_doc ENUM('CC', 'TI', 'PAS', 'NIT') NOT NULL,
    num_doc VARCHAR(20) NOT NULL UNIQUE,
    fecha_nacimiento DATE NULL,
    telefono VARCHAR(20) NOT NULL,
    telefono_secundario VARCHAR(20) NULL,
    departamento VARCHAR(30) NOT NULL,
    ciudad VARCHAR(30) NULL,
    direccion VARCHAR(40) NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------Sucursal-----------------

CREATE TABLE sucursal (
    id_sucursal INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    encargado INT,
    FOREIGN KEY (encargado)
        REFERENCES usuario (id_usuario),
    nombre_suc VARCHAR(30) NOT NULL,
    departamento VARCHAR(30) NOT NULL,
    ciudad VARCHAR(30) NOT NULL,
    direccion VARCHAR(40) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- -------------- Equipo ------------------

CREATE TABLE equipo (
    id_equipo INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal)
        REFERENCES sucursal (id_sucursal),
    tipo ENUM('Portatil', 'Torre', 'Consola', 'Control', 'All in one') NOT NULL,
    marca VARCHAR(20) NOT NULL,
    numero_serial VARCHAR(40) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);


-- --------------Categoria-----------------

CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cat VARCHAR(40) NOT NULL,
    descripcion_cat VARCHAR(100) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- -----------------------------Marca------------------------------

CREATE TABLE marca (
    id_marca INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre_marca VARCHAR(20) NOT NULL,
    descripcion_marca VARCHAR(100) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- ----------------------------Producto-----------------------------

CREATE TABLE producto (
    id_producto INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_marca INT NOT NULL,
    FOREIGN KEY (id_marca)
        REFERENCES marca (id_marca),
    id_categoria INT NOT NULL,
    FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria),
    nombre VARCHAR(100) NOT NULL,
    imagen_url VARCHAR(255) NOT NULL,
    color VARCHAR(15) NULL,
    descripcion VARCHAR(100) NOT NULL,
    precio DECIMAL(14 , 6 ) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- -------------- Servicio -----------------
CREATE TABLE tipo_servicio (
    id_tipo_servicio INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

CREATE TABLE servicio (
    id_servicio INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    id_encargado INT NOT NULL,
    FOREIGN KEY (id_encargado)
        REFERENCES usuario (id_usuario),
    id_tipo_servicio INT NOT NULL,
    FOREIGN KEY (id_tipo_servicio)
        REFERENCES tipo_servicio (id_tipo_servicio),
    id_equipo INT NOT NULL,
    FOREIGN KEY (id_equipo)
        REFERENCES equipo (id_equipo),
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE detalle_servicio (
    id_detalle_servicio INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_servicio INT NOT NULL,
    FOREIGN KEY (id_servicio)
        REFERENCES servicio (id_servicio),
    id_producto INT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
    descripcion VARCHAR(100) NOT NULL,
    estado ENUM('CANCELADO', 'PENDIENTE', 'EN PROCESO', 'COMPLETO') NOT NULL
);

-- ----------------------------------Venta-------------------------------

CREATE TABLE venta (
    id_venta INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    id_empleado INT NULL,
    FOREIGN KEY (id_empleado)
        REFERENCES usuario (id_usuario),
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal)
        REFERENCES sucursal (id_sucursal),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA') NOT NULL,
    nro_pago VARCHAR(255) NOT NULL,
    comprobante MEDIUMBLOB NOT NULL,
    telefono VARCHAR(20) NULL,
    tipo_venta ENUM('DOMICILIO', 'SUCURSAL') NOT NULL DEFAULT 'SUCURSAL',
    ciudad VARCHAR(100) NULL,
    direccion_entrega VARCHAR(180) NULL,
    numero_guia VARCHAR(30) NULL,
    notas VARCHAR(300) NULL,
    estado ENUM('PAGADA', 'ANULADA') NOT NULL DEFAULT 'PAGADA'
);

CREATE TABLE detalle_venta (
    id_detalle_venta INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    FOREIGN KEY (id_venta)
        REFERENCES venta (id_venta),
	id_producto INT NOT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
	cantidad INT NOT NULL,
    precio_unitario DECIMAL(14 , 6 ) NOT NULL,
    subtotal DECIMAL(14 , 6 ) NOT NULL,
    notas VARCHAR(200) NULL
);
-- ----------------------------- Garantia ----------------------------------------

CREATE TABLE garantia (
    id_garantia INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_detalle_venta INT NOT NULL,
    FOREIGN KEY (id_detalle_venta)
        REFERENCES detalle_venta (id_detalle_venta),
	fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('VIGENTE','VENCIDA', 'ANULADA') NOT NULL DEFAULT 'VIGENTE'
);

-- --------------- Compra -------------------------

CREATE TABLE compra (
    id_compra INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_admin INT NOT NULL,
    FOREIGN KEY (id_admin)
        REFERENCES usuario (id_usuario),
    id_proveedor INT NOT NULL,
    FOREIGN KEY (id_proveedor)
        REFERENCES usuario (id_usuario),
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal)
        REFERENCES sucursal (id_sucursal),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA') NOT NULL,
    notas VARCHAR(200) NULL,
    estado ENUM('PAGADA', 'ANULADA') NOT NULL DEFAULT 'PAGADA'
);

CREATE TABLE detalle_compra (
    id_detalle_compra INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    FOREIGN KEY (id_compra)
        REFERENCES compra (id_compra),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14 , 6 ) NOT NULL,
    subtotal DECIMAL(14 , 6 ) NOT NULL
);

-- ---------------------------- Cotizacion -------------------------------

CREATE TABLE cotizacion (
    id_cotizacion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    id_servicio INT NULL,
    FOREIGN KEY (id_servicio)
        REFERENCES servicio (id_servicio),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validez INT NOT NULL DEFAULT 15,
    total DECIMAL(14 , 6 ) NOT NULL,
    estado ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA') NOT NULL
);

CREATE TABLE detalle_cotizacion (
    id_detalle_cotizacion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_cotizacion INT NOT NULL,
    FOREIGN KEY (id_cotizacion)
        REFERENCES cotizacion (id_cotizacion),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14 , 6 ) NOT NULL,
    subtotal DECIMAL(14 , 6 ) NOT NULL
);

-- -----------------------Promociones----------------------------

CREATE TABLE promocion (
    id_promocion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
    id_encargado INT NOT NULL,
    FOREIGN KEY (id_encargado)
        REFERENCES usuario (id_usuario),
    precio DECIMAL(14 , 6 ) NOT NULL,
    descripcion VARCHAR(150) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- ----------------------- inventario --------------------------

CREATE TABLE inventario (
    id_inventario INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal)
        REFERENCES sucursal (id_sucursal),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
    stock INT NOT NULL DEFAULT 0,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    UNIQUE KEY sucursal_producto (id_sucursal , id_producto)
);

-- ---------------------------backups-----------------------------

CREATE TABLE backup (
    id_backup INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_encargado INT NULL,
    FOREIGN KEY (id_encargado)
        REFERENCES usuario (id_usuario),
    nombre_archivo VARCHAR(70) NOT NULL,
    ruta_almacenamiento varchar(255) NOT NULL,
    peso INT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo ENUM ('COMPLETO', 'INCREMENTAL', 'DIFERENCIAL'),
    estado ENUM ('EXITOSO', 'FALLIDO', 'EN PROCESO') NOT NULL
);


-- ---------------- rol ----------------
INSERT INTO rol (nombre_rol, descripcion_rol, estado) VALUES
('Cliente', 'Usuario que compra productos y solicita servicios', 'ACTIVO'),
('Administrador', 'Gestiona todo el sistema', 'ACTIVO'),
('Proveedor', 'Empresa o persona que surte productos', 'ACTIVO'),
('Trabajador', 'Empleado de sucursal: ventas y servicios tecnicos', 'ACTIVO');

-- ---------------- usuario ----------------

INSERT INTO usuario (id_rol, nombre, apellido, tipo_doc, num_doc, fecha_nacimiento, telefono, telefono_secundario, departamento, ciudad, direccion, correo, contrasena_hash, estado) VALUES
(1, 'Carlos', 'Ramirez', 'CC', '1012345678', '1995-03-14', '3101234567', NULL, 'Cundinamarca', 'Bogota', 'Cra 15 # 80-20', 'carlos.ramirez@correo.com', '$2b$10$abcdefghijklmnopqrstuuMDHashEjemplo1111111111111111', 'ACTIVO'),
(1, 'Laura', 'Gomez', 'CC', '1098765432', '1998-07-22', '3209876543', '3151112233', 'Antioquia', 'Medellin', 'Calle 50 # 45-10', 'laura.gomez@correo.com', '$2b$10$abcdefghijklmnopqrstuuMDHashEjemplo2222222222222222', 'ACTIVO'),
(2, 'Andres', 'Torres', 'CC', '80123456', '1988-11-05', '3001112233', NULL, 'Cundinamarca', 'Bogota', 'Av 68 # 22-15', 'andres.torres@correo.com', '$2b$10$abcdefghijklmnopqrstuuMDHashEjemplo3333333333333333', 'ACTIVO');


-- ---------------- sucursal ----------------
INSERT INTO sucursal (encargado, nombre_suc, departamento, ciudad, direccion, telefono, correo, estado) VALUES
(3, 'Sucursal Chapinero', 'Cundinamarca', 'Bogota', 'Cra 13 # 60-25', '6015551001', 'chapinero@tienda.com', 'ACTIVO'),
(5, 'Sucursal Centro', 'Cundinamarca', 'Bogota', 'Calle 19 # 7-30', '6015551002', 'centro@tienda.com', 'ACTIVO'),
(6, 'Sucursal Poblado', 'Antioquia', 'Medellin', 'Cra 43A # 10-50', '6045551003', 'poblado@tienda.com', 'ACTIVO');

-- ---------------- equipo ----------------
INSERT INTO equipo (id_usuario, id_sucursal, tipo, marca, numero_serial, descripcion, estado) VALUES
(1, 1, 'Portatil', 'HP', 'HP-SN-2024-0001', 'Portatil HP 15 con falla en la bateria', 'ACTIVO'),
(2, 3, 'Consola', 'Sony', 'PS5-SN-2023-0456', 'PlayStation 5 que no enciende', 'ACTIVO'),
(1, 2, 'Torre', 'Ensamblado', 'TORRE-SN-0789', 'Torre gamer con sobrecalentamiento', 'ACTIVO');

-- ---------------- categoria ----------------
INSERT INTO categoria (nombre_cat, descripcion_cat, estado) VALUES
('Portatiles', 'Computadores portatiles de todas las gamas', 'ACTIVO'),
('Perifericos', 'Mouse, teclados, audifonos y similares', 'ACTIVO'),
('Almacenamiento', 'Discos duros, SSD y memorias', 'ACTIVO');

-- ---------------- marca ----------------
INSERT INTO marca (nombre_marca, descripcion_marca, estado) VALUES
('Lenovo', 'Computadores y accesorios Lenovo', 'ACTIVO'),
('Logitech', 'Perifericos Logitech', 'ACTIVO'),
('Kingston', 'Memorias y unidades de almacenamiento', 'ACTIVO');

-- ---------------- producto ----------------
INSERT INTO producto (id_marca, id_categoria, nombre, imagen_url, color, descripcion, precio, estado) VALUES
(1, 1, 'Portatil Lenovo IdeaPad 3', 'img/productos/ideapad3.jpg', 'Gris', 'Ryzen 5, 16GB RAM, 512GB SSD, 15.6 pulgadas', 2200000.000000, 'ACTIVO'),
(2, 2, 'Mouse Logitech M185', 'img/productos/m185.jpg', 'Negro', 'Mouse inalambrico con receptor USB', 45000.000000, 'ACTIVO'),
(3, 3, 'SSD Kingston A400 480GB', 'img/productos/a400.jpg', NULL, 'Unidad de estado solido SATA 2.5 pulgadas', 180000.000000, 'ACTIVO');

-- ---------------- tipo_servicio ----------------
INSERT INTO tipo_servicio (nombre, descripcion, estado) VALUES
('Mantenimiento preventivo', 'Limpieza interna y cambio de pasta termica', 'ACTIVO'),
('Reparacion', 'Diagnostico y reparacion de fallas de hardware', 'ACTIVO'),
('Instalacion de software', 'Formateo e instalacion de sistema operativo y programas', 'ACTIVO');

-- ---------------- servicio ----------------
INSERT INTO servicio (nombre, descripcion, id_usuario, id_encargado, id_tipo_servicio, id_equipo, estado) VALUES
('Cambio de bateria portatil HP', 'Reemplazo de bateria defectuosa', 1, 5, 2, 1, 'ACTIVO'),
('Revision consola PS5', 'Diagnostico de falla de encendido', 2, 6, 2, 2, 'ACTIVO'),
('Mantenimiento torre gamer', 'Limpieza y cambio de pasta termica', 1, 5, 1, 3, 'ACTIVO');

-- ---------------- detalle_servicio ----------------
INSERT INTO detalle_servicio (id_servicio, id_producto, descripcion, estado) VALUES
(1, NULL, 'Diagnostico inicial de la bateria', 'COMPLETO'),
(2, NULL, 'Revision de fuente de poder y puerto HDMI', 'EN PROCESO'),
(3, 3, 'Se instala SSD adicional durante el mantenimiento', 'PENDIENTE');

-- ---------------- venta ----------------
INSERT INTO venta (id_usuario, id_empleado, id_sucursal, fecha, metodo_pago, nro_pago, comprobante, telefono, tipo_venta, ciudad, direccion_entrega, numero_guia, notas, estado) VALUES
(1, 5, 1, '2026-09-10 10:30:00', 'TARJETA', 'PAGO-0001', CAST('comprobante_0001' AS BINARY), '3101234567', 'SUCURSAL', NULL, NULL, NULL, 'Compra en mostrador', 'PAGADA'),
(2, 6, 3, '2026-09-12 15:45:00', 'TRANSFERENCIA', 'PAGO-0002', CAST('comprobante_0002' AS BINARY), '3209876543', 'DOMICILIO', 'Medellin', 'Calle 50 # 45-10 Apto 301', 'GUIA-123456', 'Entregar en horario de la tarde', 'PAGADA'),
(1, 5, 2, '2026-09-15 09:15:00', 'EFECTIVO', 'PAGO-0003', CAST('comprobante_0003' AS BINARY), '3101234567', 'SUCURSAL', NULL, NULL, NULL, NULL, 'PAGADA');

-- ---------------- detalle_venta ----------------
INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal, notas) VALUES
(1, 1, 1, 2200000.000000, 2200000.000000, NULL),
(2, 2, 2, 45000.000000, 90000.000000, 'Dos unidades'),
(3, 3, 1, 180000.000000, 180000.000000, NULL);

-- ---------------- garantia ----------------
INSERT INTO garantia (id_detalle_venta, fecha_inicio, fecha_fin, estado) VALUES
(1, '2026-09-10 10:30:00', '2027-09-10 10:30:00', 'VIGENTE'),
(2, '2026-09-12 15:45:00', '2027-03-12 15:45:00', 'VIGENTE'),
(3, '2026-09-15 09:15:00', '2027-09-15 09:15:00', 'VIGENTE');

-- ---------------- compra ----------------
INSERT INTO compra (id_admin, id_proveedor, id_sucursal, fecha, metodo_pago, notas, estado) VALUES
(3, 4, 1, '2026-08-20 11:00:00', 'TRANSFERENCIA', 'Reposicion de portatiles', 'PAGADA'),
(3, 4, 2, '2026-08-22 14:20:00', 'TRANSFERENCIA', 'Reposicion de perifericos', 'PAGADA'),
(3, 4, 3, '2026-08-25 16:10:00', 'EFECTIVO', NULL, 'PAGADA');

-- ---------------- detalle_compra ----------------
INSERT INTO detalle_compra (id_compra, id_producto, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 5, 1800000.000000, 9000000.000000),
(2, 2, 50, 30000.000000, 1500000.000000),
(3, 3, 20, 130000.000000, 2600000.000000);

-- ---------------- cotizacion ----------------
INSERT INTO cotizacion (id_usuario, id_servicio, fecha, validez, total, estado) VALUES
(1, 1, '2026-09-01 09:00:00', 15, 230000.000000, 'ACEPTADA'),
(2, 2, '2026-09-03 10:30:00', 15, 350000.000000, 'PENDIENTE'),
(1, NULL, '2026-09-05 12:00:00', 30, 2200000.000000, 'RECHAZADA');

-- ---------------- detalle_cotizacion ----------------
INSERT INTO detalle_cotizacion (id_cotizacion, id_producto, cantidad, precio_unitario, subtotal) VALUES
(1, 3, 1, 180000.000000, 180000.000000),
(2, 2, 1, 45000.000000, 45000.000000),
(3, 1, 1, 2200000.000000, 2200000.000000);

-- ---------------- promocion ----------------
INSERT INTO promocion (id_producto, id_encargado, precio, descripcion, fecha_inicio, fecha_fin, estado) VALUES
(1, 3, 2000000.000000, 'Descuento de temporada en portatil Lenovo', '2026-10-01 00:00:00', '2026-10-31 23:59:59', 'ACTIVO'),
(2, 3, 38000.000000, 'Promo mouse inalambrico', '2026-10-01 00:00:00', '2026-10-15 23:59:59', 'ACTIVO'),
(3, 3, 150000.000000, 'Oferta SSD 480GB', '2026-09-01 00:00:00', '2026-09-30 23:59:59', 'INACTIVO');

-- ---------------- inventario ----------------
INSERT INTO inventario (id_sucursal, id_producto, stock, estado) VALUES
(1, 1, 5, 'ACTIVO'),
(2, 2, 50, 'ACTIVO'),
(3, 3, 20, 'ACTIVO');