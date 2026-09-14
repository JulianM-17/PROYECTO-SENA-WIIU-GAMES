/**
 * ==========================================================================
 * WIIU-GAMES - PANEL DE ADMINISTRADOR
 * Lógica e Interactividad Integral
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initPresetData();
  renderAllModules();
  initGlobalSearch();
});

/* ==========================================================================
   DATOS INICIALES Y LOCALSTORAGE
   ========================================================================== */

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'The Legend of Zelda: Breath of the Wild (Wii U)',
    category: 'Juegos Wii U',
    sku: 'WIIU-GME-001',
    price: 189900,
    costPrice: 120000,
    stock: 25,
    minStock: 5,
    condition: 'Nuevo Sellado',
    warranty: '1 Año',
    publisher: 'Nintendo',
    platform: 'Disco Físico Original',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop',
    description: 'Aventura épica de mundo abierto en Hyrule para la consola Wii U. Edición original física en caja sellada.'
  },
  {
    id: 2,
    name: 'Super Mario 3D World',
    category: 'Juegos Wii U',
    sku: 'WIIU-GME-002',
    price: 149900,
    costPrice: 90000,
    stock: 18,
    minStock: 4,
    condition: 'Usado - Excelente',
    warranty: '6 Meses',
    publisher: 'Nintendo',
    platform: 'Disco Físico Original',
    imageUrl: 'https://images.unsplash.com/photo-1612287233214-9988424269e8?w=300&h=300&fit=crop',
    description: 'Juego de plataformas multijugador cooperativo para hasta 4 jugadores con Mario gato y amigos.'
  },
  {
    id: 3,
    name: 'Mario Kart 8',
    category: 'Juegos Wii U',
    sku: 'WIIU-GME-003',
    price: 139900,
    costPrice: 85000,
    stock: 32,
    minStock: 6,
    condition: 'Nuevo Sellado',
    warranty: '1 Año',
    publisher: 'Nintendo',
    platform: 'Disco Físico Original',
    imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=300&h=300&fit=crop',
    description: 'Carreras antigravedad a toda velocidad con pistas exclusivas de Wii U y modo multijugador online.'
  },
  {
    id: 4,
    name: 'Splatoon (Wii U)',
    category: 'Juegos Wii U',
    sku: 'WIIU-GME-004',
    price: 119900,
    costPrice: 70000,
    stock: 14,
    minStock: 3,
    condition: 'Usado - Excelente',
    warranty: '3 Meses',
    publisher: 'Nintendo',
    platform: 'Disco Físico Original',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=300&fit=crop',
    description: 'Combates de tinta 4 vs 4 usando los sensores de movimiento giroscópicos del Wii U GamePad.'
  },
  {
    id: 5,
    name: 'Super Smash Bros. for Wii U',
    category: 'Juegos Wii U',
    sku: 'WIIU-GME-005',
    price: 159900,
    costPrice: 100000,
    stock: 20,
    minStock: 5,
    condition: 'Nuevo Sellado',
    warranty: '1 Año',
    publisher: 'Nintendo',
    platform: 'Disco Físico Original',
    imageUrl: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=300&h=300&fit=crop',
    description: 'El juego de peleas definitivo para 8 jugadores simultáneos con compatibilidad total de Amiibo.'
  },
  {
    id: 6,
    name: 'Consola Wii U Deluxe 32GB Black + GamePad',
    category: 'Consolas',
    sku: 'WIIU-CNS-001',
    price: 850000,
    costPrice: 620000,
    stock: 4,
    minStock: 2,
    condition: 'Reacondicionado Certificado',
    warranty: '6 Meses',
    publisher: 'Nintendo',
    platform: 'Consola Completa',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop',
    description: 'Consola Wii U Negra de 32GB con GamePad pantalla táctil, barra de sensores, cables y cargadores originales.'
  }
];

