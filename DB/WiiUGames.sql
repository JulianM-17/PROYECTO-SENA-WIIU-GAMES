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
    contraseña_hash VARCHAR(255) NOT NULL,
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
    id_empleado NULL,
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
    total DECIMAL(14 , 5 ) NOT NULL,
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
    subtotal DECIMAL(14 , 5 ) NOT NULL
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

-- ---------------------------------------Triggers----------------------------------------------------

DELIMITER //

-- resta el stock caundo se realiza una venta pero previamente revisa si el produto existe
-- ademas revisa si el producto esta activo para  la venta

CREATE TRIGGER trg_venta_descontar_stock
BEFORE INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_suc INT;
    DECLARE stock_actual INT;
    DECLARE v_precio DECIMAL(12,6);
    DECLARE v_estado VARCHAR(10);

SELECT 
    id_sucursal
INTO v_suc FROM
    venta
WHERE
    id_venta = NEW.id_venta;

SELECT 
    precio, estado
INTO v_precio , v_estado FROM
    producto
WHERE
    id_producto = NEW.id_producto;

    IF v_precio IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El producto indicado no existe.';
    END IF;

    IF v_estado <> 'ACTIVO' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El producto no está disponible para la venta.';
    END IF;
    
    SET NEW.precio_unitario = v_precio;
    SET NEW.subtotal = v_precio * NEW.cantidad;

SELECT 
    stock
INTO stock_actual FROM
    inventario
WHERE
    id_sucursal = v_suc
        AND id_producto = NEW.id_producto;

    IF stock_actual IS NULL OR stock_actual < NEW.cantidad THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock insuficiente en esta sucursal para completar la venta.';
    ELSE
        UPDATE inventario
        SET stock = stock - NEW.cantidad
        WHERE id_sucursal = v_suc AND id_producto = NEW.id_producto;
    END IF;
END//

-- ----------------------------------------Compra---------------------------------------
-- Suma al stock cada vez que hay una comopra de algun producto a algun proveedor

CREATE TRIGGER trg_compra_aumentar_stock
BEFORE INSERT ON detalle_compra
FOR EACH ROW
BEGIN
    DECLARE v_suc INT;
    DECLARE v_existe INT;

    --buscamos el id de la sucursal donde se esta haciendo la compra
    SELECT id_sucursal INTO v_suc 
    FROM compra 
    WHERE id_compra = NEW.id_compra;

    --verificamos si el producto ya existe en el inventario de esa sucursal especifica
    SELECT COUNT(*) INTO v_existe 
    FROM inventario 
    WHERE id_sucursal = v_suc AND id_producto = NEW.id_producto;
        -- si no existe, procedemos a mandar el mensaje y a crear el producto nuevo
    IF v_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El producto no existe en el inventario de esta sucursal. Por favor, asigne el producto a la sucursal antes de registrar la compra.';
    ELSE
        -- si existe, procedemos a sumar la cantidad al stock
        UPDATE inventario 
        SET stock = stock + NEW.cantidad
        WHERE id_sucursal = v_suc AND id_producto = NEW.id_producto;
    END IF;
END//

-- -----------------------------------JDFN------------------------------------
DELIMITER ;