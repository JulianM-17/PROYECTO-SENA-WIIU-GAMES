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
  var contenido = document.createElement('span');
  contenido.textContent = icono + ' ' + mensaje;
  toast.appendChild(contenido);
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

  var navegacion = document.getElementById('menuNavegacion');
  var botonHamburguesa = document.querySelector('.boton-hamburguesa');
  if (navegacion && botonHamburguesa) {
    navegacion.classList.remove('abierto');
    botonHamburguesa.setAttribute('aria-expanded', 'false');
    botonHamburguesa.setAttribute('aria-label', 'Abrir menú de navegación');
  }

  // 4. Subir la vista al inicio del contenido
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMenuMovil() {
  var navegacion = document.getElementById('menuNavegacion');
  var botonHamburguesa = document.querySelector('.boton-hamburguesa');
  if (!navegacion || !botonHamburguesa) return;

  var abierto = navegacion.classList.toggle('abierto');
  botonHamburguesa.setAttribute('aria-expanded', String(abierto));
  botonHamburguesa.setAttribute(
    'aria-label',
    abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
  );
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
// 3. MENÚ DE PERFIL, CERRAR SESIÓN Y NOTIFICACIONES
// ==========================================================================
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

  // Notificar al backend para invalidar la sesión
  if (sessionToken) {
    fetch(API_BASE + '/api/session', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + sessionToken }
    }).catch(function() {});
  }

  // Limpiar tokens y datos guardados en el navegador
  localStorage.removeItem('sessionToken');
  sessionStorage.removeItem('sessionToken');
  sessionStorage.removeItem('wiiu_usuario_activo');

  // Redirigir al Login después de una breve pausa para feedback
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
  var campana = document.querySelector('.campana-contenedor');
  var panelNotificaciones = document.getElementById('panelNotificaciones');
  var botonCampana = document.querySelector('.campana-alerta');
  if (campana && panelNotificaciones && botonCampana && !campana.contains(evento.target)) {
    panelNotificaciones.hidden = true;
    botonCampana.setAttribute('aria-expanded', 'false');
  }
});

function mostrarNotificaciones() {
  var panel = document.getElementById('panelNotificaciones');
  var boton = document.querySelector('.campana-alerta');
  if (!panel || !boton) return;

  panel.hidden = !panel.hidden;
  boton.setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) {
    notificacionesActuales.forEach(function(notificacion) {
      clavesNotificacionesLeidas.add(notificacion.key);
    });
    guardarClavesNotificaciones(
      claveAlmacenamientoNotificacionesLeidas,
      clavesNotificacionesLeidas,
      'leídas',
    );
    notificacionesNoLeidas = 0;
    actualizarContadorNotificaciones();
  }
}

var ventasNotificaciones = [];
var citasNotificaciones = [];
var inventarioNotificaciones = [];
var clavesNotificacionesConocidas = new Set();
var notificacionesActuales = [];
var claveAlmacenamientoNotificacionesDescartadas = 'wiiugames_admin_notificaciones_descartadas';
var claveAlmacenamientoNotificacionesLeidas = 'wiiugames_admin_notificaciones_leidas';
var clavesNotificacionesDescartadas = cargarClavesNotificaciones(
  claveAlmacenamientoNotificacionesDescartadas,
  'limpiadas',
);
var clavesNotificacionesLeidas = cargarClavesNotificaciones(
  claveAlmacenamientoNotificacionesLeidas,
  'leídas',
);
var notificacionesInicializadas = false;
var notificacionesNoLeidas = 0;
var notificacionesSolicitudEnCurso = false;

function cargarClavesNotificaciones(claveAlmacenamiento, descripcion) {
  try {
    var guardadas = JSON.parse(
      localStorage.getItem(claveAlmacenamiento) || '[]',
    );
    return new Set(
      Array.isArray(guardadas)
        ? guardadas.filter(function(clave) { return typeof clave === 'string'; })
        : [],
    );
  } catch (error) {
    console.warn('No se pudieron cargar las notificaciones ' + descripcion + ':', error);
    return new Set();
  }
}

function guardarClavesNotificaciones(claveAlmacenamiento, conjunto, descripcion) {
  try {
    localStorage.setItem(
      claveAlmacenamiento,
      JSON.stringify(Array.from(conjunto).slice(-500)),
    );
  } catch (error) {
    console.warn('No se pudieron guardar las notificaciones ' + descripcion + ':', error);
  }
}

function fechaLocalParaNotificaciones(fecha) {
  var valor = fecha || new Date();
  var anio = valor.getFullYear();
  var mes = String(valor.getMonth() + 1).padStart(2, '0');
  var dia = String(valor.getDate()).padStart(2, '0');
  var hora = String(valor.getHours()).padStart(2, '0');
  var minuto = String(valor.getMinutes()).padStart(2, '0');
  var segundo = String(valor.getSeconds()).padStart(2, '0');
  return anio + '-' + mes + '-' + dia + 'T' + hora + ':' + minuto + ':' + segundo;
}

function etiquetaDiaNotificacion(fechaTexto) {
  var fecha = new Date(String(fechaTexto || '').replace(' ', 'T'));
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';

  function claveDia(valor) {
    return [
      valor.getFullYear(),
      String(valor.getMonth() + 1).padStart(2, '0'),
      String(valor.getDate()).padStart(2, '0'),
    ].join('-');
  }

  var hoy = new Date();
  var ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  var diaNotificacion = claveDia(fecha);
  if (diaNotificacion === claveDia(hoy)) return 'Hoy';
  if (diaNotificacion === claveDia(ayer)) return 'Ayer';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha);
}

function actualizarContadorNotificaciones() {
  var contador = document.getElementById('contadorNotificaciones');
  var boton = document.querySelector('.campana-alerta');
  if (!contador || !boton) return;
  var icono = boton.querySelector('i');
  if (icono) {
    icono.classList.toggle('fi-sr-bell', notificacionesNoLeidas > 0);
    icono.classList.toggle('fi-rr-bell', notificacionesNoLeidas === 0);
  }
  contador.hidden = notificacionesNoLeidas === 0;
  contador.setAttribute(
    'aria-label',
    notificacionesNoLeidas + ' notificaciones nuevas',
  );
  boton.setAttribute(
    'aria-label',
    notificacionesNoLeidas
      ? 'Abrir notificaciones. ' + notificacionesNoLeidas + ' nuevas'
      : 'Abrir notificaciones',
  );
}

