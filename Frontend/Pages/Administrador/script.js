/* ==========================================================================
   LÓGICA JAVASCRIPT DEL PANEL DE ADMINISTRADOR - WIIU-GAMES
   Conectado con la API del backend para persistir datos en MySQL
   ========================================================================== */

// URL base del backend
var API_BASE = 'http://localhost:3000';

// Variable para saber qué formulario modal está abierto
var tipoModalActual = "";

// Token de sesión (se obtiene del localStorage si existe)
var sessionToken = localStorage.getItem('sessionToken') || '';

// ==========================================================================
// 0. SISTEMA DE NOTIFICACIONES TOAST
// ==========================================================================
function mostrarToast(tipo, mensaje) {
  var contenedor = document.getElementById('contenedor-toast');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'contenedor-toast';
    contenedor.className = 'contenedor-toast';
    document.body.appendChild(contenedor);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + tipo;
  var icono = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = '<span>' + icono + ' ' + mensaje + '</span>';
  contenedor.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3500);
}

// ==========================================================================
// 1. CAMBIAR ENTRE PESTAÑAS DEL MENÚ LATERAL
// ==========================================================================
function cambiarPestana(idSeccion, botonClickeado) {
  // 1. Ocultar todas las secciones
  var secciones = document.querySelectorAll('.seccion');
  for (var i = 0; i < secciones.length; i++) {
    secciones[i].classList.remove('visible');
  }

  // 2. Mostrar la sección seleccionada
  var seccionDestino = document.getElementById(idSeccion);
  if (seccionDestino) {
    seccionDestino.classList.add('visible');
  }

  // 3. Resaltar en amarillo el botón activo en el menú lateral
  if (botonClickeado) {
    var botones = document.querySelectorAll('.boton-menu');
    for (var j = 0; j < botones.length; j++) {
      botones[j].classList.remove('activo');
    }
    botonClickeado.classList.add('activo');
  }

  // 4. Subir la vista al inicio del contenido
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 2. BUSCADOR GLOBAL Y FILTROS EN TIEMPO REAL
// ==========================================================================
function filtrarGlobal(texto) {
  var filtro = texto.toLowerCase();
  var filas = document.querySelectorAll('.seccion.visible tbody tr');
  
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].querySelector('.texto-vacio')) continue;

    var contenidoFila = filas[i].textContent.toLowerCase();
    if (contenidoFila.indexOf(filtro) > -1) {
      filas[i].style.display = "";
    } else {
      filas[i].style.display = "none";
    }
  }
}

function filtrarTabla(idTbody, texto) {
  var filtro = texto.toLowerCase();
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  var filas = tbody.getElementsByTagName('tr');
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].querySelector('.texto-vacio')) continue;

    var contenido = filas[i].textContent.toLowerCase();
    if (contenido.indexOf(filtro) > -1) {
      filas[i].style.display = "";
    } else {
      filas[i].style.display = "none";
    }
  }
}

function filtrarEstadoTabla(idTbody, valor, indiceColumna) {
  var filtro = valor.toLowerCase();
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  var filas = tbody.getElementsByTagName('tr');
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].querySelector('.texto-vacio')) continue;

    var celdas = filas[i].getElementsByTagName('td');
    if (celdas.length > indiceColumna) {
      var celdaTexto = celdas[indiceColumna].textContent.toLowerCase();
      if (filtro === "" || celdaTexto.indexOf(filtro) > -1) {
        filas[i].style.display = "";
      } else {
        filas[i].style.display = "none";
      }
    }
  }
}

// ==========================================================================
// 3. MENÚ DE PERFIL Y NOTIFICACIONES
// ==========================================================================
function toggleMenuPerfil() {
  var menu = document.getElementById('menuPerfil');
  if (menu) {
    menu.classList.toggle('abierto');
  }
}

document.addEventListener('click', function (evento) {
  var perfil = document.querySelector('.perfil-usuario');
  var menu = document.getElementById('menuPerfil');
  if (perfil && menu && !perfil.contains(evento.target)) {
    menu.classList.remove('abierto');
  }
});

function mostrarNotificaciones() {
  alert("🔔 Notificaciones del Sistema:\n\nActualmente tienes 0 alertas pendientes. La tienda funciona con normalidad.");
}

