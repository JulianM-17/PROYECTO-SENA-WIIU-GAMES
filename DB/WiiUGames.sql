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
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol),
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    tipo_doc ENUM('CC', 'TI', 'PAS', 'NIT', 'CE') NOT NULL,
    num_doc VARCHAR(20) NOT NULL UNIQUE,
    fecha_nacimiento DATE NULL,
    telefono VARCHAR(20) NOT NULL,
    telefono_secundario VARCHAR(20) NULL,
    departamento VARCHAR(30) NOT NULL,
    ciudad VARCHAR(30) NULL,
    direccion VARCHAR(40) NULL,
    codigo_postal VARCHAR(20) NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Citas ----------------
CREATE TABLE cita (
    id_cita INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    id_tecnico INT NULL,
    FOREIGN KEY (id_tecnico) REFERENCES usuario (id_usuario),
    equipo VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    telefono VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    precio DECIMAL(14, 2) NULL,
    tipo_servicio ENUM('MANTENIMIENTO', 'REPARACION') NOT NULL,
    estado ENUM('SOLICITUD RECIBIDA','CONFIRMADA','EN PROCESO','COMPLETADA','CANCELADA') NOT NULL DEFAULT 'SOLICITUD RECIBIDA',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_cita_local VARCHAR(80) NULL,
    UNIQUE KEY uq_cita_usuario_local (id_usuario, id_cita_local),
    INDEX idx_cita_usuario_fecha (id_usuario, fecha),
    INDEX idx_cita_tecnico (id_tecnico)
);

-- --------------Sucursal-----------------
CREATE TABLE sucursal (
    id_sucursal INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    encargado INT,
    FOREIGN KEY (encargado) REFERENCES usuario (id_usuario),
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
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal) REFERENCES sucursal (id_sucursal),
    tipo ENUM('Portatil', 'Torre', 'Consola', 'Control', 'All in one') NOT NULL,
    marca VARCHAR(20) NOT NULL,
    numero_serial VARCHAR(40) NOT NULL UNIQUE,
    descripcion VARCHAR(100) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- ---------------------------Categoria----------------------------
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
    FOREIGN KEY (id_marca) REFERENCES marca (id_marca),
    id_categoria INT NOT NULL,
    FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria),
    nombre VARCHAR(100) NOT NULL,
    imagen_prin VARCHAR(255) NOT NULL,
    imagen_2 VARCHAR(255) NULL,
    imagen_3 VARCHAR(255) NULL,
    imagen_4 VARCHAR(255) NULL,
    color VARCHAR(15) NULL,
    descripcion VARCHAR(100) NOT NULL,
    precio DECIMAL(14 , 6) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_precio_producto CHECK (precio >= 0)
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
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    id_encargado INT NOT NULL,
    FOREIGN KEY (id_encargado) REFERENCES usuario (id_usuario),
    id_tipo_servicio INT NOT NULL,
    FOREIGN KEY (id_tipo_servicio) REFERENCES tipo_servicio (id_tipo_servicio),
    id_equipo INT NOT NULL,
    FOREIGN KEY (id_equipo) REFERENCES equipo (id_equipo),
    estado ENUM('PENDIENTE', 'EN PROCESO', 'CANCELADO', 'COMPLETO') NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE detalle_servicio (
    id_detalle_servicio INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_servicio INT NOT NULL,
    FOREIGN KEY (id_servicio) REFERENCES servicio (id_servicio),
    id_producto INT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto (id_producto),
    descripcion VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(14 , 6) NOT NULL,
    subtotal DECIMAL(14 , 6) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    estado ENUM('CANCELADO', 'PENDIENTE', 'EN PROCESO', 'COMPLETO') NOT NULL,
    CONSTRAINT chk_cantidad_det_serv CHECK (cantidad >= 0),
    CONSTRAINT chk_precio_det_serv CHECK (precio_unitario >= 0)
);

-- ---------------------------- Cotizacion -------------------------------
CREATE TABLE cotizacion (
    id_cotizacion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    id_servicio INT NULL,
    FOREIGN KEY (id_servicio) REFERENCES servicio (id_servicio),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validez INT NOT NULL DEFAULT 15,
    total DECIMAL(14 , 6) NOT NULL,
    estado ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA') NOT NULL,
    CONSTRAINT chk_validez CHECK (validez >= 0),
    CONSTRAINT chk_total_cotizacion CHECK (total >= 0)
);

