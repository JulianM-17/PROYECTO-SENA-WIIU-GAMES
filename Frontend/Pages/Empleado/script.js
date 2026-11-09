var tipoRegistroActual = "";
var subtotalVenta = 0;

function cambiarPestana(idVista, botonClickeado) {
  var secciones = document.querySelectorAll('.seccion-vista');
  for (var i = 0; i < secciones.length; i++) {
    secciones[i].classList.remove('activa');
  }

  var seccionDestino = document.getElementById(idVista);
  if (seccionDestino) {
    seccionDestino.classList.add('activa');
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

function toggleMenuPerfil() {
  var menu = document.getElementById('menuPerfil');
  if (menu) {
    menu.classList.toggle('abierto');
  }
}

document.addEventListener('click', function (evento) {
  var perfil = document.querySelector('.perfil-empleado');
  var menu = document.getElementById('menuPerfil');
  if (perfil && menu && !perfil.contains(evento.target)) {
    menu.classList.remove('abierto');
  }
});

function mostrarNotificaciones() {
  alert("🔔 Tienes 0 notificaciones pendientes en tu turno de atención.");
}

function filtrarTablaGenerica(idTbody, texto) {
  var filtro = texto.toLowerCase();
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  var filas = tbody.getElementsByTagName('tr');
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].querySelector('.mensaje-vacio')) continue;

    var contenido = filas[i].textContent.toLowerCase();
    if (contenido.indexOf(filtro) > -1) {
      filas[i].style.display = "";
    } else {
      filas[i].style.display = "none";
    }
  }
}

function filtrarProductosPos(texto) {
  var contenedor = document.getElementById('contenedorProductosPos');
  if (texto.trim() === "") {
    contenedor.innerHTML = '<p>No hay productos disponibles en el inventario</p>';
  } else {
    contenedor.innerHTML = `
      <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; padding: 15px;">
        <div style="background: rgba(255,255,255,0.05); border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; cursor: pointer; text-align: center;" onclick="agregarProductoVenta('${texto}', 85000)">
          <div style="font-weight: 700; margin-bottom: 5px;">${texto}</div>
          <div style="color: #00a3c4; font-weight: 800; font-size: 15px;">$ 85.000</div>
          <small style="color: #64748b;">(Clic para agregar al recibo)</small>
        </div>
      </div>
    `;
  }
}

function filtrarCategoriaPos(categoria) {
  if (categoria === "") {
    document.getElementById('contenedorProductosPos').innerHTML = '<p>No hay productos disponibles en el inventario</p>';
  } else {
    filtrarProductosPos(categoria);
  }
}

function agregarProductoVenta(nombre, precio) {
  subtotalVenta += precio;
  var itemsContainer = document.getElementById('posItemsContainer');
  
  if (itemsContainer.textContent.indexOf('Selecciona un producto') > -1) {
    itemsContainer.innerHTML = '';
  }

  var itemDiv = document.createElement('div');
  itemDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 12px;";
  itemDiv.innerHTML = `
    <span>${nombre}</span>
    <strong>$ ${precio.toLocaleString('es-CO')}</strong>
  `;
  itemsContainer.appendChild(itemDiv);

  actualizarTotalesPos();
}

function vaciarOrden() {
  subtotalVenta = 0;
  document.getElementById('posItemsContainer').innerHTML = 'Selecciona un producto del catálogo para agregar a la venta';
  actualizarTotalesPos();
}

function actualizarTotalesPos() {
  document.getElementById('posSubtotal').textContent = '$ ' + subtotalVenta.toLocaleString('es-CO');
  document.getElementById('posTotal').textContent = '$ ' + subtotalVenta.toLocaleString('es-CO');
}

function completarVenta() {
  if (subtotalVenta <= 0) {
    alert("⚠️ Agrega al menos un producto a la orden antes de completar la venta.");
    return;
  }
  var metodo = document.querySelector('input[name="pago"]:checked').value;
  alert("✅ ¡Venta completada con éxito!\n\nTotal Cobrado: $ " + subtotalVenta.toLocaleString('es-CO') + "\nMétodo de Pago: " + metodo + "\n\nComprobante generado correctamente.");
  vaciarOrden();
}