function filtrarPeriodo() {
  var nuevo = prompt("Selecciona el período de consulta:\n1. Hoy\n2. Últimos 7 días\n3. Este mes\n4. Este año", "Últimos 7 días");
  if (nuevo) {
    document.querySelector('.boton-dias span').textContent = nuevo;
  }
}

// ==========================================================================
// 4. VENTANAS MODALES PARA REGISTRAR DATOS
// ==========================================================================
function abrirModal(tipo) {
  tipoModalActual = tipo;
  var modal = document.getElementById('modalFormulario');
  var titulo = document.getElementById('modalTitulo');
  var campos = document.getElementById('modalCampos');

  modal.classList.add('activo');

  if (tipo === 'garantias') {
    titulo.textContent = "Registrar Nueva Garantía";
    campos.innerHTML = '<div class="campo-grupo"><label>Nombre del Cliente:</label><input type="text" id="campo1" required placeholder="Ej. Carlos Ramirez"></div><div class="campo-grupo"><label>Producto / Serial:</label><input type="text" id="campo2" required placeholder="Ej. Mouse Logitech M185 (SN: 12345)"></div><div class="campo-grupo"><label>Meses de Cobertura:</label><select id="campo3"><option value="6">6 Meses</option><option value="12" selected>12 Meses</option><option value="24">24 Meses</option></select></div>';
  } else if (tipo === 'mantenimientos') {
    titulo.textContent = "Nuevo Servicio de Mantenimiento";
    campos.innerHTML = '<div class="campo-grupo"><label>Equipo / Consola:</label><input type="text" id="campo1" required placeholder="Ej. PlayStation 5 / Laptop HP"></div><div class="campo-grupo"><label>Nombre del Cliente:</label><input type="text" id="campo2" required placeholder="Ej. Laura Gomez"></div><div class="campo-grupo"><label>Técnico Responsable:</label><input type="text" id="campo3" required placeholder="Ej. Mateo Rios"></div><div class="campo-grupo"><label>Costo Estimado ($):</label><input type="number" id="campo4" required placeholder="Ej. 180000"></div>';
  } else if (tipo === 'inventario') {
    titulo.textContent = "Agregar Producto al Inventario";
    campos.innerHTML = '<div class="campo-grupo"><label>Nombre del Producto:</label><input type="text" id="campo1" required placeholder="Ej. Nintendo Switch OLED"></div><div class="campo-grupo"><label>Categoría:</label><select id="campo2"><option value="Periféricos">Periféricos</option><option value="Portátiles">Portátiles</option><option value="Almacenamiento">Almacenamiento</option><option value="Consolas">Consolas</option></select></div><div class="campo-grupo"><label>Precio de Venta ($):</label><input type="number" id="campo3" required placeholder="Ej. 1450000"></div><div class="campo-grupo"><label>Unidades en Stock:</label><input type="number" id="campo4" required placeholder="Ej. 10"></div>';
  } else if (tipo === 'reparacion') {
    titulo.textContent = "Nueva Orden de Reparación";
    campos.innerHTML = '<div class="campo-grupo"><label>Dispositivo:</label><input type="text" id="campo1" required placeholder="Ej. GamePad Wii U"></div><div class="campo-grupo"><label>Falla Reportada:</label><input type="text" id="campo2" required placeholder="Ej. Pantalla rota o no da imagen"></div><div class="campo-grupo"><label>Cliente:</label><input type="text" id="campo3" required placeholder="Ej. Carlos Ramirez"></div><div class="campo-grupo"><label>Presupuesto ($):</label><input type="number" id="campo4" required placeholder="Ej. 65000"></div>';
  } else if (tipo === 'descuentos') {
    titulo.textContent = "Crear Código de Descuento";
    campos.innerHTML = '<div class="campo-grupo"><label>Código del Cupón:</label><input type="text" id="campo1" required placeholder="Ej. WIIU2026"></div><div class="campo-grupo"><label>Porcentaje / Descuento:</label><input type="text" id="campo2" required placeholder="Ej. 15% Descuento"></div><div class="campo-grupo"><label>Fecha Límite:</label><input type="date" id="campo3" required></div>';
  } else if (tipo === 'resenas') {
    titulo.textContent = "Moderar / Agregar Reseña";
    campos.innerHTML = '<div class="campo-grupo"><label>Nombre del Cliente:</label><input type="text" id="campo1" required placeholder="Ej. Andrea Morales"></div><div class="campo-grupo"><label>Producto o Servicio:</label><input type="text" id="campo2" required placeholder="Ej. Mantenimiento Preventivo"></div><div class="campo-grupo"><label>Calificación:</label><select id="campo3"><option value="5 estrellas">⭐⭐⭐⭐⭐ (5 Estrellas)</option><option value="4 estrellas">⭐⭐⭐⭐ (4 Estrellas)</option><option value="3 estrellas">⭐⭐⭐ (3 Estrellas)</option></select></div><div class="campo-grupo"><label>Comentario:</label><textarea id="campo4" rows="3" placeholder="Excelente atención y rapidez..."></textarea></div>';
  } else if (tipo === 'clientes') {
    titulo.textContent = "Registrar Nuevo Cliente";
    campos.innerHTML = '<div class="campo-grupo"><label>Nombre Completo:</label><input type="text" id="campo1" required placeholder="Ej. Mario Alejandro Pérez"></div><div class="campo-grupo"><label>Teléfono:</label><input type="text" id="campo2" required placeholder="Ej. 312 456 7890"></div><div class="campo-grupo"><label>Correo Electrónico:</label><input type="email" id="campo3" required placeholder="Ej. mario@gmail.com"></div><div class="campo-grupo"><label>Ciudad:</label><input type="text" id="campo4" required placeholder="Ej. Sogamoso"></div>';
  } else if (tipo === 'pedidos') {
    titulo.textContent = "Registrar Nuevo Pedido";
    campos.innerHTML = '<div class="campo-grupo"><label>Cliente:</label><input type="text" id="campo1" required placeholder="Ej. Carlos Ramirez"></div><div class="campo-grupo"><label>Total del Pedido ($):</label><input type="number" id="campo2" required placeholder="Ej. 180000"></div>';
  }
}