-- ----------------------------------Venta-------------------------------
CREATE TABLE venta (
    id_venta INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    id_empleado INT NULL,
    FOREIGN KEY (id_empleado) REFERENCES usuario (id_usuario),
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal) REFERENCES sucursal (id_sucursal),
    id_cotizacion INT NULL,
    FOREIGN KEY (id_cotizacion) REFERENCES cotizacion (id_cotizacion),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA') NOT NULL,
    nro_pago VARCHAR(255) NULL,
    comprobante VARCHAR(255) NULL,
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
    FOREIGN KEY (id_venta) REFERENCES venta (id_venta),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto (id_producto),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14 , 6) NOT NULL,
    subtotal DECIMAL(14 , 6) NOT NULL,
    notas VARCHAR(200) NULL,
    CONSTRAINT chk_cantidad_det_venta CHECK (cantidad > 0),
    CONSTRAINT chk_precio_det_venta CHECK (precio_unitario >= 0)
);

-- ----------------------------- Garantia ----------------------------------------
CREATE TABLE garantia (
    id_garantia INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_detalle_venta INT NOT NULL,
    FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta (id_detalle_venta),
    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('VIGENTE','VENCIDA', 'ANULADA', 'SUSPENDIDA') NOT NULL DEFAULT 'VIGENTE',
    UNIQUE KEY uq_garantia_detalle_venta (id_detalle_venta),
    CONSTRAINT chk_fechas_garantia CHECK (fecha_fin > fecha_inicio)
);

-- ---------------------- Solicitud de garantia ----------------------
CREATE TABLE solicitud_garantia (
    id_solicitud INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    id_detalle_venta INT NOT NULL,
    FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta (id_detalle_venta),
    descripcion TEXT NOT NULL,
    estado ENUM(
        'RECIBIDA',
        'EN_REVISION',
        'APROBADA',
        'RECHAZADA',
        'CERRADA'
    ) NOT NULL DEFAULT 'RECIBIDA',
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_solicitud_garantia_usuario_fecha (id_usuario, fecha_solicitud),
    UNIQUE KEY uq_solicitud_garantia_detalle_venta (id_detalle_venta)
);

-- --------------- Compra -------------------------
CREATE TABLE compra (
    id_compra INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_admin INT NOT NULL,
    FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario),
    id_proveedor INT NOT NULL,
    FOREIGN KEY (id_proveedor) REFERENCES usuario (id_usuario),
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal) REFERENCES sucursal (id_sucursal),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA') NOT NULL,
    notas VARCHAR(200) NULL,
    estado ENUM('PAGADA', 'ANULADA') NOT NULL DEFAULT 'PAGADA'
);

CREATE TABLE detalle_compra (
    id_detalle_compra INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    FOREIGN KEY (id_compra) REFERENCES compra (id_compra),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto (id_producto),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14 , 6) NOT NULL,
    subtotal DECIMAL(14 , 6) NOT NULL,
    CONSTRAINT chk_cantidad_det_compra CHECK (cantidad > 0),
    CONSTRAINT chk_precio_det_compra CHECK (precio_unitario >= 0)
);

CREATE TABLE detalle_cotizacion (
    id_detalle_cotizacion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_cotizacion INT NOT NULL,
    FOREIGN KEY (id_cotizacion) REFERENCES cotizacion (id_cotizacion),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto (id_producto),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(14 , 6) NOT NULL,
    subtotal DECIMAL(14 , 6) NOT NULL,
    CONSTRAINT chk_cantidad_det_cot CHECK (cantidad > 0),
    CONSTRAINT chk_precio_det_cot CHECK (precio_unitario >= 0)
);

-- -----------------------Promociones----------------------------
CREATE TABLE promocion (
    id_promocion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto (id_producto),
    id_encargado INT NOT NULL,
    FOREIGN KEY (id_encargado) REFERENCES usuario (id_usuario),
    precio DECIMAL(14 , 6) NOT NULL,
    descripcion VARCHAR(150) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_precio_promo CHECK (precio >= 0),
    CONSTRAINT chk_fechas_promo CHECK (fecha_fin > fecha_inicio)
);