function abrirModalEmpleado(tipo) {
  tipoRegistroActual = tipo;
  var modal = document.getElementById('modalEmpleado');
  var titulo = document.getElementById('modalEmpleadoTitulo');
  var campos = document.getElementById('modalEmpleadoCampos');

  modal.classList.add('activo');

  if (tipo === 'garantia') {
    titulo.textContent = "Registrar Nueva Garantía";
    campos.innerHTML = `
      <div class="grupo-campo">
        <label>Nombre del Cliente:</label>
        <input type="text" id="empCampo1" required placeholder="Ej. Carlos Ramirez">
      </div>
      <div class="grupo-campo">
        <label>Producto / Serial:</label>
        <input type="text" id="empCampo2" required placeholder="Ej. SSD Kingston A400 480GB">
      </div>
      <div class="grupo-campo">
        <label>Meses de Garantía:</label>
        <select id="empCampo3">
          <option value="12">12 Meses</option>
          <option value="6">6 Meses</option>
          <option value="24">24 Meses</option>
        </select>
      </div>
    `;
  } else if (tipo === 'taller') {
    titulo.textContent = "Ingresar Orden a Taller Técnico";
    campos.innerHTML = `
      <div class="grupo-campo">
        <label>Dispositivo / Consola:</label>
        <input type="text" id="empCampo1" required placeholder="Ej. Portátil HP 15">
      </div>
      <div class="grupo-campo">
        <label>Falla Reportada:</label>
        <input type="text" id="empCampo2" required placeholder="Ej. Batería defectuosa / No enciende">
      </div>
      <div class="grupo-campo">
        <label>Cliente:</label>
        <input type="text" id="empCampo3" required placeholder="Ej. Carlos Ramirez">
      </div>
      <div class="grupo-campo">
        <label>Presupuesto Estimado ($):</label>
        <input type="number" id="empCampo4" required placeholder="Ej. 180000">
      </div>
    `;
  } else if (tipo === 'cliente') {
    titulo.textContent = "Registrar Nuevo Cliente";
    campos.innerHTML = `
      <div class="grupo-campo">
        <label>Nombre Completo:</label>
        <input type="text" id="empCampo1" required placeholder="Ej. Carlos Ramirez">
      </div>
      <div class="grupo-campo">
        <label>Teléfono de Contacto:</label>
        <input type="text" id="empCampo2" required placeholder="Ej. 312 345 6789">
      </div>
      <div class="grupo-campo">
        <label>Correo Electrónico:</label>
        <input type="email" id="empCampo3" required placeholder="Ej. carlos@gmail.com">
      </div>
    `;
  }
}

function cerrarModalEmpleado() {
  var modal = document.getElementById('modalEmpleado');
  if (modal) {
    modal.classList.remove('activo');
  }
}

function guardarRegistroEmpleado(evento) {
  evento.preventDefault();

  var c1 = document.getElementById('empCampo1') ? document.getElementById('empCampo1').value : '';
  var c2 = document.getElementById('empCampo2') ? document.getElementById('empCampo2').value : '';
  var c3 = document.getElementById('empCampo3') ? document.getElementById('empCampo3').value : '';
  var c4 = document.getElementById('empCampo4') ? document.getElementById('empCampo4').value : '';

  var fechaHoy = new Date().toISOString().split('T')[0];

  if (tipoRegistroActual === 'garantia') {
    insertarFilaEmpleado('tablaGarantiasBody', `
      <td><strong>GAR-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${fechaHoy}</td>
      <td>12 Meses</td>
      <td><span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 3px 8px; border-radius: 10px; font-weight: 700;">Activa</span></td>
      <td><a href="#" style="color: #f5a623; text-decoration: none; font-weight: 600;">Ver certificado</a></td>
    `);
  } else if (tipoRegistroActual === 'taller') {
    insertarFilaEmpleado('tablaTallerBody', `
      <td><strong>MNT-${Math.floor(Math.random()*900)+100}</strong></td>
      <td>${c1}</td>
      <td>${c2}</td>
      <td>${c3}</td>
      <td>$ ${Number(c4).toLocaleString('es-CO')}</td>
      <td><span style="background: rgba(245,166,35,0.15); color: #f5a623; padding: 3px 8px; border-radius: 10px; font-weight: 700;">En Taller</span></td>
      <td><a href="#" style="color: #f5a623; text-decoration: none; font-weight: 600;">Detalles</a></td>
    `);
  } else if (tipoRegistroActual === 'cliente') {
    insertarFilaEmpleado('tablaClientesBody', `
      <td><strong>${c1}</strong></td>
      <td>${c2}</td>
      <td>${c3}</td>
      <td>$ 0</td>
      <td><span style="background: rgba(59,130,246,0.15); color: #3b82f6; padding: 3px 8px; border-radius: 10px; font-weight: 700;">Nuevo</span></td>
    `);

    var posCliente = document.getElementById('posCliente');
    if (posCliente) {
      var opt = document.createElement('option');
      opt.textContent = c1;
      opt.value = c1;
      posCliente.appendChild(opt);
    }
  }

  cerrarModalEmpleado();
  alert("✅ Registro guardado exitosamente.");
}

function insertarFilaEmpleado(idTbody, html) {
  var tbody = document.getElementById(idTbody);
  if (!tbody) return;

  var vacio = tbody.querySelector('.mensaje-vacio');
  if (vacio) {
    tbody.innerHTML = '';
  }

  var tr = document.createElement('tr');
  tr.innerHTML = html;
  tbody.appendChild(tr);
}

