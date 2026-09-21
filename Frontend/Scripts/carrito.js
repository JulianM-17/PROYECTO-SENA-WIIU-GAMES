document.addEventListener('DOMContentLoaded', () => {
  const listaProductos = document.getElementById('lista-productos');
  if (!listaProductos) return;

  function id(str) {
    return document.getElementById(str);
  }

  function formatCOP(amount) {
    return '$' + Math.round(amount).toLocaleString('es-CO') + ' COP';
  }

  function recalculateTotals() {
    const filas = listaProductos.querySelectorAll('.fila-producto');
    let subtotal = 0;
    let totalItems = 0;

    filas.forEach(fila => {
      const precioUnitario = parseFloat(fila.dataset.precio) || 0;
      const cantSpan = fila.querySelector('.cant-val');
      const cant = parseInt(cantSpan ? cantSpan.textContent : '1', 10) || 1;
      
      const subtotalFila = precioUnitario * cant;
      subtotal += subtotalFila;
      totalItems += cant;

      const subtotalEl = fila.querySelector('.val-subtotal');
      if (subtotalEl) {
        subtotalEl.textContent = formatCOP(subtotalFila);
      }
    });

    const resumenSubtotal = id('resumen-subtotal');
    const resumenEnvio = id('resumen-envio');
    const resumenImpuestos = id('resumen-impuestos');
    const resumenTasa = id('resumen-tasa');
    const resumenTotal = id('resumen-total');
    const cartCount = id('cart-count');

    if (cartCount) {
      cartCount.textContent = totalItems;
    }

    if (filas.length === 0) {
      listaProductos.innerHTML = `
        <div class="carrito-vacio">
          <i class="fi fi-rr-shopping-cart"></i>
          <h3>Tu carrito está vacío</h3>
          <p>No tienes productos agregados en tu carrito de compras.</p>
          <a href="Catalog.html" class="btn-linea">Explorar Catálogo</a>
        </div>
      `;
      if (resumenSubtotal) resumenSubtotal.textContent = '$0 COP';
      if (resumenEnvio) resumenEnvio.textContent = '$0 COP';
      if (resumenImpuestos) resumenImpuestos.textContent = '$0 COP';
      if (resumenTasa) resumenTasa.textContent = '$0 COP';
      if (resumenTotal) resumenTotal.textContent = '$0 COP';
      return;
    }

    const costoEnvio = 25000;
    const impuestos = subtotal * 0.19;
    const tasaServicio = subtotal * 0.10;
    const totalFinal = subtotal + costoEnvio + impuestos + tasaServicio;

    if (resumenSubtotal) resumenSubtotal.textContent = formatCOP(subtotal);
    if (resumenEnvio) resumenEnvio.textContent = formatCOP(costoEnvio);
    if (resumenImpuestos) resumenImpuestos.textContent = formatCOP(impuestos);
    if (resumenTasa) resumenTasa.textContent = formatCOP(tasaServicio);
    if (resumenTotal) resumenTotal.textContent = formatCOP(totalFinal);
  }

  // Delegación de eventos en la lista de productos
  listaProductos.addEventListener('click', (e) => {
    const fila = e.target.closest('.fila-producto');
    if (!fila) return;

    if (e.target.closest('.btn-sumar')) {
      const cantSpan = fila.querySelector('.cant-val');
      let val = parseInt(cantSpan.textContent, 10) || 1;
      cantSpan.textContent = val + 1;
      recalculateTotals();
    } else if (e.target.closest('.btn-restar')) {
      const cantSpan = fila.querySelector('.cant-val');
      let val = parseInt(cantSpan.textContent, 10) || 1;
      if (val > 1) {
        cantSpan.textContent = val - 1;
        recalculateTotals();
      }
    } else if (e.target.closest('.eliminar')) {
      fila.remove();
      recalculateTotals();
    }
  });

  // Botón vaciar carrito
  const btnVaciar = id('btn-vaciar');
  if (btnVaciar) {
    btnVaciar.addEventListener('click', () => {
      listaProductos.innerHTML = '';
      recalculateTotals();
    });
  }

  // Botón actualizar
  const btnActualizar = id('btn-actualizar');
  if (btnActualizar) {
    btnActualizar.addEventListener('click', () => {
      recalculateTotals();
    });
  }

  // Inicializar al cargar
  recalculateTotals();
});