-- ----------------------- inventario --------------------------
CREATE TABLE inventario (
    id_inventario INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_sucursal INT NOT NULL,
    FOREIGN KEY (id_sucursal) REFERENCES sucursal (id_sucursal),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto (id_producto),
    stock INT NOT NULL DEFAULT 0,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    UNIQUE KEY sucursal_producto (id_sucursal , id_producto),
    CONSTRAINT chk_stock CHECK (stock >= 0)
);

-- ----------------------- sugerencias --------------------------
CREATE TABLE sugerencia (
    id_sugerencia INT AUTO_INCREMENT NOT NULL PRIMARY KEY, 
    mensaje VARCHAR(500) NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

-- ---------------------------backups-----------------------------
CREATE TABLE backup (
    id_backup INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_encargado INT NULL,
    FOREIGN KEY (id_encargado) REFERENCES usuario (id_usuario),
    nombre_archivo VARCHAR(70) NOT NULL,
    ruta_almacenamiento VARCHAR(255) NOT NULL,
    contenido LONGTEXT NULL,
    peso INT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo ENUM ('COMPLETO', 'INCREMENTAL', 'DIFERENCIAL'),
    estado ENUM ('EXITOSO', 'FALLIDO', 'EN PROCESO') NOT NULL,
    CONSTRAINT chk_peso CHECK (peso >= 0)
);

-- -------------------------- favorito ---------------------------
CREATE TABLE favorito (
    id_favorito INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fecha_agregado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    id_producto INT NOT NULL,
    UNIQUE (id_usuario, id_producto),
    FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto)
);

-- --------------------------Reseñas---------------------------------
CREATE TABLE resenas (
    id_resenas INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    id_producto INT NOT NULL,
    FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto),
    calificacion TINYINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario VARCHAR(300),
    compra_verificada BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_usuario_producto (id_usuario, id_producto)
);

-- ---------------- rol ----------------
INSERT INTO rol (nombre_rol, descripcion_rol, estado) VALUES
('Cliente', 'Usuario que compra productos y solicita servicios', 'ACTIVO'),
('Administrador', 'Gestiona todo el sistema', 'ACTIVO'),
('Proveedor', 'Empresa o persona que surte productos', 'ACTIVO'),
('Trabajador', 'Empleado de sucursal: ventas y servicios tecnicos', 'ACTIVO');


-- ---------------- usuario ----------------
INSERT INTO usuario (id_rol, nombre, apellido, tipo_doc, num_doc, fecha_nacimiento, telefono, telefono_secundario, departamento, ciudad, direccion, correo, contrasena_hash, estado) VALUES
(1, 'Carlos', 'Ramirez', 'CC', '1012345678', '1995-03-14', '3101234567', NULL, 'Cundinamarca', 'Bogota', 'Cra 15 # 80-20', 'cliente@gmail.com', 'Cliente123', 'ACTIVO'),
(1, 'Laura', 'Gomez', 'CC', '1098765432', '1998-07-22', '3209876543', '3151112233', 'Antioquia', 'Medellin', 'Calle 50 # 45-10', 'cliente2@gmail.com', 'Cliente123', 'ACTIVO'),
(2, 'Andres', 'Torres', 'CC', '80123456', '1988-11-05', '3001112233', NULL, 'Cundinamarca', 'Bogota', 'Av 68 # 22-15', 'Admin123@gmail.com', 'Admin123', 'ACTIVO'),
(3, 'Distribuciones Tech', 'SAS', 'NIT', '900123456', NULL, '6012223344', NULL, 'Cundinamarca', 'Bogota', 'Zona Industrial', 'proveedor@gmail.com', 'Proveedor123', 'ACTIVO'),
(4, 'Sofia', 'MartineZ', 'CC', '1023456789', '1992-05-10', '3112223344', NULL, 'Cundinamarca', 'Bogota', 'Calle 100 # 15-20', 'Trabajador@gmail.com', 'Trabajador123', 'ACTIVO'),
(4, 'Mateo', 'Rios', 'CC', '1034567890', '1990-09-15', '3223334455', NULL, 'Antioquia', 'Medellin', 'Cra 80 # 30-10', 'Trabajador2@gmail.com', 'Trabajador123', 'ACTIVO');

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
('Almacenamiento', 'Discos duros, SSD y memorias', 'ACTIVO'),
('PC Escritorio', 'Torres gamer, empresariales y Todo en Uno', 'ACTIVO'),
('Tarjetas Graficas', 'GPUs NVIDIA GeForce y AMD Radeon de alto rendimiento', 'ACTIVO'),
('Monitores', 'Pantallas gaming y profesionales de alta tasa de refresco', 'ACTIVO'),
('Memorias RAM', 'Modulos DDR4 y DDR5 para portatiles y escritorios', 'ACTIVO'),
('Motherboards', 'Placas base para procesadores Intel y AMD', 'ACTIVO'),
('Procesadores', 'CPUs Intel Core y AMD Ryzen para gaming y creacion de contenido', 'ACTIVO'),
('Consolas y Videojuegos', 'Consolas retro, modernas, accesorios y videojuegos', 'ACTIVO');

