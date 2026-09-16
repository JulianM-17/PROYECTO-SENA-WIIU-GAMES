/**
 * ==========================================================================
 * WIIU-GAMES - PANEL DE EMPLEADO (SCRIPT PRINCIPAL DE CAJA Y ATENCIÓN)
 * Conectado en tiempo real con la base de datos compartida (localStorage)
 * ==========================================================================
 */

let cartItems = [];

document.addEventListener('DOMContentLoaded', () => {
  initPresetData();
  initNavigation();
  renderPosProductsGrid();
  renderCart();
  renderAllEmployeeTables();
});

/* ==========================================================================
   1. BASE DE DATOS Y COMPARTICIÓN CON EL ADMINISTRADOR
   ========================================================================== */

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'The Legend of Zelda: Breath of the Wild (Wii U)', category: 'Juegos Wii U', sku: 'WIIU-GME-001', price: 189900, stock: 25, condition: 'Nuevo Sellado', imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop' },
  { id: 2, name: 'Super Mario 3D World', category: 'Juegos Wii U', sku: 'WIIU-GME-002', price: 149900, stock: 18, condition: 'Usado - Excelente', imageUrl: 'https://images.unsplash.com/photo-1612287233214-9988424269e8?w=300&h=300&fit=crop' },
  { id: 3, name: 'Mario Kart 8', category: 'Juegos Wii U', sku: 'WIIU-GME-003', price: 139900, stock: 32, condition: 'Nuevo Sellado', imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=300&h=300&fit=crop' },
  { id: 4, name: 'Splatoon (Wii U)', category: 'Juegos Wii U', sku: 'WIIU-GME-004', price: 119900, stock: 14, condition: 'Usado - Excelente', imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=300&fit=crop' },
  { id: 5, name: 'Super Smash Bros. for Wii U', category: 'Juegos Wii U', sku: 'WIIU-GME-005', price: 159900, stock: 20, condition: 'Nuevo Sellado', imageUrl: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=300&h=300&fit=crop' },
  { id: 6, name: 'Consola Wii U Deluxe 32GB Black + GamePad', category: 'Consolas', sku: 'WIIU-CNS-001', price: 850000, stock: 4, condition: 'Reacondicionado Certificado', imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop' }
];

const DEFAULT_WARRANTIES = [
  { id: 'GAR-801', client: 'Juan Camilo R.', product: 'Consola Wii U 32GB (SN: GW70291823)', buyDate: '10/08/2026', expDate: '10/02/2027', status: 'Activa' },
  { id: 'GAR-802', client: 'Andrés Felipe G.', product: 'Zelda Breath of the Wild (WIIU-GME-001)', buyDate: '01/09/2026', expDate: '01/09/2027', status: 'Activa' }
];

const DEFAULT_REPAIRS = [
  { ticket: 'REP-101', device: 'Wii U GamePad', defect: 'Cambio de pantalla LCD y táctil', client: 'Andrés Felipe G.', price: '$ 150.000', status: 'En Reparación' }
];

const DEFAULT_CLIENTS = [
  { name: 'Juan Camilo R.', phone: '+57 312 456 7890', email: 'camilo.r@gmail.com', totalSpent: '$ 1.250.000', level: 'VIP Gamer' },
  { name: 'María Fernanda T.', phone: '+57 315 987 6543', email: 'mafe.t@hotmail.com', totalSpent: '$ 680.000', level: 'Frecuente' }
];

function initPresetData() {
  if (!localStorage.getItem('wiiu_products')) localStorage.setItem('wiiu_products', JSON.stringify(DEFAULT_PRODUCTS));
  if (!localStorage.getItem('wiiu_warranties')) localStorage.setItem('wiiu_warranties', JSON.stringify(DEFAULT_WARRANTIES));
  if (!localStorage.getItem('wiiu_repairs')) localStorage.setItem('wiiu_repairs', JSON.stringify(DEFAULT_REPAIRS));
  if (!localStorage.getItem('wiiu_clients')) localStorage.setItem('wiiu_clients', JSON.stringify(DEFAULT_CLIENTS));
}

function getProducts() {
  return JSON.parse(localStorage.getItem('wiiu_products')) || DEFAULT_PRODUCTS;
}

function saveProducts(products) {
  localStorage.setItem('wiiu_products', JSON.stringify(products));
}

/* ==========================================================================
   2. SISTEMA DE NAVEGACIÓN
   ========================================================================== */

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });
}

