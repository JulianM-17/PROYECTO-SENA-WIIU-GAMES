let cartItems = [];

document.addEventListener('DOMContentLoaded', () => {
  initPresetData();
  initNavigation();
  initUserProfileMenu();
  renderPosProductsGrid();
  renderCart();
  renderAllEmployeeTables();
});

function initUserProfileMenu() {
  const btnMenu = document.getElementById("btnMenuUsuario");
  const menuUsuario = document.getElementById("menuUsuario");
  const perfilUsuario = document.getElementById("perfilUsuario");
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");

  if (!btnMenu || !menuUsuario) return;

  const toggleMenu = (e) => {
    e.stopPropagation();
    const isOpen = menuUsuario.classList.toggle("mostrar");
    btnMenu.classList.toggle("activo", isOpen);
    perfilUsuario?.classList.toggle("activo", isOpen);
    btnMenu.setAttribute("aria-expanded", String(isOpen));
  };

  btnMenu.addEventListener("click", toggleMenu);
  perfilUsuario?.addEventListener("click", (e) => {
    if (!e.target.closest("#menuUsuario") && !e.target.closest("#btnMenuUsuario")) {
      toggleMenu(e);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#perfilUsuario") && !e.target.closest("#menuUsuario")) {
      menuUsuario.classList.remove("mostrar");
      btnMenu.classList.remove("activo");
      perfilUsuario?.classList.remove("activo");
      btnMenu.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menuUsuario.classList.remove("mostrar");
      btnMenu.classList.remove("activo");
      perfilUsuario?.classList.remove("activo");
      btnMenu.setAttribute("aria-expanded", "false");
    }
  });

  btnCerrarSesion?.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      localStorage.removeItem("wiiu_current_session");
      localStorage.removeItem("wiiu_logged_user");
      sessionStorage.clear();
    } catch (err) {}
    window.location.href = "../Login.html";
  });
}


const DEFAULT_PRODUCTS = [];
const DEFAULT_WARRANTIES = [];
const DEFAULT_REPAIRS = [];
const DEFAULT_CLIENTS = [];

function initPresetData() {
  const keys = ['wiiu_products', 'wiiu_warranties', 'wiiu_repairs', 'wiiu_clients'];
  keys.forEach(k => {
    const val = localStorage.getItem(k);
    if (
      !val ||
      val.includes('WIIU-GME') ||
      val.includes('GAR-801') ||
      val.includes('REP-101') ||
      val.includes('Juan Camilo') ||
      val.includes('camilo.r@gmail.com') ||
      val.includes('VIP Gamer') ||
      val.includes('María Fernanda') ||
      val.includes('Andrés Felipe') ||
      val.includes('Laura Sofía')
    ) {
      localStorage.setItem(k, JSON.stringify([]));
    }
  });

  // Limpieza directa garantizada para clientes de prueba predeterminados
  try {
    const clients = JSON.parse(localStorage.getItem('wiiu_clients')) || [];
    const cleanClients = clients.filter(
      c =>
        c.name !== 'Juan Camilo R.' &&
        c.name !== 'María Fernanda T.' &&
        c.name !== 'Andrés Felipe G.' &&
        c.name !== 'Laura Sofía M.' &&
        !c.email?.includes('camilo.r') &&
        !c.email?.includes('mafe.t') &&
        !c.email?.includes('andres.fg') &&
        !c.email?.includes('laura.m')
    );
    if (cleanClients.length !== clients.length) {
      localStorage.setItem('wiiu_clients', JSON.stringify(cleanClients));
    }
  } catch (e) {
    localStorage.setItem('wiiu_clients', JSON.stringify([]));
  }
}

function getProducts() {
  return JSON.parse(localStorage.getItem('wiiu_products')) || [];
}

function saveProducts(products) {
  localStorage.setItem('wiiu_products', JSON.stringify(products));
}

function initNavigation() {
  document.querySelectorAll('.elemento-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.getAttribute('data-view'));
    });
  });
}