const DEFAULT_WARRANTIES = [
  { id: 'GAR-801', client: 'Juan Camilo R.', product: 'Consola Wii U 32GB (SN: GW70291823)', buyDate: '10/08/2026', expDate: '10/02/2027', status: 'Activa' },
  { id: 'GAR-802', client: 'Andrés Felipe G.', product: 'Zelda Breath of the Wild (WIIU-GME-001)', buyDate: '01/09/2026', expDate: '01/09/2027', status: 'Activa' },
  { id: 'GAR-803', client: 'María Fernanda T.', product: 'Wii U GamePad Touch Screen (SN: GP481029)', buyDate: '15/05/2026', expDate: '15/11/2026', status: 'En Revisión' },
  { id: 'GAR-804', client: 'Carlos Mario V.', product: 'Mario Kart 8 Wii U', buyDate: '12/01/2026', expDate: '12/07/2026', status: 'Expirada' }
];

const DEFAULT_MAINTENANCE = [
  { order: 'MNT-401', equipment: 'Wii U Deluxe Black 32GB', client: 'Juan Camilo R.', tech: 'Téc. Sebastián M.', cost: '$ 65.000', status: 'En Taller' },
  { order: 'MNT-402', equipment: 'GamePad Wii U (Calibración)', client: 'Laura Sofía M.', tech: 'Téc. David R.', cost: '$ 45.000', status: 'Listo para Entrega' },
  { order: 'MNT-403', equipment: 'Lector Óptico Láser Wii U', client: 'Diego Alejandro P.', tech: 'Téc. Sebastián M.', cost: '$ 80.000', status: 'En Diagnóstico' }
];

const DEFAULT_REPAIRS = [
  { ticket: 'REP-101', device: 'Wii U GamePad', defect: 'Cambio de pantalla LCD y táctil digitalizador', client: 'Andrés Felipe G.', price: '$ 150.000', status: 'En Reparación' },
  { ticket: 'REP-102', device: 'Consola Wii U', defect: 'Error de memoria NAND / Pantalla azul', client: 'Santiago H.', price: '$ 180.000', status: 'En Espera de Repuesto' },
  { ticket: 'REP-103', device: 'Control Wii U Pro', defect: 'Cambio de palanca joystick analógico izquierdo', client: 'Valentina O.', price: '$ 45.000', status: 'Completada' }
];

const DEFAULT_DISCOUNTS = [
  { code: 'WIIU-VERANO20', desc: '20% OFF en todos los juegos físicos de Wii U', percent: '20%', expires: '30/09/2026', uses: '45 / 100', status: 'Activo' },
  { code: 'NINTENDO-VIP', desc: '15% OFF para clientes frecuentes en consolas y repuestos', percent: '15%', expires: '31/12/2026', uses: '12 / 50', status: 'Activo' },
  { code: 'RETRO-FLASH', desc: 'Rebaja especial fin de semana', percent: '10%', expires: '15/09/2026', uses: '50 / 50', status: 'Agotado' }
];

const DEFAULT_REVIEWS = [
  { name: 'Camilo Restrepo', stars: '★★★★★', product: 'Zelda BOTW Wii U', comment: 'Llegó en perfecto estado, el disco impecable y la caja sellada. La mejor compra para revivir la Wii U.' },
  { name: 'Natalia Gómez', stars: '★★★★★', product: 'Reparación GamePad', comment: 'Excelente servicio técnico. Arreglaron la pantalla de mi GamePad en menos de 2 días y quedó como nueva.' },
  { name: 'Julián Mendoza', stars: '★★★★☆', product: 'Super Mario 3D World', comment: 'Muy buen juego y entrega rápida. Recomendada 100% esta tienda.' },
  { name: 'Alejandro Cruz', stars: '★★★★★', product: 'Consola Wii U Deluxe', comment: 'La consola llegó con todos sus cables, impecable y funcionando a la perfección. Gran atención.' }
];