function cerrarModal() {
  var modal = document.getElementById('modalFormulario');
  if (modal) {
    modal.classList.remove('activo');
  }
  tipoModalActual = "";
}

// ==========================================================================
// 5. CARGAR DATOS DESDE EL DASHBOARD DEL BACKEND
// ==========================================================================
function cargarDashboard() {
  fetch(API_BASE + '/api/dashboard/admin', {
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.ok) {
      console.warn('Dashboard respondió sin ok:', data.message);
      return;
    }

    // ---------- HOME: Tarjetas de resumen ----------
    var el;
    el = document.getElementById('homeVentasTotales');
    if (el) el.textContent = '$ ' + Number(data.summary.salesTotal || 0).toLocaleString('es-CO');

    el = document.getElementById('homePedidosTotales');
    if (el) el.textContent = data.summary.ordersCount || 0;

    el = document.getElementById('homeClientesNuevos');
    if (el) el.textContent = data.summary.clientsCount || 0;

    // ---------- HOME: Productos más vendidos ----------
    if (data.topProducts && data.topProducts.length > 0) {
      var contenedorTop = document.getElementById('contenedorTopProductos');
      if (contenedorTop) {
        contenedorTop.innerHTML = '';
        for (var t = 0; t < Math.min(data.topProducts.length, 3); t++) {
          var p = data.topProducts[t];
          contenedorTop.innerHTML += '<div class="item-producto-top"><span class="puesto-numero">#' + (t+1) + '</span><div class="imagen-caja">WiiU</div><p class="nombre-producto">' + p.nombre + '</p><small>' + p.cantidad + ' unidades</small><h4>$ ' + Number(p.total).toLocaleString('es-CO') + '</h4></div>';
        }
      }
    }

    // ---------- HOME: Pedidos recientes ----------
    if (data.recentOrders) {
      poblarTabla('tablaPedidosBody', data.recentOrders, function(row) {
        var estadoClase = row.estado === 'PAGADA' ? 'etiqueta-verde' : 'etiqueta-naranja';
        return '<td><strong>#' + row.id_venta + '</strong></td><td>' + row.nombre + ' ' + row.apellido + '</td><td><span class="' + estadoClase + '">' + row.estado + '</span></td><td>$ ' + Number(row.total).toLocaleString('es-CO') + '</td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

    // ---------- INVENTARIO ----------
    if (data.inventory) {
      poblarTabla('tablaInventarioBody', data.inventory, function(row) {
        var stockTexto = row.stock + ' uds';
        var estadoClase = row.stock > 0 ? 'etiqueta-verde' : 'etiqueta-rojo';
        var estadoTexto = row.stock > 0 ? 'Disponible' : 'Agotado';
        return '<td><strong>' + row.name + '</strong></td><td>' + row.sku + '</td><td>' + row.category + '</td><td>$ ' + Number(row.price).toLocaleString('es-CO') + '</td><td>' + stockTexto + '</td><td>' + (row.warranty || '12 Meses') + '</td><td><span class="' + estadoClase + '">' + estadoTexto + '</span></td><td><button class="boton-icono" title="Editar"><i class="fi fi-rr-edit"></i></button><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'productos\', ' + row.id + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
      // Actualizar tarjetas de inventario
      el = document.getElementById('invTotalProductos');
      if (el) el.textContent = data.inventory.length + ' items';

      el = document.getElementById('invValorStock');
      if (el) {
        var valorTotal = 0;
        for (var vi = 0; vi < data.inventory.length; vi++) {
          valorTotal += Number(data.inventory[vi].price) * Number(data.inventory[vi].stock);
        }
        el.textContent = '$ ' + valorTotal.toLocaleString('es-CO');
      }

      el = document.getElementById('invStockBajo');
      if (el) {
        var alertas = 0;
        for (var si = 0; si < data.inventory.length; si++) {
          if (Number(data.inventory[si].stock) <= Number(data.inventory[si].minStock || 3)) alertas++;
        }
        el.textContent = alertas + ' alertas';
      }
    }

    // ---------- GARANTÍAS ----------
    if (data.warranties) {
      poblarTabla('tablaGarantiasBody', data.warranties, function(row) {
        var estadoClase = row.status === 'Activa' ? 'etiqueta-verde' : 'etiqueta-naranja';
        return '<td><strong>' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + row.buyDate + '</td><td>' + row.expDate + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

    // ---------- MANTENIMIENTOS ----------
    if (data.maintenance) {
      poblarTabla('tablaMantenimientosBody', data.maintenance, function(row) {
        var estadoClase = 'etiqueta-naranja';
        if (row.status === 'Listo para Entrega') estadoClase = 'etiqueta-verde';
        if (row.status === 'En Diagnóstico') estadoClase = 'etiqueta-azul';
        return '<td><strong>' + row.maintenanceOrder + '</strong></td><td>' + row.equipment + '</td><td>' + row.client + '</td><td>' + row.tech + '</td><td>' + row.cost + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

    // ---------- REPARACIONES ----------
    if (data.repairs) {
      poblarTabla('tablaReparacionBody', data.repairs, function(row) {
        var estadoClase = row.status === 'En Reparación' ? 'etiqueta-azul' : (row.status === 'Completada' ? 'etiqueta-verde' : 'etiqueta-rojo');
        return '<td><strong>' + row.ticket + '</strong></td><td>' + row.device + '</td><td>' + row.defect + '</td><td>' + row.client + '</td><td>' + row.price + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

    // ---------- DESCUENTOS ----------
    if (data.discounts) {
      poblarTabla('tablaDescuentosBody', data.discounts, function(row) {
        var estadoClase = row.status === 'Activo' ? 'etiqueta-verde' : 'etiqueta-rojo';
        return '<td><strong>' + row.code + '</strong></td><td>Porcentaje</td><td>' + row.percent + '</td><td>' + (row.discountDescription || '') + '</td><td>' + row.expires + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('descActivos');
      if (el) el.textContent = data.discounts.length;
    }

    // ---------- CLIENTES ----------
    if (data.clients) {
      poblarTabla('tablaClientesBody', data.clients, function(row) {
        var fechaVisita = row.lastVisit ? new Date(row.lastVisit).toISOString().split('T')[0] : 'N/A';
        return '<td><strong>CLI-' + row.id + '</strong></td><td>' + row.name + '</td><td>' + (row.phone || 'N/A') + '</td><td>' + row.email + '</td><td>$ ' + Number(row.totalSpent).toLocaleString('es-CO') + '</td><td>' + fechaVisita + '</td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('cliTotal');
      if (el) el.textContent = data.clients.length;
      el = document.getElementById('cliActivos');
      if (el) el.textContent = data.clients.length;
    }

    // ---------- RESEÑAS ----------
    if (data.reviews && data.reviews.length > 0) {
      poblarTabla('tablaResenasBody', data.reviews, function(row) {
        return '<td><strong>RES-' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + row.rating + '</td><td>' + row.comment + '</td><td>' + row.date + '</td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('resTotal');
      if (el) el.textContent = data.reviews.length;
    }

    // ---------- RESUMEN FINANCIERO ----------
    el = document.getElementById('finIngresos');
    if (el) el.textContent = '$ ' + Number(data.summary.salesTotal || 0).toLocaleString('es-CO');

    mostrarToast('success', 'Datos del panel cargados correctamente');
  })
  .catch(function(err) {
    console.error('Error al cargar el dashboard:', err);
    mostrarToast('error', 'No se pudieron cargar los datos del servidor. Verifica que MySQL esté corriendo.');
  });
}

// ==========================================================================
// 6. FUNCIÓN AUXILIAR: POBLAR TABLA CON DATOS
// ==========================================================================
function poblarTabla(idTbody, datos, generarFila) {
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  if (!datos || datos.length === 0) return;

  // Limpiar la tabla (quitar mensajes de "No hay registros")
  tbody.innerHTML = '';

  for (var i = 0; i < datos.length; i++) {
    var fila = document.createElement('tr');
    fila.innerHTML = generarFila(datos[i]);
    tbody.appendChild(fila);
  }
}

// ==========================================================================
// 7. GUARDAR DATOS DESDE LOS FORMULARIOS MODALES
// ==========================================================================
function guardarDatos(evento) {
  evento.preventDefault();

  var c1 = document.getElementById('campo1') ? document.getElementById('campo1').value : '';
  var c2 = document.getElementById('campo2') ? document.getElementById('campo2').value : '';
  var c3 = document.getElementById('campo3') ? document.getElementById('campo3').value : '';
  var c4 = document.getElementById('campo4') ? document.getElementById('campo4').value : '';

  var fechaHoy = new Date().toISOString().split('T')[0];

  // --- INVENTARIO: Crear producto en BD ---
  if (tipoModalActual === 'inventario') {
    var datosProducto = {
      name: c1,
      category: c2,
      publisher: 'General',
      price: Number(c3),
      stock: Number(c4),
      imageUrl: 'img/productos/default.jpg',
      description: c1
    };

    fetch(API_BASE + '/api/admin/productos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sessionToken
      },
      body: JSON.stringify(datosProducto)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.ok) {
        mostrarToast('success', '✅ Producto creado exitosamente');
        cargarDashboard(); // recargar todos los datos
      } else {
        mostrarToast('error', data.message || 'Error al crear producto');
      }
    })
    .catch(function(err) {
      console.error('Error:', err);
      mostrarToast('error', 'Error de conexión al crear producto');
    });

    cerrarModal();
    return;
  }

  // --- PARA LOS DEMÁS MÓDULOS: Inserción temporal en la tabla ---
  if (tipoModalActual === 'garantias') {
    insertarFila('tablaGarantiasBody', '<td><strong>GAR-' + (Math.floor(Math.random()*900)+100) + '</strong></td><td>' + c1 + '</td><td>' + c2 + '</td><td>' + fechaHoy + '</td><td>' + c3 + ' Meses</td><td><span class="etiqueta-verde">Activa</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
  } else if (tipoModalActual === 'mantenimientos') {
    insertarFila('tablaMantenimientosBody', '<td><strong>MNT-' + (Math.floor(Math.random()*900)+100) + '</strong></td><td>' + c1 + '</td><td>' + c2 + '</td><td>' + c3 + '</td><td>$ ' + Number(c4).toLocaleString('es-CO') + '</td><td><span class="etiqueta-naranja">En Taller</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
  } else if (tipoModalActual === 'reparacion') {
    insertarFila('tablaReparacionBody', '<td><strong>REP-' + (Math.floor(Math.random()*900)+100) + '</strong></td><td>' + c1 + '</td><td>' + c2 + '</td><td>' + c3 + '</td><td>$ ' + Number(c4).toLocaleString('es-CO') + '</td><td><span class="etiqueta-azul">En Reparación</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
  } else if (tipoModalActual === 'descuentos') {
    insertarFila('tablaDescuentosBody', '<td><strong>' + c1.toUpperCase() + '</strong></td><td>Porcentaje</td><td>' + c2 + '</td><td>' + fechaHoy + '</td><td>' + c3 + '</td><td><span class="etiqueta-verde">Activo</span></td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
    var totalDesc = document.querySelectorAll('#tablaDescuentosBody tr').length;
    var elDesc = document.getElementById('descActivos');
    if (elDesc) elDesc.textContent = totalDesc;
  } else if (tipoModalActual === 'resenas') {
    insertarFila('tablaResenasBody', '<td><strong>RES-' + (Math.floor(Math.random()*900)+100) + '</strong></td><td>' + c1 + '</td><td>' + c2 + '</td><td>' + c3 + '</td><td>"' + (c4 || 'Sin comentarios') + '"</td><td>' + fechaHoy + '</td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
    var totalRes = document.querySelectorAll('#tablaResenasBody tr').length;
    var elRes = document.getElementById('resTotal');
    if (elRes) elRes.textContent = totalRes;
  } else if (tipoModalActual === 'clientes') {
    insertarFila('tablaClientesBody', '<td><strong>CLI-' + (Math.floor(Math.random()*900)+100) + '</strong></td><td>' + c1 + '</td><td>' + c2 + '</td><td>' + c3 + '</td><td>' + c4 + '</td><td>' + fechaHoy + '</td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
    var totalCli = document.querySelectorAll('#tablaClientesBody tr').length;
    var elCli = document.getElementById('cliTotal');
    if (elCli) elCli.textContent = totalCli;
    var elCliAct = document.getElementById('cliActivos');
    if (elCliAct) elCliAct.textContent = totalCli;
  } else if (tipoModalActual === 'pedidos') {
    insertarFila('tablaPedidosBody', '<td><strong>#' + (Math.floor(Math.random()*900)+100) + '</strong></td><td>' + c1 + '</td><td><span class="etiqueta-verde">Pagada</span></td><td>$ ' + Number(c2).toLocaleString('es-CO') + '</td><td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>');
    var totalPed = document.querySelectorAll('#tablaPedidosBody tr').length;
    var elPed = document.getElementById('homePedidosTotales');
    if (elPed) elPed.textContent = totalPed;
  }

  cerrarModal();
  mostrarToast('success', '✅ Registro agregado exitosamente');
}

// ==========================================================================
// 8. FUNCIONES AUXILIARES PARA MANIPULAR FILAS
// ==========================================================================
function insertarFila(idTbody, contenidoHtml) {
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  // Si existe el mensaje de "No hay registros", lo eliminamos primero
  var vacio = tbody.querySelector('.texto-vacio');
  if (vacio) {
    tbody.innerHTML = "";
  }

  var nuevaFila = document.createElement('tr');
  nuevaFila.innerHTML = contenidoHtml;
  tbody.appendChild(nuevaFila);
}

function eliminarFila(boton) {
  if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
    var fila = boton.closest('tr');
    var tbody = fila.parentElement;
    fila.remove();

    if (tbody.getElementsByTagName('tr').length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="texto-vacio">No hay registros en la base de datos</td></tr>';
    }
    mostrarToast('success', 'Registro eliminado');
  }
}

// Eliminar producto de la BD (soft-delete)
function eliminarFilaDB(boton, recurso, id) {
  if (!confirm("¿Estás seguro de que deseas eliminar este registro de la base de datos?")) return;

  fetch(API_BASE + '/api/admin/' + recurso + '/' + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.ok) {
      mostrarToast('success', 'Registro eliminado de la base de datos');
      cargarDashboard();
    } else {
      mostrarToast('error', data.message || 'Error al eliminar');
    }
  })
  .catch(function(err) {
    console.error('Error:', err);
    mostrarToast('error', 'Error de conexión al eliminar');
  });
}

// ==========================================================================
// 9. CARGAR DATOS AL INICIAR LA PÁGINA
// ==========================================================================
document.addEventListener('DOMContentLoaded', function() {
  cargarDashboard();
});