-- ---------------- marca ----------------
INSERT INTO marca (nombre_marca, descripcion_marca, estado) VALUES
('Lenovo', 'Computadores y accesorios Lenovo', 'ACTIVO'),
('Logitech', 'Perifericos Logitech', 'ACTIVO'),
('Kingston', 'Memorias y unidades de almacenamiento', 'ACTIVO'),
('ASUS', 'Laptops, componentes y monitores ASUS', 'ACTIVO'),
('NVIDIA', 'Tarjetas graficas GeForce RTX y tecnologias visuales', 'ACTIVO'),
('Corsair', 'Memorias RAM, fuentes y perifericos de alto rendimiento', 'ACTIVO'),
('Intel', 'Procesadores Intel Core y placas base', 'ACTIVO'),
('AMD', 'Procesadores Ryzen y tarjetas graficas Radeon', 'ACTIVO'),
('Nintendo', 'Consolas Nintendo Switch y videojuegos', 'ACTIVO'),
('Sony', 'Consolas PlayStation y accesorios', 'ACTIVO'),
('MSI', 'Placas base, tarjetas de video y perifericos gaming', 'ACTIVO');

-- ---------------- producto ----------------
INSERT INTO producto (id_marca, id_categoria, nombre, imagen_prin, imagen_2, imagen_3, imagen_4, color, descripcion, precio, estado) VALUES
(1, 1, 'Portatil Lenovo IdeaPad 3', 'https://exitocol.vtexassets.com/arquivos/ids/9427292/portatil-lenovo-ideapad-3-14-core-i5-8gb-512gb-ssd-w10.jpg?v=637653492669170000', 'https://p3-ofp.static.pub/fes/cms/2022/12/28/h34tkgatdrq93k39ndojjdabaj8ief172697.png', 'https://p1-ofp.static.pub/medias/bWFzdGVyfHJvb3R8ODQ0MjB8aW1hZ2UvanBlZ3xoOGIvaGY0LzEwNzU0NzQxNjAwMjg2LmpwZ3xkZGFiM2ZhYTIyODYzNWJlNWEyYWUwNzNiZDI3MGUwNmU4MzRjYjY0YWE4NDQ1ZjYxNTZiNTQyNzY0YTFjMmZi/lenovo-laptop-ideapad-3-14-intel-subseries-gallery-4.jpg', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuouMzUMYIznreAhfvfAOw7Vy69OnP-Ie9w3iFxcY7-d8Wxor07T0EEuw&s=10', 'Gris', 'Ryzen 5, 16GB RAM, 512GB SSD, 15.6 pulgadas', 2200000.000000, 'ACTIVO'),
(2, 2, 'Mouse Logitech M185', 'https://discoveryeb.com/wp-content/uploads/2025/07/MOUSE-LOGITECH-M185-NEGRO-INALAMBRICO.webp', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRI3g_cN7GdPpBNhd-DEqtdwSZddY-7FB9IxeJJPWJPQ&s=10', 'https://www.logitechstore.com.co/cdn/shop/files/D_793154-MCO76755306039_052024-B.jpg?v=1749834200&width=800', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsa3gbJhQJP-9Rc0iAhwBNesX5O9mpEmLw-CokefcQ6thXGHO8y1rsx5L2&s=10', 'Negro', 'Mouse inalambrico con receptor USB', 45000.000000, 'ACTIVO'),
(3, 3, 'SSD Kingston A400 480GB', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTc0MEbuVDtNatNOeXLvubslsh7flOHP0_nNlxRRe1T6Nk9-_v4Xnl8lBI6&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTd-v5gmIGbvBSyScAwP1thFCOVuo-20BXxN2HFkQf04Q&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1q9RPAlltPAc9lbdxZ2dfbKbMJbWr6aaRSb7s1xoD3A&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZ0rS4p1fsV8EZW7MyQhIiSzFC98Kb1SHrYoexykdRVw&s=10', 'Negro', 'Unidad de estado solido SATA 2.5 pulgadas', 180000.000000, 'ACTIVO'),
(4, 1, 'Portatil Gamer ASUS ROG Strix G16', 'https://dlcdnwebimgs.asus.com/gain/29EA1134-FDC7-4623-8301-D3CEE534CC71', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaAJ1g40WZ9T0sKbw0VjZPXrNJZ1nMh6VZWe_1WOG_vg&s=10', 'https://www.professionalwireless.com.co/wp-content/uploads/2026/01/ROG-STRIX-G16-G614PR_D.png', 'https://gamerscolombia.com/cdn/shop/files/41.png?v=1757616706', 'Negro', 'Intel Core i7-13650HX, RTX 4060, 16GB RAM DDR5, 512GB SSD', 5800000.000000, 'ACTIVO'),
(8, 4, 'PC Gamer Torre Custom Ryzen 7', 'https://media.falabella.com/falabellaCO/126854817_02/w=1500,h=1500,fit=cover', '', '', '', 'Negro', 'AMD Ryzen 7 5700X, RTX 4060 Ti, 32GB RAM, 1TB NVMe, Fuente 750W', 4500000.000000, 'ACTIVO'),
(5, 5, 'Tarjeta Grafica NVIDIA GeForce RTX 4060 8GB', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS045T533PXM2vplMfKOCiy0awrf2Y70f1CWvEBORNj0w&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRo0ZuHbmuXklfYa70w10jUOzGZSD3GEdg3AGhLEGh0FQ&s=10', 'https://cdn.mesajil.com/files/2026/10/02/tarjeta-grafica-gigabyte-nvidia-geforce-rtx-4060-gaming-oc-8gb-gddr6-galeria-1.webp', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT29Yc0TviWVjvLgpgyuO8KTa3FPJ4i2jCsSDdX5NICaA&s=10', 'Negro', 'Arquitectura Ada Lovelace, DLSS 3, Ray Tracing, 8GB GDDR6', 1650000.000000, 'ACTIVO'),
(4, 6, 'Monitor Gaming ASUS TUF 27 165Hz', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyhelKvif-AT95jLas92alyZ_2d7Abs54wrDPh1UW-cg&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt2APmTqFTXjBWtnfbrUxpjhkunyKLzyTJVfKwuQwHEA&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmThPGcMp6mihlAY4aQPp3HE_-zhelSG322tjkBHy7Jg&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRo4-_o_LtDieuVElI8qEqBQr2tdahkSvQmoSkQLaRcIQ&s=10', 'Negro', 'Pantalla IPS 27 pulgadas, 165Hz, 1ms, FreeSync Premium, HDR10', 1150000.000000, 'ACTIVO'),
(6, 7, 'Memoria RAM Corsair Vengeance RGB 16GB DDR4', 'https://http2.mlstatic.com/D_NQ_NP_871475-MLA91871043439_092025-O.webp', 'https://www.mipcparquecentral.com/cdn/shop/files/KITRAM16DDR43200CORSAIRVENGANCERGBRS.jpg?v=1776702619', 'https://assets.corsair.com/image/upload/f_auto,q_auto/content/CMR16GX4M2A2666C16-Vengeance-RGB-01.png', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo1IAa7CRW4a9UTnutFs-VjnajOUMu-29pph60KfKfFA&s=10', 'Negro', 'Kit 16GB (2x8GB) 3200MHz CL16 con iluminacion dinamica RGB', 210000.000000, 'ACTIVO'),
(11, 8, 'Motherboard MSI B550M PRO-VDH WiFi', 'https://symcomputadores.com/wp-content/uploads/2023/12/MSI-B550M-PRO-VHD-WIFI-3.png', 'https://reset.net.co/wp-content/uploads/2024/02/Board-MSI-B550M-PRO-VDH-WIFI-principal.webp', 'https://storage-asset.msi.com/global/picture/image/feature/mb/B550M/PRO-VDH-WIFI/storage-hero.jpg', 'https://storage-asset.msi.com/global/picture/image/feature/mb/B550M/PRO-VDH-WIFI/usb-hero.jpg', 'Negro', 'Socket AM4, PCIe 4.0, Dual M.2, WiFi integrado, soporte Ryzen 5000', 490000.000000, 'ACTIVO'),
(7, 9, 'Procesador Intel Core i7-13700K 16 Nucleos', 'https://http2.mlstatic.com/D_NQ_NP_909668-CBT79029631396_092024-O.webp', 'https://www.fabritec.pe/storage/products/1790796314_bx8071513700k_01.webp', 'https://m.media-amazon.com/images/I/41ce2ohZT2L._AC_UF894,1000_QL80_.jpg', 'https://m.media-amazon.com/images/I/7116i-92V-L._AC_UF350,350_QL80_.jpg', 'Azul', 'Hasta 5.4 GHz, 30MB Cache, Socket LGA1700, Graficos Intel UHD 770', 1890000.000000, 'ACTIVO'),
(9, 10, 'Consola Nintendo Switch OLED 64GB', 'https://exitocol.vtexassets.com/arquivos/ids/32433207/consola-nintendo-switch-oled-blanca-64gb-pantalla-7-pulgadas.jpg?v=639059222278530000', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_2.0/ncom/en_US/switch/site-design-update/photo01.png', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_2.0/ncom/en_US/switch/videos/heg001-07060600/posters/oled-model.jpg', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9sCV0pyKVqoS46pmRjNkluyz4N2xrGcyd-gY88JlQrw&s', 'Blanco', 'Pantalla OLED 7 pulgadas, soporte ajustable, 64GB almacenamiento interno', 1450000.000000, 'ACTIVO'),
(10, 10, 'Consola PlayStation 5 Slim Digital 1TB', 'https://i.blogs.es/8fdd98/ps51/450_1000.webp','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShoynVukg-wtSzSk4YhzTrsxJwHvZnTGK5dD8Y17o4P-qVvay77KtZpBd3&s=10', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTo66g8lOlv1xncjYVj4WQSOCf_gT62MsDHCRkM8TRSJRQFFiGFShfksVF&s=10', 'https://t3.ftcdn.net/jpg/06/82/00/48/360_F_682004801_hFGnRDJg2vnxgF9HL25oRhRSBnz5SxTH.jpg', 'Blanco', 'SSD 1TB de ultra alta velocidad, Tempest 3D AudioTech, soporte 4K 120Hz', 2490000.000000, 'ACTIVO');

-- ---------------- tipo_servicio ----------------
INSERT INTO tipo_servicio (nombre, descripcion, estado) VALUES
('Mantenimiento preventivo', 'Limpieza interna y cambio de pasta termica', 'ACTIVO'),
('Reparacion', 'Diagnostico y reparacion de fallas de hardware', 'ACTIVO'),
('Instalacion de software', 'Formateo e instalacion de sistema operativo y programas', 'ACTIVO');

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
(1, NULL, '2026-09-05 12:00:00', 30, 2200000.000000, 'RECHAZADA');

-- ---------------- detalle_cotizacion ----------------
INSERT INTO detalle_cotizacion (id_cotizacion, id_producto, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 1, 2200000.000000, 2200000.000000);

-- -----------------------Promociones----------------------------
INSERT INTO promocion (id_producto, id_encargado, precio, descripcion, fecha_inicio, fecha_fin, estado) VALUES
(1, 3, 2000000.000000, 'Descuento de temporada en portatil Lenovo', '2026-10-01 00:00:00', '2026-10-31 23:59:59', 'ACTIVO'),
(2, 3, 38000.000000, 'Promo mouse inalambrico', '2026-10-01 00:00:00', '2026-10-15 23:59:59', 'ACTIVO'),
(3, 3, 150000.000000, 'Oferta SSD 480GB', '2026-09-01 00:00:00', '2026-09-30 23:59:59', 'INACTIVO');

-- ----------------------- inventario --------------------------
INSERT INTO inventario (id_sucursal, id_producto, stock, estado) VALUES
(1, 1, 5, 'ACTIVO'),
(2, 2, 50, 'ACTIVO'),
(3, 3, 20, 'ACTIVO'),
(1, 4, 8, 'ACTIVO'),
(2, 5, 6, 'ACTIVO'),
(3, 6, 12, 'ACTIVO'),
(1, 7, 15, 'ACTIVO'),
(2, 8, 30, 'ACTIVO'),
(3, 9, 10, 'ACTIVO'),
(1, 10, 14, 'ACTIVO'),
(2, 11, 22, 'ACTIVO'),
(3, 12, 9, 'ACTIVO');