const DEFAULT_CLIENTS = [
  { name: 'Juan Camilo R.', phone: '+57 312 456 7890', email: 'camilo.r@gmail.com', totalSpent: '$ 1.250.000', lastVisit: 'Hoy, 14:20', level: 'VIP Gamer' },
  { name: 'María Fernanda T.', phone: '+57 315 987 6543', email: 'mafe.t@hotmail.com', totalSpent: '$ 680.000', lastVisit: 'Ayer, 18:45', level: 'Frecuente' },
  { name: 'Andrés Felipe G.', phone: '+57 320 112 2334', email: 'andres.fg@gmail.com', totalSpent: '$ 890.000', lastVisit: 'Hace 3 días', level: 'VIP Gamer' },
  { name: 'Laura Sofía M.', phone: '+57 301 555 4433', email: 'laura.m@yahoo.com', totalSpent: '$ 320.000', lastVisit: '10 Sep 2026', level: 'Nuevo' }
];

// Inicializar almacenamiento
function initPresetData() {
  if (!localStorage.getItem('wiiu_products')) {
    localStorage.setItem('wiiu_products', JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem('wiiu_warranties')) {
    localStorage.setItem('wiiu_warranties', JSON.stringify(DEFAULT_WARRANTIES));
  }
  if (!localStorage.getItem('wiiu_maintenance')) {
    localStorage.setItem('wiiu_maintenance', JSON.stringify(DEFAULT_MAINTENANCE));
  }
  if (!localStorage.getItem('wiiu_repairs')) {
    localStorage.setItem('wiiu_repairs', JSON.stringify(DEFAULT_REPAIRS));
  }
  if (!localStorage.getItem('wiiu_discounts')) {
    localStorage.setItem('wiiu_discounts', JSON.stringify(DEFAULT_DISCOUNTS));
  }
}

function getProducts() {
  return JSON.parse(localStorage.getItem('wiiu_products')) || DEFAULT_PRODUCTS;
}

function saveProductsList(products) {
  localStorage.setItem('wiiu_products', JSON.stringify(products));
}

/* ==========================================================================
   SISTEMA DE NAVEGACIÓN ENTRE SECCIONES
   ========================================================================== */

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });
}