function actualizarNotificaciones(ventas, inventario, citas) {
  if (Array.isArray(ventas)) ventasNotificaciones = ventas;
  if (Array.isArray(inventario)) inventarioNotificaciones = inventario;
  if (Array.isArray(citas)) citasNotificaciones = citas;

  var notificaciones = [];
  var eventos = [];
  ventasNotificaciones.forEach(function(venta) {
    eventos.push({
      key: 'venta:' + venta.id,
      type: 'sale',
      createdAt: venta.createdAt,
      titulo: 'Nueva venta #' + escaparHtmlAdmin(venta.id),
      detalle:
        escaparHtmlAdmin(venta.client || 'Cliente') +
        ' · ' +
        escaparHtmlAdmin(venta.status || 'Registrada') +
        ' · $ ' +
        Number(venta.total || 0).toLocaleString('es-CO'),
    });
  });
  citasNotificaciones.forEach(function(cita) {
    var tipoServicio =
      cita.serviceType === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Reparación';
    eventos.push({
      key: 'cita:' + cita.id,
      type: 'appointment',
      createdAt: cita.createdAt,
      titulo: 'Nueva cita CIT-' + escaparHtmlAdmin(cita.id),
      detalle:
        escaparHtmlAdmin(cita.client || 'Cliente') +
        ' · ' +
        tipoServicio +
        ' · ' +
        escaparHtmlAdmin(cita.equipment || 'Equipo') +
        ' · ' +
        escaparHtmlAdmin(cita.status || 'Solicitud recibida'),
    });
  });

  var eventosNuevos = [];
  eventos.forEach(function(evento) {
    if (clavesNotificacionesConocidas.has(evento.key)) return;
    clavesNotificacionesConocidas.add(evento.key);
    if (
      notificacionesInicializadas &&
      !clavesNotificacionesDescartadas.has(evento.key) &&
      !clavesNotificacionesLeidas.has(evento.key)
    ) {
      eventosNuevos.push(evento);
    }
  });
  var alertasInventario = inventarioNotificaciones.filter(function(producto) {
    return Number(producto.stock) <= Number(producto.minStock || 3);
  });
  if (notificacionesInicializadas) {
    notificacionesNoLeidas += eventosNuevos.length;
  } else {
    notificacionesInicializadas = true;
    notificacionesNoLeidas = alertasInventario.filter(function(producto) {
      return !clavesNotificacionesDescartadas.has(
        'stock:' + (producto.id || producto.name),
      );
    }).length;
  }

  eventosNuevos.forEach(function(evento) {
    mostrarToast('info', evento.titulo + ' registrada.');
  });

  notificaciones.push.apply(notificaciones, eventos);
  alertasInventario.forEach(function(producto) {
    var stock = Number(producto.stock);
    notificaciones.push({
      key: 'stock:' + (producto.id || producto.name),
      createdAt: fechaLocalParaNotificaciones(new Date()),
      titulo: 'Stock bajo: ' + escaparHtmlAdmin(producto.name),
      detalle: 'Quedan ' + stock + ' unidades disponibles.'
    });
  });
  notificaciones.sort(function(a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  notificacionesActuales = notificaciones.filter(function(notificacion) {
    return !clavesNotificacionesDescartadas.has(notificacion.key);
  });
  notificacionesNoLeidas = notificacionesActuales.filter(function(notificacion) {
    return !clavesNotificacionesLeidas.has(notificacion.key);
  }).length;

  var lista = document.getElementById('listaNotificaciones');
  var botonLimpiar = document.getElementById('btnLimpiarNotificaciones');
  if (botonLimpiar) botonLimpiar.disabled = notificacionesActuales.length === 0;
  if (!lista) return;

  if (notificacionesActuales.length === 0) {
    lista.innerHTML = '<li class="notificacion-vacia">No hay notificaciones por ahora.</li>';
    actualizarContadorNotificaciones();
    return;
  }

  var gruposPorDia = new Map();
  notificacionesActuales.forEach(function(notificacion) {
    var grupo = etiquetaDiaNotificacion(notificacion.createdAt);
    if (!gruposPorDia.has(grupo)) gruposPorDia.set(grupo, []);
    gruposPorDia.get(grupo).push(notificacion);
  });
  lista.innerHTML = Array.from(gruposPorDia.entries()).map(function(grupo) {
    var avisosDelDia = grupo[1].map(function(notificacion) {
      return '<li><strong>' + notificacion.titulo + '</strong><span>' +
        notificacion.detalle + '</span></li>';
    }).join('');
    return '<li class="notificacion-grupo"><strong class="notificacion-dia">' +
      escaparHtmlAdmin(grupo[0]) + '</strong><ul class="notificaciones-dia">' +
      avisosDelDia + '</ul></li>';
  }).join('');
  actualizarContadorNotificaciones();
}

function limpiarNotificacionesAdmin() {
  if (!notificacionesActuales.length) return;
  if (!confirm('¿Quieres limpiar las notificaciones que aparecen en la lista?')) return;

  notificacionesActuales.forEach(function(notificacion) {
    clavesNotificacionesDescartadas.add(notificacion.key);
  });
  guardarClavesNotificaciones(
    claveAlmacenamientoNotificacionesDescartadas,
    clavesNotificacionesDescartadas,
    'limpiadas',
  );
  notificacionesNoLeidas = 0;
  actualizarNotificaciones(
    ventasNotificaciones,
    inventarioNotificaciones,
    citasNotificaciones,
  );
}

function cargarNotificacionesAdmin() {
  if (notificacionesSolicitudEnCurso || !sessionToken) return;
  notificacionesSolicitudEnCurso = true;
  fetch(API_BASE + '/api/admin/notifications', {
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(response) {
    if (!response.ok || !response.data.ok) {
      throw new Error(response.data.message || 'No se pudieron cargar las notificaciones.');
    }
    actualizarNotificaciones(
      response.data.sales,
      null,
      response.data.appointments,
    );
  })
  .catch(function(error) {
    console.error('Error al cargar las notificaciones:', error);
    if (!notificacionesInicializadas) {
      var lista = document.getElementById('listaNotificaciones');
      if (lista) {
        lista.innerHTML =
          '<li class="notificacion-vacia">No se pudieron cargar las notificaciones.</li>';
      }
    }
  })
  .finally(function() {
    notificacionesSolicitudEnCurso = false;
  });
}

// Variables globales de datos auxiliares para los modales
var categoriasDisponibles = [];
var marcasDisponibles = [];
var clientesDisponibles = [];
var tecnicosDisponibles = [];
var productosDisponibles = [];
var productoInventarioEdicion = null;
var detallesOrdenServicio = new Map();
var detalleOrdenAbiertaAdmin = null;

// ==========================================================================
// 4. VENTANAS MODALES PARA REGISTRAR DATOS
// ==========================================================================
function abrirModal(tipo, productoId) {
  tipoModalActual = tipo;
  productoInventarioEdicion = null;
  if (tipo === 'inventario' && productoId !== undefined) {
    productoInventarioEdicion = productosDisponibles.find(function(producto) {
      return String(producto.id) === String(productoId);
    });
    if (!productoInventarioEdicion) {
      mostrarToast('error', 'No se encontró el producto seleccionado.');
      tipoModalActual = '';
      return;
    }
  }

  var modal = document.getElementById('modalFormulario');
  var titulo = document.getElementById('modalTitulo');
  var campos = document.getElementById('modalCampos');

  limpiarErroresModal();
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
        <select id="campo3" required>
          <option value="3">3 Meses</option>
          <option value="6">6 Meses</option>
          <option value="12" selected>12 Meses (1 Año)</option>
          <option value="24">24 Meses (2 Años)</option>
        </select>
      </div>
    `;
  } else if (tipo === 'mantenimientos') {
    titulo.textContent = "Nuevo Servicio de Mantenimiento";
    var optsClientes = clientesDisponibles.map(function(c) {
      return '<option value="' + escaparHtmlAdmin(c.id) + '">' + escaparHtmlAdmin(c.name) + '</option>';
    }).join('');
    var optsTecnicos = tecnicosDisponibles.map(function(tech) {
      return '<option value="' + escaparHtmlAdmin(tech.id) + '">' + escaparHtmlAdmin(tech.name) + '</option>';
    }).join('');

    campos.innerHTML = `
      <div class="campo-grupo">
        <label for="campo1">Equipo / modelo:</label>
        <input type="text" id="campo1" required maxlength="100" placeholder="Ej. PlayStation 5 / Laptop ASUS">
      </div>
      <div class="campo-grupo">
        <label for="campo_tipo_equipo">Tipo de equipo:</label>
        <select id="campo_tipo_equipo" required>
          <option value="">Selecciona el tipo de equipo</option>
          <option value="Portatil">Portátil</option>
          <option value="Torre">Torre / PC</option>
          <option value="Consola">Consola</option>
          <option value="Control">Control</option>
          <option value="All in one">All in one</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label for="campo_marca_equipo">Marca:</label>
        <input type="text" id="campo_marca_equipo" required maxlength="20" placeholder="Ej. Nintendo, HP, ASUS">
      </div>
      <div class="campo-grupo">
        <label for="campo_serie_equipo">Número de serie (opcional):</label>
        <input type="text" id="campo_serie_equipo" maxlength="40" placeholder="Déjalo vacío si no está disponible">
      </div>
      <div class="campo-grupo">
        <label for="campo2">Cliente propietario:</label>
        <select id="campo2" required>
          <option value="">Selecciona un cliente</option>${optsClientes}
        </select>
      </div>
      <div class="campo-grupo">
        <label for="campo3">Técnico responsable:</label>
        <select id="campo3" required>
          <option value="">Selecciona un técnico</option>${optsTecnicos}
        </select>
      </div>
      <div class="campo-grupo">
        <label for="campo_detalle">Trabajo solicitado:</label>
        <textarea id="campo_detalle" required maxlength="100" rows="3" placeholder="Describe qué mantenimiento necesita el equipo"></textarea>
      </div>
      <div class="campo-grupo">
        <label for="campo_diagnostico">Diagnóstico u observaciones:</label>
        <textarea id="campo_diagnostico" maxlength="100" rows="3" placeholder="Opcional; si aún no se revisa, quedará pendiente de diagnóstico"></textarea>
      </div>
      <div class="campo-grupo">
        <label for="campo4">Presupuesto estimado ($):</label>
        <input type="number" id="campo4" required min="1" max="99999999" step="1" placeholder="Ej. 180000">
      </div>
    `;
  } else if (tipo === 'inventario') {
    var producto = productoInventarioEdicion;
    var categorias = categoriasDisponibles.length > 0
      ? categoriasDisponibles.map(function(cat) { return cat.nombre_cat; })
      : ['Periféricos', 'Portátiles', 'Almacenamiento', 'Consolas y Videojuegos'];
    var marcas = marcasDisponibles.length > 0
      ? marcasDisponibles.map(function(marca) { return marca.nombre_marca; })
      : ['Logitech', 'Sony', 'Nintendo', 'ASUS'];
    if (producto && categorias.indexOf(producto.category) === -1) {
      categorias.unshift(producto.category);
    }
    if (producto && marcas.indexOf(producto.publisher) === -1) {
      marcas.unshift(producto.publisher);
    }
    var optsCat = categorias.map(function(nombre) {
      var selected = producto && nombre === producto.category ? ' selected' : '';
      return '<option value="' + escaparHtmlAdmin(nombre) + '"' + selected + '>' + escaparHtmlAdmin(nombre) + '</option>';
    }).join('');
    var optsMarcas = marcas.map(function(nombre) {
      var selected = producto && nombre === producto.publisher ? ' selected' : '';
      return '<option value="' + escaparHtmlAdmin(nombre) + '"' + selected + '>' + escaparHtmlAdmin(nombre) + '</option>';
    }).join('');
    var valorCampo = function(valor) {
      return escaparHtmlAdmin(valor === undefined || valor === null ? '' : valor);
    };
    var stockSucursal = producto
      ? (producto.branchStock === undefined ? producto.stock : producto.branchStock)
      : '';
    titulo.textContent = producto ? 'Editar Producto del Inventario' : 'Agregar Producto al Inventario';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre del Producto:</label>
        <input type="text" id="campo1" required maxlength="100" value="${valorCampo(producto && producto.name)}" placeholder="Ej. Nintendo Switch OLED">
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
        <input type="number" id="campo3" required min="1" step="1" value="${valorCampo(producto && producto.price)}" placeholder="Ej. 1450000">
      </div>
      <div class="campo-grupo">
        <label>Unidades en la sucursal seleccionada:</label>
        <input type="number" id="campo4" required min="0" step="1" value="${valorCampo(stockSucursal)}" placeholder="Ej. 10">
      </div>
      <div class="campo-grupo">
        <label>Descripción:</label>
        <textarea id="campo_descripcion" required maxlength="100" rows="3" placeholder="Descripción breve">${valorCampo(producto && producto.description)}</textarea>
      </div>
      <div class="campo-grupo">
        <label>Imagen principal (ruta o URL):</label>
        <input type="text" id="campo_imagen_principal" required maxlength="255" value="${valorCampo(producto ? producto.imageUrl : '../Assets/lenovolegion.webp')}" placeholder="../Assets/producto.png">
      </div>
      <div class="campo-grupo">
        <label>Imagen adicional 1 (opcional):</label>
        <input type="text" id="campo_imagen_2" maxlength="255" value="${valorCampo(producto && producto.imageUrl2)}" placeholder="../Assets/producto-2.png">
        <label for="archivo_imagen_2">O subir desde la PC:</label>
        <input type="file" id="archivo_imagen_2" accept="image/jpeg,image/png,image/webp,image/gif">
        <small class="ayuda-campo">Si eliges un archivo, reemplazará el enlace de arriba.</small>
      </div>
      <div class="campo-grupo">
        <label>Imagen adicional 2 (opcional):</label>
        <input type="text" id="campo_imagen_3" maxlength="255" value="${valorCampo(producto && producto.imageUrl3)}" placeholder="../Assets/producto-3.png">
        <label for="archivo_imagen_3">O subir desde la PC:</label>
        <input type="file" id="archivo_imagen_3" accept="image/jpeg,image/png,image/webp,image/gif">
        <small class="ayuda-campo">Si eliges un archivo, reemplazará el enlace de arriba.</small>
      </div>
      <div class="campo-grupo">
        <label>Imagen adicional 3 (opcional):</label>
        <input type="text" id="campo_imagen_4" maxlength="255" value="${valorCampo(producto && producto.imageUrl4)}" placeholder="../Assets/producto-4.png">
        <label for="archivo_imagen_4">O subir desde la PC:</label>
        <input type="file" id="archivo_imagen_4" accept="image/jpeg,image/png,image/webp,image/gif">
        <small class="ayuda-campo">Si eliges un archivo, reemplazará el enlace de arriba.</small>
      </div>
    `;
  } else if (tipo === 'reparacion') {
    titulo.textContent = "Nueva Orden de Reparación";
    var optsClientes = clientesDisponibles.map(function(c) {
      return '<option value="' + escaparHtmlAdmin(c.id) + '">' + escaparHtmlAdmin(c.name) + '</option>';
    }).join('');
    var optsTecnicos = tecnicosDisponibles.map(function(tech) {
      return '<option value="' + escaparHtmlAdmin(tech.id) + '">' + escaparHtmlAdmin(tech.name) + '</option>';
    }).join('');

    campos.innerHTML = `
      <div class="campo-grupo">
        <label for="campo1">Equipo / modelo:</label>
        <input type="text" id="campo1" required maxlength="100" placeholder="Ej. GamePad Wii U">
      </div>
      <div class="campo-grupo">
        <label for="campo_tipo_equipo">Tipo de equipo:</label>
        <select id="campo_tipo_equipo" required>
          <option value="">Selecciona el tipo de equipo</option>
          <option value="Portatil">Portátil</option>
          <option value="Torre">Torre / PC</option>
          <option value="Consola">Consola</option>
          <option value="Control">Control</option>
          <option value="All in one">All in one</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label for="campo_marca_equipo">Marca:</label>
        <input type="text" id="campo_marca_equipo" required maxlength="20" placeholder="Ej. Nintendo, HP, ASUS">
      </div>
      <div class="campo-grupo">
        <label for="campo_serie_equipo">Número de serie (opcional):</label>
        <input type="text" id="campo_serie_equipo" maxlength="40" placeholder="Déjalo vacío si no está disponible">
      </div>
      <div class="campo-grupo">
        <label for="campo2">Falla reportada por el cliente:</label>
        <textarea id="campo2" required maxlength="100" rows="3" placeholder="Describe la falla reportada"></textarea>
      </div>
      <div class="campo-grupo">
        <label for="campo_diagnostico">Causa / diagnóstico técnico:</label>
        <textarea id="campo_diagnostico" maxlength="100" rows="3" placeholder="Opcional; si aún no se revisa, quedará pendiente de diagnóstico"></textarea>
      </div>
      <div class="campo-grupo">
        <label for="campo3">Cliente:</label>
        <select id="campo3" required>
          <option value="">Selecciona un cliente</option>${optsClientes}
        </select>
      </div>
      <div class="campo-grupo">
        <label for="campo_tecnico">Técnico responsable:</label>
        <select id="campo_tecnico" required>
          <option value="">Selecciona un técnico</option>${optsTecnicos}
        </select>
      </div>
      <div class="campo-grupo">
        <label for="campo4">Presupuesto estimado ($):</label>
        <input type="number" id="campo4" required min="1" max="99999999" step="1" placeholder="Ej. 65000">
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
        <input type="number" id="campo2" required min="1" max="99" placeholder="Ej. 15">
      </div>
      <div class="campo-grupo">
        <label>Descripción / Nota del Cupón:</label>
        <input type="text" id="campo3" required placeholder="Ej. Descuento de temporada navideña">
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
        <select id="campo3" required>
          <option value="5 estrellas">⭐⭐⭐⭐⭐ (5 Estrellas)</option>
          <option value="4 estrellas">⭐⭐⭐⭐ (4 Estrellas)</option>
          <option value="3 estrellas">⭐⭐⭐ (3 Estrellas)</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label>Comentario u Opinión:</label>
        <textarea id="campo4" rows="3" required placeholder="Escribe un comentario detallado (mínimo 5 caracteres)..."></textarea>
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
        <label>Teléfono de Contacto (7 a 15 dígitos):</label>
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
        <input type="number" id="campo2" required min="1000" step="500" placeholder="Ej. 180000">
      </div>
    `;
  }
}

// Funciones para marcar y limpiar errores visuales en los campos
function marcarErrorCampo(input, mensaje) {
  if (!input) return;
  input.classList.add('campo-invalido');
  var padre = input.parentElement;
  if (padre) {
    var errorSpan = padre.querySelector('.mensaje-error-campo');
    if (!errorSpan) {
      errorSpan = document.createElement('span');
      errorSpan.className = 'mensaje-error-campo';
      padre.appendChild(errorSpan);
    }
    errorSpan.textContent = mensaje;
  }
}

function limpiarErroresModal() {
  var invalidos = document.querySelectorAll('.campo-invalido');
  invalidos.forEach(function(el) { el.classList.remove('campo-invalido'); });
  var mensajes = document.querySelectorAll('.mensaje-error-campo');
  mensajes.forEach(function(m) { m.remove(); });
}

function cerrarModal() {
  var modal = document.getElementById('modalFormulario');
  if (modal) {
    modal.classList.remove('activo');
  }
  tipoModalActual = "";
  productoInventarioEdicion = null;
}

function escaparHtmlAdmin(valor) {
  return String(valor).replace(/[&<>"']/g, function(caracter) {
    var entidades = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entidades[caracter];
  });
}

function crearSelectorEstadoServicio(tipo, orden) {
  var estados = tipo === 'mantenimientos'
    ? [
        ['PENDIENTE', 'En Taller'],
        ['EN PROCESO', 'En Diagnóstico'],
        ['COMPLETO', 'Listo para Entrega'],
        ['CANCELADO', 'Cancelado']
      ]
    : [
        ['PENDIENTE', 'En Taller'],
        ['EN PROCESO', 'En Reparación'],
        ['COMPLETO', 'Completada'],
        ['CANCELADO', 'Cancelada']
      ];
  var actual = estados.some(function(estado) {
    return estado[0] === orden.statusCode;
  }) ? orden.statusCode : 'PENDIENTE';
  var id = Number(orden.id);
  return '<select class="select-filtro select-estado-servicio" id="estado-' + tipo + '-' + id + '" aria-label="Estado de la orden ' + escaparHtmlAdmin(orden.maintenanceOrder || orden.ticket) + '">' +
    estados.map(function(estado) {
      return '<option value="' + estado[0] + '"' + (estado[0] === actual ? ' selected' : '') + '>' + estado[1] + '</option>';
    }).join('') +
    '</select>';
}

function crearDetalleOrdenServicio(row, tipo) {
  var id = String(row.id);
  var source = row.source || 'service';
  detallesOrdenServicio.set(tipo + ':' + source + ':' + id, row);
  return '<button type="button" class="btn-mas-informacion" data-servicio-tipo="' +
    escaparHtmlAdmin(tipo) + '" data-servicio-id="' + escaparHtmlAdmin(id) +
    '" data-servicio-origen="' + escaparHtmlAdmin(source) +
    '" aria-label="Más información de ' +
    escaparHtmlAdmin(row.maintenanceOrder || row.ticket) +
    '">Más información</button>';
}

function agregarDatoLecturaDetalleAdmin(lista, etiquetaTexto, valorTexto) {
  var fila = document.createElement('div');
  var etiqueta = document.createElement('dt');
  var valor = document.createElement('dd');
  etiqueta.textContent = etiquetaTexto;
  valor.textContent = valorTexto || 'No registrado';
  fila.append(etiqueta, valor);
  lista.appendChild(fila);
}

function agregarCampoEdicionDetalleAdmin(form, nombre, etiquetaTexto, valor, tipo, opciones) {
  var contenedor = document.createElement('label');
  var etiqueta = document.createElement('span');
  var control = document.createElement(tipo === 'textarea' ? 'textarea' : tipo === 'select' ? 'select' : 'input');
  etiqueta.textContent = etiquetaTexto;
  contenedor.className = 'campo-edicion-detalle';
  control.name = nombre;
  control.id = 'campo-detalle-' + nombre;
  control.required =
    nombre === 'status' ||
    (nombre !== 'price' &&
      (nombre !== 'technicianId' || opciones?.[0]?.label !== 'Sin asignar'));

  if (tipo === 'select') {
    opciones.forEach(function(opcion) {
      var option = new Option(opcion.label, opcion.value);
      option.selected = String(opcion.value) === String(valor ?? '');
      control.add(option);
    });
  } else {
    control.type = tipo;
    control.value = valor ?? '';
    if (tipo === 'number') {
      control.min = '0';
      if (nombre === 'price' || nombre === 'cost') {
        control.max = nombre === 'price' ? '999999999999.99' : '99999999.99';
      }
      control.step = '0.01';
    }
    if (tipo === 'textarea') {
      control.rows = 4;
      control.maxLength = nombre === 'description' ? 1000 : 100;
    }
    if (nombre === 'equipment') control.maxLength = 100;
    if (nombre === 'phone') {
      control.maxLength = 10;
      control.inputMode = 'numeric';
    }
  }

  contenedor.append(etiqueta, control);
  form.appendChild(contenedor);
  return control;
}

function opcionesEstadoDetalleAdmin(origen) {
  return origen === 'appointment'
    ? [
        { value: 'SOLICITUD RECIBIDA', label: 'Solicitud recibida' },
        { value: 'CONFIRMADA', label: 'Confirmada' },
        { value: 'EN PROCESO', label: 'En proceso' },
        { value: 'COMPLETADA', label: 'Completada' },
        { value: 'CANCELADA', label: 'Cancelada' }
      ]
    : [
        { value: 'PENDIENTE', label: 'En Taller' },
        { value: 'EN PROCESO', label: 'En proceso' },
        { value: 'COMPLETO', label: 'Completada' },
        { value: 'CANCELADO', label: 'Cancelada' }
      ];
}

function opcionesTecnicoDetalleAdmin(tecnicoId, permitirSinAsignar) {
  var opciones = permitirSinAsignar
    ? [{ value: '', label: 'Sin asignar' }]
    : [{ value: '', label: 'Selecciona un técnico' }];
  return opciones.concat(tecnicosDisponibles.map(function(tecnico) {
    return { value: tecnico.id, label: tecnico.name };
  }));
}

function limpiarErrorCampoDetalleAdmin(form, campo) {
  var control = form.elements.namedItem(campo);
  if (control) {
    control.classList.remove('campo-invalido');
    control.removeAttribute('aria-invalid');
    control.parentElement?.querySelector('.mensaje-error-campo')?.remove();
  }
}

function mostrarErrorGeneralDetalleAdmin(form, mensaje) {
  var resumen = form.querySelector('.mensaje-error-general');
  if (!resumen) {
    resumen = document.createElement('div');
    resumen.className = 'mensaje-error-general';
    resumen.setAttribute('role', 'alert');
    form.prepend(resumen);
  }
  resumen.textContent = mensaje;
}

function marcarErroresCitaDetalleAdmin(form, errores) {
  Object.keys(errores || {}).forEach(function(campo) {
    var control = form.elements.namedItem(campo);
    if (!control) return;
    marcarErrorCampo(control, errores[campo]);
    control.setAttribute('aria-invalid', 'true');
  });
}

function validarCitaDetalleAdmin(form) {
  var errores = {};
  var equipo = form.elements.equipment.value.trim();
  var descripcion = form.elements.description.value.trim();
  var telefono = form.elements.phone.value.trim();
  var fecha = form.elements.appointmentDate.value;
  var precio = form.elements.price.value.trim();
  var tecnico = form.elements.technicianId.value;
  var estado = form.elements.status.value;
  var fechaParseada = new Date(fecha + 'T00:00:00Z');

  if (equipo.length < 2 || equipo.length > 100) {
    errores.equipment = 'El equipo debe tener entre 2 y 100 caracteres.';
  }
  if (descripcion.length < 10 || descripcion.length > 1000) {
    errores.description = 'La descripción debe tener entre 10 y 1000 caracteres.';
  }
  if (!/^\d{10}$/.test(telefono)) {
    errores.phone = 'El teléfono debe contener exactamente 10 dígitos.';
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    Number.isNaN(fechaParseada.getTime()) ||
    fechaParseada.toISOString().slice(0, 10) !== fecha
  ) {
    errores.appointmentDate = 'Selecciona una fecha válida para la cita.';
  }
  if (
    precio !== '' &&
    (!Number.isFinite(Number(precio)) ||
      Number(precio) < 0 ||
      Number(precio) > 999999999999.99)
  ) {
    errores.price = 'El precio debe estar entre 0 y 999.999.999.999,99.';
  }
  if (tecnico !== '' && (!/^\d+$/.test(tecnico) || !Number.isSafeInteger(Number(tecnico)))) {
    errores.technicianId = 'Selecciona un técnico válido o deja la cita sin asignar.';
  }
  if (!['SOLICITUD RECIBIDA', 'CONFIRMADA', 'EN PROCESO', 'COMPLETADA', 'CANCELADA'].includes(estado)) {
    errores.status = 'Selecciona un estado válido.';
  }
  return errores;
}

function nombreEstadoCitaAdmin(status) {
  var estados = {
    'SOLICITUD RECIBIDA': 'Solicitud recibida',
    CONFIRMADA: 'Confirmada',
    'EN PROCESO': 'En proceso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada'
  };
  return estados[status] || status || 'Sin estado';
}

function mostrarDetalleOrdenServicio(tipo, id, source) {
  var orden = detallesOrdenServicio.get(tipo + ':' + (source || 'service') + ':' + id);
  var dialogo = document.getElementById('modalDetalleServicio');
  var titulo = document.getElementById('modalDetalleTitulo');
  var contenido = document.getElementById('modalDetalleContenido');
  if (!orden || !dialogo || !titulo || !contenido) return;

  var esCita = orden.source === 'appointment';
  detalleOrdenAbiertaAdmin = { tipo: tipo, id: orden.id, source: esCita ? 'appointment' : 'service' };
  titulo.textContent = esCita
    ? (tipo === 'mantenimientos' ? 'Ticket de mantenimiento ' : 'Ticket de reparación ') + orden.reference
    : (tipo === 'mantenimientos' ? 'Mantenimiento ' + orden.maintenanceOrder : 'Reparación ' + orden.ticket);

  var form = document.createElement('form');
  form.id = 'formEditarDetalleServicio';
  form.className = 'form-edicion-detalle';
  form.noValidate = esCita;
  form.addEventListener('submit', guardarDetalleOrdenServicioAdmin);
  form.addEventListener('input', function(evento) {
    if (!evento.target?.name) return;
    limpiarErrorCampoDetalleAdmin(form, evento.target.name);
    form.querySelector('.mensaje-error-general')?.remove();
  });
  form.addEventListener('change', function(evento) {
    if (!evento.target?.name) return;
    limpiarErrorCampoDetalleAdmin(form, evento.target.name);
    form.querySelector('.mensaje-error-general')?.remove();
  });
  var datosLectura = document.createElement('dl');
  datosLectura.className = 'lista-detalle-servicio';
  agregarDatoLecturaDetalleAdmin(
    datosLectura,
    'Ticket',
    esCita ? orden.reference : orden.maintenanceOrder || orden.ticket,
  );
  agregarDatoLecturaDetalleAdmin(datosLectura, 'Cliente', orden.client);

  if (esCita) {
    agregarDatoLecturaDetalleAdmin(
      datosLectura,
      'Tipo de servicio',
      tipo === 'mantenimientos' ? 'Mantenimiento' : 'Reparación',
    );
    agregarCampoEdicionDetalleAdmin(form, 'equipment', 'Equipo', orden.equipment, 'text');
    agregarCampoEdicionDetalleAdmin(
      form,
      'description',
      'Descripción del problema o necesidad',
      orden.description,
      'textarea',
    );
    agregarCampoEdicionDetalleAdmin(form, 'phone', 'Teléfono', orden.phone, 'tel');
    agregarCampoEdicionDetalleAdmin(
      form,
      'appointmentDate',
      'Fecha de la cita',
      orden.appointmentDate,
      'date',
    );
    agregarCampoEdicionDetalleAdmin(form, 'price', 'Precio', orden.price, 'number');
    agregarCampoEdicionDetalleAdmin(
      form,
      'technicianId',
      'Técnico asignado',
      orden.technicianId,
      'select',
      opcionesTecnicoDetalleAdmin(orden.technicianId, true),
    );
  } else {
    agregarDatoLecturaDetalleAdmin(datosLectura, 'Equipo', orden.equipment || orden.device);
    agregarDatoLecturaDetalleAdmin(datosLectura, 'Tipo de equipo', orden.equipmentType);
    agregarDatoLecturaDetalleAdmin(datosLectura, 'Marca', orden.brand);
    agregarDatoLecturaDetalleAdmin(datosLectura, 'Número de serie', orden.serialNumber);
    agregarDatoLecturaDetalleAdmin(datosLectura, 'Fecha de ingreso', orden.createdAt);
    agregarCampoEdicionDetalleAdmin(
      form,
      'serviceDescription',
      tipo === 'mantenimientos' ? 'Trabajo solicitado' : 'Falla reportada',
      tipo === 'mantenimientos' ? orden.workRequested : orden.defect,
      'textarea',
    );
    agregarCampoEdicionDetalleAdmin(
      form,
      'diagnosis',
      tipo === 'mantenimientos' ? 'Observaciones / diagnóstico' : 'Causa / diagnóstico técnico',
      orden.details,
      'textarea',
    );
    agregarCampoEdicionDetalleAdmin(
      form,
      'cost',
      'Precio total',
      tipo === 'mantenimientos' ? orden.cost : orden.price,
      'number',
    );
    agregarCampoEdicionDetalleAdmin(
      form,
      'technicianId',
      'Técnico responsable',
      orden.technicianId,
      'select',
      opcionesTecnicoDetalleAdmin(orden.technicianId, false),
    );
  }

  agregarCampoEdicionDetalleAdmin(
    form,
    'status',
    'Estado',
    esCita ? orden.status : orden.statusCode,
    'select',
    opcionesEstadoDetalleAdmin(esCita ? 'appointment' : 'service'),
  );
  form.prepend(datosLectura);
  contenido.replaceChildren(form);
  dialogo.showModal();
}

function guardarDetalleOrdenServicioAdmin(evento) {
  evento.preventDefault();
  if (!detalleOrdenAbiertaAdmin) return;

  var form = evento.currentTarget;
  form.querySelectorAll('.campo-invalido').forEach(function(control) {
    control.classList.remove('campo-invalido');
    control.removeAttribute('aria-invalid');
  });
  form.querySelectorAll('.mensaje-error-campo, .mensaje-error-general').forEach(function(error) {
    error.remove();
  });
  var origen = detalleOrdenAbiertaAdmin.source;
  var tipo = detalleOrdenAbiertaAdmin.tipo;
  var id = detalleOrdenAbiertaAdmin.id;
  var payload;
  var url;

  if (origen === 'appointment') {
    var citaPrecio = form.elements.price.value;
    payload = {
      equipment: form.elements.equipment.value.trim(),
      description: form.elements.description.value.trim(),
      phone: form.elements.phone.value.trim(),
      appointmentDate: form.elements.appointmentDate.value,
      price: citaPrecio === '' ? null : Number(citaPrecio),
      technicianId: form.elements.technicianId.value
        ? Number(form.elements.technicianId.value)
        : null,
      status: form.elements.status.value
    };
    url = API_BASE + '/api/admin/appointments/' + encodeURIComponent(id);
    var erroresCliente = validarCitaDetalleAdmin(form);
    if (Object.keys(erroresCliente).length) {
      marcarErroresCitaDetalleAdmin(form, erroresCliente);
      mostrarErrorGeneralDetalleAdmin(form, 'Corrige los campos marcados para guardar la cita.');
      form.querySelector('.campo-invalido')?.focus();
      return;
    }
  } else {
    payload = {
      serviceDescription: form.elements.serviceDescription.value.trim(),
      diagnosis: form.elements.diagnosis.value.trim(),
      cost: Number(form.elements.cost.value),
      technicianId: Number(form.elements.technicianId.value),
      status: form.elements.status.value
    };
    url = API_BASE + '/api/admin/' + tipo + '/' + encodeURIComponent(id);
  }

  fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify(payload)
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(response) {
    if (!response.ok || !response.data.ok) {
      if (response.data.errors) {
        marcarErroresCitaDetalleAdmin(form, response.data.errors);
      }
      mostrarErrorGeneralDetalleAdmin(
        form,
        response.data.message || 'No se pudieron guardar los cambios.',
      );
      return;
    }
    document.getElementById('modalDetalleServicio')?.close();
    mostrarToast('success', response.data.message || 'Cambios guardados.');
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al guardar los detalles del servicio:', error);
    mostrarErrorGeneralDetalleAdmin(form, 'Error de conexión al guardar los cambios.');
  });
}

document.addEventListener('click', function(evento) {
  if (!(evento.target instanceof Element)) return;
  var boton = evento.target.closest('.btn-mas-informacion');
  if (boton) {
    mostrarDetalleOrdenServicio(
      boton.dataset.servicioTipo,
      boton.dataset.servicioId,
      boton.dataset.servicioOrigen,
    );
  }
});

var modalDetalleServicio = document.getElementById('modalDetalleServicio');
document.getElementById('btnCerrarDetalleServicio')?.addEventListener('click', function() {
  modalDetalleServicio?.close();
});
document.getElementById('btnCerrarDetalleServicioPie')?.addEventListener('click', function() {
  modalDetalleServicio?.close();
});
modalDetalleServicio?.addEventListener('click', function(evento) {
  if (evento.target === modalDetalleServicio) modalDetalleServicio.close();
});

function actualizarEstadoServicio(tipo, id) {
  if (tipo !== 'mantenimientos' && tipo !== 'reparaciones') return;

  var estadoSelect = document.getElementById('estado-' + tipo + '-' + id);
  if (!estadoSelect) {
    mostrarToast('error', 'No se encontró el selector de estado de la orden.');
    return;
  }

  fetch(API_BASE + '/api/admin/' + tipo + '/' + encodeURIComponent(id) + '/estado', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify({ status: estadoSelect.value })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.ok) {
      mostrarToast('error', data.message || 'No se pudo actualizar el estado.');
      return;
    }
    mostrarToast('success', data.message || 'Estado actualizado.');
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al actualizar el estado de la orden:', error);
    mostrarToast('error', 'Error de conexión al actualizar el estado.');
  });
}

