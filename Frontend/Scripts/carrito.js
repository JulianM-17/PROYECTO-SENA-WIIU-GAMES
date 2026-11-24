document.addEventListener('DOMContentLoaded', () => {
  const listaProductos = document.getElementById('lista-productos');
  if (!listaProductos) return;

  let promocionesDisponibles = [];

  async function cargarPromociones() {
    try {
      const response = await fetch('http://localhost:3000/api/promotions');
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !Array.isArray(data.promotions)) {
        throw new Error(data.message || 'No se pudieron cargar los descuentos.');
      }
      promocionesDisponibles = data.promotions;
    } catch (error) {
      console.error(error);
    }
  }

  function leerDescuentoActivo() {
    try {
      return JSON.parse(localStorage.getItem('wiiu_active_discount') || 'null');
    } catch (error) {
      return null;
    }
  }

  function obtenerDescuentoAplicado(subtotal) {
    const active = leerDescuentoActivo();
    if (!active || !Number.isFinite(Number(active.percent))) return null;
    const promotion = promocionesDisponibles.find(
      (item) => item.code === active.code
    );
    if (!promotion) return null;
    const percent = Math.min(100, Math.max(0, Number(promotion.percent) || 0));
    return {
      code: promotion.code,
      percent,
      amount: subtotal * (percent / 100),
    };
  }

  function formatCOP(amount) {
    return '$' + Math.round(amount).toLocaleString('es-CO') + ' COP';
  }

  function renderCart() {
    const cart = window.WiiUGamesCart.read();
    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    if (cart.length === 0) {
      listaProductos.innerHTML = `
        <div class="carrito-vacio">
          <i class="fi fi-rr-shopping-cart"></i>
          <h3>Tu carrito está vacío</h3>
          <p>No tienes productos agregados en tu carrito de compras.</p>
          <a href="Catalog.html" class="btn-linea">Explorar Catálogo</a>
        </div>
      `;
    } else {
      listaProductos.innerHTML = cart.map((item) => {
        const quantity = Number(item.quantity);
        const hasStockLimit =
          item.stock !== null &&
          item.stock !== undefined &&
          Number.isFinite(Number(item.stock));
        const plusDisabled = hasStockLimit && quantity >= Number(item.stock);
        return `
          <div class="fila-producto" data-product-id="${escapeHtml(item.productId)}">
            <div class="celda-item">
              <img class="img-producto" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" onerror="this.src='../Assets/lenovolegion.webp'">
              <span class="texto-producto">${escapeHtml(item.name)}</span>
            </div>
            <div class="celda-precio">${formatCOP(Number(item.price))}</div>
            <div class="celda-cantidad-wrapper">
              <div class="celda-cantidad">
                <span class="cant-val">${quantity}</span>
                <span class="flechitas">
                  <button class="btn-sumar" type="button" aria-label="Aumentar cantidad" ${plusDisabled ? 'disabled' : ''}>▲</button>
                  <button class="btn-restar" type="button" aria-label="Disminuir cantidad" ${quantity <= 1 ? 'disabled' : ''}>▼</button>
                </span>
              </div>
            </div>
            <div class="celda-subtotal val-subtotal">${formatCOP(Number(item.price) * quantity)}</div>
            <div class="celda-acciones">
              <button class="icono-accion eliminar" type="button" aria-label="Eliminar ${escapeHtml(item.name)}">×</button>
            </div>
          </div>
        `;
      }).join('');
    }

    const shipping = cart.length ? 25000 : 0;
    const descuento = obtenerDescuentoAplicado(subtotal);
    const montoDescuento = descuento ? descuento.amount : 0;
    const subtotalConDescuento = Math.max(0, subtotal - montoDescuento);
    const taxes = subtotalConDescuento * 0.19;
    document.getElementById('resumen-subtotal').textContent = formatCOP(subtotal);
    document.getElementById('resumen-envio').textContent = formatCOP(shipping);
    document.getElementById('resumen-impuestos').textContent = formatCOP(taxes);
    document.getElementById('resumen-total').textContent = formatCOP(
      subtotalConDescuento + shipping + taxes,
    );
    const filaDescuento = document.getElementById('fila-descuento');
    if (descuento && filaDescuento) {
      filaDescuento.hidden = false;
      document.getElementById('texto-descuento').textContent =
        `Descuento (${descuento.code} · ${descuento.percent}%)`;
      document.getElementById('resumen-descuento').textContent =
        `-${formatCOP(montoDescuento)}`;
    } else if (filaDescuento) {
      filaDescuento.hidden = true;
    }
    window.WiiUGamesCart.updateCount(cart);
  }

  listaProductos.addEventListener('click', (event) => {
    const row = event.target.closest('.fila-producto');
    if (!row) return;

    const id = row.dataset.productId;
    const cart = window.WiiUGamesCart.read();
    const item = cart.find((entry) => String(entry.productId) === id);
    if (!item) return;

    if (event.target.closest('.btn-sumar')) {
      window.WiiUGamesCart.setQuantity(id, Number(item.quantity) + 1);
    } else if (event.target.closest('.btn-restar') && item.quantity > 1) {
      window.WiiUGamesCart.setQuantity(id, Number(item.quantity) - 1);
    } else if (event.target.closest('.eliminar')) {
      window.WiiUGamesCart.remove(id);
    }
  });

  document.getElementById('btn-vaciar')?.addEventListener('click', () => {
    window.WiiUGamesCart.clear();
  });

  const botonDescuento = document.getElementById('btn-descuento');
  const panelDescuento = document.getElementById('panel-descuento');
  botonDescuento?.addEventListener('click', () => {
    const isOpen = botonDescuento.getAttribute('aria-expanded') === 'true';
    botonDescuento.setAttribute('aria-expanded', String(!isOpen));
    botonDescuento.classList.toggle('abierto', !isOpen);
    panelDescuento.hidden = isOpen;
  });

  const inputDescuento = document.getElementById('input-descuento');
  const botonAplicarDescuento = document.getElementById('btn-aplicar-descuento');
  const botonQuitarDescuento = document.getElementById('btn-quitar-descuento');

  function actualizarBotonesDescuento() {
    const active = leerDescuentoActivo();
    if (botonQuitarDescuento) botonQuitarDescuento.hidden = !active;
    if (inputDescuento && active) inputDescuento.value = active.code;
  }

  botonAplicarDescuento?.addEventListener('click', () => {
    const code = inputDescuento?.value.trim().toUpperCase();
    if (!code) {
      mostrarToast('Escribe un código de descuento.');
      return;
    }
    const promotion = promocionesDisponibles.find(
      (item) => String(item.code).toUpperCase() === code
    );
    if (!promotion) {
      mostrarToast('El código ingresado no es válido.');
      return;
    }
    localStorage.setItem('wiiu_active_discount', JSON.stringify({
      code: promotion.code,
      percent: Number(promotion.percent) || 0,
    }));
    actualizarBotonesDescuento();
    renderCart();
  });

  inputDescuento?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      botonAplicarDescuento?.click();
    }
  });

  botonQuitarDescuento?.addEventListener('click', () => {
    localStorage.removeItem('wiiu_active_discount');
    if (inputDescuento) inputDescuento.value = '';
    actualizarBotonesDescuento();
    renderCart();
  });

  document.getElementById('btn-proceder-pago')?.addEventListener('click', (event) => {
    event.preventDefault();

    if (window.WiiUGamesCart.read().length === 0) {
      mostrarToast(
        'Tu carrito está vacío. Agrega al menos un producto para continuar.',
      );
      return;
    }

    let usuarioActivo;
    try {
      usuarioActivo = JSON.parse(
        sessionStorage.getItem('wiiu_usuario_activo') || 'null',
      );
    } catch (error) {
      console.error('No se pudo validar la sesión del usuario:', error);
    }

    if (!usuarioActivo?.token) {
      window.location.href = 'Login.html?returnTo=metodos_pago.html';
      return;
    }

    window.location.href = 'metodos_pago.html';
  });
  window.addEventListener('wiiu-cart-change', renderCart);
  cargarPromociones().finally(() => {
    actualizarBotonesDescuento();
    renderCart();
  });
  renderCart();
});

function mostrarToast(mensaje) {
  const contenedor = document.getElementById('contenedor-toast');
  if (!contenedor) return;

  const toast = document.createElement('div');
  toast.className = 'toast error';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <i class="fi fi-rr-cross-circle" aria-hidden="true"></i>
    <span></span>
  `;
  toast.querySelector('span').textContent = mensaje;
  contenedor.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