window.switchView = function(viewKey) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewKey);
  });

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active-view'));

  const target = document.getElementById(`view-${viewKey}`);
  if (target) {
    target.classList.add('active-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (viewKey === 'pos') renderPosProductsGrid();
  else if (viewKey === 'catalogo') renderEmpCatalogTable();
  else if (viewKey === 'garantias') renderEmpWarrantiesTable();
  else if (viewKey === 'taller') renderEmpRepairsTable();
  else if (viewKey === 'clientes') renderEmpClientsTable();
};

/* ==========================================================================
   3. PUNTO DE VENTA (POS CAJA) Y CARRITO
   ========================================================================== */

function renderPosProductsGrid(items = null) {
  const products = items || getProducts();
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;

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
  if (cat === 'todos') renderPosProductsGrid(products);
  else renderPosProductsGrid(products.filter(p => p.category === cat));
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

// Procesar Cobro de Venta en Caja
window.processCheckout = function() {
  if (cartItems.length === 0) {
    showToast('El carrito está vacío. Agrega productos antes de procesar.', 'error');
    return;
  }

  const clientName = document.getElementById('posClientSelect').value;
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'Efectivo';

  // Descontar existencias en stock de localStorage
  const products = getProducts();
  cartItems.forEach(cartItem => {
    const targetProd = products.find(p => p.id === cartItem.id);
    if (targetProd) {
      targetProd.stock = Math.max(0, targetProd.stock - cartItem.qty);
    }
  });

  saveProducts(products);

  let grandTotal = cartItems.reduce((acc, i) => acc + (i.price * i.qty), 0);

  // Vaciar carrito y actualizar vista
  cartItems = [];
  renderCart();
  renderPosProductsGrid();

  showToast(`¡Venta procesada con éxito! Total: $ ${grandTotal.toLocaleString('es-CO')} (${payMethod}) - Cliente: ${clientName}`);
};

/* ==========================================================================
   4. RENDERIZADO DE MÓDULOS OPERATIVOS
   ========================================================================== */

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

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.imageUrl}" alt="${p.name}" style="width:34px;height:34px;border-radius:4px;object-fit:cover;">
          <span style="font-weight:700;">${p.name}</span>
        </div>
      </td>
      <td style="color:var(--accent-cyan); font-weight:600;">${p.sku}</td>
      <td>${p.category}</td>
      <td style="font-weight:700;">$ ${Number(p.price).toLocaleString('es-CO')}</td>
      <td><span style="font-weight:700; color:${p.stock > 3 ? '#10B981' : '#EF4444'};">${p.stock} uds</span></td>
      <td><span class="badge-status delivered">${p.condition || 'Nuevo'}</span></td>
      <td><button class="row-more-btn" onclick="window.addToCart(${p.id}); window.switchView('pos');">➕ Vender</button></td>
    </tr>
  `).join('');
}

window.filterEmpProducts = function(term) {
  const filtered = getProducts().filter(p => p.name.toLowerCase().includes(term.toLowerCase()) || p.sku.toLowerCase().includes(term.toLowerCase()));
  renderEmpCatalogTable(filtered);
};

function renderEmpWarrantiesTable() {
  const warranties = JSON.parse(localStorage.getItem('wiiu_warranties')) || DEFAULT_WARRANTIES;
  const tbody = document.getElementById('empGarantiasTableBody');
  if (!tbody) return;

  tbody.innerHTML = warranties.map(w => `
    <tr>
      <td style="color:var(--accent-blue); font-weight:700;">${w.id}</td>
      <td>${w.client}</td>
      <td>${w.product}</td>
      <td>${w.buyDate}</td>
      <td>${w.expDate}</td>
      <td><span class="badge-status delivered">${w.status}</span></td>
      <td><button class="row-more-btn" onclick="window.showToast('Certificado ${w.id} impreso en caja')">Imprimir</button></td>
    </tr>
  `).join('');
}

function renderEmpRepairsTable() {
  const repairs = JSON.parse(localStorage.getItem('wiiu_repairs')) || DEFAULT_REPAIRS;
  const tbody = document.getElementById('empRepairsTableBody');
  if (!tbody) return;

  tbody.innerHTML = repairs.map(r => `
    <tr>
      <td style="color:var(--accent-gold); font-weight:700;">${r.ticket}</td>
      <td>${r.device}</td>
      <td style="color:var(--text-secondary);">${r.defect}</td>
      <td>${r.client}</td>
      <td style="font-weight:700;">${r.price}</td>
      <td><span class="badge-status processing">${r.status}</span></td>
      <td><button class="row-more-btn" onclick="window.showToast('Ticket ${r.ticket} enviado a laboratorio técnico')">Enviar Taller</button></td>
    </tr>
  `).join('');
}

function renderEmpClientsTable() {
  const clients = JSON.parse(localStorage.getItem('wiiu_clients')) || DEFAULT_CLIENTS;
  const tbody = document.getElementById('empClientsTableBody');
  if (!tbody) return;

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td style="font-weight:700;">${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td style="color:var(--accent-gold); font-weight:700;">${c.totalSpent}</td>
      <td><span class="badge-status delivered">${c.level}</span></td>
    </tr>
  `).join('');
}

