

var API_BASE = 'http://localhost:3000';

var tipoModalActual = "";

var sessionToken = localStorage.getItem('sessionToken') || '';

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

function cambiarPestana(idSeccion, botonClickeado) {

  var secciones = document.querySelectorAll('.seccion');
  for (var i = 0; i < secciones.length; i++) {
    secciones[i].classList.remove('visible');
  }

var seccionDestino = document.getElementById(idSeccion);
  if (seccionDestino) {
    seccionDestino.classList.add('visible');
  }

if (botonClickeado) {
    var botones = document.querySelectorAll('.boton-menu');
    for (var j = 0; j < botones.length; j++) {
      botones[j].classList.remove('activo');
    }
    botonClickeado.classList.add('activo');
  }

window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

function toggleMenuPerfil() {
  var menu = document.getElementById('menuPerfil');
  if (menu) {
    menu.classList.toggle('abierto');
  }
}

function cerrarSesion(evento) {
  if (evento) evento.preventDefault();

  if (!confirm("¿Estás seguro de que deseas cerrar sesión?")) {
    return;
  }

  mostrarToast('info', 'Cerrando sesión...');

if (sessionToken) {
    fetch(API_BASE + '/api/session', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + sessionToken }
    }).catch(function() {});
  }

localStorage.removeItem('sessionToken');
  sessionStorage.removeItem('sessionToken');
  sessionStorage.removeItem('wiiu_usuario_activo');

setTimeout(function() {
    window.location.href = '../Login.html';
  }, 600);
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

var categoriasDisponibles = [];
var marcasDisponibles = [];
var clientesDisponibles = [];
var productosDisponibles = [];