function crearSelectorEstadoCita(cita) {
  var estados = [
    ['SOLICITUD RECIBIDA', 'Solicitud recibida'],
    ['CONFIRMADA', 'Confirmada'],
    ['EN PROCESO', 'En proceso'],
    ['COMPLETADA', 'Completada'],
    ['CANCELADA', 'Cancelada']
  ];
  var actual = estados.some(function(estado) {
    return estado[0] === cita.status;
  }) ? cita.status : 'SOLICITUD RECIBIDA';
  var id = Number(cita.id);
  return '<select class="select-filtro select-estado-servicio" id="estado-cita-' + id + '" aria-label="Estado de la cita ' + escaparHtmlAdmin(cita.reference) + '">' +
    estados.map(function(estado) {
      return '<option value="' + estado[0] + '"' + (estado[0] === actual ? ' selected' : '') + '>' + estado[1] + '</option>';
    }).join('') +
    '</select>';
}

function crearSelectorTecnicoCita(cita) {
  var id = Number(cita.id);
  var actual = cita.technicianId == null ? '' : String(cita.technicianId);
  var opciones = '<option value="">Sin asignar</option>';
  opciones += tecnicosDisponibles.map(function(tecnico) {
    var tecnicoId = String(tecnico.id);
    return '<option value="' + escaparHtmlAdmin(tecnicoId) + '"' +
      (tecnicoId === actual ? ' selected' : '') + '>' +
      escaparHtmlAdmin(tecnico.name) + '</option>';
  }).join('');
  return '<select class="select-filtro select-estado-servicio" id="tecnico-cita-' + id + '" aria-label="Técnico asignado a ' + escaparHtmlAdmin(cita.reference) + '">' +
    opciones +
    '</select>';
}

