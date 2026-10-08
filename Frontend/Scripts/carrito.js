document.addEventListener('DOMContentLoaded', () => {
  const listaProductos = document.getElementById('lista-productos');
  if (!listaProductos) return;

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
    const taxes = subtotal * 0.19;
    const serviceFee = subtotal * 0.10;
    document.getElementById('resumen-subtotal').textContent = formatCOP(subtotal);
    document.getElementById('resumen-envio').textContent = formatCOP(shipping);
    document.getElementById('resumen-impuestos').textContent = formatCOP(taxes);
    document.getElementById('resumen-tasa').textContent = formatCOP(serviceFee);
    document.getElementById('resumen-total').textContent = formatCOP(
      subtotal + shipping + taxes + serviceFee,
    );
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
  document.getElementById('btn-actualizar')?.addEventListener('click', renderCart);
  window.addEventListener('wiiu-cart-change', renderCart);
  renderCart();
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