function abrirModal(tipo) {
  tipoModalActual = tipo;
  var modal = document.getElementById('modalFormulario');
  var titulo = document.getElementById('modalTitulo');
  var campos = document.getElementById('modalCampos');

  modal.classList.add('activo');

  if (tipo === 'garantias') {
    titulo.textContent = "Registrar Nueva Garantía";
    var optsClientes = clientesDisponibles.length > 0
      ? clientesDisponibles.map(function(c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('')
      : '<option value="Carlos Ramirez">Carlos Ramirez</option><option value="Laura Gomez">Laura Gomez</option>';
    var optsProds = productosDisponibles.length > 0
      ? productosDisponibles.map(function(p) { return '<option value="' + p.name + '">' + p.name + '</option>'; }).join('')
      : '<option value="Mouse Logitech M185">Mouse Logitech M185</option><option value="SSD Kingston A400 480GB">SSD Kingston A400 480GB</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Cliente:</label>
        <select id="campo1" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Producto Asociado:</label>
        <select id="campo2" required>${optsProds}</select>
      </div>
      <div class="campo-grupo">
        <label>Meses de Cobertura:</label>
        <select id="campo3">
          <option value="3">3 Meses</option>
          <option value="6">6 Meses</option>
          <option value="12" selected>12 Meses (1 Año)</option>
          <option value="24">24 Meses (2 Años)</option>
        </select>
      </div>
    `;
  } else if (tipo === 'mantenimientos') {
    titulo.textContent = "Nuevo Servicio de Mantenimiento";
    var optsClientes = clientesDisponibles.length > 0
      ? clientesDisponibles.map(function(c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('')
      : '<option value="Carlos Ramirez">Carlos Ramirez</option><option value="Laura Gomez">Laura Gomez</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Equipo / Consola a Mantenimiento:</label>
        <input type="text" id="campo1" required placeholder="Ej. PlayStation 5 / Laptop ASUS">
      </div>
      <div class="campo-grupo">
        <label>Cliente Propietario:</label>
        <select id="campo2" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Técnico Responsable:</label>
        <select id="campo3">
          <option value="Sofia MartineZ">Sofia MartineZ</option>
          <option value="Mateo Rios">Mateo Rios</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label>Costo del Servicio ($):</label>
        <input type="number" id="campo4" required min="10000" step="5000" placeholder="Ej. 180000">
      </div>
    `;
  } else if (tipo === 'inventario') {
    titulo.textContent = "Agregar Producto al Inventario";
    var optsCat = categoriasDisponibles.length > 0
      ? categoriasDisponibles.map(function(cat) { return '<option value="' + cat.nombre_cat + '">' + cat.nombre_cat + '</option>'; }).join('')
      : '<option value="Perifericos">Perifericos</option><option value="Portatiles">Portatiles</option><option value="Almacenamiento">Almacenamiento</option><option value="Consolas y Videojuegos">Consolas y Videojuegos</option>';

    var optsMarcas = marcasDisponibles.length > 0
      ? marcasDisponibles.map(function(m) { return '<option value="' + m.nombre_marca + '">' + m.nombre_marca + '</option>'; }).join('')
      : '<option value="Logitech">Logitech</option><option value="Sony">Sony</option><option value="Nintendo">Nintendo</option><option value="ASUS">ASUS</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre del Producto:</label>
        <input type="text" id="campo1" required placeholder="Ej. Nintendo Switch OLED">
      </div>
      <div class="campo-grupo">
        <label>Categoría:</label>
        <select id="campo2" required>${optsCat}</select>
      </div>
      <div class="campo-grupo">
        <label>Marca:</label>
        <select id="campo_marca" required>${optsMarcas}</select>
      </div>
      <div class="campo-grupo">
        <label>Precio de Venta ($):</label>
        <input type="number" id="campo3" required min="1000" step="1000" placeholder="Ej. 1450000">
      </div>
      <div class="campo-grupo">
        <label>Unidades en Stock Inicial:</label>
        <input type="number" id="campo4" required min="1" placeholder="Ej. 10">
      </div>
    `;
  } else if (tipo === 'reparacion') {
    titulo.textContent = "Nueva Orden de Reparación";
    var optsClientes = clientesDisponibles.length > 0
      ? clientesDisponibles.map(function(c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('')
      : '<option value="Carlos Ramirez">Carlos Ramirez</option><option value="Laura Gomez">Laura Gomez</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Dispositivo a Reparar:</label>
        <input type="text" id="campo1" required placeholder="Ej. GamePad Wii U / Pantalla rota">
      </div>
      <div class="campo-grupo">
        <label>Falla Reportada por el Cliente:</label>
        <input type="text" id="campo2" required placeholder="Ej. Pantalla no da imagen o puerto HDMI dañado">
      </div>
      <div class="campo-grupo">
        <label>Cliente:</label>
        <select id="campo3" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Presupuesto Estimado ($):</label>
        <input type="number" id="campo4" required min="10000" step="5000" placeholder="Ej. 65000">
      </div>
    `;
  } else if (tipo === 'descuentos') {
    titulo.textContent = "Crear Código de Descuento";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Código del Cupón:</label>
        <input type="text" id="campo1" required placeholder="Ej. WIIU2026" style="text-transform: uppercase;">
      </div>
      <div class="campo-grupo">
        <label>Porcentaje de Descuento (%):</label>
        <input type="number" id="campo2" required min="1" max="90" placeholder="Ej. 15">
      </div>
      <div class="campo-grupo">
        <label>Descripción / Nota del Cupón:</label>
        <input type="text" id="campo3" placeholder="Ej. Descuento de temporada navideña">
      </div>
    `;
  } else if (tipo === 'resenas') {
    titulo.textContent = "Moderar / Agregar Reseña";
    var optsClientes = clientesDisponibles.length > 0
      ? clientesDisponibles.map(function(c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('')
      : '<option value="Carlos Ramirez">Carlos Ramirez</option><option value="Laura Gomez">Laura Gomez</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Cliente:</label>
        <select id="campo1" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Producto o Servicio:</label>
        <input type="text" id="campo2" required placeholder="Ej. Mantenimiento Preventivo o Compra">
      </div>
      <div class="campo-grupo">
        <label>Calificación:</label>
        <select id="campo3">
          <option value="5 estrellas">⭐⭐⭐⭐⭐ (5 Estrellas)</option>
          <option value="4 estrellas">⭐⭐⭐⭐ (4 Estrellas)</option>
          <option value="3 estrellas">⭐⭐⭐ (3 Estrellas)</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label>Comentario u Opinión:</label>
        <textarea id="campo4" rows="3" required placeholder="Excelente atención, rapidez y calidad..."></textarea>
      </div>
    `;
  } else if (tipo === 'clientes') {
    titulo.textContent = "Registrar Nuevo Cliente";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre y Apellidos:</label>
        <input type="text" id="campo1" required placeholder="Ej. Mario Alejandro Pérez">
      </div>
      <div class="campo-grupo">
        <label>Teléfono de Contacto:</label>
        <input type="tel" id="campo2" required placeholder="Ej. 3124567890">
      </div>
      <div class="campo-grupo">
        <label>Correo Electrónico:</label>
        <input type="email" id="campo3" required placeholder="Ej. cliente@gmail.com">
      </div>
    `;
  } else if (tipo === 'pedidos') {
    titulo.textContent = "Registrar Nuevo Pedido / Venta";
    var optsClientes = clientesDisponibles.length > 0
      ? clientesDisponibles.map(function(c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('')
      : '<option value="Carlos Ramirez">Carlos Ramirez</option><option value="Laura Gomez">Laura Gomez</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Cliente:</label>
        <select id="campo1" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Total de la Venta ($):</label>
        <input type="number" id="campo2" required min="5000" step="1000" placeholder="Ej. 180000">
      </div>
    `;
  }
}

function cerrarModal() {
  var modal = document.getElementById('modalFormulario');
  if (modal) {
    modal.classList.remove('activo');
  }
  tipoModalActual = "";
}

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

if (data.categories) categoriasDisponibles = data.categories;
    if (data.brands) marcasDisponibles = data.brands;
    if (data.clients) clientesDisponibles = data.clients;
    if (data.inventory) productosDisponibles = data.inventory;

var el;
    el = document.getElementById('homeVentasTotales');
    if (el) el.textContent = '$ ' + Number(data.summary.salesTotal || 0).toLocaleString('es-CO');

    el = document.getElementById('homePedidosTotales');
    if (el) el.textContent = data.summary.ordersCount || 0;

    el = document.getElementById('homeClientesNuevos');
    if (el) el.textContent = data.summary.clientsCount || 0;

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

if (data.recentOrders) {
      poblarTabla('tablaPedidosBody', data.recentOrders, function(row) {
        var estadoClase = row.estado === 'PAGADA' ? 'etiqueta-verde' : 'etiqueta-naranja';
        return '<td><strong>#' + row.id_venta + '</strong></td><td>' + row.nombre + ' ' + row.apellido + '</td><td><span class="' + estadoClase + '">' + row.estado + '</span></td><td>$ ' + Number(row.total).toLocaleString('es-CO') + '</td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'pedidos\', ' + row.id_venta + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

if (data.inventory) {
      poblarTabla('tablaInventarioBody', data.inventory, function(row) {
        var stockTexto = row.stock + ' uds';
        var estadoClase = row.stock > 0 ? 'etiqueta-verde' : 'etiqueta-rojo';
        var estadoTexto = row.stock > 0 ? 'Disponible' : 'Agotado';
        return '<td><strong>' + row.name + '</strong></td><td>' + row.sku + '</td><td>' + row.category + '</td><td>$ ' + Number(row.price).toLocaleString('es-CO') + '</td><td>' + stockTexto + '</td><td>' + (row.warranty || '12 Meses') + '</td><td><span class="' + estadoClase + '">' + estadoTexto + '</span></td><td><button class="boton-icono" title="Editar"><i class="fi fi-rr-edit"></i></button><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'productos\', ' + row.id + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });

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

if (data.warranties) {
      poblarTabla('tablaGarantiasBody', data.warranties, function(row) {
        var estadoClase = row.status === 'Activa' ? 'etiqueta-verde' : 'etiqueta-naranja';
        var rawId = String(row.id).replace('GAR-', '');
        return '<td><strong>' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + String(row.buyDate).substring(0,10) + '</td><td>' + String(row.expDate).substring(0,10) + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'garantias\', ' + rawId + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

if (data.maintenance) {
      poblarTabla('tablaMantenimientosBody', data.maintenance, function(row) {
        var estadoClase = 'etiqueta-naranja';
        if (row.status === 'Listo para Entrega') estadoClase = 'etiqueta-verde';
        if (row.status === 'En Diagnóstico') estadoClase = 'etiqueta-azul';
        var rawId = String(row.maintenanceOrder).replace('MNT-', '');
        return '<td><strong>' + row.maintenanceOrder + '</strong></td><td>' + row.equipment + '</td><td>' + row.client + '</td><td>' + row.tech + '</td><td>' + row.cost + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'mantenimientos\', ' + rawId + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

if (data.repairs) {
      poblarTabla('tablaReparacionBody', data.repairs, function(row) {
        var estadoClase = row.status === 'En Reparación' ? 'etiqueta-azul' : (row.status === 'Completada' ? 'etiqueta-verde' : 'etiqueta-rojo');
        var rawId = String(row.ticket).replace('REP-', '');
        return '<td><strong>' + row.ticket + '</strong></td><td>' + row.device + '</td><td>' + row.defect + '</td><td>' + row.client + '</td><td>' + row.price + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'reparaciones\', ' + rawId + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

if (data.discounts) {
      poblarTabla('tablaDescuentosBody', data.discounts, function(row) {
        var estadoClase = row.status === 'Activo' ? 'etiqueta-verde' : 'etiqueta-rojo';
        var rawId = String(row.code).replace('PROM-', '');
        return '<td><strong>' + row.code + '</strong></td><td>Porcentaje</td><td>' + row.percent + '</td><td>' + (row.discountDescription || '') + '</td><td>' + row.expires + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'descuentos\', ' + rawId + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('descActivos');
      if (el) el.textContent = data.discounts.length;
    }

if (data.clients) {
      poblarTabla('tablaClientesBody', data.clients, function(row) {
        var fechaVisita = row.lastVisit ? new Date(row.lastVisit).toISOString().split('T')[0] : 'N/A';
        return '<td><strong>CLI-' + row.id + '</strong></td><td>' + row.name + '</td><td>' + (row.phone || 'N/A') + '</td><td>' + row.email + '</td><td>$ ' + Number(row.totalSpent).toLocaleString('es-CO') + '</td><td>' + fechaVisita + '</td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'clientes\', ' + row.id + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('cliTotal');
      if (el) el.textContent = data.clients.length;
      el = document.getElementById('cliActivos');
      if (el) el.textContent = data.clients.length;
    }

if (data.reviews && data.reviews.length > 0) {
      poblarTabla('tablaResenasBody', data.reviews, function(row) {
        return '<td><strong>RES-' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + row.rating + '</td><td>' + row.comment + '</td><td>' + row.date + '</td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'resenas\', ' + row.id + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('resTotal');
      if (el) el.textContent = data.reviews.length;
    }

el = document.getElementById('finIngresos');
    if (el) el.textContent = '$ ' + Number(data.summary.salesTotal || 0).toLocaleString('es-CO');

    mostrarToast('success', 'Datos del panel cargados correctamente');
  })
  .catch(function(err) {
    console.error('Error al cargar el dashboard:', err);
    mostrarToast('error', 'No se pudieron cargar los datos del servidor. Verifica que MySQL esté corriendo.');
  });
}

function poblarTabla(idTbody, datos, generarFila) {
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  if (!datos || datos.length === 0) return;

tbody.innerHTML = '';

  for (var i = 0; i < datos.length; i++) {
    var fila = document.createElement('tr');
    fila.innerHTML = generarFila(datos[i]);
    tbody.appendChild(fila);
  }
}

function guardarDatos(evento) {
  evento.preventDefault();

  var c1 = document.getElementById('campo1') ? document.getElementById('campo1').value : '';
  var c2 = document.getElementById('campo2') ? document.getElementById('campo2').value : '';
  var c3 = document.getElementById('campo3') ? document.getElementById('campo3').value : '';
  var c4 = document.getElementById('campo4') ? document.getElementById('campo4').value : '';

  var url = '';
  var payload = {};

  if (tipoModalActual === 'inventario') {
    var campoMarca = document.getElementById('campo_marca');
    var marcaSeleccionada = campoMarca ? campoMarca.value : 'General';
    url = API_BASE + '/api/admin/productos';
    payload = {
      name: c1,
      category: c2,
      publisher: marcaSeleccionada,
      price: Number(c3),
      stock: Number(c4),
      imageUrl: 'img/productos/default.jpg',
      description: c1
    };
  } else if (tipoModalActual === 'garantias') {
    url = API_BASE + '/api/admin/garantias';
    payload = {
      client: c1,
      product: c2,
      buyDate: new Date().toISOString().split('T')[0],
      duration: c3 + ' Meses'
    };
  } else if (tipoModalActual === 'mantenimientos') {
    url = API_BASE + '/api/admin/mantenimientos';
    payload = {
      equipment: c1,
      client: c2,
      tech: c3,
      cost: Number(c4),
      status: 'En Taller'
    };
  } else if (tipoModalActual === 'reparacion') {
    url = API_BASE + '/api/admin/reparaciones';
    payload = {
      device: c1,
      defect: c2,
      client: c3,
      price: Number(c4)
    };
  } else if (tipoModalActual === 'descuentos') {
    url = API_BASE + '/api/admin/descuentos';
    var numPercent = parseInt(c2) || 15;
    payload = {
      code: c1.toUpperCase().trim(),
      percent: numPercent,
      limit: 100,
      desc: c3 || ('Cupón ' + c1)
    };
  } else if (tipoModalActual === 'clientes') {
    url = API_BASE + '/api/admin/clientes';
    payload = {
      name: c1,
      phone: c2,
      email: c3
    };
  } else if (tipoModalActual === 'resenas') {
    url = API_BASE + '/api/admin/resenas';
    payload = {
      client: c1,
      comment: '[' + c3 + '] ' + c2 + ': ' + c4
    };
  } else if (tipoModalActual === 'pedidos') {
    url = API_BASE + '/api/admin/pedidos';
    payload = {
      client: c1,
      total: Number(c2)
    };
  }

  if (!url) {
    cerrarModal();
    return;
  }

  mostrarToast('info', 'Guardando en la base de datos...');

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.ok) {
      mostrarToast('success', '✅ ' + (data.message || 'Registro guardado exitosamente'));
      cargarDashboard(); // Recargar datos frescos desde MySQL
    } else {
      mostrarToast('error', data.message || 'Error al guardar');
    }
  })
  .catch(function(err) {
    console.error('Error al guardar en BD:', err);
    mostrarToast('error', 'Error de conexión con el servidor');
  });

  cerrarModal();
}

function insertarFila(idTbody, contenidoHtml) {
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

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

document.addEventListener('DOMContentLoaded', function() {
  cargarDashboard();
});