function asignarTecnicoCitaAdmin(id) {
  var tecnicoSelect = document.getElementById('tecnico-cita-' + id);
  if (!tecnicoSelect) {
    mostrarToast('error', 'No se encontró el selector de técnico de la cita.');
    return;
  }

  fetch(API_BASE + '/api/admin/appointments/' + encodeURIComponent(id) + '/technician', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify({
      technicianId: tecnicoSelect.value ? Number(tecnicoSelect.value) : null
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.ok) {
      mostrarToast('error', data.message || 'No se pudo asignar el técnico.');
      return;
    }
    mostrarToast('success', data.message || 'Técnico asignado.');
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al asignar técnico a la cita:', error);
    mostrarToast('error', 'Error de conexión al asignar el técnico.');
  });
}

function actualizarEstadoCitaAdmin(id) {
  var estadoSelect = document.getElementById('estado-cita-' + id);
  if (!estadoSelect) {
    mostrarToast('error', 'No se encontró el selector de estado de la cita.');
    return;
  }

  fetch(API_BASE + '/api/admin/appointments/' + encodeURIComponent(id) + '/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify({ status: estadoSelect.value })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.ok) {
      mostrarToast('error', data.message || 'No se pudo actualizar el estado de la cita.');
      return;
    }
    mostrarToast('success', data.message || 'Estado de la cita actualizado.');
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al actualizar el estado de la cita:', error);
    mostrarToast('error', 'Error de conexión al actualizar el estado de la cita.');
  });
}