window.switchView = function(viewKey) {
  // Cambiar botones activos en el sidebar
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-view') === viewKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Ocultar todas las secciones y mostrar la elegida
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => sec.classList.remove('active-view'));

  const targetSection = document.getElementById(`view-${viewKey}`);
  if (targetSection) {
    targetSection.classList.add('active-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Refrescar datos según la vista
  if (viewKey === 'inventario') {
    renderInventoryTable();
  } else if (viewKey === 'garantias') {
    renderWarrantiesTable();
  } else if (viewKey === 'mantenimientos') {
    renderMaintenanceTable();
  } else if (viewKey === 'reparacion') {
    renderRepairsTable();
  } else if (viewKey === 'descuentos') {
    renderDiscountsTable();
  } else if (viewKey === 'reseñas') {
    renderReviewsGrid();
  } else if (viewKey === 'clientes') {
    renderClientsTable();
  }
};

/* ==========================================================================
   RENDERIZADO DE MÓDULOS
   ========================================================================== */

function renderAllModules() {
  renderInventoryTable();
  renderWarrantiesTable();
  renderMaintenanceTable();
  renderRepairsTable();
  renderDiscountsTable();
  renderReviewsGrid();
  renderClientsTable();
}

// 1. INVENTARIO
function renderInventoryTable(itemsToRender = null) {
  const products = itemsToRender || getProducts();
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  // Actualizar contadores de inventario
  const totalStockCount = products.length;
  let totalStockVal = 0;
  let lowStockCount = 0;

  products.forEach(p => {
    totalStockVal += (p.price * p.stock);
    if (p.stock <= (p.minStock || 3)) {
      lowStockCount++;
    }
  });

  const countEl = document.getElementById('invTotalCount');
  const valEl = document.getElementById('invTotalValue');
  const lowEl = document.getElementById('invLowStock');

  if (countEl) countEl.textContent = `${totalStockCount} items`;
  if (valEl) valEl.textContent = `$ ${totalStockVal.toLocaleString('es-CO')}`;
  if (lowEl) lowEl.textContent = `${lowStockCount} alertas`;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No se encontraron productos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(prod => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${prod.imageUrl || 'https://via.placeholder.com/40'}" alt="${prod.name}" style="width: 38px; height: 38px; border-radius: 6px; object-fit: cover; background: #0E1834;" onerror="this.src='https://via.placeholder.com/40/0E214D/00D2FF?text=Game'">
          <div>
            <div style="font-weight: 700; color: #FFFFFF; font-size: 0.88rem;">${prod.name}</div>
            <div style="font-size: 0.74rem; color: var(--text-secondary);">${prod.platform || 'Original'}</div>
          </div>
        </div>
      </td>
      <td style="color: var(--accent-cyan); font-weight: 600; font-size: 0.82rem;">${prod.sku}</td>
      <td><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 0.78rem;">${prod.category}</span></td>
      <td style="font-weight: 700; color: #FFFFFF;">$ ${Number(prod.price).toLocaleString('es-CO')}</td>
      <td>
        <span style="font-weight: 700; color: ${prod.stock <= (prod.minStock || 3) ? '#EF4444' : '#10B981'};">
          ${prod.stock} uds
        </span>
      </td>
      <td style="font-size: 0.8rem; color: var(--text-secondary);">${prod.warranty || '3 Meses'}</td>
      <td>
        <span class="badge-status ${prod.condition === 'Nuevo Sellado' ? 'delivered' : 'shipping'}">${prod.condition}</span>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button style="background:none; border:none; color: var(--accent-gold); cursor:pointer; font-size: 1rem;" title="Editar producto" onclick="window.editProduct(${prod.id})">✏️</button>
          <button style="background:none; border:none; color: var(--accent-red); cursor:pointer; font-size: 1rem;" title="Eliminar producto" onclick="window.deleteProduct(${prod.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// 2. GARANTÍAS
function renderWarrantiesTable(items = null) {
  const warranties = items || JSON.parse(localStorage.getItem('wiiu_warranties')) || DEFAULT_WARRANTIES;
  const tbody = document.getElementById('garantiasTableBody');
  if (!tbody) return;

  tbody.innerHTML = warranties.map(w => `
    <tr>
      <td style="color: var(--accent-blue); font-weight: 700;">${w.id}</td>
      <td style="font-weight: 600;">${w.client}</td>
      <td>${w.product}</td>
      <td>${w.buyDate}</td>
      <td>${w.expDate}</td>
      <td>
        <span class="badge-status ${w.status === 'Activa' ? 'delivered' : (w.status === 'En Revisión' ? 'shipping' : 'warning')}">
          ${w.status}
        </span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Garantía ${w.id} consultada correctamente')">Ver certificado</button>
      </td>
    </tr>
  `).join('');
}

// 3. MANTENIMIENTOS
function renderMaintenanceTable() {
  const list = JSON.parse(localStorage.getItem('wiiu_maintenance')) || DEFAULT_MAINTENANCE;
  const tbody = document.getElementById('mantenimientosTableBody');
  if (!tbody) return;

  tbody.innerHTML = list.map(m => `
    <tr>
      <td style="color: var(--accent-gold); font-weight: 700;">${m.order}</td>
      <td style="font-weight: 600;">${m.equipment}</td>
      <td>${m.client}</td>
      <td style="color: var(--accent-cyan);">${m.tech}</td>
      <td style="font-weight: 700;">${m.cost}</td>
      <td>
        <span class="badge-status ${m.status === 'Listo para Entrega' ? 'delivered' : (m.status === 'En Taller' ? 'shipping' : 'processing')}">
          ${m.status}
        </span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Orden ${m.order} actualizada')">Detalles</button>
      </td>
    </tr>
  `).join('');
}

// 4. REPARACIONES
function renderRepairsTable() {
  const list = JSON.parse(localStorage.getItem('wiiu_repairs')) || DEFAULT_REPAIRS;
  const tbody = document.getElementById('reparacionesTableBody');
  if (!tbody) return;

  tbody.innerHTML = list.map(r => `
    <tr>
      <td style="color: var(--accent-blue); font-weight: 700;">${r.ticket}</td>
      <td style="font-weight: 600;">${r.device}</td>
      <td style="color: var(--text-secondary); max-width: 250px;">${r.defect}</td>
      <td>${r.client}</td>
      <td style="font-weight: 700; color: #FFFFFF;">${r.price}</td>
      <td>
        <span class="badge-status ${r.status === 'Completada' ? 'delivered' : (r.status === 'En Reparación' ? 'processing' : 'warning')}">
          ${r.status}
        </span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Ticket ${r.ticket} en seguimiento')">Estado</button>
      </td>
    </tr>
  `).join('');
}

// 5. DESCUENTOS
function renderDiscountsTable() {
  const list = JSON.parse(localStorage.getItem('wiiu_discounts')) || DEFAULT_DISCOUNTS;
  const tbody = document.getElementById('descuentosTableBody');
  if (!tbody) return;

  tbody.innerHTML = list.map(d => `
    <tr>
      <td style="color: var(--accent-gold); font-weight: 800; letter-spacing: 0.05em;">${d.code}</td>
      <td>${d.desc}</td>
      <td style="font-weight: 700; color: var(--accent-cyan);">${d.percent}</td>
      <td>${d.expires}</td>
      <td>${d.uses}</td>
      <td>
        <span class="badge-status ${d.status === 'Activo' ? 'delivered' : 'warning'}">${d.status}</span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Cupón ${d.code} copiado al portapapeles')">Copiar</button>
      </td>
    </tr>
  `).join('');
}

// 6. RESEÑAS
function renderReviewsGrid() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  grid.innerHTML = DEFAULT_REVIEWS.map(rev => `
    <div class="review-card">
      <div class="review-header">
        <span class="reviewer-name">${rev.name}</span>
        <span class="review-stars">${rev.stars}</span>
      </div>
      <p class="review-comment">"${rev.comment}"</p>
      <div class="review-product-tag">🎮 ${rev.product}</div>
    </div>
  `).join('');
}

// 7. CLIENTES
function renderClientsTable() {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;

  tbody.innerHTML = DEFAULT_CLIENTS.map(c => `
    <tr>
      <td style="font-weight: 700; color: #FFFFFF;">${c.name}</td>
      <td>${c.phone}</td>
      <td style="color: var(--text-secondary);">${c.email}</td>
      <td style="font-weight: 700; color: var(--accent-gold);">${c.totalSpent}</td>
      <td>${c.lastVisit}</td>
      <td><span class="badge-status delivered">${c.level}</span></td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Historial del cliente: ${c.name}')">Historial</button>
      </td>
    </tr>
  `).join('');
}

/* ==========================================================================
   MODAL: AGREGAR PRODUCTO CON TODOS SUS DETALLES
   ========================================================================== */

window.openAddProductModal = function() {
  const modal = document.getElementById('modalAddProduct');
  if (!modal) return;

  // Limpiar y preparar formulario
  document.getElementById('formAddProduct').reset();
  document.getElementById('imagePreview').src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop';
  document.getElementById('previewCategoryBadge').textContent = 'Juegos Wii U';
  window.generateRandomSKU();

  modal.classList.add('active');
};

window.closeAddProductModal = function() {
  const modal = document.getElementById('modalAddProduct');
  if (modal) modal.classList.remove('active');
};

// Generador de SKU aleatorio
window.generateRandomSKU = function() {
  const cat = document.getElementById('prodCategory')?.value || 'Juegos';
  let prefix = 'WIIU-GME';
  if (cat.includes('Consola')) prefix = 'WIIU-CNS';
  else if (cat.includes('Accesorio')) prefix = 'WIIU-ACC';
  else if (cat.includes('Repuesto')) prefix = 'WIIU-RPT';
  else if (cat.includes('Coleccionable')) prefix = 'WIIU-AMB';

  const randomNum = Math.floor(100 + Math.random() * 900);
  const skuInput = document.getElementById('prodSKU');
  if (skuInput) skuInput.value = `${prefix}-${randomNum}`;
};

// Portadas oficiales sugeridas
const PRESET_COVERS = {
  zelda: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop',
  mario: 'https://images.unsplash.com/photo-1612287233214-9988424269e8?w=300&h=300&fit=crop',
  mariokart: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=300&h=300&fit=crop',
  splatoon: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=300&fit=crop',
  smash: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=300&h=300&fit=crop',
  gamepad: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=300&h=300&fit=crop'
};

window.setPresetCover = function(key) {
  const url = PRESET_COVERS[key] || PRESET_COVERS.zelda;
  const urlInput = document.getElementById('prodImageUrl');
  if (urlInput) urlInput.value = url;
  previewProductImage(url);
};

window.previewProductImage = function(url) {
  const img = document.getElementById('imagePreview');
  if (!img) return;
  if (url && url.trim() !== '') {
    img.src = url;
  } else {
    img.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop';
  }
};

// Guardar nuevo producto
window.saveProduct = function(event) {
  event.preventDefault();

  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const sku = document.getElementById('prodSKU').value.trim();
  const publisher = document.getElementById('prodPublisher').value.trim() || 'Nintendo';
  const platform = document.getElementById('prodPlatform').value;
  const price = parseFloat(document.getElementById('prodPrice').value) || 0;
  const costPrice = parseFloat(document.getElementById('prodCostPrice').value) || (price * 0.6);
  const stock = parseInt(document.getElementById('prodStock').value) || 0;
  const minStock = parseInt(document.getElementById('prodMinStock').value) || 2;
  const condition = document.getElementById('prodCondition').value;
  const warranty = document.getElementById('prodWarranty').value;
  const imageUrl = document.getElementById('prodImageUrl').value.trim() || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop';
  const description = document.getElementById('prodDescription').value.trim();

  if (!name || !sku || price <= 0 || stock < 0) {
    showToast('Por favor completa todos los campos requeridos correctamente.', 'error');
    return;
  }

  const products = getProducts();
  const newProduct = {
    id: Date.now(),
    name,
    category,
    sku,
    publisher,
    platform,
    price,
    costPrice,
    stock,
    minStock,
    condition,
    warranty,
    imageUrl,
    description
  };

  products.unshift(newProduct);
  saveProductsList(products);

  // Cerrar modal y notificar
  closeAddProductModal();
  renderInventoryTable();
  showToast(`¡Producto "${name}" agregado con éxito al inventario!`);
};

// Eliminar producto
window.deleteProduct = function(id) {
  if (confirm('¿Estás seguro de que deseas eliminar este producto del inventario?')) {
    let products = getProducts();
    products = products.filter(p => p.id !== id);
    saveProductsList(products);
    renderInventoryTable();
    showToast('Producto eliminado del inventario.');
  }
};

// Editar producto
window.editProduct = function(id) {
  const products = getProducts();
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  openAddProductModal();
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodCategory').value = prod.category;
  document.getElementById('prodSKU').value = prod.sku;
  document.getElementById('prodPublisher').value = prod.publisher || '';
  document.getElementById('prodPlatform').value = prod.platform || 'Disco Físico Original';
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodCostPrice').value = prod.costPrice || '';
  document.getElementById('prodStock').value = prod.stock;
  document.getElementById('prodMinStock').value = prod.minStock || 2;
  document.getElementById('prodCondition').value = prod.condition;
  document.getElementById('prodWarranty').value = prod.warranty || '3 Meses';
  document.getElementById('prodImageUrl').value = prod.imageUrl;
  document.getElementById('prodDescription').value = prod.description || '';
  previewProductImage(prod.imageUrl);

  // Al guardar se reemplazará
  products.splice(products.findIndex(p => p.id === id), 1);
  saveProductsList(products);
};

/* ==========================================================================
   MODAL DE DESCUENTOS Y ACCIONES RÁPIDAS
   ========================================================================== */

window.openDiscountModal = function() {
  const modal = document.getElementById('modalDiscount');
  if (modal) {
    document.getElementById('formDiscount').reset();
    modal.classList.add('active');
  }
};

window.closeDiscountModal = function() {
  const modal = document.getElementById('modalDiscount');
  if (modal) modal.classList.remove('active');
};

window.saveDiscount = function(e) {
  e.preventDefault();
  const code = document.getElementById('discCode').value.toUpperCase().trim();
  const percent = document.getElementById('discPercent').value + '%';
  const limit = document.getElementById('discLimit').value;
  const desc = document.getElementById('discDesc').value.trim();

  const discounts = JSON.parse(localStorage.getItem('wiiu_discounts')) || DEFAULT_DISCOUNTS;
  discounts.unshift({
    code,
    desc,
    percent,
    expires: '31/12/2026',
    uses: `0 / ${limit}`,
    status: 'Activo'
  });

  localStorage.setItem('wiiu_discounts', JSON.stringify(discounts));
  closeDiscountModal();
  renderDiscountsTable();
  showToast(`¡Cupón de descuento "${code}" activado!`);
};

window.exportFullReport = function() {
  showToast('Generando reporte consolidado de ventas y taller...');
  setTimeout(() => {
    const reportData = {
      tienda: 'WiiU-Games',
      fecha: new Date().toLocaleDateString('es-CO'),
      ventasTotales: '$ 24.850.000',
      pedidosSemana: 512,
      clientesNuevos: 128,
      tasaConversion: '3.48%',
      inventarioTotal: getProducts().length,
      utilidadNeta: '$ 17.600.000'
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_WiiUGames_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Reporte descargado exitosamente.');
  }, 800);
};

/* ==========================================================================
   BÚSQUEDAS Y FILTROS DINÁMICOS
   ========================================================================== */

function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  if (!input) return;

  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (term === '') return;

    // Si coincide con inventario, buscar y cambiar vista
    const products = getProducts();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) || 
      p.category.toLowerCase().includes(term)
    );

    if (filtered.length > 0 && !document.getElementById('view-inventario').classList.contains('active-view')) {
      switchView('inventario');
      renderInventoryTable(filtered);
    }
  });
}

