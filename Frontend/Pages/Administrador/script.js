// Lógica del panel de administración

// URL base del backend
var API_BASE = 'http://localhost:3000';

// Variable para saber qué formulario modal está abierto
var tipoModalActual = "";

// Token de sesión (se obtiene del localStorage si existe)
var sessionToken =
  localStorage.getItem('sessionToken') ||
  sessionStorage.getItem('sessionToken') ||
  '';

// Notificaciones
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
  toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
  var iconoContenido = document.createElement('span');
  iconoContenido.className = 'toast-icono';
  iconoContenido.setAttribute('aria-hidden', 'true');
  iconoContenido.textContent = icono;
  var contenido = document.createElement('span');
  contenido.className = 'toast-mensaje';
  contenido.textContent = mensaje;
  toast.appendChild(iconoContenido);
  toast.appendChild(contenido);
  contenedor.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3500);
}

// Navegación entre secciones
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
    var esMovil = window.matchMedia('(max-width: 768px)').matches;
    var panel = document.querySelector('.panel-contenedor');
    if (esMovil) navegacion.classList.remove('abierto');
    var colapsado = panel?.classList.contains('menu-colapsado') || false;
    botonHamburguesa.setAttribute('aria-expanded', String(esMovil ? false : !colapsado));
    botonHamburguesa.setAttribute(
      'aria-label',
      esMovil || colapsado ? 'Abrir menú de navegación' : 'Contraer menú de navegación'
    );
  }

  // 4. Subir la vista al inicio del contenido
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function irAVentasAdmin() {
  var botonVentas = document.querySelector('.boton-menu[data-seccion="seccion-ventas"]');
  cambiarPestana('seccion-ventas', botonVentas);
}