/* ==========================================================================
   5. MODALES Y REGISTROS DE EMPLEADO
   ========================================================================== */

// Modal Garantía
window.openAddWarrantyModal = function() {
  const modal = document.getElementById('modalAddWarranty');
  if (modal) modal.classList.add('active');
};
window.closeAddWarrantyModal = function() {
  const modal = document.getElementById('modalAddWarranty');
  if (modal) modal.classList.remove('active');
};

window.saveWarranty = function(e) {
  e.preventDefault();
  const client = document.getElementById('warClient').value.trim();
  const product = document.getElementById('warProduct').value.trim();
  const duration = document.getElementById('warDuration').value;

  const warranties = JSON.parse(localStorage.getItem('wiiu_warranties')) || DEFAULT_WARRANTIES;
  const newWar = {
    id: `GAR-${Math.floor(850 + Math.random() * 100)}`,
    client, product, buyDate: new Date().toLocaleDateString('es-CO'), expDate: duration, status: 'Activa'
  };

  warranties.unshift(newWar);
  localStorage.setItem('wiiu_warranties', JSON.stringify(warranties));
  closeAddWarrantyModal();
  renderEmpWarrantiesTable();
  showToast(`¡Certificado de garantía ${newWar.id} emitido para ${client}!`);
};

// Modal Reparación Taller
window.openAddRepairModal = function() {
  const modal = document.getElementById('modalAddRepair');
  if (modal) modal.classList.add('active');
};
window.closeAddRepairModal = function() {
  const modal = document.getElementById('modalAddRepair');
  if (modal) modal.classList.remove('active');
};

window.saveRepairOrder = function(e) {
  e.preventDefault();
  const device = document.getElementById('repDevice').value.trim();
  const defect = document.getElementById('repDefect').value.trim();
  const client = document.getElementById('repClient').value.trim();
  const price = document.getElementById('repPrice').value.trim() || '$ 60.000';

  const repairs = JSON.parse(localStorage.getItem('wiiu_repairs')) || DEFAULT_REPAIRS;
  const newRepair = {
    ticket: `REP-${Math.floor(105 + Math.random() * 90)}`,
    device, defect, client, price, status: 'Ingresado en Taller'
  };

  repairs.unshift(newRepair);
  localStorage.setItem('wiiu_repairs', JSON.stringify(repairs));
  closeAddRepairModal();
  renderEmpRepairsTable();
  showToast(`¡Orden ${newRepair.ticket} recibida y asignada al taller técnico!`);
};

// Modal Cliente
window.openAddClientModal = function() {
  const modal = document.getElementById('modalAddClient');
  if (modal) modal.classList.add('active');
};
window.closeAddClientModal = function() {
  const modal = document.getElementById('modalAddClient');
  if (modal) modal.classList.remove('active');
};

window.saveClient = function(e) {
  e.preventDefault();
  const name = document.getElementById('cliName').value.trim();
  const phone = document.getElementById('cliPhone').value.trim() || 'Sin teléfono';
  const email = document.getElementById('cliEmail').value.trim() || 'Sin correo';

  const clients = JSON.parse(localStorage.getItem('wiiu_clients')) || DEFAULT_CLIENTS;
  clients.unshift({ name, phone, email, totalSpent: '$ 0', level: 'Nuevo' });
  localStorage.setItem('wiiu_clients', JSON.stringify(clients));
  closeAddClientModal();
  renderEmpClientsTable();
  showToast(`¡Cliente "${name}" registrado correctamente!`);
};

/* ==========================================================================
   6. SISTEMA DE TOASTS
   ========================================================================== */

window.showToast = function(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const infoIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${infoIcon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4000);
};
