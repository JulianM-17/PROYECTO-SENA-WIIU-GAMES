/* ==========================================================================
   LÓGICA JAVASCRIPT DEL PANEL DE ADMINISTRADOR - WIIU-GAMES
   Código limpio, funcional y fácil de entender para estudiantes
   ========================================================================== */

// Variable para saber qué formulario modal está abierto
var tipoModalActual = "";

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
    // Si es la fila de "No hay registros", la ignoramos
    if (filas[i].querySelector('.texto-vacio')) continue;

    var contenidoFila = filas[i].textContent.toLowerCase();
    if (contenidoFila.indexOf(filtro) > -1) {
      filas[i].style.display = "";
    } else {
      filas[i].style.display = "none";
    }
  }
}

// Filtro específico para inputs de cada tabla
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

// Filtro para los selects desplegables de estados / categorías
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

// Cerrar el menú desplegable si se hace clic fuera
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
// 4. VENTANAS MODALES PARA REGISTRAR DATOS (SIMULACIÓN DE BD)
// ==========================================================================
function abrirModal(tipo) {
  tipoModalActual = tipo;
  var modal = document.getElementById('modalFormulario');
  var titulo = document.getElementById('modalTitulo');
  var campos = document.getElementById('modalCampos');

  modal.classList.add('activo');

  // Dependiendo del botón, mostramos campos adecuados
  if (tipo === 'garantias') {
    titulo.textContent = "Registrar Nueva Garantía";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre del Cliente:</label>
        <input type="text" id="campo1" required placeholder="Ej. Carlos Ramirez">
      </div>
      <div class="campo-grupo">
        <label>Producto / Serial:</label>
        <input type="text" id="campo2" required placeholder="Ej. Mouse Logitech M185 (SN: 12345)">
      </div>
      <div class="campo-grupo">
        <label>Meses de Cobertura:</label>
        <select id="campo3">
          <option value="6">6 Meses</option>
          <option value="12" selected>12 Meses</option>
          <option value="24">24 Meses</option>
        </select>
      </div>
    `;
  } else if (tipo === 'mantenimientos') {
    titulo.textContent = "Nuevo Servicio de Mantenimiento";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Equipo / Consola:</label>
        <input type="text" id="campo1" required placeholder="Ej. PlayStation 5 / Laptop HP">
      </div>
      <div class="campo-grupo">
        <label>Nombre del Cliente:</label>
        <input type="text" id="campo2" required placeholder="Ej. Laura Gomez">
      </div>
      <div class="campo-grupo">
        <label>Técnico Responsable:</label>
        <input type="text" id="campo3" required placeholder="Ej. Mateo Rios">
      </div>
      <div class="campo-grupo">
        <label>Costo Estimado ($):</label>
        <input type="number" id="campo4" required placeholder="Ej. 180000">
      </div>
    `;
  } else if (tipo === 'inventario') {
    titulo.textContent = "Agregar Producto al Inventario";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre del Producto:</label>
        <input type="text" id="campo1" required placeholder="Ej. Nintendo Switch OLED">
      </div>
      <div class="campo-grupo">
        <label>Categoría:</label>
        <select id="campo2">
          <option value="Periféricos">Periféricos</option>
          <option value="Portátiles">Portátiles</option>
          <option value="Almacenamiento">Almacenamiento</option>
          <option value="Consolas">Consolas</option>
        </select>
      </div>
      <div class="campo-grupo">
        <label>Precio de Venta ($):</label>
        <input type="number" id="campo3" required placeholder="Ej. 1450000">
      </div>
      <div class="campo-grupo">
        <label>Unidades en Stock:</label>
        <input type="number" id="campo4" required placeholder="Ej. 10">
      </div>
    `;
  } else if (tipo === 'reparacion') {
    titulo.textContent = "Nueva Orden de Reparación";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Dispositivo:</label>
        <input type="text" id="campo1" required placeholder="Ej. GamePad Wii U">
      </div>
      <div class="campo-grupo">
        <label>Falla Reportada:</label>
        <input type="text" id="campo2" required placeholder="Ej. Pantalla rota o no da imagen">
      </div>
      <div class="campo-grupo">
        <label>Cliente:</label>
        <input type="text" id="campo3" required placeholder="Ej. Carlos Ramirez">
      </div>
      <div class="campo-grupo">
        <label>Presupuesto ($):</label>
        <input type="number" id="campo4" required placeholder="Ej. 65000">
      </div>
    `;
  } else if (tipo === 'descuentos') {
    titulo.textContent = "Crear Código de Descuento";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Código del Cupón:</label>
        <input type="text" id="campo1" required placeholder="Ej. WIIU2026">
      </div>
      <div class="campo-grupo">
        <label>Porcentaje / Descuento:</label>
        <input type="text" id="campo2" required placeholder="Ej. 15% Descuento">
      </div>
      <div class="campo-grupo">
        <label>Fecha Límite:</label>
        <input type="date" id="campo3" required>
      </div>
    `;
  } else if (tipo === 'resenas') {
    titulo.textContent = "Moderar / Agregar Reseña";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre del Cliente:</label>
        <input type="text" id="campo1" required placeholder="Ej. Andrea Morales">
      </div>
      <div class="campo-grupo">
        <label>Producto o Servicio:</label>
        <input type="text" id="campo2" required placeholder="Ej. Mantenimiento Preventivo">
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
        <label>Comentario:</label>
        <textarea id="campo4" rows="3" placeholder="Excelente atención y rapidez..."></textarea>
      </div>
    `;
  } else if (tipo === 'clientes') {
    titulo.textContent = "Registrar Nuevo Cliente";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Nombre Completo:</label>
        <input type="text" id="campo1" required placeholder="Ej. Mario Alejandro Pérez">
      </div>
      <div class="campo-grupo">
        <label>Teléfono:</label>
        <input type="text" id="campo2" required placeholder="Ej. 312 456 7890">
      </div>
      <div class="campo-grupo">
        <label>Correo Electrónico:</label>
        <input type="email" id="campo3" required placeholder="Ej. mario@gmail.com">
      </div>
      <div class="campo-grupo">
        <label>Ciudad:</label>
        <input type="text" id="campo4" required placeholder="Ej. Sogamoso">
      </div>
    `;
  } else if (tipo === 'pedidos') {
    titulo.textContent = "Registrar Nuevo Pedido";
    campos.innerHTML = `
      <div class="campo-grupo">
        <label>Cliente:</label>
        <input type="text" id="campo1" required placeholder="Ej. Carlos Ramirez">
      </div>
      <div class="campo-grupo">
        <label>Total del Pedido ($):</label>
        <input type="number" id="campo2" required placeholder="Ej. 180000">
      </div>
    `;
  }
}

function cerrarModal() {
  var modal = document.getElementById('modalFormulario');
  if (modal) {
    modal.classList.remove('activo');
  }
}

// ==========================================================================
// 5. GUARDAR DATOS Y INSERTAR EN LAS TABLAS (PREPARADO PARA BD)
// ==========================================================================
function guardarDatos(evento) {
  evento.preventDefault();

  var c1 = document.getElementById('campo1') ? document.getElementById('campo1').value : '';
  var c2 = document.getElementById('campo2') ? document.getElementById('campo2').value : '';
  var c3 = document.getElementById('campo3') ? document.getElementById('campo3').value : '';
  var c4 = document.getElementById('campo4') ? document.getElementById('campo4').value : '';

  var fechaHoy = new Date().toISOString().split('T')[0];

  if (tipoModalActual === 'garantias') {
    insertarFila('tablaGarantiasBody', `
      <td><strong>GAR-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${fechaHoy}</td>
      <td>12 Meses</td>
      <td><span class="etiqueta-verde">Activa</span></td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
  } else if (tipoModalActual === 'mantenimientos') {
    insertarFila('tablaMantenimientosBody', `
      <td><strong>MNT-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${c3}</td>
      <td>$ ${Number(c4).toLocaleString('es-CO')}</td>
      <td><span class="etiqueta-naranja">En Taller</span></td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
  } else if (tipoModalActual === 'inventario') {
    insertarFila('tablaInventarioBody', `
      <td><strong>${c1}</strong></td>
      <td>PRD-${Math.floor(Math.random()*900)+100}</td>
      <td>${c2}</td>
      <td>$ ${Number(c3).toLocaleString('es-CO')}</td>
      <td>${c4} uds</td>
      <td>12 Meses</td>
      <td><span class="etiqueta-verde">Disponible</span></td>
      <td>
        <button class="boton-icono" title="Editar"><i class="fi fi-rr-edit"></i></button>
        <button class="boton-icono rojo" title="Eliminar" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button>
      </td>
    `);
    // Actualizar contador de productos
    var totalActual = document.querySelectorAll('#tablaInventarioBody tr').length;
    document.getElementById('invTotalProductos').textContent = totalActual + " items";
  } else if (tipoModalActual === 'reparacion') {
    insertarFila('tablaReparacionBody', `
      <td><strong>REP-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${c3}</td>
      <td>$ ${Number(c4).toLocaleString('es-CO')}</td>
      <td><span class="etiqueta-azul">En Reparación</span></td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
  } else if (tipoModalActual === 'descuentos') {
    insertarFila('tablaDescuentosBody', `
      <td><strong>${c1.toUpperCase()}</strong></td>
      <td>Porcentaje</td>
      <td>${c2}</td>
      <td>${fechaHoy}</td>
      <td>${c3}</td>
      <td><span class="etiqueta-verde">Activo</span></td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
    var totalDesc = document.querySelectorAll('#tablaDescuentosBody tr').length;
    document.getElementById('descActivos').textContent = totalDesc;
  } else if (tipoModalActual === 'resenas') {
    insertarFila('tablaResenasBody', `
      <td><strong>RES-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${c3}</td>
      <td>"${c4 || 'Sin comentarios'}"</td>
      <td>${fechaHoy}</td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
    var totalRes = document.querySelectorAll('#tablaResenasBody tr').length;
    document.getElementById('resTotal').textContent = totalRes;
  } else if (tipoModalActual === 'clientes') {
    insertarFila('tablaClientesBody', `
      <td><strong>CLI-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${c3}</td>
      <td>${c4}</td>
      <td>${fechaHoy}</td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
    var totalCli = document.querySelectorAll('#tablaClientesBody tr').length;
    document.getElementById('cliTotal').textContent = totalCli;
    document.getElementById('cliActivos').textContent = totalCli;
  } else if (tipoModalActual === 'pedidos') {
    insertarFila('tablaPedidosBody', `
      <td><strong>#${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td><span class="etiqueta-verde">Pagada</span></td>
      <td>$ ${Number(c2).toLocaleString('es-CO')}</td>
      <td><button class="boton-icono rojo" onclick="eliminarFila(this)"><i class="fi fi-rr-trash"></i></button></td>
    `);
    var totalPed = document.querySelectorAll('#tablaPedidosBody tr').length;
    document.getElementById('homePedidosTotales').textContent = totalPed;
  }

  cerrarModal();
  alert("✅ ¡Registro agregado con éxito! (Listo para enviar al backend/base de datos).");
}

// Función auxiliar para insertar fila en un tbody
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

// Función para eliminar fila
function eliminarFila(boton) {
  if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
    var fila = boton.closest('tr');
    var tbody = fila.parentElement;
    fila.remove();

    // Si ya no quedan filas, volvemos a poner el aviso de vacío
    if (tbody.getElementsByTagName('tr').length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="texto-vacio">No hay registros en la base de datos</td></tr>';
    }
  }
}