function toggleMenuMovil() {
  var navegacion = document.getElementById('menuNavegacion');
  var botonHamburguesa = document.querySelector('.boton-hamburguesa');
  if (!navegacion || !botonHamburguesa) return;

  if (window.matchMedia('(max-width: 768px)').matches) {
    var abierto = navegacion.classList.toggle('abierto');
    botonHamburguesa.setAttribute('aria-expanded', String(abierto));
    botonHamburguesa.setAttribute(
      'aria-label',
      abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
    return;
  }

  var panel = document.querySelector('.panel-contenedor');
  if (!panel) return;
  var colapsado = panel.classList.toggle('menu-colapsado');
  botonHamburguesa.setAttribute('aria-expanded', String(!colapsado));
  botonHamburguesa.setAttribute(
    'aria-label',
    colapsado ? 'Expandir menú de navegación' : 'Contraer menú de navegación'
  );
  document.querySelectorAll('#menuNavegacion .boton-menu').forEach(function(boton) {
    var etiqueta = boton.querySelector('span')?.textContent.trim();
    if (colapsado && etiqueta) {
      boton.title = etiqueta;
      boton.setAttribute('aria-label', etiqueta);
    } else {
      boton.removeAttribute('title');
      boton.removeAttribute('aria-label');
    }
  });
}

function configurarMenuLateral() {
  var panel = document.querySelector('.panel-contenedor');
  var navegacion = document.getElementById('menuNavegacion');
  var botonHamburguesa = document.querySelector('.boton-hamburguesa');
  if (!panel || !navegacion || !botonHamburguesa) return;

  var esMovil = window.matchMedia('(max-width: 768px)').matches;
  var colapsado = !esMovil && panel.classList.contains('menu-colapsado');
  navegacion.classList.remove('abierto');
  botonHamburguesa.setAttribute('aria-expanded', String(!esMovil && !colapsado));
  botonHamburguesa.setAttribute(
    'aria-label',
    esMovil ? 'Abrir menú de navegación' : colapsado ? 'Expandir menú de navegación' : 'Contraer menú de navegación'
  );
  document.querySelectorAll('#menuNavegacion .boton-menu').forEach(function(boton) {
    var etiqueta = boton.querySelector('span')?.textContent.trim();
    if (colapsado && etiqueta) {
      boton.title = etiqueta;
      boton.setAttribute('aria-label', etiqueta);
    } else {
      boton.removeAttribute('title');
      boton.removeAttribute('aria-label');
    }
  });
}

// Búsqueda y filtros
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

// Perfil, cierre de sesión y notificaciones
function toggleMenuPerfil() {
  var menu = document.getElementById('menuPerfil');
  if (menu) {
    menu.classList.toggle('abierto');
  }
}

async function cerrarSesion(evento) {
  if (evento) evento.preventDefault();

  if (!(await window.confirmarCierreSesion())) {
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
  localStorage.removeItem('wiiu_cart');

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

function abrirSeccionNotificacion(evento, idSeccion) {
  if (evento) evento.preventDefault();

  var seccionesPermitidas = [
    'seccion-ventas',
    'seccion-mantenimientos',
    'seccion-reparacion',
    'seccion-garantias',
    'seccion-inventario'
  ];
  if (seccionesPermitidas.indexOf(idSeccion) === -1) return;

  var botonMenu = document.querySelector(
    '#menuNavegacion [data-seccion="' + idSeccion + '"]'
  );
  var panel = document.getElementById('panelNotificaciones');
  var botonCampana = document.querySelector('.campana-alerta');
  cambiarPestana(idSeccion, botonMenu);
  if (panel) panel.hidden = true;
  if (botonCampana) botonCampana.setAttribute('aria-expanded', 'false');
}

var ventasNotificaciones = [];
var citasNotificaciones = [];
var garantiasNotificaciones = [];
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
  var resumen = document.getElementById('resumenNotificaciones');
  if (!contador || !boton) return;
  boton.classList.toggle('tiene-no-leidas', notificacionesNoLeidas > 0);
  var icono = boton.querySelector('i');
  if (icono) {
    icono.classList.toggle('fi-sr-bell', notificacionesNoLeidas > 0);
    icono.classList.toggle('fi-rr-bell', notificacionesNoLeidas === 0);
  }
  contador.hidden = notificacionesNoLeidas === 0;
  contador.textContent =
    notificacionesNoLeidas > 99 ? '99+' : String(notificacionesNoLeidas);
  if (resumen) {
    resumen.textContent =
      notificacionesNoLeidas === 0
        ? 'Todo al día'
        : notificacionesNoLeidas + (notificacionesNoLeidas === 1 ? ' novedad nueva' : ' novedades nuevas');
  }
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

function actualizarNotificaciones(ventas, inventario, citas, garantias) {
  if (Array.isArray(ventas)) ventasNotificaciones = ventas;
  if (Array.isArray(inventario)) inventarioNotificaciones = inventario;
  if (Array.isArray(citas)) citasNotificaciones = citas;
  if (Array.isArray(garantias)) garantiasNotificaciones = garantias;

  var notificaciones = [];
  var eventos = [];
  ventasNotificaciones.forEach(function(venta) {
    eventos.push({
      key: 'venta:' + venta.id,
      type: 'sale',
      section: 'seccion-ventas',
      createdAt: venta.createdAt,
      titulo: 'Nueva compra ' + escaparHtmlAdmin(venta.orderNumber || ('#' + venta.id)),
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
      section: cita.serviceType === 'MANTENIMIENTO'
        ? 'seccion-mantenimientos'
        : 'seccion-reparacion',
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
  garantiasNotificaciones.forEach(function(solicitud) {
    eventos.push({
      key: 'garantia:' + solicitud.id,
      type: 'warranty',
      section: 'seccion-garantias',
      createdAt: solicitud.createdAt,
      titulo: 'Nueva solicitud de garantía #' + escaparHtmlAdmin(solicitud.id),
      detalle:
        escaparHtmlAdmin(solicitud.client || 'Cliente') +
        ' · ' +
        escaparHtmlAdmin(solicitud.product || 'Producto') +
        ' · Pedido ' +
        escaparHtmlAdmin(solicitud.orderNumber || 'sin número') +
        ' · ' +
        escaparHtmlAdmin(solicitud.status || 'RECIBIDA'),
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
  if (!notificacionesInicializadas) {
    notificacionesInicializadas = true;
  }

  eventosNuevos.forEach(function(evento) {
    mostrarToast('info', evento.titulo + ' registrada.');
  });

  notificaciones.push.apply(notificaciones, eventos);
  alertasInventario.forEach(function(producto) {
    var stock = Number(producto.stock);
    notificaciones.push({
      key: 'stock:' + (producto.id || producto.name),
      type: 'stock',
      section: 'seccion-inventario',
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
      var icono = notificacion.type === 'sale'
        ? 'fi-rr-shopping-bag'
        : notificacion.type === 'appointment'
          ? 'fi-rr-calendar'
          : notificacion.type === 'warranty'
            ? 'fi-rr-shield-check'
            : notificacion.type === 'stock'
              ? 'fi-rr-box'
              : 'fi-rr-bell';
      var noLeida = !clavesNotificacionesLeidas.has(notificacion.key);
      var hora = '';
      var fecha = new Date(String(notificacion.createdAt || '').replace(' ', 'T'));
      if (!Number.isNaN(fecha.getTime())) {
        hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      }
      return '<li class="notificacion-item' + (noLeida ? ' no-leida' : '') + '">' +
        '<a class="notificacion-enlace" href="#' + escaparHtmlAdmin(notificacion.section) +
        '" onclick="abrirSeccionNotificacion(event, \'' +
        escaparHtmlAdmin(notificacion.section) + '\')">' +
        '<span class="notificacion-icono"><i class="fi ' + icono + '"></i></span>' +
        '<span class="notificacion-contenido"><strong>' + notificacion.titulo + '</strong>' +
        '<span>' + notificacion.detalle + '</span></span>' +
        (hora ? '<time>' + hora + '</time>' : '') + '</a></li>';
    }).join('');
    return '<li class="notificacion-grupo"><strong class="notificacion-dia">' +
      escaparHtmlAdmin(grupo[0]) + '</strong><ul class="notificaciones-dia">' +
      avisosDelDia + '</ul></li>';
  }).join('');
  actualizarContadorNotificaciones();
}

function limpiarNotificacionesAdmin() {
  if (!notificacionesActuales.length) return;
  notificacionesActuales.forEach(function(notificacion) {
    clavesNotificacionesLeidas.add(notificacion.key);
  });
  guardarClavesNotificaciones(
    claveAlmacenamientoNotificacionesLeidas,
    clavesNotificacionesLeidas,
    'leídas',
  );
  notificacionesNoLeidas = 0;
  actualizarNotificaciones(
    ventasNotificaciones,
    inventarioNotificaciones,
    citasNotificaciones,
    garantiasNotificaciones,
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
      response.data.warrantyRequests,
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

// Formularios modales de registro y edición
var categoriasDisponibles = [];
var marcasDisponibles = [];
var clientesDisponibles = [];
var usuariosDisponibles = [];
var rolesDisponibles = [];
var usuarioEdicion = null;
var descuentosDisponibles = [];
var descuentoEdicion = null;
var tecnicosDisponibles = [];
var productosDisponibles = [];
var productoInventarioEdicion = null;
var detallesOrdenServicio = new Map();
var detalleOrdenAbiertaAdmin = null;

function abrirModal(tipo, productoId) {
  tipoModalActual = tipo;
  productoInventarioEdicion = null;
  usuarioEdicion = null;
  descuentoEdicion = null;
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
  if (tipo === 'clientes' && productoId !== undefined) {
    usuarioEdicion = usuariosDisponibles.find(function(usuario) {
      return String(usuario.id) === String(productoId);
    });
    if (!usuarioEdicion) {
      mostrarToast('error', 'No se encontró el usuario seleccionado.');
      tipoModalActual = '';
      return;
    }
  }
  if (tipo === 'descuentos' && productoId !== undefined) {
    descuentoEdicion = descuentosDisponibles.find(function(descuento) {
      return String(descuento.id) === String(productoId);
    });
    if (!descuentoEdicion) {
      mostrarToast('error', 'No se encontró el descuento seleccionado.');
      tipoModalActual = '';
      return;
    }
  }

  var modal = document.getElementById('modalFormulario');
  var titulo = document.getElementById('modalTitulo');
  var campos = document.getElementById('modalCampos');
  var cajaModal = modal.querySelector('.caja-modal');
  cajaModal.classList.toggle('modal-inventario', tipo === 'inventario');
  cajaModal.classList.toggle('modal-dos-columnas', tipo !== 'inventario');

  limpiarErroresModal();
  modal.classList.add('activo');

  if (tipo === 'mantenimientos') {
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
    var optsCat = (producto ? '' : '<option value="" selected disabled>Selecciona una categoría...</option>') + categorias.map(function(nombre) {
      var selected = producto && nombre === producto.category ? ' selected' : '';
      return '<option value="' + escaparHtmlAdmin(nombre) + '"' + selected + '>' + escaparHtmlAdmin(nombre) + '</option>';
    }).join('');
    var optsMarcas = (producto ? '' : '<option value="" selected disabled>Selecciona una marca...</option>') + marcas.map(function(nombre) {
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
        <input type="number" id="campo3" required min="1" max="99999999" step="1" value="${valorCampo(producto && producto.price)}" placeholder="Ej. 1450000">
      </div>
      <div class="campo-grupo">
        <label>Unidades en la sucursal seleccionada:</label>
        <input type="number" id="campo4" required min="0" max="2147483647" step="1" value="${valorCampo(stockSucursal)}" placeholder="Ej. 10">
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
    var descuento = descuentoEdicion;
    var campoCodigoDescuento = descuento
      ? '<div class="campo-grupo"><label>Código del Cupón:</label>' +
        '<input type="text" id="campo1" value="' + escaparHtmlAdmin(descuento.code) +
        '" readonly aria-readonly="true" style="text-transform: uppercase;"></div>'
      : '<p class="ayuda-campo">El identificador PROM se asigna automáticamente al guardar.</p>';
    titulo.textContent = descuento ? "Editar Descuento" : "Crear Código de Descuento";
    campos.innerHTML = `
      ${campoCodigoDescuento}
      <div class="campo-grupo">
        <label>Porcentaje de Descuento (%):</label>
        <input type="number" id="campo2" required min="1" max="99" step="1" value="${escaparHtmlAdmin(descuento && descuento.percentValue != null ? descuento.percentValue : '')}" placeholder="Ej. 15">
      </div>
      <div class="campo-grupo">
        <label>Descripción / Nota del Cupón:</label>
        <input type="text" id="campo3" required minlength="3" maxlength="150" value="${escaparHtmlAdmin(descuento ? descuento.discountDescription : '')}" placeholder="Ej. Descuento de temporada navideña">
      </div>
    `;
  } else if (tipo === 'resenas') {
    titulo.textContent = "Moderar / Agregar Reseña";
    var optsClientes = clientesDisponibles.length > 0
      ? '<option value="" selected disabled>Selecciona un cliente...</option>' + clientesDisponibles.map(function(c) {
          return '<option value="' + escaparHtmlAdmin(c.id) + '">' + escaparHtmlAdmin(c.name) + '</option>';
        }).join('')
      : '<option value="" selected disabled>No hay clientes activos</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Cliente:</label>
        <select id="campo1" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Producto o Servicio:</label>
        <input type="text" id="campo2" required minlength="3" maxlength="100" placeholder="Ej. Mantenimiento Preventivo o Compra">
      </div>
      <div class="campo-grupo">
        <label>Calificación:</label>
        <select id="campo3" required>
          <option value="" selected disabled>Selecciona una calificación...</option>
          <option value="5 estrellas">⭐⭐⭐⭐⭐ (5 Estrellas)</option>
          <option value="4 estrellas">⭐⭐⭐⭐ (4 Estrellas)</option>
          <option value="3 estrellas">⭐⭐⭐ (3 Estrellas)</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label>Comentario u Opinión:</label>
        <textarea id="campo4" rows="3" required minlength="5" maxlength="300" placeholder="Escribe un comentario detallado (mínimo 5 caracteres)..."></textarea>
      </div>
    `;
  } else if (tipo === 'clientes') {
    var nombreCompleto = usuarioEdicion ? usuarioEdicion.name : '';
    var rolesUnicos = [];
    var indicesRolesPorNombre = new Map();
    rolesDisponibles.forEach(function(rol) {
      var nombreRolNormalizado = String(rol.name || '').trim().toLocaleLowerCase();
      if (!nombreRolNormalizado) return;
      if (!indicesRolesPorNombre.has(nombreRolNormalizado)) {
        indicesRolesPorNombre.set(nombreRolNormalizado, rolesUnicos.length);
        rolesUnicos.push(rol);
      } else if (usuarioEdicion && Number(usuarioEdicion.roleId) === Number(rol.id)) {
        rolesUnicos[indicesRolesPorNombre.get(nombreRolNormalizado)] = rol;
      }
    });
    var opcionesRoles = rolesUnicos.map(function(rol) {
      var selected = usuarioEdicion && Number(usuarioEdicion.roleId) === Number(rol.id)
        ? ' selected'
        : '';
      return '<option value="' + escaparHtmlAdmin(rol.id) + '"' + selected + '>' +
        escaparHtmlAdmin(rol.name) + '</option>';
    }).join('');
    if (usuarioEdicion && !rolesUnicos.some(function(rol) {
      return Number(rol.id) === Number(usuarioEdicion.roleId);
    })) {
      opcionesRoles =
        '<option value="' + escaparHtmlAdmin(usuarioEdicion.roleId) + '" selected disabled>' +
        escaparHtmlAdmin(usuarioEdicion.role) + ' (inactivo)</option>' + opcionesRoles;
    }

    titulo.textContent = usuarioEdicion ? "Editar Usuario" : "Registrar Nuevo Cliente";
    if (usuarioEdicion) {
      campos.innerHTML = `
        <div class="campo-grupo">
          <label for="campo1">Nombre y Apellidos:</label>
          <input type="text" id="campo1" required maxlength="60" value="${escaparHtmlAdmin(nombreCompleto)}" placeholder="Ej. Mario Alejandro Pérez">
        </div>
        <div class="campo-grupo">
          <label for="campo2">Teléfono de Contacto:</label>
          <input type="tel" id="campo2" required maxlength="20" value="${escaparHtmlAdmin(usuarioEdicion.phone || '')}" placeholder="Ej. 3124567890">
        </div>
        <div class="campo-grupo">
          <label for="campo3">Correo Electrónico:</label>
          <input type="email" id="campo3" required maxlength="120" value="${escaparHtmlAdmin(usuarioEdicion.email || '')}" placeholder="Ej. cliente@gmail.com">
        </div>
        <div class="campo-grupo">
          <label for="campo_departamento">Departamento:</label>
          <input type="text" id="campo_departamento" required maxlength="30" value="${escaparHtmlAdmin(usuarioEdicion.department || '')}">
        </div>
        <div class="campo-grupo">
          <label for="campo_ciudad">Ciudad:</label>
          <input type="text" id="campo_ciudad" maxlength="30" value="${escaparHtmlAdmin(usuarioEdicion.city || '')}">
        </div>
        <div class="campo-grupo">
          <label for="campo_direccion">Dirección:</label>
          <input type="text" id="campo_direccion" maxlength="40" value="${escaparHtmlAdmin(usuarioEdicion.address || '')}">
        </div>
        <div class="campo-grupo">
          <label for="campo_rol">Rol:</label>
          <select id="campo_rol" required>${opcionesRoles}</select>
        </div>
      `;
    } else {
      var opcionesDepartamentos = Object.keys(window.departamentosColombia).map(function(departamento) {
        return '<option value="' + escaparHtmlAdmin(departamento) + '">' +
          escaparHtmlAdmin(departamento) + '</option>';
      }).join('');
      campos.innerHTML = `
        <div class="campo-grupo">
          <label for="cliente-nombre">Nombre:</label>
          <input type="text" id="cliente-nombre" required minlength="2" maxlength="30" autocomplete="given-name" placeholder="Tu nombre">
        </div>
        <div class="campo-grupo">
          <label for="cliente-apellido">Apellido:</label>
          <input type="text" id="cliente-apellido" required minlength="2" maxlength="30" autocomplete="family-name" placeholder="Tu apellido">
        </div>
        <div class="campo-grupo">
          <label for="cliente-nacimiento">Fecha de nacimiento:</label>
          <input type="date" id="cliente-nacimiento" required min="1940-01-01">
        </div>
        <div class="campo-grupo">
          <label for="cliente-tipo-documento">Tipo de documento:</label>
          <select id="cliente-tipo-documento" required>
            <option value="">Selecciona el tipo</option>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PAS">Pasaporte</option>
            <option value="NIT">NIT</option>
          </select>
        </div>
        <div class="campo-grupo">
          <label for="cliente-numero-documento">Número de documento:</label>
          <input type="text" id="cliente-numero-documento" required minlength="6" maxlength="20" inputmode="numeric" placeholder="Ej. 1075654321">
        </div>
        <div class="campo-grupo">
          <label for="cliente-correo">Correo electrónico:</label>
          <input type="email" id="cliente-correo" required maxlength="120" autocomplete="email" placeholder="ejemplo@correo.com">
        </div>
        <div class="campo-grupo">
          <label for="cliente-confirmar-correo">Confirmar correo electrónico:</label>
          <input type="email" id="cliente-confirmar-correo" required maxlength="120" autocomplete="email" placeholder="Repite el correo electrónico">
        </div>
        <div class="campo-grupo">
          <label for="cliente-contrasena">Contraseña:</label>
          <input type="password" id="cliente-contrasena" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
        </div>
        <div class="campo-grupo">
          <label for="cliente-confirmar-contrasena">Confirmar contraseña:</label>
          <input type="password" id="cliente-confirmar-contrasena" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Repite la contraseña">
        </div>
        <div class="campo-grupo">
          <label for="cliente-direccion">Dirección principal:</label>
          <input type="text" id="cliente-direccion" required minlength="5" maxlength="40" autocomplete="street-address" placeholder="Calle, carrera, avenida, casa">
          <small class="ayuda-campo">Máximo 40 caracteres.</small>
        </div>
        <div class="campo-grupo">
          <label for="cliente-departamento">Departamento:</label>
          <select id="cliente-departamento" required>
            <option value="">Selecciona un departamento</option>
            ${opcionesDepartamentos}
          </select>
        </div>
        <div class="campo-grupo">
          <label for="cliente-ciudad">Municipio / Ciudad:</label>
          <select id="cliente-ciudad" required disabled>
            <option value="">Primero elige un departamento</option>
          </select>
        </div>
        <div class="campo-grupo">
          <label for="cliente-codigo-postal">Código postal (opcional):</label>
          <input type="text" id="cliente-codigo-postal" maxlength="20" autocomplete="postal-code" placeholder="Ej. 152210">
        </div>
        <div class="campo-grupo">
          <label for="cliente-telefono">Teléfono principal:</label>
          <div class="campo-telefono">
            <select id="cliente-prefijo-telefono" aria-label="Prefijo del teléfono principal">
              <option value="+57">🇨🇴 +57</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+52">🇲🇽 +52</option>
              <option value="+34">🇪🇸 +34</option>
              <option value="+54">🇦🇷 +54</option>
              <option value="+55">🇧🇷 +55</option>
              <option value="+56">🇨🇱 +56</option>
              <option value="+51">🇵🇪 +51</option>
              <option value="+593">🇪🇨 +593</option>
              <option value="+58">🇻🇪 +58</option>
            </select>
            <input type="tel" id="cliente-telefono" required maxlength="16" autocomplete="tel-national" placeholder="Ej. 312 345 6789">
          </div>
        </div>
        <div class="campo-grupo">
          <label for="cliente-telefono-secundario">Teléfono secundario (opcional):</label>
          <div class="campo-telefono">
            <select id="cliente-prefijo-secundario" aria-label="Prefijo del teléfono secundario">
              <option value="+57">🇨🇴 +57</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+52">🇲🇽 +52</option>
              <option value="+34">🇪🇸 +34</option>
              <option value="+54">🇦🇷 +54</option>
              <option value="+55">🇧🇷 +55</option>
              <option value="+56">🇨🇱 +56</option>
              <option value="+51">🇵🇪 +51</option>
              <option value="+593">🇪🇨 +593</option>
              <option value="+58">🇻🇪 +58</option>
            </select>
            <input type="tel" id="cliente-telefono-secundario" maxlength="16" autocomplete="tel" placeholder="Ej. 608 770 1234">
          </div>
        </div>
        <div class="campo-grupo campo-grupo-check">
          <input type="checkbox" id="cliente-misma-direccion" checked>
          <label for="cliente-misma-direccion">Usar la misma dirección para facturación.</label>
        </div>
        <div class="campo-grupo campo-grupo-check">
          <input type="checkbox" id="cliente-terminos" required>
          <label for="cliente-terminos">El cliente acepta los términos, condiciones y la política de tratamiento de datos.</label>
        </div>
      `;
      configurarFormularioNuevoClienteAdmin();
    }
  } else if (tipo === 'pedidos') {
    titulo.textContent = "Registrar Nuevo Pedido / Venta";
    var optsClientes = clientesDisponibles.length > 0
      ? '<option value="" selected disabled>Selecciona un cliente...</option>' + clientesDisponibles.map(function(c) {
          return '<option value="' + escaparHtmlAdmin(c.id) + '">' + escaparHtmlAdmin(c.name) + '</option>';
        }).join('')
      : '<option value="" selected disabled>No hay clientes activos</option>';

    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Cliente:</label>
        <select id="campo1" required>${optsClientes}</select>
      </div>
      <div class="campo-grupo">
        <label>Total de la Venta ($):</label>
        <input type="number" id="campo2" required min="1000" max="99999999" step="500" placeholder="Ej. 180000">
      </div>
    `;
  }
  aplicarIndicadoresCamposObligatorios(campos);
}

function actualizarCiudadesNuevoClienteAdmin(departamento) {
  var ciudadSelect = document.getElementById('cliente-ciudad');
  if (!ciudadSelect) return;

  ciudadSelect.replaceChildren();
  var ciudades = window.departamentosColombia[departamento];
  if (!ciudades) {
    ciudadSelect.add(new Option('Primero elige un departamento', ''));
    ciudadSelect.disabled = true;
    return;
  }

  ciudadSelect.disabled = false;
  ciudadSelect.add(new Option('Selecciona tu municipio', ''));
  ciudades.forEach(function(ciudad) {
    ciudadSelect.add(new Option(ciudad, ciudad));
  });
}

function configurarFormularioNuevoClienteAdmin() {
  var departamentoSelect = document.getElementById('cliente-departamento');
  var nacimientoInput = document.getElementById('cliente-nacimiento');
  var tipoDocumentoSelect = document.getElementById('cliente-tipo-documento');
  var numeroDocumentoInput = document.getElementById('cliente-numero-documento');
  if (departamentoSelect) {
    departamentoSelect.addEventListener('change', function() {
      actualizarCiudadesNuevoClienteAdmin(departamentoSelect.value);
      limpiarErrorCampoAdmin(document.getElementById('cliente-ciudad'));
    });
  }
  document.querySelectorAll('#modalCampos input, #modalCampos select').forEach(function(input) {
    input.addEventListener('input', function() {
      if (input.classList.contains('campo-invalido')) limpiarErrorCampoAdmin(input);
    });
    input.addEventListener('change', function() {
      if (input.classList.contains('campo-invalido')) limpiarErrorCampoAdmin(input);
    });
  });
  if (nacimientoInput) {
    var fechaMaxima = new Date();
    fechaMaxima.setFullYear(fechaMaxima.getFullYear() - 10);
    nacimientoInput.max = [
      fechaMaxima.getFullYear(),
      String(fechaMaxima.getMonth() + 1).padStart(2, '0'),
      String(fechaMaxima.getDate()).padStart(2, '0')
    ].join('-');
  }
  if (tipoDocumentoSelect && numeroDocumentoInput) {
    tipoDocumentoSelect.addEventListener('change', function() {
      var esPasaporte = tipoDocumentoSelect.value === 'PAS';
      numeroDocumentoInput.value = '';
      numeroDocumentoInput.inputMode = esPasaporte ? 'text' : 'numeric';
      numeroDocumentoInput.pattern = esPasaporte ? '[A-Za-z0-9-]{5,20}' : '[0-9]{6,20}';
      numeroDocumentoInput.placeholder = esPasaporte ? 'Ej. AB123456' : 'Ej. 1075654321';
      limpiarErrorCampoAdmin(numeroDocumentoInput);
    });
    numeroDocumentoInput.addEventListener('input', function() {
      numeroDocumentoInput.value = tipoDocumentoSelect.value === 'PAS'
        ? numeroDocumentoInput.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
        : numeroDocumentoInput.value.replace(/\D/g, '');
    });
  }
}

function limpiarErrorCampoAdmin(input) {
  if (!input) return;
  input.classList.remove('campo-invalido');
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
  if (input.nextElementSibling?.classList.contains('mensaje-error-campo')) {
    input.nextElementSibling.remove();
  }
}

function validarNuevoClienteAdmin() {
  var valores = {
    firstName: document.getElementById('cliente-nombre').value.trim(),
    lastName: document.getElementById('cliente-apellido').value.trim(),
    birthDate: document.getElementById('cliente-nacimiento').value,
    documentType: document.getElementById('cliente-tipo-documento').value,
    documentNumber: document.getElementById('cliente-numero-documento').value.trim(),
    email: document.getElementById('cliente-correo').value.trim().toLowerCase(),
    confirmEmail: document.getElementById('cliente-confirmar-correo').value.trim().toLowerCase(),
    password: document.getElementById('cliente-contrasena').value,
    confirmPassword: document.getElementById('cliente-confirmar-contrasena').value,
    address: document.getElementById('cliente-direccion').value.trim(),
    department: document.getElementById('cliente-departamento').value,
    city: document.getElementById('cliente-ciudad').value,
    phone: document.getElementById('cliente-telefono').value.trim(),
    secondaryPhone: document.getElementById('cliente-telefono-secundario').value.trim()
  };
  var valido = true;
  function invalidar(id, mensaje) {
    marcarErrorCampo(document.getElementById(id), mensaje);
    valido = false;
  }

  var patronNombre = /^[\p{L}][\p{L}\s'-]*$/u;
  if (valores.firstName.length < 2 || valores.firstName.length > 30 || !patronNombre.test(valores.firstName)) {
    invalidar('cliente-nombre', 'Ingresa un nombre de 2 a 30 caracteres; usa solo letras, espacios, apóstrofes o guiones.');
  }
  if (valores.lastName.length < 2 || valores.lastName.length > 30 || !patronNombre.test(valores.lastName)) {
    invalidar('cliente-apellido', 'Ingresa un apellido de 2 a 30 caracteres; usa solo letras, espacios, apóstrofes o guiones.');
  }

  var fechaNacimiento = new Date(valores.birthDate + 'T00:00:00Z');
  var fechaMaxima = new Date();
  fechaMaxima.setFullYear(fechaMaxima.getFullYear() - 10);
  var fechaMaximaTexto = [
    fechaMaxima.getFullYear(),
    String(fechaMaxima.getMonth() + 1).padStart(2, '0'),
    String(fechaMaxima.getDate()).padStart(2, '0')
  ].join('-');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valores.birthDate) ||
    Number.isNaN(fechaNacimiento.getTime()) ||
    fechaNacimiento.toISOString().slice(0, 10) !== valores.birthDate ||
    valores.birthDate < '1940-01-01' ||
    valores.birthDate > fechaMaximaTexto
  ) {
    invalidar('cliente-nacimiento', 'Selecciona una fecha válida entre 1940 y la fecha límite permitida (mínimo 10 años).');
  }

  if (!['CC', 'TI', 'CE', 'PAS', 'NIT'].includes(valores.documentType)) {
    invalidar('cliente-tipo-documento', 'Selecciona un tipo de documento válido.');
  }
  var documentoValido = valores.documentType === 'PAS'
    ? /^[A-Za-z0-9-]{5,20}$/.test(valores.documentNumber)
    : /^[0-9]{6,20}$/.test(valores.documentNumber);
  if (!documentoValido) {
    invalidar(
      'cliente-numero-documento',
      valores.documentType === 'PAS'
        ? 'Ingresa un pasaporte de 5 a 20 caracteres alfanuméricos.'
        : 'Ingresa un documento de 6 a 20 números.',
    );
  }

  var formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (valores.email.length > 120 || !formatoCorreo.test(valores.email)) {
    invalidar('cliente-correo', 'Ingresa un correo válido de máximo 120 caracteres.');
  }
  if (valores.confirmEmail !== valores.email || !valores.confirmEmail) {
    invalidar('cliente-confirmar-correo', 'Los correos electrónicos deben coincidir.');
  }
  if (valores.password.length < 8 || valores.password.length > 128) {
    invalidar('cliente-contrasena', 'La contraseña debe tener entre 8 y 128 caracteres.');
  }
  if (valores.confirmPassword !== valores.password || !valores.confirmPassword) {
    invalidar('cliente-confirmar-contrasena', 'Las contraseñas deben coincidir.');
  }
  if (valores.address.length < 5 || valores.address.length > 40) {
    invalidar('cliente-direccion', 'Ingresa una dirección de 5 a 40 caracteres.');
  }
  if (!Object.hasOwn(window.departamentosColombia, valores.department)) {
    invalidar('cliente-departamento', 'Selecciona un departamento válido.');
  }
  if (!window.departamentosColombia[valores.department]?.includes(valores.city)) {
    invalidar('cliente-ciudad', 'Selecciona un municipio válido para el departamento.');
  }

  function telefonoValido(valor, prefijoId, obligatorio) {
    if (!valor && !obligatorio) return true;
    var prefijo = document.getElementById(prefijoId).value;
    var digitosLocales = valor.replace(/\D/g, '').replace(/^0+/, '');
    return /^[\d()\s-]{7,16}$/.test(valor) &&
      digitosLocales.length >= 7 &&
      (prefijo + ' ' + valor).length <= 20;
  }
  if (!telefonoValido(valores.phone, 'cliente-prefijo-telefono', true)) {
    invalidar('cliente-telefono', 'Ingresa un teléfono válido con al menos 7 dígitos.');
  }
  if (!telefonoValido(valores.secondaryPhone, 'cliente-prefijo-secundario', false)) {
    invalidar('cliente-telefono-secundario', 'Ingresa un teléfono secundario válido con al menos 7 dígitos.');
  }
  if (!document.getElementById('cliente-terminos').checked) {
    invalidar('cliente-terminos', 'Debes confirmar la aceptación de los términos y la política de datos.');
  }

  if (!valido) {
    mostrarToast('error', 'Por favor corrige los campos señalados antes de guardar.');
    document.querySelector('#formularioDinamico .campo-invalido')?.focus();
  }
  return valido;
}

function formatearTelefonoClienteAdmin(valorId, prefijoId) {
  var digitos = document.getElementById(valorId).value.replace(/\D/g, '').replace(/^0+/, '');
  return digitos ? document.getElementById(prefijoId).value + ' ' + digitos : '';
}

// Funciones para marcar y limpiar errores visuales en los campos
function marcarErrorCampo(input, mensaje) {
  if (!input) return;
  input.classList.add('campo-invalido');
  input.setAttribute('aria-invalid', 'true');
  var errorSpan = input.nextElementSibling;
  if (!errorSpan || !errorSpan.classList.contains('mensaje-error-campo')) {
    errorSpan = document.createElement('span');
    errorSpan.className = 'mensaje-error-campo';
    errorSpan.id = 'error-' + (input.id || Math.random().toString(36).slice(2));
    input.insertAdjacentElement('afterend', errorSpan);
  }
  errorSpan.textContent = mensaje;
  input.setAttribute('aria-describedby', errorSpan.id);
}

function aplicarIndicadoresCamposObligatorios(contenedor) {
  contenedor.querySelectorAll('input[required], select[required], textarea[required]').forEach(function(input) {
    var grupo = input.closest('.campo-grupo');
    var etiqueta = grupo && grupo.querySelector('label');
    if (!etiqueta || etiqueta.querySelector('.indicador-obligatorio')) return;
    var indicador = document.createElement('span');
    indicador.className = 'indicador-obligatorio';
    indicador.setAttribute('aria-hidden', 'true');
    indicador.textContent = ' *';
    etiqueta.appendChild(indicador);
  });
}

function validarCamposObligatorios(formulario) {
  var valido = true;
  formulario.querySelectorAll('input[required], select[required], textarea[required]').forEach(function(input) {
    var vacio = input.type === 'checkbox'
    ? !input.checked
    : input.type === 'file'
      ? !input.files || input.files.length === 0
      : !String(input.value || '').trim();
    if (!vacio) return;

    var grupo = input.closest('.campo-grupo');
    var etiqueta = grupo && grupo.querySelector('label');
    var nombreCampo = etiqueta
    ? etiqueta.textContent.replace(/\s*\*$/, '').replace(/\s*\(.*\)$/, '').trim()
    : 'Este campo';
    marcarErrorCampo(input, nombreCampo + ' es obligatorio.');
    valido = false;
  });
  return valido;
}

function campoIdParaErrorBackend(campo) {
  if (tipoModalActual === 'clientes' && !usuarioEdicion) {
    var camposNuevoCliente = {
      firstName: 'cliente-nombre',
      lastName: 'cliente-apellido',
      birthDate: 'cliente-nacimiento',
      documentType: 'cliente-tipo-documento',
      documentNumber: 'cliente-numero-documento',
      email: 'cliente-correo',
      confirmEmail: 'cliente-confirmar-correo',
      password: 'cliente-contrasena',
      confirmPassword: 'cliente-confirmar-contrasena',
      phone: 'cliente-telefono',
      secondaryPhone: 'cliente-telefono-secundario',
      department: 'cliente-departamento',
      city: 'cliente-ciudad',
      address: 'cliente-direccion',
      postalCode: 'cliente-codigo-postal',
      acceptedTerms: 'cliente-terminos'
    };
    return camposNuevoCliente[campo] || campo;
  }

  var camposPorFormulario = {
    inventario: {
    name: 'campo1', category: 'campo2', publisher: 'campo_marca',
    price: 'campo3', stock: 'campo4', imageUrl: 'campo_imagen_principal',
    imageUrl2: 'campo_imagen_2', imageUrl3: 'campo_imagen_3',
    imageUrl4: 'campo_imagen_4', description: 'campo_descripcion'
    },
    mantenimientos: {
    equipment: 'campo1', equipmentType: 'campo_tipo_equipo',
    brand: 'campo_marca_equipo', serialNumber: 'campo_serie_equipo',
    clientId: 'campo2', technicianId: 'campo3',
    serviceDescription: 'campo_detalle', diagnosis: 'campo_diagnostico',
    cost: 'campo4'
    },
    reparacion: {
    equipment: 'campo1', equipmentType: 'campo_tipo_equipo',
    brand: 'campo_marca_equipo', serialNumber: 'campo_serie_equipo',
    serviceDescription: 'campo2', diagnosis: 'campo_diagnostico',
    clientId: 'campo3', technicianId: 'campo_tecnico', cost: 'campo4'
    },
    descuentos: { code: 'campo1', percent: 'campo2', desc: 'campo3' },
    clientes: {
    name: 'campo1', phone: 'campo2', email: 'campo3',
    department: 'campo_departamento', city: 'campo_ciudad',
    address: 'campo_direccion', roleId: 'campo_rol'
    },
    resenas: {
    clientId: 'campo1', productOrService: 'campo2',
    rating: 'campo3', comment: 'campo4'
    },
    pedidos: { clientId: 'campo1', total: 'campo2' }
  };
  return camposPorFormulario[tipoModalActual]?.[campo] || campo;
}

function mostrarErroresRespuestaModal(data) {
  var errores = data && data.errors;
  if (errores && typeof errores === 'object' && !Array.isArray(errores)) {
    Object.entries(errores).forEach(function([campo, mensaje]) {
    var input = document.getElementById(campoIdParaErrorBackend(campo));
    var texto = Array.isArray(mensaje) ? mensaje.join(' ') : String(mensaje || '');
    if (input && texto) marcarErrorCampo(input, texto);
    });
  }
  mostrarToast('error', data && data.message ? data.message : 'No se pudo guardar el registro.');
  var primerCampoInvalido = document.querySelector('#formularioDinamico .campo-invalido');
  var campoSucursal = document.getElementById('filtroSucursalInventario');
  if (!primerCampoInvalido && campoSucursal?.classList.contains('campo-invalido')) {
    primerCampoInvalido = campoSucursal;
  }
  primerCampoInvalido?.focus();
}

function limpiarErroresModal() {
  var formulario = document.getElementById('formularioDinamico');
  if (!formulario) return;
  var invalidos = formulario.querySelectorAll('.campo-invalido');
  invalidos.forEach(function(el) {
    el.classList.remove('campo-invalido');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
  var mensajes = formulario.querySelectorAll('.mensaje-error-campo');
  mensajes.forEach(function(m) { m.remove(); });
  var sucursal = document.getElementById('filtroSucursalInventario');
  if (sucursal) {
    sucursal.classList.remove('campo-invalido');
    sucursal.removeAttribute('aria-invalid');
    sucursal.removeAttribute('aria-describedby');
    if (sucursal.nextElementSibling?.classList.contains('mensaje-error-campo')) {
      sucursal.nextElementSibling.remove();
    }
  }
}

function cerrarModal() {
  var modal = document.getElementById('modalFormulario');
  if (modal) {
    modal.classList.remove('activo');
  }
  tipoModalActual = "";
  productoInventarioEdicion = null;
  usuarioEdicion = null;
  descuentoEdicion = null;
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

function configurarAccionesSolicitudesGarantia() {
  var tbody = document.getElementById('tablaSolicitudesGarantiaBody');
  if (!tbody) return;

  tbody.addEventListener('change', function(event) {
    var selector = event.target.closest('.select-estado-solicitud');
    if (!selector) return;
    var button = selector.closest('tr').querySelector('.boton-guardar-solicitud');
    button.disabled = selector.value === selector.dataset.savedStatus;
  });

  tbody.addEventListener('click', function(event) {
    var button = event.target.closest('.boton-guardar-solicitud');
    if (!button || button.disabled) return;

    var row = button.closest('tr');
    var selector = row.querySelector('.select-estado-solicitud');
    var requestId = button.dataset.requestId;
    var nextStatus = selector.value;
    button.disabled = true;
    selector.disabled = true;

    fetch(API_BASE + '/api/admin/warranty-requests/' + encodeURIComponent(requestId) + '/status', {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + sessionToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: nextStatus })
    })
    .then(function(response) {
      return response.json().then(function(data) {
        return { status: response.status, data: data };
      });
    })
    .then(function(result) {
      if (result.status >= 400 || !result.data.ok) {
        throw new Error(result.data.message || 'No se pudo actualizar la solicitud.');
      }
      selector.dataset.savedStatus = nextStatus;
      mostrarToast('success', result.data.message || 'Estado actualizado.');
      cargarDashboard();
    })
    .catch(function(error) {
      selector.value = selector.dataset.savedStatus;
      button.disabled = true;
      mostrarToast('error', error.message || 'No se pudo actualizar la solicitud.');
    })
    .finally(function() {
      selector.disabled = false;
      button.disabled = selector.value === selector.dataset.savedStatus;
    });
  });
}

function configurarAccionesGarantias() {
  var tbody = document.getElementById('tablaGarantiasBody');
  if (!tbody) return;

  tbody.addEventListener('change', function(event) {
    var selector = event.target.closest('.select-estado-garantia');
    if (!selector) return;
    var button = selector.closest('tr').querySelector('.boton-guardar-garantia');
    button.disabled = selector.value === selector.dataset.savedStatus;
  });

  tbody.addEventListener('click', function(event) {
    var button = event.target.closest('.boton-guardar-garantia');
    if (!button || button.disabled) return;

    var row = button.closest('tr');
    var selector = row.querySelector('.select-estado-garantia');
    var warrantyId = button.dataset.warrantyId;
    var nextStatus = selector.value;
    button.disabled = true;
    selector.disabled = true;

    cambiarEstadoGarantiaAdmin(button, Number(warrantyId), nextStatus)
      .finally(function() {
        selector.disabled = false;
        button.disabled = selector.value === selector.dataset.savedStatus;
      });
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
      control.maxLength = 15;
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
  if (!/^\d{10,15}$/.test(telefono)) {
    errores.phone = 'El teléfono debe contener entre 10 y 15 dígitos.';
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

function renderizarGraficoVentas(tendencia) {
  var contenedor = document.getElementById('graficoVentas');
  if (!contenedor) return;
  var periodoSelect = document.getElementById('filtroPeriodoVentas');
  var periodo = periodoSelect ? Number(periodoSelect.value) : 7;
  var puntos = Array.isArray(tendencia) ? tendencia.slice().reverse().map(function(punto) {
    var fecha = String(punto.date || '');
    var fechaPartes = fecha.split('-');
    var fechaUtc = fechaPartes.length === 3
      ? new Date(Date.UTC(Number(fechaPartes[0]), Number(fechaPartes[1]) - 1, Number(fechaPartes[2])))
      : null;
    return {
      date: fecha,
      label: fechaUtc && !Number.isNaN(fechaUtc.getTime())
        ? new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC'
        }).format(fechaUtc).replace(/\./g, '')
        : String(punto.label || ''),
      value: Math.max(0, Number(punto.value) || 0)
    };
  }) : [];

  contenedor.replaceChildren();
  if (!puntos.length) {
    var vacio = document.createElement('p');
    vacio.className = 'grafico-vacio';
    vacio.textContent = 'No hay ventas para mostrar en los últimos ' + periodo + ' días.';
    contenedor.appendChild(vacio);
    return;
  }

  var valorMaximo = Math.max.apply(null, puntos.map(function(punto) {
    return punto.value;
  }));
  var paso = 1;
  if (valorMaximo > 0) {
    var pasoBase = valorMaximo / 4;
    var magnitud = Math.pow(10, Math.floor(Math.log(pasoBase) / Math.LN10));
    var normalizado = pasoBase / magnitud;
    paso = (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10) * magnitud;
  }
  var maximoEje = valorMaximo > 0 ? paso * 4 : 4;
  var formatoCompacto = new Intl.NumberFormat('es-CO', {
    notation: 'compact',
    maximumFractionDigits: 1
  });
  var formatoMoneda = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  });
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 700 200');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Ventas diarias de los últimos ' + periodo + ' días');

  var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  function agregarGradiente(id, x1, y1, x2, y2, paradas) {
    var gradiente = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradiente.setAttribute('id', id);
    gradiente.setAttribute('x1', x1);
    gradiente.setAttribute('y1', y1);
    gradiente.setAttribute('x2', x2);
    gradiente.setAttribute('y2', y2);
    paradas.forEach(function(parada) {
      var stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', parada.offset);
      stop.setAttribute('stop-color', parada.color);
      stop.setAttribute('stop-opacity', parada.opacity);
      gradiente.appendChild(stop);
    });
    defs.appendChild(gradiente);
  }
  agregarGradiente('ventasAreaGradient', '0', '0', '0', '1', [
    { offset: '0%', color: '#22d3ee', opacity: '.28' },
    { offset: '100%', color: '#2563eb', opacity: '.01' }
  ]);
  agregarGradiente('ventasLineGradient', '0', '0', '1', '0', [
    { offset: '0%', color: '#22d3ee', opacity: '1' },
    { offset: '55%', color: '#3b82f6', opacity: '1' },
    { offset: '100%', color: '#a78bfa', opacity: '1' }
  ]);
  svg.appendChild(defs);

  function agregarSvg(nombre, atributos, texto) {
    var elemento = document.createElementNS('http://www.w3.org/2000/svg', nombre);
    Object.keys(atributos).forEach(function(atributo) {
      elemento.setAttribute(atributo, atributos[atributo]);
    });
    if (texto !== undefined) elemento.textContent = texto;
    svg.appendChild(elemento);
    return elemento;
  }

  var izquierda = 62;
  var derecha = 694;
  var arriba = 14;
  var abajo = 156;
  var ancho = derecha - izquierda;
  var alto = abajo - arriba;

  for (var tick = 0; tick <= 4; tick++) {
    var valorTick = maximoEje * (4 - tick) / 4;
    var posicionY = arriba + alto * tick / 4;
    agregarSvg('line', {
      x1: izquierda,
      y1: posicionY,
      x2: derecha,
      y2: posicionY,
      class: 'grafico-linea-guia'
    });
    agregarSvg('text', {
      x: izquierda - 8,
      y: posicionY + 4,
      class: 'grafico-etiqueta-eje',
      'text-anchor': 'end'
    }, '$' + formatoCompacto.format(valorTick));
  }

  var coordenadas = puntos.map(function(punto, indice) {
    var x = izquierda + (puntos.length === 1 ? ancho / 2 : ancho * indice / (puntos.length - 1));
    var y = abajo - punto.value / maximoEje * alto;
    return { x: x, y: y, punto: punto };
  });
  var trayectoria = coordenadas.map(function(coordenada, indice) {
    return (indice === 0 ? 'M' : 'L') + coordenada.x + ' ' + coordenada.y;
  }).join(' ');

  var area = trayectoria + ' L' + coordenadas[coordenadas.length - 1].x + ' ' + abajo +
    ' L' + coordenadas[0].x + ' ' + abajo + ' Z';
  agregarSvg('path', { d: area, class: 'grafico-area-ventas' });
  agregarSvg('path', { d: trayectoria, class: 'grafico-linea-ventas' });
  coordenadas.forEach(function(coordenada) {
    var grupo = agregarSvg('g', { class: 'grafico-punto-grupo' });
    var circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circulo.setAttribute('cx', coordenada.x);
    circulo.setAttribute('cy', coordenada.y);
    circulo.setAttribute('r', 5);
    circulo.setAttribute('class', 'grafico-punto-venta');
    grupo.appendChild(circulo);
    var titulo = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titulo.textContent = coordenada.punto.date + ': $ ' + formatoMoneda.format(coordenada.punto.value);
    grupo.appendChild(titulo);
  });
  var frecuenciaEtiquetas = Math.max(1, Math.ceil(coordenadas.length / 7));
  coordenadas.forEach(function(coordenada, indice) {
    if (indice % frecuenciaEtiquetas !== 0 && indice !== coordenadas.length - 1) return;
    var ancla = coordenadas.length === 1
      ? 'middle'
      : indice === 0
        ? 'start'
        : indice === coordenadas.length - 1
          ? 'end'
          : 'middle';
    agregarSvg('text', {
      x: coordenada.x,
      y: 184,
      class: 'grafico-etiqueta-dia',
      'text-anchor': ancla
    }, coordenada.punto.label);
  });

  contenedor.appendChild(svg);
}

// Cargar datos del panel desde el backend
var detalleVentaRequestId = 0;
var detalleVentaActual = null;
var resumenFinancieroActual = null;

function mostrarDetallesFinancieros(evento) {
  if (evento) evento.preventDefault();

  var dialogo = document.getElementById('modalDetalleFinanciero');
  var contenido = document.getElementById('modalDetalleFinancieroContenido');
  var periodo = document.getElementById('modalDetalleFinancieroPeriodo');
  var resumen = resumenFinancieroActual;
  if (!dialogo || !contenido || !resumen) {
    mostrarToast('error', 'No se pudieron cargar los detalles financieros.');
    return;
  }

  var partesMes = String(resumen.month || '').split('-');
  var fechaMes = partesMes.length === 2
    ? new Date(Number(partesMes[0]), Number(partesMes[1]) - 1, 1)
    : new Date();
  var nombreMes = fechaMes.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric'
  });
  if (periodo) periodo.textContent = 'Periodo: ' + nombreMes;

  var detalles = document.createElement('dl');
  detalles.className = 'lista-detalle-servicio';
  agregarDatoLecturaDetalleAdmin(
    detalles,
    'Ingresos por ventas pagadas',
    '$ ' + Number(resumen.income || 0).toLocaleString('es-CO') +
      ' · ' + Number(resumen.salesCount || 0) + ' ventas'
  );
  agregarDatoLecturaDetalleAdmin(
    detalles,
    'Compras de inventario pagadas',
    '$ ' + Number(resumen.expenses || 0).toLocaleString('es-CO') +
      ' · ' + Number(resumen.purchasesCount || 0) + ' compras'
  );
  agregarDatoLecturaDetalleAdmin(
    detalles,
    'Resultado estimado',
    '$ ' + Number(resumen.result || 0).toLocaleString('es-CO')
  );
  agregarDatoLecturaDetalleAdmin(
    detalles,
    'Margen estimado',
    Number(resumen.marginPercent || 0).toLocaleString('es-CO', {
      maximumFractionDigits: 1
    }) + '%'
  );

  var nota = document.createElement('p');
  nota.className = 'detalle-financiero-nota';
  nota.textContent =
    'El resultado resta las compras de inventario pagadas durante el mes a las ventas pagadas del mismo periodo. Es una estimación de flujo: no incluye otros gastos ni el costo de productos comprados en meses anteriores.';
  contenido.replaceChildren(detalles, nota);
  if (!dialogo.open) dialogo.showModal();
}

var modalDetalleFinanciero = document.getElementById('modalDetalleFinanciero');
document.getElementById('btnCerrarDetalleFinanciero')?.addEventListener('click', function() {
  modalDetalleFinanciero?.close();
});
document.getElementById('btnCerrarDetalleFinancieroPie')?.addEventListener('click', function() {
  modalDetalleFinanciero?.close();
});
modalDetalleFinanciero?.addEventListener('click', function(evento) {
  if (evento.target === modalDetalleFinanciero) modalDetalleFinanciero.close();
});

function mostrarDetalleVenta(id, iniciarEdicion) {
  var saleId = Number(id);
  var dialogo = document.getElementById('modalDetalleVenta');
  var titulo = document.getElementById('modalDetalleVentaTitulo');
  var contenido = document.getElementById('modalDetalleVentaContenido');
  var botonEditar = document.getElementById('btnEditarDetalleVenta');
  if (!Number.isSafeInteger(saleId) || saleId <= 0 || !dialogo || !titulo || !contenido) {
    mostrarToast('error', 'No se pudo abrir el detalle de la venta.');
    return;
  }

  var requestId = ++detalleVentaRequestId;
  detalleVentaActual = null;
  if (botonEditar) botonEditar.hidden = true;
  titulo.textContent = (iniciarEdicion ? 'Editar datos de venta #' : 'Detalle de venta #') + saleId;
  contenido.textContent = 'Cargando detalle de la venta...';
  contenido.setAttribute('aria-busy', 'true');
  if (!dialogo.open) dialogo.showModal();

  fetch(API_BASE + '/api/admin/ventas/' + encodeURIComponent(saleId), {
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(async function(response) {
    var data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('El servidor devolvió información inválida para esta venta.');
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.message || 'No se pudo cargar el detalle de la venta.');
    }
    return data;
  })
  .then(function(data) {
    if (requestId !== detalleVentaRequestId || !dialogo.open) return;

    var sale = data.sale;
    var items = Array.isArray(data.items) ? data.items : [];
    var details = document.createElement('dl');
    details.className = 'lista-detalle-servicio detalle-venta-datos';

    var saleTypes = {
      DOMICILIO: 'Domicilio',
      SUCURSAL: 'Venta en sucursal'
    };
    var paymentMethods = {
      EFECTIVO: 'Efectivo',
      TARJETA: 'Tarjeta',
      TRANSFERENCIA: 'Transferencia'
    };
    var statuses = {
      PAGADA: 'Pagada',
      ANULADA: 'Anulada'
    };
    agregarDatoLecturaDetalleAdmin(details, 'Venta', '#' + sale.id);
    agregarDatoLecturaDetalleAdmin(details, 'Referencia de pago', sale.reference);
    agregarDatoLecturaDetalleAdmin(details, 'Cliente', sale.clientName);
    agregarDatoLecturaDetalleAdmin(details, 'Correo', sale.clientEmail);
    agregarDatoLecturaDetalleAdmin(details, 'Teléfono', sale.phone);
    agregarDatoLecturaDetalleAdmin(details, 'Fecha', sale.date);
    agregarDatoLecturaDetalleAdmin(details, 'Estado', statuses[sale.status] || sale.status);
    agregarDatoLecturaDetalleAdmin(
      details,
      'Método de pago',
      paymentMethods[sale.paymentMethod] || sale.paymentMethod,
    );
    agregarDatoLecturaDetalleAdmin(
      details,
      'Tipo de venta',
      saleTypes[sale.saleType] || sale.saleType,
    );
    agregarDatoLecturaDetalleAdmin(details, 'Sucursal', sale.branchName);
    if (sale.saleType === 'DOMICILIO') {
      agregarDatoLecturaDetalleAdmin(details, 'Ciudad de entrega', sale.city);
      agregarDatoLecturaDetalleAdmin(details, 'Dirección de entrega', sale.address);
      agregarDatoLecturaDetalleAdmin(details, 'Número de guía', sale.trackingNumber);
    }
    if (sale.receipt) {
      agregarDatoLecturaDetalleAdmin(details, 'Comprobante', sale.receipt);
    }

    var productsTitle = document.createElement('h3');
    productsTitle.className = 'detalle-venta-seccion-titulo';
    productsTitle.textContent = 'Productos de la venta';

    var tableWrapper = document.createElement('div');
    tableWrapper.className = 'tabla-responsive';
    var table = document.createElement('table');
    table.className = 'tabla-panel';
    table.innerHTML =
      '<thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>' +
      '<tbody></tbody>';
    var tableBody = table.querySelector('tbody');
    if (items.length) {
      items.forEach(function(item) {
        var row = document.createElement('tr');
        [
          item.productName || 'Producto',
          Number(item.quantity || 0).toLocaleString('es-CO'),
          '$ ' + Number(item.unitPrice || 0).toLocaleString('es-CO'),
          '$ ' + Number(item.subtotal || 0).toLocaleString('es-CO')
        ].forEach(function(value) {
          var cell = document.createElement('td');
          cell.textContent = String(value);
          row.appendChild(cell);
        });
        tableBody.appendChild(row);
      });
    } else {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.className = 'texto-vacio';
      emptyCell.textContent = 'Esta venta no tiene productos asociados.';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
    }
    tableWrapper.appendChild(table);

    var total = document.createElement('p');
    total.className = 'detalle-venta-total';
    total.textContent =
      'Total de la venta: $ ' + Number(sale.total || 0).toLocaleString('es-CO');

    detalleVentaActual = {
      sale: sale,
      elements: [details, productsTitle, tableWrapper, total]
    };
    if (iniciarEdicion) {
      mostrarFormularioEdicionVenta();
    } else {
      contenido.replaceChildren.apply(contenido, detalleVentaActual.elements);
      if (botonEditar) botonEditar.hidden = false;
    }
    contenido.setAttribute('aria-busy', 'false');
  })
  .catch(function(error) {
    if (requestId !== detalleVentaRequestId || !dialogo.open) return;
    console.error('Error al cargar el detalle de la venta:', error);
    contenido.textContent = error.message || 'No se pudo cargar el detalle de la venta.';
    contenido.setAttribute('aria-busy', 'false');
    mostrarToast('error', contenido.textContent);
  });
}

function mostrarFormularioEdicionVenta() {
  if (!detalleVentaActual) return;

  var sale = detalleVentaActual.sale;
  var contenido = document.getElementById('modalDetalleVentaContenido');
  var botonEditar = document.getElementById('btnEditarDetalleVenta');
  if (!contenido) return;
  if (botonEditar) botonEditar.hidden = true;

  var formulario = document.createElement('form');
  formulario.id = 'formEditarVenta';
  formulario.className = 'form-edicion-detalle';

  var campos = [
    { name: 'firstName', label: 'Nombre(s) del cliente (actualiza su cuenta)', type: 'text', maxLength: 30, value: sale.clientFirstName, required: true },
    { name: 'lastName', label: 'Apellidos del cliente', type: 'text', maxLength: 30, value: sale.clientLastName, required: true },
    { name: 'date', label: 'Fecha de venta', type: 'datetime-local', value: String(sale.date || '').replace(' ', 'T'), required: true },
    { name: 'status', label: 'Estado', type: 'select', value: sale.status, options: [
      { value: 'PAGADA', label: 'Pagada' },
      { value: 'ANULADA', label: 'Anulada' }
    ] },
    { name: 'total', label: 'Total de la venta', type: 'number', value: Number(sale.total || 0), min: '0', max: '99999999.999999', step: '0.01', required: true },
    { name: 'phone', label: 'Teléfono de contacto', type: 'text', maxLength: 20, value: sale.phone }
  ];
  if (sale.saleType === 'DOMICILIO') {
    campos.push(
      { name: 'city', label: 'Ciudad de entrega', type: 'text', maxLength: 100, value: sale.city },
      { name: 'address', label: 'Dirección de entrega', type: 'text', maxLength: 180, value: sale.address },
      { name: 'trackingNumber', label: 'Número de guía', type: 'text', maxLength: 30, value: sale.trackingNumber }
    );
  }

  campos.forEach(function(campo) {
    var contenedor = document.createElement('label');
    contenedor.className = 'campo-edicion-detalle';
    contenedor.textContent = campo.label;
    var control = campo.type === 'select'
      ? document.createElement('select')
      : document.createElement('input');
    control.name = campo.name;
    if (campo.type === 'select') {
      campo.options.forEach(function(optionData) {
        var option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        control.appendChild(option);
      });
    } else {
      control.type = campo.type;
      if (campo.maxLength) control.maxLength = campo.maxLength;
      if (campo.min !== undefined) control.min = campo.min;
      if (campo.max !== undefined) control.max = campo.max;
      if (campo.step !== undefined) control.step = campo.step;
    }
    control.value = campo.value === undefined ? '' : campo.value;
    control.required = Boolean(campo.required);
    contenedor.appendChild(control);
    formulario.appendChild(contenedor);
  });

  var acciones = document.createElement('div');
  acciones.className = 'acciones-edicion-venta';
  var cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'btn-cancelar';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', cancelarEdicionVenta);
  var guardar = document.createElement('button');
  guardar.type = 'submit';
  guardar.className = 'boton-amarillo';
  guardar.textContent = 'Guardar cambios';
  acciones.append(cancelar, guardar);
  formulario.appendChild(acciones);
  formulario.addEventListener('submit', guardarEdicionVentaAdmin);

  contenido.replaceChildren(formulario);
}

function cancelarEdicionVenta() {
  var contenido = document.getElementById('modalDetalleVentaContenido');
  var botonEditar = document.getElementById('btnEditarDetalleVenta');
  if (!contenido || !detalleVentaActual) return;
  contenido.replaceChildren.apply(contenido, detalleVentaActual.elements);
  if (botonEditar) botonEditar.hidden = false;
}

async function guardarEdicionVentaAdmin(evento) {
  evento.preventDefault();
  if (!detalleVentaActual) return;

  var formulario = evento.currentTarget;
  var botonGuardar = formulario.querySelector('button[type="submit"]');
  var saleId = detalleVentaActual.sale.id;
  var body = {
    firstName: formulario.elements.firstName.value,
    lastName: formulario.elements.lastName.value,
    date: formulario.elements.date.value,
    status: formulario.elements.status.value,
    total: Number(formulario.elements.total.value),
    phone: formulario.elements.phone.value,
    city: formulario.elements.city ? formulario.elements.city.value : '',
    address: formulario.elements.address ? formulario.elements.address.value : '',
    trackingNumber: formulario.elements.trackingNumber
      ? formulario.elements.trackingNumber.value
      : ''
  };
  if (botonGuardar) botonGuardar.disabled = true;

  try {
    var response = await fetch(API_BASE + '/api/admin/ventas/' + encodeURIComponent(saleId), {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + sessionToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    var data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('El servidor devolvió una respuesta inválida al guardar la venta.');
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.message || 'No se pudieron guardar los cambios de la venta.');
    }

    modalDetalleVenta?.close();
    mostrarToast('success', data.message || 'Datos de la venta actualizados.');
    cargarDashboard();
  } catch (error) {
    console.error('Error al editar la venta:', error);
    mostrarToast('error', error.message || 'No se pudieron guardar los cambios.');
    if (botonGuardar) botonGuardar.disabled = false;
  }
}

var modalDetalleVenta = document.getElementById('modalDetalleVenta');
document.getElementById('btnCerrarDetalleVenta')?.addEventListener('click', function() {
  modalDetalleVenta?.close();
});
document.getElementById('btnCerrarDetalleVentaPie')?.addEventListener('click', function() {
  modalDetalleVenta?.close();
});
document.getElementById('btnEditarDetalleVenta')?.addEventListener('click', mostrarFormularioEdicionVenta);
modalDetalleVenta?.addEventListener('click', function(evento) {
  if (evento.target === modalDetalleVenta) modalDetalleVenta.close();
});
modalDetalleVenta?.addEventListener('close', function() {
  detalleVentaRequestId++;
  detalleVentaActual = null;
  var botonEditar = document.getElementById('btnEditarDetalleVenta');
  if (botonEditar) botonEditar.hidden = true;
});

function cargarDashboard() {
  var inventoryBranchSelect = document.getElementById('filtroSucursalInventario');
  var selectedBranchId = inventoryBranchSelect && inventoryBranchSelect.value;
  var periodSelect = document.getElementById('filtroPeriodoVentas');
  var selectedPeriod = periodSelect ? periodSelect.value : '7';
  var dashboardUrl = API_BASE + '/api/dashboard/admin';
  var dashboardParams = [];
  if (selectedBranchId) {
    dashboardParams.push('branchId=' + encodeURIComponent(selectedBranchId));
  }
  dashboardParams.push('period=' + encodeURIComponent(selectedPeriod));
  dashboardUrl += '?' + dashboardParams.join('&');

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
    if (response.status === 401) {
      localStorage.removeItem('sessionToken');
      sessionStorage.removeItem('sessionToken');
      sessionStorage.removeItem('wiiu_usuario_activo');
      window.location.replace('../Login.html');
      return;
    }
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
    if (data.users) usuariosDisponibles = data.users;
    if (data.roles) rolesDisponibles = data.roles;
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

    // Resumen de ventas y pedidos
    var el;
    el = document.getElementById('homeVentasTotales');
    if (el) el.textContent = '$ ' + Number(data.summary.salesTotal || 0).toLocaleString('es-CO');

    el = document.getElementById('homePedidosTotales');
    if (el) el.textContent = data.summary.ordersCount || 0;

    el = document.getElementById('homeClientesNuevos');
    if (el) el.textContent = data.summary.clientsCount || 0;

    renderizarGraficoVentas(data.salesTrend);

    // Productos más vendidos
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

    // Pedidos registrados
    var pedidosInicio = Array.isArray(data.orders) ? data.orders : [];
    var botonVerVentasHome = document.getElementById('pedidosVerVentasHome');
    if (botonVerVentasHome) botonVerVentasHome.hidden = pedidosInicio.length < 5;
    if (pedidosInicio.length) {
      poblarTabla('tablaPedidosBody', pedidosInicio.slice(0, 5), function(row) {
        var estadoClase = row.estado === 'PAGADA'
          ? 'etiqueta-verde'
          : row.estado === 'ANULADA'
            ? 'etiqueta-rojo'
            : 'etiqueta-naranja';
        var saleId = Number(row.id_venta);
        var botonAnular = row.estado === 'ANULADA'
          ? '<button class="boton-icono" type="button" disabled title="La venta ya está anulada" aria-label="Venta anulada"><i class="fi fi-rr-ban"></i></button>'
          : '<button class="boton-icono rojo" type="button" title="Anular venta" aria-label="Anular venta #' +
            escaparHtmlAdmin(row.id_venta) + '" onclick="anularVentaAdmin(' + saleId +
            ')"><i class="fi fi-rr-ban"></i></button>';
        return '<td><strong>#' + escaparHtmlAdmin(row.orderNumber || row.id_venta) + '</strong></td><td>' + escaparHtmlAdmin(row.nombre + ' ' + row.apellido) + '<small>Cliente #' + escaparHtmlAdmin(row.clientId) + '</small></td><td>' + escaparHtmlAdmin(row.date) + '</td><td><span class="' + estadoClase + '">' + escaparHtmlAdmin(row.estado) + '</span></td><td>$ ' + Number(row.total).toLocaleString('es-CO') + '</td><td>' + botonAnular + '</td>';
      });
    } else {
      document.getElementById('tablaPedidosBody').innerHTML =
        '<tr><td colspan="6" class="texto-vacio">No hay pedidos registrados en la base de datos</td></tr>';
    }

    var ventas = pedidosInicio;
    var ventasIngresos = document.getElementById('ventasIngresos');
    if (ventasIngresos) {
      ventasIngresos.textContent =
        '$ ' + Number(data.summary.salesTotal || 0).toLocaleString('es-CO');
    }
    var ventasPagadas = document.getElementById('ventasPagadas');
    if (ventasPagadas) {
      ventasPagadas.textContent = String(data.summary.ordersCount || 0);
    }
    var ventasRegistradas = document.getElementById('ventasRegistradas');
    if (ventasRegistradas) {
      ventasRegistradas.textContent = String(ventas.length);
    }
    if (ventas.length) {
      poblarTabla('tablaVentasBody', ventas, function(row) {
        var estado = String(row.estado || '');
        var saleId = Number(row.id_venta);
        var estadoClase = estado === 'PAGADA'
          ? 'etiqueta-verde'
          : estado === 'ANULADA'
            ? 'etiqueta-rojo'
            : 'etiqueta-naranja';
        var cliente = [row.nombre, row.apellido].filter(Boolean).join(' ');
        var botonAnular = estado === 'ANULADA'
          ? '<button type="button" class="boton-icono" disabled title="La venta ya está anulada" aria-label="Venta anulada"><i class="fi fi-rr-ban"></i></button>'
          : '<button type="button" class="boton-icono rojo" title="Anular venta" aria-label="Anular venta #' +
            escaparHtmlAdmin(row.id_venta) + '" onclick="anularVentaAdmin(' + saleId +
            ')"><i class="fi fi-rr-ban"></i></button>';
        return '<td><strong>Venta #' + escaparHtmlAdmin(row.id_venta) + '</strong></td>' +
          '<td>' + escaparHtmlAdmin(cliente) + '</td>' +
          '<td>' + escaparHtmlAdmin(row.date) + '</td>' +
          '<td><span class="' + estadoClase + '">' + escaparHtmlAdmin(estado) + '</span></td>' +
          '<td>$ ' + Number(row.total || 0).toLocaleString('es-CO') + '</td>' +
          '<td><div class="acciones-venta">' +
          '<button type="button" class="btn-mas-informacion" aria-label="Ver detalle de venta #' +
          escaparHtmlAdmin(row.id_venta) + '" title="Ver detalle" onclick="mostrarDetalleVenta(' +
          saleId + ')"><i class="fi fi-rr-eye" aria-hidden="true"></i> Ver</button>' +
          '<button type="button" class="boton-icono" title="Editar datos de venta" aria-label="Editar datos de venta #' +
          escaparHtmlAdmin(row.id_venta) + '" onclick="mostrarDetalleVenta(' + saleId +
          ', true)"><i class="fi fi-rr-edit"></i></button>' + botonAnular +
          '</div></td>';
      });
    } else {
      document.getElementById('tablaVentasBody').innerHTML =
        '<tr><td colspan="6" class="texto-vacio">No hay ventas registradas en la tienda.</td></tr>';
    }

    inventarioNotificaciones = (data.inventory || []).filter(function(producto) {
      return producto.status === 'ACTIVO';
    });
    if (notificacionesInicializadas) {
      actualizarNotificaciones(
        ventasNotificaciones,
        inventarioNotificaciones,
        citasNotificaciones,
      );
    }

    // Inventario
    if (data.inventory) {
      poblarTabla('tablaInventarioBody', data.inventory, function(row) {
        var stockTexto = row.stock + ' uds';
        var stockActual = Number(row.stock);
        var stockMinimo = Number(row.minStock || 3);
        var productoActivo = row.status === 'ACTIVO';
        var estadoClase = !productoActivo || stockActual <= 0
          ? 'etiqueta-rojo'
          : stockActual <= stockMinimo
            ? 'etiqueta-naranja'
            : 'etiqueta-verde';
        var estadoTexto = !productoActivo
          ? 'Suspendido'
          : stockActual <= 0
            ? 'Agotado'
            : stockActual <= stockMinimo
              ? 'Stock bajo'
              : 'Disponible';
        var productId = Number(row.id);
        var nextStatus = productoActivo ? 'INACTIVO' : 'ACTIVO';
        var actionLabel = productoActivo ? 'Suspender' : 'Reactivar';
        var actionIcon = productoActivo ? 'fi-rr-ban' : 'fi-rr-refresh';
        var editButton = productoActivo
          ? '<button class="boton-icono" type="button" title="Editar" aria-label="Editar ' + escaparHtmlAdmin(row.name) + '" onclick="abrirModal(\'inventario\', ' + productId + ')"><i class="fi fi-rr-edit"></i></button>'
          : '';
        return '<td><strong>' + escaparHtmlAdmin(row.name) + '</strong></td><td>' + escaparHtmlAdmin(row.sku) + '</td><td>' + escaparHtmlAdmin(row.category) + '</td><td>$ ' + Number(row.price).toLocaleString('es-CO') + '</td><td>' + stockTexto + '</td><td>' + escaparHtmlAdmin(row.warranty || '12 Meses') + '</td><td><span class="' + estadoClase + '">' + estadoTexto + '</span></td><td>' + editButton + '<button class="boton-icono ' + (productoActivo ? 'rojo' : '') + '" type="button" title="' + actionLabel + ' producto" aria-label="' + actionLabel + ' ' + escaparHtmlAdmin(row.name) + '" onclick="cambiarEstadoProductoAdmin(' + productId + ', \'' + nextStatus + '\')"><i class="fi ' + actionIcon + '"></i></button></td>';
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
          if (
            data.inventory[si].status === 'ACTIVO' &&
            Number(data.inventory[si].stock) <= Number(data.inventory[si].minStock || 3)
          ) alertas++;
        }
        el.textContent = alertas + ' alertas';
      }
    }

    // Garantías
    if (data.warranties) {
      poblarTabla('tablaGarantiasBody', data.warranties, function(row) {
        var estadoClase = row.status === 'Activa'
          ? 'etiqueta-verde'
          : row.status === 'Suspendida'
            ? 'etiqueta-rojo'
            : 'etiqueta-naranja';
        var rawId = Number(String(row.id).replace('GAR-', ''));
        var productLabel = row.quantity > 1
          ? row.product + ' (x' + row.quantity + ')'
          : row.product;
        var puedeCambiarEstado = Number(row.canChangeStatus) === 1 &&
          (row.status === 'Activa' || row.status === 'Suspendida');
        var estadoActual = row.status === 'Suspendida' ? 'SUSPENDIDA' : 'VIGENTE';
        var estadoCobertura = puedeCambiarEstado
          ? '<select class="select-estado-garantia" data-warranty-id="' + rawId + '" data-saved-status="' + estadoActual + '" aria-label="Estado de garantía ' + escaparHtmlAdmin(row.id) + '">' +
            '<option value="VIGENTE"' + (estadoActual === 'VIGENTE' ? ' selected' : '') + '>Activa</option>' +
            '<option value="SUSPENDIDA"' + (estadoActual === 'SUSPENDIDA' ? ' selected' : '') + '>Suspendida</option>' +
            '</select>'
          : '<span class="' + estadoClase + '">' + escaparHtmlAdmin(row.status) + '</span>';
        var accionCobertura = puedeCambiarEstado
          ? '<button type="button" class="boton-amarillo boton-guardar-garantia" data-warranty-id="' + rawId + '" disabled>Guardar</button>'
          : '<span aria-label="La garantía venció; no se puede cambiar su estado">—</span>';
        return '<td><strong>' + escaparHtmlAdmin(row.id) + '</strong></td>' +
          '<td>' + escaparHtmlAdmin(row.client) + '</td>' +
          '<td>' + escaparHtmlAdmin(productLabel) + '</td>' +
          '<td>' + escaparHtmlAdmin(String(row.buyDate).substring(0, 10)) + '</td>' +
          '<td>' + escaparHtmlAdmin(String(row.expDate).substring(0, 10)) + '</td>' +
          '<td>' + estadoCobertura + '</td>' +
          '<td>' + accionCobertura + '</td>';
      });
    }
    if (Array.isArray(data.warrantyRequests)) {
      var requestsTbody = document.getElementById('tablaSolicitudesGarantiaBody');
      if (requestsTbody && data.warrantyRequests.length === 0) {
        requestsTbody.innerHTML = '<tr><td colspan="7" class="texto-vacio">Aún no hay solicitudes de garantía.</td></tr>';
      } else {
        var requestStatuses = [
          ['RECIBIDA', 'Recibida'],
          ['EN_REVISION', 'En revisión'],
          ['APROBADA', 'Aprobada'],
          ['RECHAZADA', 'Rechazada'],
          ['CERRADA', 'Cerrada']
        ];
        poblarTabla('tablaSolicitudesGarantiaBody', data.warrantyRequests, function(row) {
          var requestId = Number(row.id);
          var status = requestStatuses.some(function(option) {
            return option[0] === row.status;
          }) ? row.status : 'RECIBIDA';
          var statusOptions = requestStatuses.map(function(option) {
            return '<option value="' + option[0] + '"' + (option[0] === status ? ' selected' : '') + '>' + option[1] + '</option>';
          }).join('');
          return '<td><strong>' + escaparHtmlAdmin(row.reference) + '</strong></td>' +
            '<td>' + escaparHtmlAdmin(row.client) + '</td>' +
            '<td><strong>' + escaparHtmlAdmin(row.orderNumber) + '</strong><br>' + escaparHtmlAdmin(row.product) + '</td>' +
            '<td>' + escaparHtmlAdmin(row.requestedAt) + '<br><small>Vence: ' + escaparHtmlAdmin(row.warrantyExpiresAt) + '</small></td>' +
            '<td class="descripcion-solicitud-garantia">' + escaparHtmlAdmin(row.description) + '</td>' +
            '<td><select class="select-estado-solicitud" data-saved-status="' + status + '" aria-label="Estado de solicitud ' + requestId + '">' + statusOptions + '</select></td>' +
            '<td><button type="button" class="boton-amarillo boton-guardar-solicitud" data-request-id="' + requestId + '" disabled>Guardar</button></td>';
        });
      }
    }

    // Mantenimientos
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

    // Reparaciones
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

    // Descuentos
    if (data.discounts) {
      descuentosDisponibles = data.discounts;
      poblarTabla('tablaDescuentosBody', data.discounts, function(row) {
        var estadoClase = row.status === 'Activo' ? 'etiqueta-verde' : 'etiqueta-rojo';
        var discountId = Number(row.id);
        return '<td><strong>' + escaparHtmlAdmin(row.code) + '</strong></td><td>Porcentaje</td><td>' + escaparHtmlAdmin(row.percent) + '</td><td>' + escaparHtmlAdmin(row.discountDescription || '') + '</td><td>' + escaparHtmlAdmin(row.expires) + '</td><td><span class="' + estadoClase + '">' + escaparHtmlAdmin(row.status) + '</span></td><td><button class="boton-icono" type="button" title="Editar descuento" aria-label="Editar descuento ' + escaparHtmlAdmin(row.code) + '" onclick="abrirModal(\'descuentos\', ' + discountId + ')"><i class="fi fi-rr-edit"></i></button><button class="boton-icono rojo" type="button" title="Suspender descuento" aria-label="Suspender descuento ' + escaparHtmlAdmin(row.code) + '" onclick="suspenderDescuentoAdmin(' + discountId + ')"><i class="fi fi-rr-ban"></i></button></td>';
      });
      el = document.getElementById('descActivos');
      if (el) el.textContent = data.discounts.length;
    }

    // Usuarios
    if (data.users) {
      poblarTabla('tablaClientesBody', data.users, function(row) {
        var id = Number(row.id);
        var activo = row.status === 'ACTIVO';
        var esCuentaActual = id === Number(data.currentAdminId);
        var fechaRegistro = row.createdAt || 'N/A';
        var botonEstado = esCuentaActual
          ? '<button class="boton-icono" type="button" disabled title="No puedes suspender tu propia cuenta"><i class="fi fi-rr-ban"></i></button>'
          : '<button class="boton-icono ' + (activo ? 'rojo' : '') + '" type="button" title="' +
            (activo ? 'Suspender usuario' : 'Reactivar usuario') +
            '" aria-label="' + (activo ? 'Suspender usuario' : 'Reactivar usuario') +
            '" onclick="cambiarEstadoUsuarioAdmin(' + id + ', \'' +
            (activo ? 'INACTIVO' : 'ACTIVO') + '\')"><i class="fi ' +
            (activo ? 'fi-rr-ban' : 'fi-rr-refresh') + '"></i></button>';
        return '<td><strong>USR-' + id + '</strong></td>' +
          '<td>' + escaparHtmlAdmin(row.name || '') + '</td>' +
          '<td>' + escaparHtmlAdmin(row.phone || 'N/A') + '</td>' +
          '<td>' + escaparHtmlAdmin(row.email || '') + '</td>' +
          '<td>' + escaparHtmlAdmin(row.city || 'N/A') + '</td>' +
          '<td>$ ' + Number(row.totalSpent || 0).toLocaleString('es-CO') + '</td>' +
          '<td>' + escaparHtmlAdmin(row.role || 'Sin rol') + '</td>' +
          '<td><span class="' + (activo ? 'etiqueta-verde' : 'etiqueta-rojo') + '">' +
            (activo ? 'Activo' : 'Suspendido') + '</span></td>' +
          '<td>' + escaparHtmlAdmin(fechaRegistro) + '</td>' +
          '<td><button class="boton-icono" type="button" title="Editar usuario" aria-label="Editar usuario" onclick="abrirModal(\'clientes\', ' +
            id + ')"><i class="fi fi-rr-edit"></i></button>' + botonEstado + '</td>';
      });

      var usuariosActivos = data.users.filter(function(user) {
        return user.status === 'ACTIVO';
      }).length;
      var mesActual = new Date().toISOString().slice(0, 7);
      var usuariosNuevos = data.users.filter(function(user) {
        return String(user.createdAt || '').slice(0, 7) === mesActual;
      }).length;
      el = document.getElementById('cliTotal');
      if (el) el.textContent = data.users.length;
      el = document.getElementById('cliActivos');
      if (el) el.textContent = usuariosActivos;
      el = document.getElementById('cliNuevos');
      if (el) el.textContent = usuariosNuevos;
    }

    // Reseñas
    if (data.reviews && data.reviews.length > 0) {
      poblarTabla('tablaResenasBody', data.reviews, function(row) {
        return '<td><strong>RES-' + row.id + '</strong></td><td>' + row.client + '</td><td>' + row.product + '</td><td>' + row.rating + '</td><td>' + row.comment + '</td><td>' + row.date + '</td><td><button class="boton-icono rojo" title="Eliminar" onclick="eliminarFilaDB(this, \'resenas\', ' + row.id + ')"><i class="fi fi-rr-trash"></i></button></td>';
      });
      el = document.getElementById('resTotal');
      if (el) el.textContent = data.reviews.length;
    }

    // Resumen financiero del mes
    resumenFinancieroActual = data.summary.monthlyFinancial;
    if (!resumenFinancieroActual) {
      console.error('El backend no devolvió summary.monthlyFinancial.');
      ['finIngresos', 'finGastos', 'finUtilidad', 'finMargen'].forEach(function(id) {
        el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      mostrarToast(
        'error',
        'El backend está usando una versión anterior. Reinícialo para cargar el resumen financiero.'
      );
      return;
    }

    el = document.getElementById('finIngresos');
    if (el) el.textContent =
      '$ ' + Number(resumenFinancieroActual.income || 0).toLocaleString('es-CO');

    el = document.getElementById('finGastos');
    if (el) el.textContent =
      '$ ' + Number(resumenFinancieroActual.expenses || 0).toLocaleString('es-CO');

    el = document.getElementById('finUtilidad');
    if (el) el.textContent =
      '$ ' + Number(resumenFinancieroActual.result || 0).toLocaleString('es-CO');

    el = document.getElementById('finMargen');
    if (el) {
      el.textContent = Number(resumenFinancieroActual.marginPercent || 0)
        .toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%';
    }

    mostrarToast('success', 'Datos del panel cargados correctamente');
  })
  .catch(function(err) {
    console.error('Error al cargar el dashboard:', err);
    mostrarToast('error', 'No se pudieron cargar los datos del servidor. Verifica que MySQL esté corriendo.');
  });
}

// Renderizar filas de las tablas
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

// Guardar datos de los formularios
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
  var formulario = document.getElementById('formularioDinamico');
  var hayErrores = formulario ? !validarCamposObligatorios(formulario) : false;

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

  // Validaciones específicas del módulo actual
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

    if (!c1 || c1.length < 3 || c1.length > 100) {
      marcarErrorCampo(c1Input, 'El nombre debe tener entre 3 y 100 caracteres.');
      hayErrores = true;
    }
    if (!c2 || c2.length > 40) {
      marcarErrorCampo(c2Input, 'Selecciona una categoría válida.');
      hayErrores = true;
    }
    if (!cMarca || cMarca.length > 20) {
      marcarErrorCampo(cMarcaInput, 'Selecciona una marca válida.');
      hayErrores = true;
    }
    var precioProd = Number(c3);
    if (!Number.isFinite(precioProd) || precioProd <= 0 || precioProd > 99999999.999999) {
      marcarErrorCampo(c3Input, 'Ingresa un precio mayor a 0 y dentro del límite permitido.');
      hayErrores = true;
    }
    var stockProd = Number(c4);
    if (c4 === '' || !Number.isSafeInteger(stockProd) || stockProd < 0 || stockProd > 2147483647) {
      marcarErrorCampo(c4Input, 'Ingresa una cantidad entera entre 0 y 2.147.483.647.');
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
    if (!descripcion || !descripcion.value.trim() || descripcion.value.trim().length > 100) {
      marcarErrorCampo(descripcion, 'La descripción es obligatoria y debe tener máximo 100 caracteres.');
      hayErrores = true;
    }
    [imagenPrincipal, imagen2, imagen3, imagen4].forEach(function(imagen) {
      if (imagen && imagen.value.trim().length > 255) {
        marcarErrorCampo(imagen, 'La ruta o URL no puede superar 255 caracteres.');
        hayErrores = true;
      }
    });
    if (!Number.isSafeInteger(sucursalId) || sucursalId < 1) {
      mostrarToast('error', 'No hay una ubicación de inventario activa disponible.');
      return;
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
          try {
            imagenLocal.campo.value = await subirImagenProducto(archivoLocal);
          } catch (error) {
            marcarErrorCampo(imagenLocal.input, error.message || 'No se pudo subir esta imagen.');
            throw error;
          }
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

  } else if (tipoModalActual === 'mantenimientos') {
    var tipoEquipoMntInput = document.getElementById('campo_tipo_equipo');
    var marcaEquipoMntInput = document.getElementById('campo_marca_equipo');
    var serialMntInput = document.getElementById('campo_serie_equipo');
    var trabajoMntInput = document.getElementById('campo_detalle');
    var diagnosticoMntInput = document.getElementById('campo_diagnostico');
    if (!c1 || c1.length < 3 || c1.length > 100) {
      marcarErrorCampo(c1Input, 'Indica el equipo o consola (3 a 100 caracteres).');
      hayErrores = true;
    }
    if (!tipoEquipoMntInput.value) {
      marcarErrorCampo(tipoEquipoMntInput, 'Selecciona el tipo de equipo.');
      hayErrores = true;
    }
    if (!marcaEquipoMntInput.value.trim() || marcaEquipoMntInput.value.trim().length > 20) {
      marcarErrorCampo(marcaEquipoMntInput, 'La marca es obligatoria y debe tener máximo 20 caracteres.');
      hayErrores = true;
    }
    if (serialMntInput.value.trim().length > 40) {
      marcarErrorCampo(serialMntInput, 'El número de serie no puede superar 40 caracteres.');
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
    if (!trabajoMntInput.value.trim() || trabajoMntInput.value.trim().length < 3 || trabajoMntInput.value.trim().length > 100) {
      marcarErrorCampo(trabajoMntInput, 'Describe el trabajo solicitado (3 a 100 caracteres).');
      hayErrores = true;
    }
    if (diagnosticoMntInput.value.trim().length > 100) {
      marcarErrorCampo(diagnosticoMntInput, 'El diagnóstico no puede superar 100 caracteres.');
      hayErrores = true;
    }
    var costoMnt = Number(c4);
    if (!Number.isSafeInteger(costoMnt) || costoMnt <= 0 || costoMnt > 99999999) {
      marcarErrorCampo(c4Input, 'Ingresa un costo entero entre 1 y 99.999.999.');
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
      serialNumber: serialMntInput.value.trim(),
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
    if (!c1 || c1.length < 3 || c1.length > 100) {
      marcarErrorCampo(c1Input, 'Indica el dispositivo a reparar (3 a 100 caracteres).');
      hayErrores = true;
    }
    if (!tipoEquipoRepInput.value) {
      marcarErrorCampo(tipoEquipoRepInput, 'Selecciona el tipo de equipo.');
      hayErrores = true;
    }
    if (!marcaEquipoRepInput.value.trim() || marcaEquipoRepInput.value.trim().length > 20) {
      marcarErrorCampo(marcaEquipoRepInput, 'La marca es obligatoria y debe tener máximo 20 caracteres.');
      hayErrores = true;
    }
    if (serialEquipoRepInput.value.trim().length > 40) {
      marcarErrorCampo(serialEquipoRepInput, 'El número de serie no puede superar 40 caracteres.');
      hayErrores = true;
    }
    if (!c2 || c2.length < 4 || c2.length > 100) {
      marcarErrorCampo(c2Input, 'Describe la falla reportada (4 a 100 caracteres).');
      hayErrores = true;
    }
    if (diagnosticoRepInput.value.trim().length > 100) {
      marcarErrorCampo(diagnosticoRepInput, 'El diagnóstico no puede superar 100 caracteres.');
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
    if (!Number.isSafeInteger(precioRep) || precioRep <= 0 || precioRep > 99999999) {
      marcarErrorCampo(c4Input, 'Ingresa un presupuesto entero entre 1 y 99.999.999.');
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
    var numPercent = Number(c2);
    if (!Number.isInteger(numPercent) || numPercent < 1 || numPercent > 99) {
      marcarErrorCampo(c2Input, 'El porcentaje debe ser un valor entero entre 1 y 99.');
      hayErrores = true;
    }
    if (!c3 || c3.length < 3 || c3.length > 150) {
      marcarErrorCampo(c3Input, 'Ingresa una descripción del cupón (3 a 150 caracteres).');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor corrige los datos del descuento');
      return;
    }

    if (descuentoEdicion) {
      url = API_BASE + '/api/admin/descuentos/' + encodeURIComponent(descuentoEdicion.id);
      metodo = 'PUT';
      payload = {
        percent: numPercent,
        desc: c3
      };
    } else {
      url = API_BASE + '/api/admin/descuentos';
      payload = {
        percent: numPercent,
        limit: 100,
        desc: c3
      };
    }

  } else if (tipoModalActual === 'clientes') {
    if (usuarioEdicion) {
      var regexNombre = /^[\p{L}\s'-]{3,60}$/u;
      if (!c1 || c1.length > 60 || !regexNombre.test(c1) || c1.split(/\s+/).filter(Boolean).length < 2) {
        marcarErrorCampo(c1Input, 'Ingresa nombre y apellido completos (máximo 60 caracteres).');
        hayErrores = true;
      }
      var regexTel = /^[0-9+\-\s()]{7,20}$/;
      var digitosTelefono = c2.replace(/\D/g, '');
      if (!regexTel.test(c2) || digitosTelefono.length < 7 || digitosTelefono.length > 15) {
        marcarErrorCampo(c2Input, 'Ingresa un teléfono válido con 7 a 15 dígitos.');
        hayErrores = true;
      }
      var regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!c3 || c3.length > 120 || !regexEmail.test(c3)) {
        marcarErrorCampo(c3Input, 'Ingresa un correo válido de máximo 120 caracteres (ej. usuario@dominio.com).');
        hayErrores = true;
      }

      var departamentoInput = document.getElementById('campo_departamento');
      var ciudadInput = document.getElementById('campo_ciudad');
      var direccionInput = document.getElementById('campo_direccion');
      var rolInput = document.getElementById('campo_rol');
      var departamento = departamentoInput ? departamentoInput.value.trim() : '';
      var ciudad = ciudadInput ? ciudadInput.value.trim() : '';
      var direccion = direccionInput ? direccionInput.value.trim() : '';
      var rolId = Number(rolInput && rolInput.value);

      if (!departamento || departamento.length > 30) {
        marcarErrorCampo(departamentoInput, 'Ingresa un departamento de máximo 30 caracteres.');
        hayErrores = true;
      }
      if (ciudad.length > 30) {
        marcarErrorCampo(ciudadInput, 'La ciudad no puede superar 30 caracteres.');
        hayErrores = true;
      }
      if (direccion.length > 40) {
        marcarErrorCampo(direccionInput, 'La dirección no puede superar 40 caracteres.');
        hayErrores = true;
      }
      if (!Number.isSafeInteger(rolId) || rolId < 1) {
        marcarErrorCampo(rolInput, 'Selecciona un rol válido.');
        hayErrores = true;
      }
      if (hayErrores) {
        mostrarToast('error', 'Por favor corrige los datos del usuario');
        return;
      }

      url = API_BASE + '/api/admin/usuarios/' + encodeURIComponent(usuarioEdicion.id);
      metodo = 'PUT';
      payload = {
        name: c1,
        phone: c2,
        email: c3,
        department: departamento,
        city: ciudad,
        address: direccion,
        roleId: rolId
      };
    } else {
      if (hayErrores) {
        mostrarToast('error', 'Completa todos los campos obligatorios.');
        document.querySelector('#formularioDinamico .campo-invalido')?.focus();
        return;
      }
      if (!validarNuevoClienteAdmin()) return;

      url = API_BASE + '/api/admin/clientes';
      payload = {
        firstName: document.getElementById('cliente-nombre').value.trim(),
        lastName: document.getElementById('cliente-apellido').value.trim(),
        birthDate: document.getElementById('cliente-nacimiento').value,
        documentType: document.getElementById('cliente-tipo-documento').value,
        documentNumber: document.getElementById('cliente-numero-documento').value.trim(),
        email: document.getElementById('cliente-correo').value.trim().toLowerCase(),
        confirmEmail: document.getElementById('cliente-confirmar-correo').value.trim().toLowerCase(),
        password: document.getElementById('cliente-contrasena').value,
        confirmPassword: document.getElementById('cliente-confirmar-contrasena').value,
        phone: formatearTelefonoClienteAdmin('cliente-telefono', 'cliente-prefijo-telefono'),
        secondaryPhone: formatearTelefonoClienteAdmin('cliente-telefono-secundario', 'cliente-prefijo-secundario'),
        department: document.getElementById('cliente-departamento').value,
        city: document.getElementById('cliente-ciudad').value,
        address: document.getElementById('cliente-direccion').value.trim(),
        postalCode: document.getElementById('cliente-codigo-postal').value.trim(),
        acceptedTerms: document.getElementById('cliente-terminos').checked,
        sameBillingAddress: document.getElementById('cliente-misma-direccion').checked
      };
    }

  } else if (tipoModalActual === 'resenas') {
    var reviewClientId = Number(c1);
    if (!Number.isSafeInteger(reviewClientId) || reviewClientId <= 0) {
      marcarErrorCampo(c1Input, 'Selecciona el cliente que califica.');
      hayErrores = true;
    }
    if (!c2 || c2.trim().length < 3 || c2.trim().length > 100) {
      marcarErrorCampo(c2Input, 'Indica el producto o servicio (3 a 100 caracteres).');
      hayErrores = true;
    }
    if (!['5 estrellas', '4 estrellas', '3 estrellas'].includes(c3)) {
      marcarErrorCampo(c3Input, 'Selecciona la calificación.');
      hayErrores = true;
    }
    if (!c4 || c4.trim().length < 5 || c4.trim().length > 300) {
      marcarErrorCampo(c4Input, 'El comentario debe tener entre 5 y 300 caracteres.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor completa todos los campos de la reseña');
      return;
    }

    url = API_BASE + '/api/admin/resenas';
    payload = {
      clientId: reviewClientId,
      productOrService: c2.trim(),
      rating: c3,
      comment: c4.trim()
    };

  } else if (tipoModalActual === 'pedidos') {
    var clientId = Number(c1);
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      marcarErrorCampo(c1Input, 'Selecciona un cliente comprador.');
      hayErrores = true;
    }
    var totalPedido = Number(c2);
    if (!Number.isFinite(totalPedido) || totalPedido < 1000 || totalPedido > 99999999.999999 || totalPedido % 500 !== 0) {
      marcarErrorCampo(c2Input, 'Ingresa un total desde $1.000, en incrementos de $500.');
      hayErrores = true;
    }

    if (hayErrores) {
      mostrarToast('error', 'Por favor ingresa un total de pedido válido');
      return;
    }

    url = API_BASE + '/api/admin/pedidos';
    payload = {
      clientId: clientId,
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
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(response) {
    var data = response.data;
    if (response.ok && data.ok) {
      mostrarToast('success', '✅ ' + (data.message || 'Registro guardado exitosamente'));
      cerrarModal();
      cargarDashboard(); // Recargar datos frescos desde MySQL
    } else {
      mostrarErroresRespuestaModal(data);
    }
  })
  .catch(function(err) {
    console.error('Error al guardar en BD:', err);
    mostrarToast('error', err.message || 'Error de conexión con el servidor');
  })
  .finally(function() {
    inventarioGuardando = false;
  });
}

// Acciones de las tablas
function cambiarEstadoUsuarioAdmin(id, status) {
  var suspension = status === 'INACTIVO';
  var pregunta = suspension
    ? '¿Suspender este usuario? No podrá iniciar sesión mientras esté suspendido.'
    : '¿Reactivar este usuario y permitirle iniciar sesión nuevamente?';
  if (!confirm(pregunta)) return;

  fetch(API_BASE + '/api/admin/usuarios/' + encodeURIComponent(id) + '/estado', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify({ status: status })
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(response) {
    if (!response.ok || !response.data.ok) {
      mostrarToast('error', response.data.message || 'No se pudo cambiar el estado del usuario.');
      return;
    }
    mostrarToast('success', response.data.message);
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al cambiar el estado del usuario:', error);
    mostrarToast('error', 'No se pudo conectar con el servidor para cambiar el estado.');
  });
}

function cambiarEstadoProductoAdmin(id, status) {
  if (!['ACTIVO', 'INACTIVO'].includes(status)) {
    mostrarToast('error', 'El estado del producto no es válido.');
    return;
  }

  var suspension = status === 'INACTIVO';
  var pregunta = suspension
    ? '¿Suspender este producto? Dejará de estar disponible en la tienda.'
    : '¿Reactivar este producto para que vuelva a estar disponible en la tienda?';
  if (!confirm(pregunta)) return;

  fetch(API_BASE + '/api/admin/productos/' + encodeURIComponent(id) + '/estado', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify({ status: status })
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(response) {
    if (!response.ok || !response.data.ok) {
      mostrarToast('error', response.data.message || 'No se pudo cambiar el estado del producto.');
      return;
    }
    mostrarToast('success', response.data.message);
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al cambiar el estado del producto:', error);
    mostrarToast('error', 'No se pudo conectar con el servidor para cambiar el estado del producto.');
  });
}

function suspenderDescuentoAdmin(id) {
  if (!confirm('¿Suspender este descuento? El registro se conservará en la base de datos.')) return;

  fetch(API_BASE + '/api/admin/descuentos/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(function(response) {
    return response.json().then(function(data) {
      return { ok: response.ok, data: data };
    });
  })
  .then(function(result) {
    if (!result.ok || !result.data.ok) {
      mostrarToast('error', result.data.message || 'No se pudo suspender el descuento.');
      return;
    }
    mostrarToast('success', result.data.message);
    cargarDashboard();
  })
  .catch(function(error) {
    console.error('Error al suspender el descuento:', error);
    mostrarToast('error', 'No se pudo conectar con el servidor para suspender el descuento.');
  });
}

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
function anularVentaAdmin(id) {
  var saleId = Number(id);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    mostrarToast('error', 'No se pudo identificar la venta que quieres anular.');
    return;
  }
  if (!confirm('¿Anular esta venta? Se conservará el registro, pero dejará de contar como venta pagada.')) {
    return;
  }

  fetch(API_BASE + '/api/admin/pedidos/' + encodeURIComponent(saleId), {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
  .then(function(response) {
    return response.json().then(function(data) {
      return { ok: response.ok, data: data };
    });
  })
  .then(function(result) {
    if (!result.ok || !result.data.ok) {
      throw new Error(result.data.message || 'No se pudo anular la venta.');
    }
    mostrarToast('success', result.data.message || 'Venta anulada correctamente.');
    cargarDashboard();
    cargarNotificacionesAdmin();
  })
  .catch(function(error) {
    console.error('Error al anular la venta:', error);
    mostrarToast('error', error.message || 'No se pudo anular la venta.');
  });
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

function cambiarEstadoGarantiaAdmin(boton, id, status) {
  boton.disabled = true;
  return fetch(API_BASE + '/api/admin/garantias/' + encodeURIComponent(id) + '/estado', {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + sessionToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: status })
  })
    .then(function(response) {
      return response.text().then(function(text) {
        var data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch (error) {
          data = null;
        }
        if (!data) {
          if (response.status === 404) {
            throw new Error(
              'No se encontró la ruta para cambiar el estado de la garantía. Reinicia el backend e inténtalo de nuevo.'
            );
          }
          throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.');
        }
        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'No se pudo suspender la cobertura.');
        }
        return data;
      });
    })
    .then(function(data) {
      mostrarToast('success', data.message || 'Cobertura suspendida.');
      cargarDashboard();
    })
    .catch(function(error) {
      console.error('Error actualizando estado de garantía:', error);
      var mensaje = error instanceof TypeError
        ? 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado.'
        : error.message || 'No se pudo actualizar el estado de la garantía.';
      mostrarToast('error', mensaje);
    })
    .finally(function() {
      if (boton.isConnected) boton.disabled = false;
    });
}

function configurarOrdenamientoUsuarios() {
  var tabla = document.getElementById('tablaUsuarios');
  var tbody = document.getElementById('tablaClientesBody');
  if (!tabla || !tbody) return;

  tabla.querySelectorAll('.boton-orden-tabla').forEach(function(boton) {
    boton.addEventListener('click', function() {
      var encabezado = boton.closest('th');
      if (!encabezado) return;

      var indiceColumna = Array.prototype.indexOf.call(
        encabezado.parentElement.children,
        encabezado
      );
      var descendente = encabezado.getAttribute('aria-sort') === 'ascending';
      var direccion = descendente ? 'descending' : 'ascending';
      var multiplicador = descendente ? -1 : 1;
      var tipo = boton.dataset.sortType;
      var filas = Array.from(tbody.querySelectorAll('tr')).filter(function(fila) {
        return !fila.querySelector('.texto-vacio');
      });
      var comparadorTexto = new Intl.Collator('es', {
        numeric: true,
        sensitivity: 'base'
      });

      filas.sort(function(filaA, filaB) {
        var valorA = filaA.cells[indiceColumna]?.textContent.trim() || '';
        var valorB = filaB.cells[indiceColumna]?.textContent.trim() || '';

        if (tipo === 'number') {
          var numeroA = Number(valorA.replace(/\D/g, ''));
          var numeroB = Number(valorB.replace(/\D/g, ''));
          if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
            return (numeroA - numeroB) * multiplicador;
          }
        }

        if (tipo === 'date') {
          var fechaA = Date.parse(valorA);
          var fechaB = Date.parse(valorB);
          var fechaAValida = Number.isFinite(fechaA);
          var fechaBValida = Number.isFinite(fechaB);
          if (fechaAValida !== fechaBValida) return fechaAValida ? -1 : 1;
          if (fechaAValida) return (fechaA - fechaB) * multiplicador;
        }

        return comparadorTexto.compare(valorA, valorB) * multiplicador;
      });

      tabla.querySelectorAll('thead th[aria-sort]').forEach(function(otroEncabezado) {
        otroEncabezado.setAttribute('aria-sort', 'none');
      });
      encabezado.setAttribute('aria-sort', direccion);
      filas.forEach(function(fila) {
        tbody.appendChild(fila);
      });
    });
  });
}

function configurarOrdenamientoTodasLasTablas() {
  document.querySelectorAll('.tabla-panel').forEach(function(tabla) {
    tabla.querySelectorAll('thead th').forEach(function(encabezado) {
      var esUltimaColumna = encabezado === encabezado.parentElement.lastElementChild;
      var esTablaMantenimientos = tabla.closest('#seccion-mantenimientos');
      if (esTablaMantenimientos && esUltimaColumna) return;
      encabezado.setAttribute('title', 'Ordenar por ' + encabezado.textContent.trim());
      encabezado.setAttribute('aria-sort', 'none');
    });

    tabla.addEventListener('click', function(evento) {
      var encabezado = evento.target.closest('thead th');
      if (!encabezado || !tabla.contains(encabezado)) return;
      var esUltimaColumna = encabezado === encabezado.parentElement.lastElementChild;
      var esTablaMantenimientos = tabla.closest('#seccion-mantenimientos');
      if (esTablaMantenimientos && esUltimaColumna) return;

      var tbody = tabla.tBodies[0];
      if (!tbody) return;
      var indice = Array.prototype.indexOf.call(encabezado.parentElement.children, encabezado);
      var descendente = encabezado.getAttribute('aria-sort') === 'ascending';

      tabla.querySelectorAll('thead th').forEach(function(otro) {
        otro.setAttribute('aria-sort', 'none');
      });
      encabezado.setAttribute('aria-sort', descendente ? 'descending' : 'ascending');

      var filas = Array.from(tbody.rows).filter(function(fila) {
        return !fila.querySelector('.texto-vacio') && fila.cells[indice];
      });
      var collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

      filas.sort(function(a, b) {
        var textoA = (a.cells[indice].textContent || '').trim();
        var textoB = (b.cells[indice].textContent || '').trim();
        var numeroA = Number(textoA.replace(/[^0-9,-]/g, '').replace(',', '.'));
        var numeroB = Number(textoB.replace(/[^0-9,-]/g, '').replace(',', '.'));
        var comparacion;

        if (textoA && textoB && Number.isFinite(numeroA) && Number.isFinite(numeroB)
          && /[$%]|\d[.,]\d/.test(textoA) && /[$%]|\d[.,]\d/.test(textoB)) {
          comparacion = numeroA - numeroB;
        } else {
          var fechaA = Date.parse(textoA);
          var fechaB = Date.parse(textoB);
          if (Number.isFinite(fechaA) && Number.isFinite(fechaB)) {
            comparacion = fechaA - fechaB;
          } else {
            comparacion = collator.compare(textoA, textoB);
          }
        }
        return descendente ? -comparacion : comparacion;
      });

      filas.forEach(function(fila) {
        tbody.appendChild(fila);
      });
    });
  });
}

// Copias de seguridad
function formatearTamanoBackup(bytes) {
  var valor = Number(bytes) || 0;
  if (valor < 1024) return valor + ' B';
  if (valor < 1024 * 1024) return (valor / 1024).toFixed(1) + ' KB';
  return (valor / (1024 * 1024)).toFixed(1) + ' MB';
}

function crearBackup() {
  var boton = document.getElementById('btnCrearBackup');
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Creando respaldo...';
  }

  fetch(API_BASE + '/api/admin/backups', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
    .then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'No se pudo crear el respaldo.');
        }
        return data;
      });
    })
    .then(function(data) {
      mostrarToast('success', data.message);
      window.setTimeout(function() {
        window.location.reload();
      }, 1000);
    })
    .catch(function(error) {
      console.error('Error creando respaldo:', error);
      mostrarToast('error', error.message);
    })
    .finally(function() {
      if (boton) {
        boton.disabled = false;
        boton.innerHTML = '<i class="fi fi-rr-disk"></i> Crear respaldo';
      }
    });
}

function cargarBackups() {
  var cuerpo = document.getElementById('tablaBackupsBody');
  if (!cuerpo) return;
  cuerpo.innerHTML = '<tr><td colspan="4" class="texto-vacio">Cargando respaldos...</td></tr>';

  fetch(API_BASE + '/api/admin/backups', {
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
    .then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los respaldos.');
        return data;
      });
    })
    .then(function(data) {
      var backups = Array.isArray(data.backups) ? data.backups : [];
      var cantidad = document.getElementById('backupCantidad');
      var tamano = document.getElementById('backupTamano');
      var ultimo = document.getElementById('backupUltimo');
      var total = backups.reduce(function(sum, backup) {
        return sum + (Number(backup.size) || 0);
      }, 0);
      if (cantidad) cantidad.textContent = String(backups.length);
      if (tamano) tamano.textContent = formatearTamanoBackup(total);
      if (ultimo) {
        if (!backups.length) {
          ultimo.textContent = 'Sin respaldos';
        } else {
          var fecha = new Date(backups[0].createdAt);
          ultimo.textContent = Number.isNaN(fecha.getTime())
            ? backups[0].filename
            : fecha.toLocaleString('es-CO');
        }
      }

      if (!backups.length) {
        cuerpo.innerHTML = '<tr><td colspan="4" class="texto-vacio">No hay copias de seguridad disponibles.</td></tr>';
        return;
      }

      cuerpo.replaceChildren();
      backups.forEach(function(backup) {
        var fila = document.createElement('tr');
        var fecha = new Date(backup.createdAt);

        var celdaNombre = document.createElement('td');
        celdaNombre.textContent = backup.filename;
        var ubicacionesBackup = [];
        if (backup.storedInDatabase) ubicacionesBackup.push('MySQL');
        if (backup.storedLocally) ubicacionesBackup.push('PC');
        if (ubicacionesBackup.length) {
          var estadoUbicaciones = document.createElement('small');
          estadoUbicaciones.className = 'backup-ubicaciones';
          estadoUbicaciones.textContent = ubicacionesBackup.join(' · ');
          celdaNombre.appendChild(document.createElement('br'));
          celdaNombre.appendChild(estadoUbicaciones);
        }
        fila.appendChild(celdaNombre);

        var celdaFecha = document.createElement('td');
        celdaFecha.textContent = Number.isNaN(fecha.getTime())
          ? backup.createdAt
          : fecha.toLocaleString('es-CO');
        fila.appendChild(celdaFecha);

        var celdaTamano = document.createElement('td');
        celdaTamano.textContent = formatearTamanoBackup(backup.size);
        fila.appendChild(celdaTamano);

        var celdaAcciones = document.createElement('td');
        var contenedor = document.createElement('div');
        contenedor.className = 'acciones-backup';

        var botonDescargar = document.createElement('button');
        botonDescargar.type = 'button';
        botonDescargar.className = 'boton-backup';
        botonDescargar.textContent = 'Descargar';
        botonDescargar.addEventListener('click', function() {
          descargarBackup(backup.filename);
        });

        var botonRestaurar = document.createElement('button');
        botonRestaurar.type = 'button';
        botonRestaurar.className = 'boton-backup';
        botonRestaurar.textContent = 'Restaurar';
        botonRestaurar.addEventListener('click', function() {
          restaurarBackup(backup.filename);
        });

        var botonEliminar = document.createElement('button');
        botonEliminar.type = 'button';
        botonEliminar.className = 'boton-backup danger';
        botonEliminar.textContent = 'Eliminar';
        botonEliminar.addEventListener('click', function() {
          eliminarBackup(backup.filename);
        });

        contenedor.appendChild(botonDescargar);
        contenedor.appendChild(botonRestaurar);
        contenedor.appendChild(botonEliminar);
        celdaAcciones.appendChild(contenedor);
        fila.appendChild(celdaAcciones);
        cuerpo.appendChild(fila);
      });
    })
    .catch(function(error) {
      console.error('Error cargando respaldos:', error);
      cuerpo.innerHTML = '<tr><td colspan="4" class="texto-vacio">No se pudieron cargar los respaldos.</td></tr>';
      mostrarToast('error', error.message);
    });
}

function descargarBackup(filename) {
  fetch(API_BASE + '/api/admin/backups/' + encodeURIComponent(filename) + '/download', {
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
    .then(function(response) {
      if (!response.ok) throw new Error('No se pudo descargar el respaldo.');
      return response.blob();
    })
    .then(function(blob) {
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = filename;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    })
    .catch(function(error) {
      console.error('Error descargando respaldo:', error);
      mostrarToast('error', error.message);
    });
}

function restaurarBackup(filename) {
  if (!window.confirm('Esto reemplazará las tablas respaldadas por el contenido del archivo. ¿Deseas continuar?')) return;

  fetch(API_BASE + '/api/admin/backups/' + encodeURIComponent(filename) + '/restore', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
    .then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok || !data.ok) {
          var mensaje = data.message || 'No se pudo restaurar el respaldo.';
          if (data.details) mensaje += ' ' + data.details;
          throw new Error(mensaje);
        }
        return data;
      });
    })
    .then(function(data) {
      mostrarToast('success', data.message);
      window.setTimeout(function() {
        window.location.reload();
      }, 1000);
    })
    .catch(function(error) {
      console.error('Error restaurando respaldo:', error);
      mostrarToast('error', error.message);
    });
}

function eliminarBackup(filename) {
  if (!window.confirm('¿Eliminar definitivamente el respaldo ' + filename + '?')) return;

  fetch(API_BASE + '/api/admin/backups/' + encodeURIComponent(filename), {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + sessionToken }
  })
    .then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok) throw new Error(data.message || 'No se pudo eliminar el respaldo.');
        return data;
      });
    })
    .then(function(data) {
      mostrarToast('success', data.message);
      cargarBackups();
    })
    .catch(function(error) {
      console.error('Error eliminando respaldo:', error);
      mostrarToast('error', error.message);
    });
}

// Inicializar el panel
document.addEventListener('DOMContentLoaded', function() {
  configurarMenuLateral();
  window.matchMedia('(max-width: 768px)').addEventListener('change', configurarMenuLateral);
  document
    .getElementById('btnLimpiarNotificaciones')
    ?.addEventListener('click', limpiarNotificacionesAdmin);
  configurarOrdenamientoUsuarios();
  configurarOrdenamientoTodasLasTablas();
  configurarAccionesSolicitudesGarantia();
  configurarAccionesGarantias();
  cargarDashboard();
  cargarNotificacionesAdmin();
  window.setInterval(cargarNotificacionesAdmin, 15000);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) cargarNotificacionesAdmin();
  });
});