window.switchView = function(viewKey) {
  document.querySelectorAll('.elemento-nav').forEach(btn => {
    btn.classList.toggle('activo', btn.getAttribute('data-view') === viewKey);
  });

  document.querySelectorAll('.seccion-vista').forEach(sec => sec.classList.remove('vista-activa'));

  const target = document.getElementById(`view-${viewKey}`);
  if (target) {
    target.classList.add('vista-activa');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const renderMap = {
    pos: renderPosProductsGrid,
    catalogo: renderEmpCatalogTable,
    garantias: renderEmpWarrantiesTable,
    taller: renderEmpRepairsTable,
    clientes: renderEmpClientsTable
  };

  if (renderMap[viewKey]) renderMap[viewKey]();
};

function renderPosProductsGrid(items = null) {
  const products = items || getProducts();
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-cart-msg" style="grid-column: 1 / -1; padding: 40px; font-size: 0.95rem;">No hay productos disponibles en el inventario</div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="pos-product-card" onclick="window.addToCart(${p.id})">
      <div class="pos-product-img">
        <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/150/0E214D/00D2FF?text=Game'">
      </div>
      <div class="pos-product-name">${p.name}</div>
      <div class="pos-product-category">${p.category}</div>
      <div class="pos-product-price">$ ${Number(p.price).toLocaleString('es-CO')}</div>
      <div class="pos-product-stock">Stock: ${p.stock} uds</div>
    </div>
  `).join('');
}

window.filterPosProducts = function(term) {
  const cleanTerm = term.toLowerCase().trim();
  const filtered = getProducts().filter(p => 
    p.name.toLowerCase().includes(cleanTerm) || 
    p.sku.toLowerCase().includes(cleanTerm)
  );
  renderPosProductsGrid(filtered);
};

window.filterPosProductsByCategory = function(cat) {
  const products = getProducts();
  renderPosProductsGrid(cat === 'todos' ? products : products.filter(p => p.category === cat));
};

window.addToCart = function(prodId) {
  const products = getProducts();
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  if (prod.stock <= 0) {
    showToast(`¡El producto "${prod.name}" no tiene existencias en stock!`, 'error');
    return;
  }

  const existing = cartItems.find(item => item.id === prodId);
  if (existing) {
    if (existing.qty + 1 > prod.stock) {
      showToast(`No puedes agregar más unidades. Máximo en stock: ${prod.stock}`);
      return;
    }
    existing.qty += 1;
  } else {
    cartItems.push({ ...prod, qty: 1 });
  }

  renderCart();
  showToast(`"${prod.name}" agregado al carrito de venta.`);
};

window.changeCartQty = function(prodId, delta) {
  const products = getProducts();
  const prod = products.find(p => p.id === prodId);
  const item = cartItems.find(i => i.id === prodId);

  if (item) {
    item.qty += delta;
    if (prod && item.qty > prod.stock) {
      item.qty = prod.stock;
      showToast(`Stock máximo disponible alcanzado (${prod.stock} uds).`);
    }
    if (item.qty <= 0) {
      cartItems = cartItems.filter(i => i.id !== prodId);
    }
    renderCart();
  }
};

window.clearCart = function() {
  cartItems = [];
  renderCart();
  showToast('Carrito de venta vaciado.');
};

function renderCart() {
  const container = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;

  if (cartItems.length === 0) {
    container.innerHTML = `<div class="empty-cart-msg">Selecciona un producto del catálogo para agregar a la venta</div>`;
    if (subtotalEl) subtotalEl.textContent = '$ 0';
    if (totalEl) totalEl.textContent = '$ 0';
    return;
  }

  let total = 0;

  container.innerHTML = cartItems.map(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    return `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-price">$ ${Number(itemTotal).toLocaleString('es-CO')}</span>
        </div>
        <div class="cart-qty-controls">
          <button class="qty-btn" onclick="window.changeCartQty(${item.id}, -1)">-</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="window.changeCartQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = `$ ${total.toLocaleString('es-CO')}`;
  if (totalEl) totalEl.textContent = `$ ${total.toLocaleString('es-CO')}`;
}

window.processCheckout = function() {
  if (cartItems.length === 0) {
    showToast('El carrito está vacío. Agrega productos antes de procesar.', 'error');
    return;
  }

  const clientName = document.getElementById('posClientSelect').value;
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'Efectivo';

  const products = getProducts();
  cartItems.forEach(cartItem => {
    const targetProd = products.find(p => p.id === cartItem.id);
    if (targetProd) {
      targetProd.stock = Math.max(0, targetProd.stock - cartItem.qty);
    }
  });

  saveProducts(products);

  const grandTotal = cartItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
  cartItems = [];
  renderCart();
  renderPosProductsGrid();

  showToast(`¡Venta procesada con éxito! Total: $ ${grandTotal.toLocaleString('es-CO')} (${payMethod}) - Cliente: ${clientName}`);
};

function renderAllEmployeeTables() {
  renderEmpCatalogTable();
  renderEmpWarrantiesTable();
  renderEmpRepairsTable();
  renderEmpClientsTable();
}

function renderEmpCatalogTable(items = null) {
  const products = items || getProducts();
  const tbody = document.getElementById('empInventoryTableBody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay productos registrados en el catálogo</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${p.imageUrl || 'https://via.placeholder.com/34'}" alt="${p.name}" style="width:34px; height:34px; border-radius:4px; object-fit:cover;">
          <span style="font-weight:700;">${p.name}</span>
        </div>
      </td>
      <td style="color:var(--accent-cyan); font-weight:600;">${p.sku}</td>
      <td>${p.category}</td>
      <td style="font-weight:700;">$ ${Number(p.price).toLocaleString('es-CO')}</td>
      <td><span style="font-weight:700; color:${p.stock > 3 ? '#10B981' : '#EF4444'};">${p.stock} uds</span></td>
      <td><span class="insignia-estado entregado">${p.condition || 'Nuevo'}</span></td>
      <td><button class="row-more-btn" onclick="window.addToCart(${p.id}); window.switchView('pos');">➕ Vender</button></td>
    </tr>
  `).join('');
}

window.filterEmpProducts = function(term) {
  const clean = term.toLowerCase().trim();
  const filtered = getProducts().filter(p => p.name.toLowerCase().includes(clean) || p.sku.toLowerCase().includes(clean));
  renderEmpCatalogTable(filtered);
};

function renderEmpWarrantiesTable() {
  const warranties = JSON.parse(localStorage.getItem('wiiu_warranties')) || [];
  const tbody = document.getElementById('empGarantiasTableBody');
  if (!tbody) return;

  if (warranties.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay garantías registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = warranties.map(w => `
    <tr>
      <td style="color:var(--accent-blue); font-weight:700;">${w.id}</td>
      <td>${w.client}</td>
      <td>${w.product}</td>
      <td>${w.buyDate}</td>
      <td>${w.expDate}</td>
      <td><span class="insignia-estado entregado">${w.status}</span></td>
      <td><button class="row-more-btn" onclick="window.showToast('Certificado ${w.id} impreso en caja')">Imprimir</button></td>
    </tr>
  `).join('');
}

function renderEmpRepairsTable() {
  const repairs = JSON.parse(localStorage.getItem('wiiu_repairs')) || [];
  const tbody = document.getElementById('empRepairsTableBody');
  if (!tbody) return;

  if (repairs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay órdenes de taller técnico registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = repairs.map(r => `
    <tr>
      <td style="color:var(--accent-gold); font-weight:700;">${r.ticket}</td>
      <td>${r.device}</td>
      <td style="color:var(--text-secondary);">${r.defect}</td>
      <td>${r.client}</td>
      <td style="font-weight:700;">${r.price}</td>
      <td><span class="insignia-estado processing">${r.status}</span></td>
      <td><button class="row-more-btn" onclick="window.showToast('Ticket ${r.ticket} enviado a laboratorio técnico')">Enviar Taller</button></td>
    </tr>
  `).join('');
}

function renderEmpClientsTable() {
  const clients = JSON.parse(localStorage.getItem('wiiu_clients')) || [];
  const tbody = document.getElementById('empClientsTableBody');
  if (!tbody) return;

  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;">No hay clientes registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td style="font-weight:700;">${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td style="color:var(--accent-gold); font-weight:700;">${c.totalSpent}</td>
      <td><span class="insignia-estado entregado">${c.level}</span></td>
    </tr>
  `).join('');
}

window.populateClientDropdown = function (selectId = "repClient") {
  const select = document.getElementById(selectId);
  if (!select) return;

  const clients = JSON.parse(localStorage.getItem("wiiu_clients")) || [];
  let html = '<option value="">-- Seleccionar cliente contacto --</option>';

  if (clients.length > 0) {
    clients.forEach((c) => {
      html += `<option value="${c.name}">${c.name} (${c.phone || "Sin tel"})</option>`;
    });
  }
  select.innerHTML = html;
};

window.openAddWarrantyModal = function() {
  const modal = document.getElementById('modalAddWarranty');
  if (!modal) return;
  const form = modal.querySelector('form');
  if (form) form.reset();
  const dateInput = document.getElementById('warBuyDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  modal.classList.add('activo');
};

window.closeAddWarrantyModal = function() {
  const modal = document.getElementById('modalAddWarranty');
  if (modal) modal.classList.remove('activo');
};

window.saveWarranty = function(e) {
  e.preventDefault();
  const clientInput = document.getElementById('warClient');
  const productInput = document.getElementById('warProduct');
  const buyDateInput = document.getElementById('warBuyDate');
  const durationInput = document.getElementById('warDuration');

  const client = clientInput ? clientInput.value.trim() : '';
  const product = productInput ? productInput.value.trim() : '';
  const buyDate = buyDateInput && buyDateInput.value ? buyDateInput.value : new Date().toLocaleDateString('es-CO');
  const duration = durationInput ? durationInput.value : '3 Meses';

  if (!client || client.length < 3) {
    showToast('Por favor ingresa un nombre de cliente válido (mínimo 3 caracteres).', 'error');
    if (clientInput) clientInput.focus();
    return;
  }
  if (!product || product.length < 3) {
    showToast('Por favor ingresa el producto y serial correspondiente.', 'error');
    if (productInput) productInput.focus();
    return;
  }

  const warranties = JSON.parse(localStorage.getItem('wiiu_warranties')) || [];
  const newWar = {
    id: `GAR-${Math.floor(850 + Math.random() * 100)}`,
    client, product, buyDate, expDate: duration, status: 'Activa'
  };

  warranties.unshift(newWar);
  localStorage.setItem('wiiu_warranties', JSON.stringify(warranties));
  closeAddWarrantyModal();
  renderEmpWarrantiesTable();
  showToast(`¡Certificado de garantía ${newWar.id} emitido para ${client}!`);
};

window.openAddRepairModal = function() {
  const modal = document.getElementById('modalAddRepair');
  if (!modal) return;
  const form = modal.querySelector('form');
  if (form) form.reset();
  populateClientDropdown('repClient');
  modal.classList.add('activo');
};

window.closeAddRepairModal = function() {
  const modal = document.getElementById('modalAddRepair');
  if (modal) modal.classList.remove('activo');
};

window.saveRepairOrder = function(e) {
  e.preventDefault();
  const devInput = document.getElementById('repDevice');
  const defInput = document.getElementById('repDefect');
  const cliSelect = document.getElementById('repClient');
  const priceInput = document.getElementById('repPrice');

  const device = devInput ? devInput.value.trim() : '';
  const defect = defInput ? defInput.value.trim() : '';
  const client = (cliSelect && cliSelect.value) ? cliSelect.value : 'Cliente Mostrador';
  const priceVal = priceInput && priceInput.value !== '' ? parseFloat(priceInput.value) : 60000;

  if (!device || device.length < 3) {
    showToast('Por favor ingresa el dispositivo o consola defectuosa.', 'error');
    if (devInput) devInput.focus();
    return;
  }
  if (!defect || defect.length < 3) {
    showToast('Por favor detalla la falla reportada por el cliente.', 'error');
    if (defInput) defInput.focus();
    return;
  }
  if (isNaN(priceVal) || priceVal < 0) {
    showToast('El presupuesto debe ser un monto válido mayor o igual a 0.', 'error');
    if (priceInput) priceInput.focus();
    return;
  }

  const repairs = JSON.parse(localStorage.getItem('wiiu_repairs')) || [];
  const newRepair = {
    ticket: `REP-${Math.floor(105 + Math.random() * 90)}`,
    device, defect, client, price: `$ ${priceVal.toLocaleString('es-CO')}`, status: 'Ingresado en Taller'
  };

  repairs.unshift(newRepair);
  localStorage.setItem('wiiu_repairs', JSON.stringify(repairs));
  closeAddRepairModal();
  renderEmpRepairsTable();
  showToast(`¡Orden ${newRepair.ticket} recibida y asignada al taller técnico!`);
};

window.openAddClientModal = function() {
  const modal = document.getElementById('modalAddClient');
  if (!modal) return;
  const form = modal.querySelector('form');
  if (form) form.reset();
  modal.classList.add('activo');
};

window.closeAddClientModal = function() {
  const modal = document.getElementById('modalAddClient');
  if (modal) modal.classList.remove('activo');
};

window.saveClient = function(e) {
  e.preventDefault();
  const nameInput = document.getElementById('cliName');
  const phoneInput = document.getElementById('cliPhone');
  const emailInput = document.getElementById('cliEmail');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';

  if (!name || name.length < 3) {
    showToast('Por favor ingresa el nombre completo del cliente (mínimo 3 caracteres).', 'error');
    if (nameInput) nameInput.focus();
    return;
  }
  const phoneRegex = /^[0-9\+\-\s\(\)]{7,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    showToast('Ingresa un número de teléfono válido (ej: +57 300 123 4567).', 'error');
    if (phoneInput) phoneInput.focus();
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showToast('Ingresa un correo electrónico válido (ej: cliente@gmail.com).', 'error');
    if (emailInput) emailInput.focus();
    return;
  }

  const clients = JSON.parse(localStorage.getItem('wiiu_clients')) || [];
  clients.unshift({ name, phone, email, totalSpent: '$ 0', level: 'Nuevo' });
  localStorage.setItem('wiiu_clients', JSON.stringify(clients));
  closeAddClientModal();
  renderEmpClientsTable();
  showToast(`¡Cliente "${name}" registrado correctamente!`);
};

window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const infoIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono-notificacion"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toast.innerHTML = `${infoIcon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4000);
};