window.filterProducts = function(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  const products = getProducts();
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(term) || 
    p.sku.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  );
  renderInventoryTable(filtered);
};

window.filterProductsByCategory = function(category) {
  const products = getProducts();
  if (category === 'todos') {
    renderInventoryTable(products);
  } else {
    const filtered = products.filter(p => p.category === category);
    renderInventoryTable(filtered);
  }
};

window.filterWarranties = function(term) {
  const warranties = JSON.parse(localStorage.getItem('wiiu_warranties')) || DEFAULT_WARRANTIES;
  const filtered = warranties.filter(w => 
    w.client.toLowerCase().includes(term.toLowerCase()) || 
    w.product.toLowerCase().includes(term.toLowerCase()) || 
    w.id.toLowerCase().includes(term.toLowerCase())
  );
  renderWarrantiesTable(filtered);
};

window.filterWarrantiesByStatus = function(status) {
  const warranties = JSON.parse(localStorage.getItem('wiiu_warranties')) || DEFAULT_WARRANTIES;
  if (status === 'todos') {
    renderWarrantiesTable(warranties);
  } else {
    const filtered = warranties.filter(w => w.status === status);
    renderWarrantiesTable(filtered);
  }
};

/* ==========================================================================
   SISTEMA DE TOAST NOTIFICATIONS
   ========================================================================== */

window.showToast = function(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>🎮</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 4000);
};