// ==========================================================================
// 5. CARGAR DATOS DESDE EL DASHBOARD DEL BACKEND
// ==========================================================================
function cargarDashboard() {
  var inventoryBranchSelect = document.getElementById('filtroSucursalInventario');
  var selectedBranchId = inventoryBranchSelect && inventoryBranchSelect.value;
  var dashboardUrl = API_BASE + '/api/dashboard/admin';
  if (selectedBranchId) {
    dashboardUrl += '?branchId=' + encodeURIComponent(selectedBranchId);
  }

  fetch(dashboardUrl, {
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { status: res.status, data: data };
    });
  })
  .then(function(response) {
    var data = response.data;
    if (!response.status || response.status >= 400 || !data.ok) {
      var errorMessage = data.message || 'No se pudo cargar el panel del administrador.';
      console.warn('Dashboard respondió con error:', response.status, errorMessage);
      mostrarToast('error', errorMessage);
      return;
    }

    detallesOrdenServicio.clear();

    // Guardar colecciones para los selectores de los modales
    if (data.categories) categoriasDisponibles = data.categories;
    if (data.brands) marcasDisponibles = data.brands;
    if (data.clients) clientesDisponibles = data.clients;
    if (data.technicians) tecnicosDisponibles = data.technicians;
    if (data.inventory) productosDisponibles = data.inventory;
    if (inventoryBranchSelect && data.branches) {
      var selectedBranchIsActive = data.branches.some(function(branch) {
        return String(branch.id) === selectedBranchId;
      });
      if (!selectedBranchIsActive) {
        selectedBranchId = String(data.selectedBranchId || '');
      }
      inventoryBranchSelect.replaceChildren();
      data.branches.forEach(function(branch) {
        inventoryBranchSelect.add(new Option(branch.name, String(branch.id)));
      });
      inventoryBranchSelect.value = selectedBranchId;
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
        return '<td><strong>#' + row.id_venta + '</strong></td><td>' + row.nombre + ' ' + row.apellido + '</td><td><span class="' + estadoClase + '">' + row.estado + '</span></td><td>$ ' + Number(row.total).toLocaleString('es-CO') + '</td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'pedidos\', ' + row.id_venta + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }
    inventarioNotificaciones = data.inventory || [];
    if (notificacionesInicializadas) {
      actualizarNotificaciones(
        ventasNotificaciones,
        inventarioNotificaciones,
        citasNotificaciones,
      );
    }

    // ---------- INVENTARIO ----------
    if (data.inventory) {
      poblarTabla('tablaInventarioBody', data.inventory, function(row) {
        var stockTexto = row.stock + ' uds';
        var estadoClase = row.stock > 0 ? 'etiqueta-verde' : 'etiqueta-rojo';
        var estadoTexto = row.stock > 0 ? 'Disponible' : 'Agotado';
        var productId = Number(row.id);
        return '<td><strong>' + escaparHtmlAdmin(row.name) + '</strong></td><td>' + escaparHtmlAdmin(row.sku) + '</td><td>' + escaparHtmlAdmin(row.category) + '</td><td>$ ' + Number(row.price).toLocaleString('es-CO') + '</td><td>' + stockTexto + '</td><td>' + escaparHtmlAdmin(row.warranty || '12 Meses') + '</td><td><span class="' + estadoClase + '">' + estadoTexto + '</span></td><td><button class="boton-icono" title="Editar" aria-label="Editar ' + escaparHtmlAdmin(row.name) + '" onclick="abrirModal(\'inventario\', ' + productId + ')"><i class="fi fi-rr-edit"></i></button><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'productos\', ' + productId + ')"><i class="fi fi-rr-trash"></i></button></td>';
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
        var rawId = String(row.id).replace('GAR-', '');
        return '<td><strong>' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + String(row.buyDate).substring(0,10) + '</td><td>' + String(row.expDate).substring(0,10) + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'garantias\', ' + rawId + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
    }

    // ---------- MANTENIMIENTOS ----------
    var maintenanceRows = (data.maintenance || []).slice();
    (data.appointments || []).filter(function(appointment) {
      return appointment.serviceType === 'MANTENIMIENTO';
    }).forEach(function(appointment) {
      var appointmentTicket = 'MNT-CIT-' + Number(appointment.id);
      maintenanceRows.unshift(Object.assign({}, appointment, {
        source: 'appointment',
        reference: appointmentTicket,
        maintenanceOrder: appointmentTicket
      }));
    });
    if (data.maintenance || data.appointments) {
      poblarTabla('tablaMantenimientosBody', maintenanceRows, function(row) {
        if (row.source === 'appointment') {
          var precioCita = row.price == null ? 'Pendiente' : '$ ' + Number(row.price).toLocaleString('es-CO');
          return '<td><strong>' + escaparHtmlAdmin(row.reference) + '</strong></td><td>' + escaparHtmlAdmin(row.equipment) + '</td><td>' + escaparHtmlAdmin(row.client) + '</td><td>' + escaparHtmlAdmin(row.appointmentDate) + '</td><td>' + escaparHtmlAdmin(precioCita) + '</td><td>' + escaparHtmlAdmin(row.tech || 'Sin asignar') + '</td><td>' + escaparHtmlAdmin(nombreEstadoCitaAdmin(row.status)) + '</td><td class="acciones-servicio">' + crearDetalleOrdenServicio(row, 'mantenimientos') + '</td>';
        }
        return '<td><strong>' + escaparHtmlAdmin(row.maintenanceOrder) + '</strong></td><td>' + escaparHtmlAdmin(row.equipment) + '</td><td>' + escaparHtmlAdmin(row.client) + '</td><td>' + escaparHtmlAdmin(row.createdAt) + '</td><td>$ ' + Number(row.cost).toLocaleString('es-CO') + '</td><td>' + escaparHtmlAdmin(row.tech || 'No asignado') + '</td><td>' + escaparHtmlAdmin(row.status) + '</td><td class="acciones-servicio">' + crearDetalleOrdenServicio(row, 'mantenimientos') + '</td>';
      });
    }

    // ---------- REPARACIONES ----------
    var repairRows = (data.repairs || []).slice();
    (data.appointments || []).filter(function(appointment) {
      return appointment.serviceType === 'REPARACION';
    }).forEach(function(appointment) {
      var appointmentTicket = 'REP-CIT-' + Number(appointment.id);
      repairRows.unshift(Object.assign({}, appointment, {
        source: 'appointment',
        reference: appointmentTicket,
        ticket: appointmentTicket,
        device: appointment.equipment
      }));
    });
    if (data.repairs || data.appointments) {
      poblarTabla('tablaReparacionBody', repairRows, function(row) {
        if (row.source === 'appointment') {
          var precioCita = row.price == null ? 'Pendiente' : '$ ' + Number(row.price).toLocaleString('es-CO');
          return '<td><strong>' + escaparHtmlAdmin(row.reference) + '</strong></td><td>' + escaparHtmlAdmin(row.equipment) + '</td><td>' + escaparHtmlAdmin(row.client) + '</td><td>' + escaparHtmlAdmin(row.appointmentDate) + '</td><td>' + escaparHtmlAdmin(precioCita) + '</td><td>' + escaparHtmlAdmin(row.tech || 'Sin asignar') + '</td><td>' + escaparHtmlAdmin(nombreEstadoCitaAdmin(row.status)) + '</td><td class="acciones-servicio">' + crearDetalleOrdenServicio(row, 'reparaciones') + '</td>';
        }
        return '<td><strong>' + escaparHtmlAdmin(row.ticket) + '</strong></td><td>' + escaparHtmlAdmin(row.device) + '</td><td>' + escaparHtmlAdmin(row.client) + '</td><td>' + escaparHtmlAdmin(row.createdAt) + '</td><td>$ ' + Number(row.price).toLocaleString('es-CO') + '</td><td>' + escaparHtmlAdmin(row.tech || 'No asignado') + '</td><td>' + escaparHtmlAdmin(row.status) + '</td><td class="acciones-servicio">' + crearDetalleOrdenServicio(row, 'reparaciones') + '</td>';
      });
    }

    // ---------- DESCUENTOS ----------
    if (data.discounts) {
      poblarTabla('tablaDescuentosBody', data.discounts, function(row) {
        var estadoClase = row.status === 'Activo' ? 'etiqueta-verde' : 'etiqueta-rojo';
        var rawId = String(row.code).replace('PROM-', '');
        return '<td><strong>' + row.code + '</strong></td><td>Porcentaje</td><td>' + row.percent + '</td><td>' + (row.discountDescription || '') + '</td><td>' + row.expires + '</td><td><span class="' + estadoClase + '">' + row.status + '</span></td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'descuentos\', ' + rawId + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('descActivos');
      if (el) el.textContent = data.discounts.length;
    }

    // ---------- CLIENTES ----------
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

    // ---------- RESEÑAS ----------
    if (data.reviews && data.reviews.length > 0) {
      poblarTabla('tablaResenasBody', data.reviews, function(row) {
        return '<td><strong>RES-' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + row.rating + '</td><td>' + row.comment + '</td><td>' + row.date + '</td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'resenas\', ' + row.id + ')"><i class="fi fi-rr-trash"></i></button></td>';
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
// 7. GUARDAR DATOS DESDE LOS FORMULARIOS MODALES (CON VALIDACIÓN COMPLETA)
// ==========================================================================
async function subirImagenProducto(file) {
  var response = await fetch(API_BASE + '/api/admin/product-images', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + sessionToken,
      'Content-Type': file.type
    },
    body: file
  });
  var data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('El servidor devolvió una respuesta inválida al subir la imagen.');
  }
  if (!response.ok || !data.ok || !data.imageUrl) {
    throw new Error(data.message || 'No se pudo subir la imagen.');
  }
  return data.imageUrl;
}

var inventarioGuardando = false;

async function guardarDatos(evento) {
  evento.preventDefault();
  if (tipoModalActual === 'inventario' && inventarioGuardando) return;
  limpiarErroresModal();

  var c1Input = document.getElementById('campo1');
  var c2Input = document.getElementById('campo2');
  var c3Input = document.getElementById('campo3');
  var c4Input = document.getElementById('campo4');
  var cMarcaInput = document.getElementById('campo_marca');

  var c1 = c1Input ? c1Input.value.trim() : '';
  var c2 = c2Input ? c2Input.value.trim() : '';
  var c3 = c3Input ? c3Input.value.trim() : '';
  var c4 = c4Input ? c4Input.value.trim() : '';
  var cMarca = cMarcaInput ? cMarcaInput.value.trim() : 'General';

  var url = '';
  var metodo = 'POST';
  var payload = {};
  var hayErrores = false;

  // -------------------------------------------------------------
  // VALIDACIONES ESPECÍFICAS SEGÚN EL MÓDULO ACTUAL
  // -------------------------------------------------------------
  if (tipoModalActual === 'inventario') {
    var imagenPrincipal = document.getElementById('campo_imagen_principal');
    var imagen2 = document.getElementById('campo_imagen_2');
    var imagen3 = document.getElementById('campo_imagen_3');
    var imagen4 = document.getElementById('campo_imagen_4');
    var archivoImagen2 = document.getElementById('archivo_imagen_2');
    var archivoImagen3 = document.getElementById('archivo_imagen_3');
    var archivoImagen4 = document.getElementById('archivo_imagen_4');
    var archivosImagenes = [
      { input: archivoImagen2, campo: imagen2 },
      { input: archivoImagen3, campo: imagen3 },
      { input: archivoImagen4, campo: imagen4 }
    ];
    var descripcion = document.getElementById('campo_descripcion');
    var sucursalId = Number(document.getElementById('filtroSucursalInventario').value);

    if (!c1 || c1.length < 3) {
      marcarErrorCampo(c1Input, 'El nombre debe tener al menos 3 caracteres.');
      hayErrores = true;
    }
    if (!c2) {
      marcarErrorCampo(c2Input, 'Selecciona una categoría válida.');
      hayErrores = true;
    }
    if (!cMarca) {
      marcarErrorCampo(cMarcaInput, 'Selecciona una marca válida.');
      hayErrores = true;
    }
    var precioProd = Number(c3);
    if (!c3 || isNaN(precioProd) || precioProd <= 0) {
      marcarErrorCampo(c3Input, 'Ingresa un precio de venta mayor a 0.');
      hayErrores = true;
    }
    var stockProd = Number(c4);
    if (c4 === '' || isNaN(stockProd) || stockProd < 0 || !Number.isInteger(stockProd)) {
      marcarErrorCampo(c4Input, 'Ingresa una cantidad de stock válida (entero >= 0).');
      hayErrores = true;
    }
    if (!imagenPrincipal || !imagenPrincipal.value.trim()) {
      marcarErrorCampo(imagenPrincipal, 'Indica la ruta de la imagen principal.');
      hayErrores = true;
    }
    archivosImagenes.forEach(function(imagen) {
      var file = imagen.input.files && imagen.input.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        marcarErrorCampo(imagen.input, 'Usa una imagen JPG, PNG, WEBP o GIF.');
        hayErrores = true;
      } else if (file.size > 5 * 1024 * 1024) {
        marcarErrorCampo(imagen.input, 'La imagen no puede superar 5 MB.');
        hayErrores = true;
      }
    });
    if (!descripcion || descripcion.value.trim().length > 100) {
      marcarErrorCampo(descripcion, 'La descripción no puede superar 100 caracteres.');
      hayErrores = true;
    }
    if (!Number.isSafeInteger(sucursalId) || sucursalId < 1) {
      marcarErrorCampo(document.getElementById('filtroSucursalInventario'), 'Selecciona una sucursal válida.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor corrige los campos señalados en rojo');
      return;
    }

    inventarioGuardando = true;
    try {
      var hayImagenesLocales = archivosImagenes.some(function(imagen) {
        return imagen.input.files && imagen.input.files.length > 0;
      });
      if (hayImagenesLocales) mostrarToast('info', 'Subiendo imágenes del producto...');
      for (var imagenLocal of archivosImagenes) {
        var archivoLocal = imagenLocal.input.files && imagenLocal.input.files[0];
        if (archivoLocal) {
          imagenLocal.campo.value = await subirImagenProducto(archivoLocal);
        }
      }
    } catch (error) {
      inventarioGuardando = false;
      console.error('Error al subir imagen del producto:', error);
      mostrarToast('error', error.message || 'No se pudo subir la imagen.');
      return;
    }

    url = productoInventarioEdicion
      ? API_BASE + '/api/admin/productos/' + encodeURIComponent(productoInventarioEdicion.id)
      : API_BASE + '/api/admin/productos';
    if (productoInventarioEdicion) metodo = 'PUT';
    payload = {
      name: c1,
      category: c2,
      publisher: cMarca,
      price: precioProd,
      stock: stockProd,
      branchId: sucursalId,
      imageUrl: imagenPrincipal.value.trim(),
      imageUrl2: imagen2.value.trim(),
      imageUrl3: imagen3.value.trim(),
      imageUrl4: imagen4.value.trim(),
      description: descripcion.value.trim()
    };

  } else if (tipoModalActual === 'garantias') {
    if (!c1) {
      marcarErrorCampo(c1Input, 'Selecciona un cliente.');
      hayErrores = true;
    }
    if (!c2) {
      marcarErrorCampo(c2Input, 'Selecciona un producto asociado.');
      hayErrores = true;
    }
    if (!c3) {
      marcarErrorCampo(c3Input, 'Selecciona los meses de cobertura.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor completa todos los campos de la garantía');
      return;
    }

    url = API_BASE + '/api/admin/garantias';
    payload = {
      client: c1,
      product: c2,
      buyDate: new Date().toISOString().split('T')[0],
      duration: c3 + ' Meses'
    };

  } else if (tipoModalActual === 'mantenimientos') {
    var tipoEquipoMntInput = document.getElementById('campo_tipo_equipo');
    var marcaEquipoMntInput = document.getElementById('campo_marca_equipo');
    var serialEquipoMntInput = document.getElementById('campo_serie_equipo');
    var trabajoMntInput = document.getElementById('campo_detalle');
    var diagnosticoMntInput = document.getElementById('campo_diagnostico');
    if (!c1 || c1.length < 3) {
      marcarErrorCampo(c1Input, 'Indica el equipo o consola (mínimo 3 caracteres).');
      hayErrores = true;
    }
    if (!tipoEquipoMntInput.value) {
      marcarErrorCampo(tipoEquipoMntInput, 'Selecciona el tipo de equipo.');
      hayErrores = true;
    }
    if (!marcaEquipoMntInput.value.trim()) {
      marcarErrorCampo(marcaEquipoMntInput, 'Indica la marca del equipo.');
      hayErrores = true;
    }
    if (!c2) {
      marcarErrorCampo(c2Input, 'Selecciona el cliente propietario.');
      hayErrores = true;
    }
    if (!c3) {
      marcarErrorCampo(c3Input, 'Selecciona el técnico responsable.');
      hayErrores = true;
    }
    if (!trabajoMntInput.value.trim() || trabajoMntInput.value.trim().length < 3) {
      marcarErrorCampo(trabajoMntInput, 'Describe el trabajo de mantenimiento solicitado.');
      hayErrores = true;
    }
    if (trabajoMntInput.value.trim().length > 100 || diagnosticoMntInput.value.trim().length > 100) {
      marcarErrorCampo(trabajoMntInput, 'Los detalles no pueden superar 100 caracteres.');
      hayErrores = true;
    }
    var costoMnt = Number(c4);
    if (!c4 || isNaN(costoMnt) || costoMnt <= 0) {
      marcarErrorCampo(c4Input, 'Ingresa un costo de servicio válido mayor a 0.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor corrige los campos del mantenimiento');
      return;
    }

    url = API_BASE + '/api/admin/mantenimientos';
    payload = {
      equipment: c1,
      equipmentType: tipoEquipoMntInput.value,
      brand: marcaEquipoMntInput.value.trim(),
      serialNumber: serialEquipoMntInput.value.trim(),
      clientId: Number(c2),
      technicianId: Number(c3),
      serviceDescription: trabajoMntInput.value.trim(),
      diagnosis: diagnosticoMntInput.value.trim(),
      cost: costoMnt,
    };

  } else if (tipoModalActual === 'reparacion') {
    var tipoEquipoRepInput = document.getElementById('campo_tipo_equipo');
    var marcaEquipoRepInput = document.getElementById('campo_marca_equipo');
    var serialEquipoRepInput = document.getElementById('campo_serie_equipo');
    var diagnosticoRepInput = document.getElementById('campo_diagnostico');
    var tecnicoRepInput = document.getElementById('campo_tecnico');
    if (!c1 || c1.length < 3) {
      marcarErrorCampo(c1Input, 'Indica el dispositivo a reparar (mínimo 3 caracteres).');
      hayErrores = true;
    }
    if (!tipoEquipoRepInput.value) {
      marcarErrorCampo(tipoEquipoRepInput, 'Selecciona el tipo de equipo.');
      hayErrores = true;
    }
    if (!marcaEquipoRepInput.value.trim()) {
      marcarErrorCampo(marcaEquipoRepInput, 'Indica la marca del equipo.');
      hayErrores = true;
    }
    if (!c2 || c2.length < 4) {
      marcarErrorCampo(c2Input, 'Describe detalladamente la falla reportada (mínimo 4 caracteres).');
      hayErrores = true;
    }
    if (!c3) {
      marcarErrorCampo(c3Input, 'Selecciona el cliente vinculado.');
      hayErrores = true;
    }
    if (!tecnicoRepInput.value) {
      marcarErrorCampo(tecnicoRepInput, 'Selecciona el técnico responsable.');
      hayErrores = true;
    }
    var precioRep = Number(c4);
    if (!c4 || isNaN(precioRep) || precioRep <= 0) {
      marcarErrorCampo(c4Input, 'Ingresa un presupuesto estimado mayor a 0.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor completa todos los campos de reparación');
      return;
    }

    url = API_BASE + '/api/admin/reparaciones';
    payload = {
      equipment: c1,
      equipmentType: tipoEquipoRepInput.value,
      brand: marcaEquipoRepInput.value.trim(),
      serialNumber: serialEquipoRepInput.value.trim(),
      serviceDescription: c2,
      diagnosis: diagnosticoRepInput.value.trim(),
      clientId: Number(c3),
      technicianId: Number(tecnicoRepInput.value),
      cost: precioRep
    };

  } else if (tipoModalActual === 'descuentos') {
    var regexCodigo = /^[A-Za-z0-9\-_]{3,20}$/;
    if (!c1 || !regexCodigo.test(c1)) {
      marcarErrorCampo(c1Input, 'El código debe tener 3-20 caracteres alfanuméricos (sin espacios ni símbolos raros).');
      hayErrores = true;
    }
    var numPercent = parseInt(c2);
    if (isNaN(numPercent) || numPercent < 1 || numPercent > 99) {
      marcarErrorCampo(c2Input, 'El porcentaje debe ser un valor entero entre 1 y 99.');
      hayErrores = true;
    }
    if (!c3 || c3.length < 3) {
      marcarErrorCampo(c3Input, 'Ingresa una descripción del cupón (mínimo 3 caracteres).');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor corrige los datos del descuento');
      return;
    }

    url = API_BASE + '/api/admin/descuentos';
    payload = {
      code: c1.toUpperCase().trim(),
      percent: numPercent,
      limit: 100,
      desc: c3
    };

  } else if (tipoModalActual === 'clientes') {
    var regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúñÑüÜ\s]{3,60}$/;
    if (!c1 || !regexNombre.test(c1) || c1.split(/\s+/).length < 2) {
      marcarErrorCampo(c1Input, 'Ingresa nombre y apellido completos (solo letras y espacios).');
      hayErrores = true;
    }
    var regexTel = /^[0-9+\-\s()]{7,15}$/;
    if (!c2 || !regexTel.test(c2)) {
      marcarErrorCampo(c2Input, 'Ingresa un teléfono válido (entre 7 y 15 dígitos).');
      hayErrores = true;
    }
    var regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!c3 || !regexEmail.test(c3)) {
      marcarErrorCampo(c3Input, 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor corrige los datos del cliente');
      return;
    }

    url = API_BASE + '/api/admin/clientes';
    payload = {
      name: c1,
      phone: c2,
      email: c3
    };

  } else if (tipoModalActual === 'resenas') {
    if (!c1) {
      marcarErrorCampo(c1Input, 'Selecciona el cliente que califica.');
      hayErrores = true;
    }
    if (!c2 || c2.length < 3) {
      marcarErrorCampo(c2Input, 'Indica el producto o servicio evaluado.');
      hayErrores = true;
    }
    if (!c3) {
      marcarErrorCampo(c3Input, 'Selecciona la calificación.');
      hayErrores = true;
    }
    if (!c4 || c4.length < 5) {
      marcarErrorCampo(c4Input, 'El comentario debe contener al menos 5 caracteres.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor completa todos los campos de la reseña');
      return;
    }

    url = API_BASE + '/api/admin/resenas';
    payload = {
      client: c1,
      comment: '[' + c3 + '] ' + c2 + ': ' + c4
    };

  } else if (tipoModalActual === 'pedidos') {
    if (!c1) {
      marcarErrorCampo(c1Input, 'Selecciona un cliente comprador.');
      hayErrores = true;
    }
    var totalPedido = Number(c2);
    if (!c2 || isNaN(totalPedido) || totalPedido <= 0) {
      marcarErrorCampo(c2Input, 'Ingresa un total de venta válido mayor a 0.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor ingresa un total de pedido válido');
      return;
    }

    url = API_BASE + '/api/admin/pedidos';
    payload = {
      client: c1,
      total: totalPedido
    };
  }

  if (!url) {
    cerrarModal();
    return;
  }

  mostrarToast('info', 'Guardando en la base de datos...');

  fetch(url, {
    method: metodo,
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
      cerrarModal();
      cargarDashboard(); // Recargar datos frescos desde MySQL
    } else {
      mostrarToast('error', data.message || 'Error al guardar');
    }
  })
  .catch(function(err) {
    console.error('Error al guardar en BD:', err);
    mostrarToast('error', 'Error de conexión con el servidor');
  })
  .finally(function() {
    inventarioGuardando = false;
  });
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
  document
    .getElementById('btnLimpiarNotificaciones')
    ?.addEventListener('click', limpiarNotificacionesAdmin);
  cargarDashboard();
  cargarNotificacionesAdmin();
  window.setInterval(function() {
    if (!document.hidden) cargarNotificacionesAdmin();
  }, 15000);
});
