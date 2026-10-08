let adminDashboardData = null;

document.addEventListener("DOMContentLoaded", async () => {
  initPresetData();
  initNavigation();
  initUserProfileMenu();
  initAdminSessionData();
  initDashboardFilters();
  initNonNegativeStockInput();
  await loadAdminDashboardData();
  renderAllModules();
  initGlobalSearch();
});

async function loadAdminDashboardData() {
  try {
    const response = await fetch("http://localhost:3000/api/dashboard/admin");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.ok)
      throw new Error(data.message || "Error al cargar el dashboard");

    adminDashboardData = data;

    const inventory = (Array.isArray(data.inventory) ? data.inventory : []).map(
      (item) => ({
        ...item,
        condition: item.productCondition || item.condition || "Nuevo Sellado",
        name: item.name || item.nombre,
        price: Number(item.price || 0),
        stock: Number(item.stock || 0),
        minStock: Number(item.minStock || 3),
      }),
    );

    const maintenance = (
      Array.isArray(data.maintenance) ? data.maintenance : []
    ).map((item) => ({
      ...item,
      order: item.maintenanceOrder || item.order || "MNT-0",
    }));

    const discounts = (Array.isArray(data.discounts) ? data.discounts : []).map(
      (item) => ({
        ...item,
        desc: item.discountDescription || item.desc || "Descuento",
        percent: item.percent || "0%",
      }),
    );

    const dashboardPayload = {
      wiiu_products: inventory,
      wiiu_clients: Array.isArray(data.clients) ? data.clients : [],
      wiiu_warranties: Array.isArray(data.warranties) ? data.warranties : [],
      wiiu_maintenance: maintenance,
      wiiu_repairs: Array.isArray(data.repairs) ? data.repairs : [],
      wiiu_discounts: discounts,
      wiiu_reviews: Array.isArray(data.reviews) ? data.reviews : [],
    };

    Object.entries(dashboardPayload).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  } catch (error) {
    adminDashboardData = null;
    [
      "wiiu_products",
      "wiiu_clients",
      "wiiu_warranties",
      "wiiu_maintenance",
      "wiiu_repairs",
      "wiiu_discounts",
      "wiiu_reviews",
    ].forEach((key) => localStorage.setItem(key, "[]"));
    console.warn(
      "No se pudo cargar el dashboard real desde la API:",
      error.message,
    );
  }
}

function initAdminSessionData() {
  const usuario = JSON.parse(
    sessionStorage.getItem("wiiu_usuario_activo") || "null",
  );

  if (!usuario) {
    window.location.href = "../Login.html";
    return;
  }

  const nombre = String(usuario.nombre || "Administrador").trim();
  const primerNombre = nombre.split(" ")[0] || "Administrador";

  const nombrePerfil = document.querySelector(".nombre-usuario");
  const rolPerfil = document.querySelector(".rol-usuario");
  const greetingTitle = document.querySelector(".greeting-title span");
  const avatarImg = document.querySelector("#perfilUsuario img");

  if (nombrePerfil) nombrePerfil.textContent = nombre;
  if (rolPerfil) rolPerfil.textContent = usuario.rol || "Administrador";
  if (greetingTitle) greetingTitle.textContent = `¡Hola, ${primerNombre}!`;
  if (avatarImg) {
    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=FBBF24&color=091024&bold=true`;
    avatarImg.alt = nombre;
  }
}

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
    if (
      !e.target.closest("#menuUsuario") &&
      !e.target.closest("#btnMenuUsuario")
    ) {
      toggleMenu(e);
    }
  });

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#perfilUsuario") &&
      !e.target.closest("#menuUsuario")
    ) {
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
const DEFAULT_MAINTENANCE = [];
const DEFAULT_REPAIRS = [];
const DEFAULT_DISCOUNTS = [];
const DEFAULT_REVIEWS = [];
const DEFAULT_CLIENTS = [];

function initPresetData() {
  const keys = [
    "wiiu_products",
    "wiiu_warranties",
    "wiiu_maintenance",
    "wiiu_repairs",
    "wiiu_discounts",
    "wiiu_reviews",
    "wiiu_clients",
  ];
  keys.forEach((k) => {
    const val = localStorage.getItem(k);
    if (
      !val ||
      val.includes("WIIU-GME") ||
      val.includes("GAR-801") ||
      val.includes("MNT-401") ||
      val.includes("REP-101") ||
      val.includes("WIIU-VERANO20") ||
      val.includes("Juan Camilo") ||
      val.includes("camilo.r@gmail.com") ||
      val.includes("VIP Gamer") ||
      val.includes("María Fernanda") ||
      val.includes("Andrés Felipe") ||
      val.includes("Laura Sofía")
    ) {
      localStorage.setItem(k, JSON.stringify([]));
    }
  });

  // Limpieza directa garantizada para clientes de prueba predeterminados
  try {
    const clients = JSON.parse(localStorage.getItem("wiiu_clients")) || [];
    const cleanClients = clients.filter(
      (c) =>
        c.name !== "Juan Camilo R." &&
        c.name !== "María Fernanda T." &&
        c.name !== "Andrés Felipe G." &&
        c.name !== "Laura Sofía M." &&
        !c.email?.includes("camilo.r") &&
        !c.email?.includes("mafe.t") &&
        !c.email?.includes("andres.fg") &&
        !c.email?.includes("laura.m"),
    );
    if (cleanClients.length !== clients.length) {
      localStorage.setItem("wiiu_clients", JSON.stringify(cleanClients));
    }
  } catch (e) {
    localStorage.setItem("wiiu_clients", JSON.stringify([]));
  }
}

function getProducts() {
  const products = JSON.parse(localStorage.getItem("wiiu_products")) || [];
  return products.map((product) => ({
    ...product,
    stock: normalizeNonNegativeInteger(product.stock),
  }));
}

function saveProductsList(products) {
  const normalizedProducts = products.map((product) => ({
    ...product,
    stock: normalizeNonNegativeInteger(product.stock),
  }));
  localStorage.setItem("wiiu_products", JSON.stringify(normalizedProducts));
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function initNonNegativeStockInput() {
  const stockInput = document.getElementById("prodStock");
  if (!stockInput) return;

  stockInput.min = "0";
  stockInput.step = "1";
  stockInput.addEventListener("input", () => {
    if (stockInput.value === "") return;
    const value = Number(stockInput.value);
    if (!Number.isInteger(value) || value < 0) stockInput.value = "0";
  });
}

function initNavigation() {
  document.querySelectorAll(".elemento-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.getAttribute("data-view"));
    });
  });
}

function initDashboardFilters() {
  const rangeSelect = document.getElementById("dashboardRangeSelect");
  const rangeText = document.querySelector(".panel-filter-pill span");
  if (!rangeSelect) return;

  const updateFilterLabel = () => {
    const map = {
      7: "Esta semana",
      30: "Este mes",
      all: "Todo el periodo",
    };
    if (rangeText) {
      rangeText.textContent = map[rangeSelect.value] || "Esta semana";
    }
    renderDashboardMetrics();
  };

  rangeSelect.addEventListener("change", updateFilterLabel);
  updateFilterLabel();
}

window.switchView = function (viewKey) {
  document.querySelectorAll(".elemento-nav").forEach((btn) => {
    btn.classList.toggle("activo", btn.getAttribute("data-view") === viewKey);
  });

  document
    .querySelectorAll(".seccion-vista")
    .forEach((sec) => sec.classList.remove("vista-activa"));

  const targetSection = document.getElementById(`view-${viewKey}`);
  if (targetSection) {
    targetSection.classList.add("vista-activa");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const renderMap = {
    home: renderDashboardMetrics,
    inventario: renderInventoryTable,
    garantias: renderWarrantiesTable,
    mantenimientos: renderMaintenanceTable,
    reparacion: renderRepairsTable,
    descuentos: renderDiscountsTable,
    reseñas: renderReviewsGrid,
    clientes: renderClientsTable,
  };

  if (renderMap[viewKey]) renderMap[viewKey]();
};

function renderAllModules() {
  renderDashboardMetrics();
  renderInventoryTable();
  renderWarrantiesTable();
  renderMaintenanceTable();
  renderRepairsTable();
  renderDiscountsTable();
  renderReviewsGrid();
  renderClientsTable();
}

function getDashboardRangeValue() {
  const select = document.getElementById("dashboardRangeSelect");
  return select ? select.value || "7" : "7";
}

function renderDashboardMetrics() {
  const kpiVentas = document.getElementById("kpiVentasTotales");
  const kpiPedidos = document.getElementById("kpiTotalPedidos");
  const kpiClientes = document.getElementById("kpiClientesNuevos");

  const bestSellers = document.getElementById("bestSellersList");
  const recentOrders = document.getElementById("recentOrdersBody");
  const finIngresos = document.getElementById("finIngresos");
  const finGastos = document.getElementById("finGastos");
  const finUtilidad = document.getElementById("finUtilidad");

  const summary = adminDashboardData?.summary || {
    productsCount: 0,
    clientsCount: 0,
    ordersCount: 0,
    salesTotal: 0,
  };
  const topProducts = Array.isArray(adminDashboardData?.topProducts)
    ? adminDashboardData.topProducts
    : [];
  const recentOrdersList = Array.isArray(adminDashboardData?.recentOrders)
    ? adminDashboardData.recentOrders
    : [];
  const salesTrend = Array.isArray(adminDashboardData?.salesTrend)
    ? adminDashboardData.salesTrend
    : [];
  const rangeValue = getDashboardRangeValue();

  if (kpiVentas)
    kpiVentas.textContent = `$ ${Number(summary.salesTotal || 0).toLocaleString("es-CO")}`;
  if (kpiPedidos) kpiPedidos.textContent = String(summary.ordersCount || 0);
  if (kpiClientes) kpiClientes.textContent = String(summary.clientsCount || 0);

  renderSalesChart(salesTrend, rangeValue);

  if (bestSellers) {
    if (!topProducts.length) {
      bestSellers.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:0.85rem;">No hay productos vendidos registrados</div>`;
    } else {
      bestSellers.innerHTML = topProducts
        .map(
          (item, index) => `
            <div class="best-seller-card">
              <div class="best-seller-rank">#${index + 1}</div>
              <div class="best-seller-thumb">
                <img
                  src="${item.imagen_url || item.imageUrl || "https://via.placeholder.com/200x120/edf4ff/1273eb?text=WiiU"}"
                  alt="${item.nombre || item.name || "Producto"}"
                  onerror="this.src='https://via.placeholder.com/200x120/edf4ff/1273eb?text=WiiU'"
                />
              </div>
              <div class="best-seller-info">
                <div class="best-seller-name">${item.nombre || item.name || "Producto"}</div>
                <div class="best-seller-meta">${Number(item.cantidad || 0)} unidades</div>
              </div>
              <div class="best-seller-value">$ ${Number(item.total || 0).toLocaleString("es-CO")}</div>
            </div>
          `,
        )
        .join("");
    }
  }

  if (recentOrders) {
    if (!recentOrdersList.length) {
      recentOrders.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;">No hay pedidos registrados</td></tr>`;
    } else {
      recentOrders.innerHTML = recentOrdersList
        .map((pedido) => {
          const estado = String(pedido.estado || "PAGADA").toUpperCase();
          const estadoTexto =
            estado === "PAGADA"
              ? "Pagada"
              : estado === "PENDIENTE"
                ? "Pendiente"
                : estado === "RECHAZADA"
                  ? "Rechazada"
                  : "Procesando";
          const estadoClass =
            estado === "PAGADA"
              ? "entregado"
              : estado === "PENDIENTE"
                ? "processing"
                : "warning";

          return `
            <tr>
              <td><span class="order-code">#${pedido.id_venta}</span></td>
              <td>${pedido.nombre || "Cliente"} ${pedido.apellido || ""}</td>
              <td><span class="insignia-estado ${estadoClass}">${estadoTexto}</span></td>
              <td class="order-total-price">$ ${Number(pedido.total || 0).toLocaleString("es-CO")}</td>
              <td>
                <button class="row-more-btn" type="button" onclick="window.showToast('Detalle del pedido #${pedido.id_venta}')">Ver</button>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  if (finIngresos)
    finIngresos.textContent = `$ ${Number(summary.salesTotal || 0).toLocaleString("es-CO")}`;
  if (finGastos) finGastos.textContent = "$ 0";
  if (finUtilidad)
    finUtilidad.textContent = `$ ${(Number(summary.salesTotal || 0) - 0).toLocaleString("es-CO")}`;
}

function renderSalesChart(salesTrend = [], rangeValue = "7") {
  const svg = document.querySelector(".grafico-ventas-interactivo");
  const tooltipAmount = document.querySelector(".tooltip-amount");
  const tooltipLabel = document.querySelector(".tooltip-label");
  if (!svg) return;

  const dayMap = {
    Sun: "Dom",
    Mon: "Lun",
    Tue: "Mar",
    Wed: "Mié",
    Thu: "Jue",
    Fri: "Vie",
    Sat: "Sáb",
  };

  const defaultSeries = [
    { label: "Lun", value: 0 },
    { label: "Mar", value: 0 },
    { label: "Mié", value: 0 },
    { label: "Jue", value: 0 },
    { label: "Vie", value: 0 },
    { label: "Sáb", value: 0 },
    { label: "Dom", value: 0 },
  ];

  const normalizedTrend = (
    Array.isArray(salesTrend) && salesTrend.length ? salesTrend : defaultSeries
  ).map((point) => ({
    ...point,
    label:
      dayMap[String(point.label || "").slice(0, 3)] ||
      String(point.label || "").slice(0, 3) ||
      "-",
    value: Number(point.value || 0),
  }));

  const limitMap = { 7: 7, 30: 30, all: normalizedTrend.length };
  const sliceSize = limitMap[rangeValue] || 7;
  const filteredTrend = normalizedTrend.slice(-Math.max(1, sliceSize));
  const labels = filteredTrend.length ? filteredTrend : defaultSeries;
  const sourceSeries = labels.map((point) => point.value);

  const chartWidth = 650;
  const chartHeight = 260;
  const paddingLeft = 24;
  const paddingRight = 8;
  const paddingTop = 10;
  const paddingBottom = 18;
  const maxValue = Math.max(...sourceSeries, 1000);
  const xStep =
    (chartWidth - paddingLeft - paddingRight) /
    Math.max(sourceSeries.length - 1, 1);

  const points = sourceSeries.map((value, index) => {
    const x = paddingLeft + index * xStep;
    const y =
      chartHeight -
      paddingBottom -
      (value / maxValue) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;

  const markers = points
    .map(
      (point, index) => `
        <circle cx="${point.x}" cy="${point.y}" r="${index === points.length - 1 ? 5 : 3.5}" fill="#0077FF" stroke="#ffffff" stroke-width="2" />
      `,
    )
    .join("");

  const chartLabels = document.querySelector(".chart-x-axis");
  if (chartLabels) {
    chartLabels.innerHTML = labels
      .map(
        (point, index) =>
          `<span class="${index === labels.length - 1 ? "dia-activo" : ""}">${point.label || "-"}</span>`,
      )
      .join("");
  }

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0077FF" stop-opacity="0.3"></stop>
        <stop offset="100%" stop-color="#0077FF" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <g>
      ${Array.from({ length: 5 }, (_, idx) => {
        const y =
          paddingTop + (idx * (chartHeight - paddingTop - paddingBottom)) / 4;
        return `<line x1="${paddingLeft}" y1="${y}" x2="${chartWidth - paddingRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" />`;
      }).join("")}
      <path d="${areaPath}" fill="url(#chartAreaGrad)"></path>
      <path d="${linePath}" fill="none" stroke="#0077FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      ${markers}
    </g>
  `;

  const lastPoint = points[points.length - 1];
  if (tooltipAmount) {
    tooltipAmount.textContent = `$ ${Number(lastPoint.value || 0).toLocaleString("es-CO")}`;
  }
  if (tooltipLabel) {
    tooltipLabel.textContent = `${labels[labels.length - 1]?.label || "Hoy"}`;
  }
}

function renderInventoryTable(itemsToRender = null) {
  const products = itemsToRender || getProducts();
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;

  const totalStockVal = products.reduce((acc, p) => acc + p.price * p.stock, 0);
  const lowStockCount = products.filter(
    (p) => p.stock <= (p.minStock || 3),
  ).length;

  const countEl = document.getElementById("invTotalCount");
  const valEl = document.getElementById("invTotalValue");
  const lowEl = document.getElementById("invLowStock");

  if (countEl) countEl.textContent = `${products.length} items`;
  if (valEl) valEl.textContent = `$ ${totalStockVal.toLocaleString("es-CO")}`;
  if (lowEl) lowEl.textContent = `${lowStockCount} alertas`;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:30px;">No se encontraron productos registrados en el inventario</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map(
      (prod) => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${prod.imageUrl || "https://via.placeholder.com/40"}" alt="${prod.name}" style="width:38px; height:38px; border-radius:6px; object-fit:cover; background:#0E1834;" onerror="this.src='https://via.placeholder.com/40/0E214D/00D2FF?text=Game'">
          <div>
            <div style="font-weight:700; color:#FFFFFF; font-size:0.88rem;">${prod.name}</div>
            <div style="font-size:0.74rem; color:var(--text-secondary);">${prod.platform || "Original"}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--accent-cyan); font-weight:600; font-size:0.82rem;">${prod.sku}</td>
      <td><span style="background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:4px; font-size:0.78rem;">${prod.category}</span></td>
      <td style="font-weight:700; color:#FFFFFF;">$ ${Number(prod.price).toLocaleString("es-CO")}</td>
      <td>
        <span style="font-weight:700; color:${prod.stock <= (prod.minStock || 3) ? "#EF4444" : "#10B981"};">
          ${prod.stock} uds
        </span>
      </td>
      <td style="font-size:0.8rem; color:var(--text-secondary);">${prod.warranty || "3 Meses"}</td>
      <td>
        <span class="insignia-estado ${prod.condition === "Nuevo Sellado" ? "entregado" : "shipping"}">${prod.condition}</span>
      </td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="row-more-btn" title="Editar producto" onclick="window.editProduct(${prod.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon-sm" style="color:var(--accent-gold);"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="row-more-btn" title="Eliminar producto" onclick="window.deleteProduct(${prod.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon-sm" style="color:var(--accent-red);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderWarrantiesTable(items = null) {
  const warranties =
    items || JSON.parse(localStorage.getItem("wiiu_warranties")) || [];
  const tbody = document.getElementById("garantiasTableBody");
  if (!tbody) return;

  if (warranties.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay certificados de garantía registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = warranties
    .map(
      (w) => `
    <tr>
      <td style="color:var(--accent-blue); font-weight:700;">${w.id}</td>
      <td style="font-weight:600;">${w.client}</td>
      <td>${w.product}</td>
      <td>${w.buyDate}</td>
      <td>${w.expDate}</td>
      <td>
        <span class="insignia-estado ${w.status === "Activa" ? "entregado" : w.status === "En Revisión" ? "shipping" : "warning"}">
          ${w.status}
        </span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Garantía ${w.id} consultada correctamente')">Ver certificado</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderMaintenanceTable(items = null) {
  const list =
    items ?? (JSON.parse(localStorage.getItem("wiiu_maintenance")) || []);
  const tbody = document.getElementById("mantenimientosTableBody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay órdenes de mantenimiento técnico registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (m) => `
    <tr>
      <td style="color:var(--accent-gold); font-weight:700;">${m.order}</td>
      <td style="font-weight:600;">${m.equipment}</td>
      <td>${m.client}</td>
      <td style="color:var(--accent-cyan);">${m.tech}</td>
      <td style="font-weight:700;">${m.cost}</td>
      <td>
        <span class="insignia-estado ${m.status === "Listo para Entrega" ? "entregado" : m.status === "En Taller" ? "shipping" : "processing"}">
          ${m.status}
        </span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Orden ${m.order} actualizada')">Detalles</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderRepairsTable(items = null) {
  const list =
    items ?? (JSON.parse(localStorage.getItem("wiiu_repairs")) || []);
  const tbody = document.getElementById("reparacionesTableBody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay tickets de reparación registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (r) => `
    <tr>
      <td style="color:var(--accent-blue); font-weight:700;">${r.ticket}</td>
      <td style="font-weight:600;">${r.device}</td>
      <td style="color:var(--text-secondary); max-width:250px;">${r.defect}</td>
      <td>${r.client}</td>
      <td style="font-weight:700; color:#FFFFFF;">${r.price}</td>
      <td>
        <span class="insignia-estado ${r.status === "Completada" ? "entregado" : r.status === "En Reparación" ? "processing" : "warning"}">
          ${r.status}
        </span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Ticket ${r.ticket} en seguimiento')">Estado</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderDiscountsTable(items = null) {
  const list =
    items ?? (JSON.parse(localStorage.getItem("wiiu_discounts")) || []);
  const tbody = document.getElementById("descuentosTableBody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay cupones de descuento activos</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (d) => `
    <tr>
      <td style="color:var(--accent-gold); font-weight:800; letter-spacing:0.05em;">${d.code}</td>
      <td>${d.desc}</td>
      <td style="font-weight:700; color:var(--accent-cyan);">${d.percent}</td>
      <td>${d.expires}</td>
      <td>${d.uses}</td>
      <td>
        <span class="insignia-estado ${d.status === "Activo" ? "entregado" : "warning"}">${d.status}</span>
      </td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Cupón ${d.code} copiado al portapapeles')">Copiar</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderReviewsGrid(items = null) {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  const reviews =
    items ?? (JSON.parse(localStorage.getItem("wiiu_reviews")) || []);
  if (reviews.length === 0) {
    grid.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:0.9rem; grid-column:1/-1;">No hay opiniones ni reseñas registradas aún</div>`;
    return;
  }

  const starIcon = `<svg viewBox="0 0 24 24" class="icono-estrella-resena"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const gamepadTagIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4m-2-2v4"/><circle cx="15" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>`;

  grid.innerHTML = reviews
    .map(
      (rev) => `
    <div class="tarjeta-resena">
      <div class="encabezado-resena">
        <span class="nombre-resenador">${rev.name}</span>
        <div class="estrellas-resena">${starIcon.repeat(Number(rev.rating || 5))}</div>
      </div>
      <p class="comentario-resena">"${rev.comment}"</p>
      <div class="etiqueta-producto-resena">${gamepadTagIcon} <span>${rev.product}</span></div>
    </div>
  `,
    )
    .join("");
}

window.filterReviews = function (searchTerm) {
  const list = JSON.parse(localStorage.getItem("wiiu_reviews")) || [];
  const cleanTerm = String(searchTerm || "")
    .toLowerCase()
    .trim();

  const filtered = cleanTerm
    ? list.filter((item) =>
        [item.name, item.product, item.comment, item.rating]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(cleanTerm),
      )
    : list;

  renderReviewsGrid(filtered);
};

window.filterReviewsByRating = function (rating) {
  const list = JSON.parse(localStorage.getItem("wiiu_reviews")) || [];
  const normalized = String(rating || "todos").trim();

  const filtered =
    normalized === "todos"
      ? list
      : list.filter((item) => Number(item.rating || 0) === Number(normalized));

  renderReviewsGrid(filtered);
};

function renderClientsTable(items = null) {
  const tbody = document.getElementById("clientesTableBody");
  if (!tbody) return;

  const clients =
    items || JSON.parse(localStorage.getItem("wiiu_clients")) || [];
  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay clientes registrados en el directorio</td></tr>`;
    return;
  }

  tbody.innerHTML = clients
    .map(
      (c) => `
    <tr>
      <td style="font-weight:700; color:#FFFFFF;">${c.name}</td>
      <td>${c.phone}</td>
      <td style="color:var(--text-secondary);">${c.email}</td>
      <td style="font-weight:700; color:var(--accent-gold);">$ ${Number(c.totalSpent || 0).toLocaleString("es-CO")}</td>
      <td>${c.lastVisit || "Reciente"}</td>
      <td><span class="insignia-estado entregado">${c.level}</span></td>
      <td>
        <button class="row-more-btn" onclick="window.showToast('Historial del cliente: ${c.name}')">Historial</button>
      </td>
    </tr>
  `,
    )
    .join("");
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

window.openAddProductModal = function () {
  const modal = document.getElementById("modalAddProduct");
  if (!modal) return;

  document.getElementById("formAddProduct").reset();
  document.getElementById("imagePreview").src =
    "https://via.placeholder.com/300x300/0E214D/00D2FF?text=Vista+Previa";
  document.getElementById("previewCategoryBadge").textContent = "Juegos Wii U";
  window.generateRandomSKU();
  modal.classList.add("activo");
};

window.closeAddProductModal = function () {
  const modal = document.getElementById("modalAddProduct");
  if (modal) modal.classList.remove("activo");
};

window.generateRandomSKU = function () {
  const cat = document.getElementById("prodCategory")?.value || "Juegos";
  let prefix = "WIIU-GME";
  if (cat.includes("Consola")) prefix = "WIIU-CNS";
  else if (cat.includes("Accesorio")) prefix = "WIIU-ACC";
  else if (cat.includes("Repuesto")) prefix = "WIIU-RPT";
  else if (cat.includes("Coleccionable")) prefix = "WIIU-AMB";

  const randomNum = Math.floor(100 + Math.random() * 900);
  const skuInput = document.getElementById("prodSKU");
  if (skuInput) skuInput.value = `${prefix}-${randomNum}`;
};

const PRESET_COVERS = {
  zelda:
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop",
  mario:
    "https://images.unsplash.com/photo-1612287233214-9988424269e8?w=300&h=300&fit=crop",
  mariokart:
    "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=300&h=300&fit=crop",
  splatoon:
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=300&fit=crop",
  smash:
    "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=300&h=300&fit=crop",
};

window.setPresetCover = function (key) {
  const url = PRESET_COVERS[key] || PRESET_COVERS.zelda;
  const urlInput = document.getElementById("prodImageUrl");
  if (urlInput) urlInput.value = url;
  previewProductImage(url);
};

window.previewProductImage = function (url) {
  const img = document.getElementById("imagePreview");
  if (!img) return;
  img.src =
    url && url.trim() !== ""
      ? url
      : "https://via.placeholder.com/300x300/0E214D/00D2FF?text=Vista+Previa";
};

window.saveProduct = function (event) {
  event.preventDefault();

  const nameInput = document.getElementById("prodName");
  const skuInput = document.getElementById("prodSKU");
  const priceInput = document.getElementById("prodPrice");
  const stockInput = document.getElementById("prodStock");

  const name = nameInput.value.trim();
  const category = document.getElementById("prodCategory").value;
  const sku = skuInput.value.trim();
  const publisher =
    document.getElementById("prodPublisher").value.trim() || "Nintendo";
  const platform = document.getElementById("prodPlatform").value;
  const price = parseFloat(priceInput.value) || 0;
  const costPrice =
    parseFloat(document.getElementById("prodCostPrice").value) || price * 0.6;
  const stockValue = Number(stockInput.value);
  const stock = Number.isInteger(stockValue) ? stockValue : -1;
  const minStock = parseInt(document.getElementById("prodMinStock").value) || 2;
  const condition = document.getElementById("prodCondition").value;
  const warranty = document.getElementById("prodWarranty").value;
  const imageUrl =
    document.getElementById("prodImageUrl").value.trim() ||
    "https://via.placeholder.com/300x300/0E214D/00D2FF?text=Producto";
  const description = document.getElementById("prodDescription").value.trim();

  if (!name || name.length < 3) {
    showToast(
      "Por favor ingresa un nombre de producto válido (mínimo 3 caracteres).",
      "error",
    );
    nameInput.focus();
    return;
  }

  if (!sku || sku.length < 3) {
    showToast("Por favor ingresa un código SKU válido.", "error");
    skuInput.focus();
    return;
  }

  if (isNaN(price) || price <= 0) {
    showToast("El precio de venta debe ser un número mayor a 0.", "error");
    priceInput.focus();
    return;
  }

  if (!Number.isInteger(stockValue) || stock < 0) {
    showToast(
      "La cantidad en stock debe ser un número entero mayor o igual a 0.",
      "error",
    );
    stockInput.focus();
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
    description,
  };

  products.unshift(newProduct);
  saveProductsList(products);

  closeAddProductModal();
  renderInventoryTable();
  showToast(`¡Producto "${name}" guardado exitosamente en el inventario!`);
};

window.deleteProduct = function (id) {
  if (
    confirm(
      "¿Estás seguro de que deseas eliminar este producto del inventario?",
    )
  ) {
    const products = getProducts().filter((p) => p.id !== id);
    saveProductsList(products);
    renderInventoryTable();
    showToast("Producto eliminado del inventario.");
  }
};

window.editProduct = function (id) {
  const products = getProducts();
  const prod = products.find((p) => p.id === id);
  if (!prod) return;

  openAddProductModal();
  document.getElementById("prodName").value = prod.name;
  document.getElementById("prodCategory").value = prod.category;
  document.getElementById("prodSKU").value = prod.sku;
  document.getElementById("prodPublisher").value = prod.publisher || "";
  document.getElementById("prodPlatform").value =
    prod.platform || "Disco Físico Original";
  document.getElementById("prodPrice").value = prod.price;
  document.getElementById("prodCostPrice").value = prod.costPrice || "";
  document.getElementById("prodStock").value = prod.stock;
  document.getElementById("prodMinStock").value = prod.minStock || 2;
  document.getElementById("prodCondition").value = prod.condition;
  document.getElementById("prodWarranty").value = prod.warranty || "3 Meses";
  document.getElementById("prodImageUrl").value = prod.imageUrl;
  document.getElementById("prodDescription").value = prod.description || "";
  previewProductImage(prod.imageUrl);

  saveProductsList(products.filter((p) => p.id !== id));
};

// Modal Garantías
window.openAddWarrantyModal = function () {
  const modal = document.getElementById("modalAddWarranty");
  if (!modal) return;
  const form = document.getElementById("formAddWarranty");
  if (form) form.reset();
  const dateInput = document.getElementById("warBuyDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
  modal.classList.add("activo");
};

window.closeAddWarrantyModal = function () {
  const modal = document.getElementById("modalAddWarranty");
  if (modal) modal.classList.remove("activo");
};

window.saveWarranty = function (e) {
  e.preventDefault();
  const clientInput = document.getElementById("warClient");
  const productInput = document.getElementById("warProduct");
  const buyDateInput = document.getElementById("warBuyDate");
  const durationInput = document.getElementById("warDuration");

  const client = clientInput ? clientInput.value.trim() : "";
  const product = productInput ? productInput.value.trim() : "";
  const buyDate =
    buyDateInput && buyDateInput.value
      ? buyDateInput.value
      : new Date().toLocaleDateString("es-CO");
  const duration = durationInput ? durationInput.value : "3 Meses";

  if (!client || client.length < 3) {
    showToast(
      "Por favor ingresa un nombre de cliente válido (mínimo 3 caracteres).",
      "error",
    );
    if (clientInput) clientInput.focus();
    return;
  }
  if (!product || product.length < 3) {
    showToast(
      "Por favor ingresa el producto y serial correspondiente.",
      "error",
    );
    if (productInput) productInput.focus();
    return;
  }

  const warranties = JSON.parse(localStorage.getItem("wiiu_warranties")) || [];
  const newWar = {
    id: `GAR-${Math.floor(850 + Math.random() * 100)}`,
    client,
    product,
    buyDate,
    expDate: duration,
    status: "Activa",
  };

  warranties.unshift(newWar);
  localStorage.setItem("wiiu_warranties", JSON.stringify(warranties));
  closeAddWarrantyModal();
  renderWarrantiesTable();
  showToast(`¡Certificado de garantía ${newWar.id} emitido para ${client}!`);
};

// Modal Mantenimientos
window.openAddMaintenanceModal = function () {
  const modal = document.getElementById("modalAddMaintenance");
  if (!modal) return;
  const form = document.getElementById("formAddMaintenance");
  if (form) form.reset();
  modal.classList.add("activo");
};

window.closeAddMaintenanceModal = function () {
  const modal = document.getElementById("modalAddMaintenance");
  if (modal) modal.classList.remove("activo");
};

window.saveMaintenance = function (e) {
  e.preventDefault();
  const eqInput = document.getElementById("mntEquipment");
  const cliInput = document.getElementById("mntClient");
  const techInput = document.getElementById("mntTech");
  const costInput = document.getElementById("mntCost");
  const statusInput = document.getElementById("mntStatus");

  const equipment = eqInput ? eqInput.value.trim() : "";
  const client = cliInput ? cliInput.value.trim() : "";
  const tech = techInput ? techInput.value : "Ing. Mateo";
  const costVal = costInput ? parseFloat(costInput.value) : 0;
  const status = statusInput ? statusInput.value : "En Taller";

  if (!equipment || equipment.length < 3) {
    showToast(
      "Por favor ingresa el equipo o consola a mantenimiento.",
      "error",
    );
    if (eqInput) eqInput.focus();
    return;
  }
  if (!client || client.length < 3) {
    showToast("Por favor ingresa el nombre del cliente.", "error");
    if (cliInput) cliInput.focus();
    return;
  }
  if (isNaN(costVal) || costVal < 0) {
    showToast(
      "El costo del mantenimiento debe ser un valor mayor o igual a 0.",
      "error",
    );
    if (costInput) costInput.focus();
    return;
  }

  const list = JSON.parse(localStorage.getItem("wiiu_maintenance")) || [];
  const newMnt = {
    order: `MNT-${Math.floor(400 + Math.random() * 100)}`,
    equipment,
    client,
    tech,
    cost: `$ ${costVal.toLocaleString("es-CO")}`,
    status,
  };

  list.unshift(newMnt);
  localStorage.setItem("wiiu_maintenance", JSON.stringify(list));
  closeAddMaintenanceModal();
  renderMaintenanceTable();
  showToast(`¡Orden de mantenimiento ${newMnt.order} creada con éxito!`);
};

// Modal Recepción Taller / Reparaciones
window.openAddRepairModal = function () {
  const modal = document.getElementById("modalAddRepair");
  if (!modal) return;
  const form = document.getElementById("formAddRepair");
  if (form) form.reset();
  populateClientDropdown("repClient");
  modal.classList.add("activo");
};

window.closeAddRepairModal = function () {
  const modal = document.getElementById("modalAddRepair");
  if (modal) modal.classList.remove("activo");
};

window.saveRepairOrder = function (e) {
  e.preventDefault();
  const devInput = document.getElementById("repDevice");
  const defInput = document.getElementById("repDefect");
  const cliSelect = document.getElementById("repClient");
  const priceInput = document.getElementById("repPrice");

  const device = devInput ? devInput.value.trim() : "";
  const defect = defInput ? defInput.value.trim() : "";
  const client =
    cliSelect && cliSelect.value ? cliSelect.value : "Cliente Mostrador";
  const priceVal =
    priceInput && priceInput.value !== ""
      ? parseFloat(priceInput.value)
      : 60000;

  if (!device || device.length < 3) {
    showToast(
      "Por favor ingresa el dispositivo o consola defectuosa.",
      "error",
    );
    if (devInput) devInput.focus();
    return;
  }
  if (!defect || defect.length < 3) {
    showToast("Por favor detalla la falla reportada por el cliente.", "error");
    if (defInput) defInput.focus();
    return;
  }
  if (isNaN(priceVal) || priceVal < 0) {
    showToast(
      "El presupuesto debe ser un monto válido mayor o igual a 0.",
      "error",
    );
    if (priceInput) priceInput.focus();
    return;
  }

  const repairs = JSON.parse(localStorage.getItem("wiiu_repairs")) || [];
  const newRepair = {
    ticket: `REP-${Math.floor(105 + Math.random() * 90)}`,
    device,
    defect,
    client,
    price: `$ ${priceVal.toLocaleString("es-CO")}`,
    status: "Ingresado en Taller",
  };

  repairs.unshift(newRepair);
  localStorage.setItem("wiiu_repairs", JSON.stringify(repairs));
  closeAddRepairModal();
  renderRepairsTable();
  showToast(`¡Orden de recepción taller ${newRepair.ticket} registrada!`);
};

// Modal Nuevos Clientes
window.openAddClientModal = function () {
  const modal = document.getElementById("modalAddClient");
  if (!modal) return;
  const form = document.getElementById("formAddClient");
  if (form) form.reset();
  modal.classList.add("activo");
};

window.closeAddClientModal = function () {
  const modal = document.getElementById("modalAddClient");
  if (modal) modal.classList.remove("activo");
};

window.saveClient = function (e) {
  e.preventDefault();
  const nameInput = document.getElementById("cliName");
  const phoneInput = document.getElementById("cliPhone");
  const emailInput = document.getElementById("cliEmail");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";

  if (!name || name.length < 3) {
    showToast(
      "Por favor ingresa el nombre completo del cliente (mínimo 3 caracteres).",
      "error",
    );
    if (nameInput) nameInput.focus();
    return;
  }
  const phoneRegex = /^[0-9\+\-\s\(\)]{7,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    showToast(
      "Ingresa un número de teléfono válido (ej: +57 300 123 4567).",
      "error",
    );
    if (phoneInput) phoneInput.focus();
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showToast(
      "Ingresa un correo electrónico válido (ej: cliente@gmail.com).",
      "error",
    );
    if (emailInput) emailInput.focus();
    return;
  }

  const clients = JSON.parse(localStorage.getItem("wiiu_clients")) || [];
  clients.unshift({ name, phone, email, totalSpent: "$ 0", level: "Nuevo" });
  localStorage.setItem("wiiu_clients", JSON.stringify(clients));
  closeAddClientModal();
  renderClientsTable();
  showToast(`¡Cliente "${name}" registrado exitosamente en el directorio!`);
};

// Modal Descuentos
window.openDiscountModal = function () {
  const modal = document.getElementById("modalDiscount");
  if (modal) {
    document.getElementById("formDiscount").reset();
    modal.classList.add("activo");
  }
};

window.closeDiscountModal = function () {
  const modal = document.getElementById("modalDiscount");
  if (modal) modal.classList.remove("activo");
};

window.saveDiscount = function (e) {
  e.preventDefault();
  const codeInput = document.getElementById("discCode");
  const percentInput = document.getElementById("discPercent");
  const limitInput = document.getElementById("discLimit");
  const descInput = document.getElementById("discDesc");

  const code = codeInput ? codeInput.value.toUpperCase().trim() : "";
  const percentVal = percentInput ? parseInt(percentInput.value) : 0;
  const limitVal = limitInput ? parseInt(limitInput.value) : 0;
  const desc = descInput ? descInput.value.trim() : "";

  if (!code || code.length < 3) {
    showToast(
      "Por favor ingresa un código de cupón válido (mínimo 3 caracteres).",
      "error",
    );
    if (codeInput) codeInput.focus();
    return;
  }
  if (isNaN(percentVal) || percentVal < 1 || percentVal > 100) {
    showToast(
      "El porcentaje de descuento debe estar entre 1% y 100%.",
      "error",
    );
    if (percentInput) percentInput.focus();
    return;
  }
  if (isNaN(limitVal) || limitVal < 1) {
    showToast("El límite de usos debe ser mayor a 0.", "error");
    if (limitInput) limitInput.focus();
    return;
  }
  if (!desc || desc.length < 3) {
    showToast("Ingresa una breve descripción de la promoción.", "error");
    if (descInput) descInput.focus();
    return;
  }

  const discounts = JSON.parse(localStorage.getItem("wiiu_discounts")) || [];
  discounts.unshift({
    code,
    desc,
    percent: `${percentVal}%`,
    expires: "31/12/2026",
    uses: `0 / ${limitVal}`,
    status: "Activo",
  });

  localStorage.setItem("wiiu_discounts", JSON.stringify(discounts));
  closeDiscountModal();
  renderDiscountsTable();
  showToast(`¡Cupón promocional "${code}" activado!`);
};

function initGlobalSearch() {
  const input = document.getElementById("globalSearchInput");
  if (!input) return;

  input.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderAllModules();
      return;
    }

    const matches = [
      ...(getProducts() || []),
      ...(JSON.parse(localStorage.getItem("wiiu_clients")) || []),
      ...(JSON.parse(localStorage.getItem("wiiu_warranties")) || []),
      ...(JSON.parse(localStorage.getItem("wiiu_maintenance")) || []),
      ...(JSON.parse(localStorage.getItem("wiiu_repairs")) || []),
    ].filter((entry) => {
      const haystack = [
        entry.name,
        entry.sku,
        entry.category,
        entry.client,
        entry.product,
        entry.device,
        entry.ticket,
        entry.order,
        entry.email,
        entry.phone,
        entry.code,
        entry.desc,
        entry.equipment,
        entry.tech,
        entry.defect,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    const productMatches = matches.filter(
      (entry) => entry.name || entry.sku || entry.category,
    );
    const clientMatches = matches.filter(
      (entry) => entry.email || entry.phone || entry.name,
    );

    if (productMatches.length > 0) {
      switchView("inventario");
      renderInventoryTable(
        productMatches.map((item) => ({
          ...item,
          name: item.name || item.product || "Producto",
          sku: item.sku || "SKU-000",
          category: item.category || "General",
          price: Number(item.price || 0),
          stock: Number(item.stock || 0),
          minStock: Number(item.minStock || 3),
        })),
      );
    }

    if (clientMatches.length && !productMatches.length) {
      switchView("clientes");
      renderClientsTable(
        clientMatches.map((item) => ({
          name: item.name || item.client || "Cliente",
          phone: item.phone || "Sin teléfono",
          email: item.email || "Sin correo",
          totalSpent: Number(item.totalSpent || 0),
          lastVisit: item.lastVisit || "Reciente",
          level: item.level || "Nuevo",
        })),
      );
    }

    if (!productMatches.length && !clientMatches.length) {
      showToast("No se encontraron coincidencias en el panel administrativo.");
    }
  });
}

window.filterProducts = function (searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  const filtered = getProducts().filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term),
  );
  renderInventoryTable(filtered);
};

window.filterProductsByCategory = function (category) {
  const products = getProducts();
  renderInventoryTable(
    category === "todos"
      ? products
      : products.filter((p) => p.category === category),
  );
};

window.filterClientsByLevel = function (level) {
  const list = JSON.parse(localStorage.getItem("wiiu_clients")) || [];
  const normalized = String(level || "todos").trim();

  const filtered =
    normalized === "todos"
      ? list
      : list.filter((item) => (item.level || "Nuevo") === normalized);

  renderClientsTable(filtered);
};

window.filterMaintenance = function (searchTerm) {
  const list = JSON.parse(localStorage.getItem("wiiu_maintenance")) || [];
  const cleanTerm = String(searchTerm || "")
    .toLowerCase()
    .trim();

  const filtered = cleanTerm
    ? list.filter((item) =>
        [item.order, item.equipment, item.client, item.tech, item.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(cleanTerm),
      )
    : list;

  renderMaintenanceTable(filtered);
};

window.filterRepairs = function (searchTerm) {
  const list = JSON.parse(localStorage.getItem("wiiu_repairs")) || [];
  const cleanTerm = String(searchTerm || "")
    .toLowerCase()
    .trim();

  const filtered = cleanTerm
    ? list.filter((item) =>
        [item.ticket, item.device, item.defect, item.client, item.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(cleanTerm),
      )
    : list;

  renderRepairsTable(filtered);
};

window.filterClients = function (searchTerm) {
  const list = JSON.parse(localStorage.getItem("wiiu_clients")) || [];
  const cleanTerm = String(searchTerm || "")
    .toLowerCase()
    .trim();

  const filtered = cleanTerm
    ? list.filter((item) =>
        [item.name, item.phone, item.email, item.level]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(cleanTerm),
      )
    : list;

  renderClientsTable(filtered);
};

window.filterDiscounts = function (searchTerm) {
  const list = JSON.parse(localStorage.getItem("wiiu_discounts")) || [];
  const cleanTerm = String(searchTerm || "")
    .toLowerCase()
    .trim();

  const filtered = cleanTerm
    ? list.filter((item) =>
        [item.code, item.desc, item.discountDescription, item.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(cleanTerm),
      )
    : list;

  renderDiscountsTable(filtered);
};

window.filterDiscountsByStatus = function (status) {
  const list = JSON.parse(localStorage.getItem("wiiu_discounts")) || [];
  const normalized = String(status || "todos").trim();

  const filtered =
    normalized === "todos"
      ? list
      : list.filter((item) => (item.status || "Activo") === normalized);

  renderDiscountsTable(filtered);
};

window.filterWarranties = function (term) {
  const warranties = JSON.parse(localStorage.getItem("wiiu_warranties")) || [];
  const cleanTerm = term.toLowerCase().trim();
  renderWarrantiesTable(
    warranties.filter(
      (w) =>
        w.client.toLowerCase().includes(cleanTerm) ||
        w.product.toLowerCase().includes(cleanTerm) ||
        w.id.toLowerCase().includes(cleanTerm),
    ),
  );
};

window.filterWarrantiesByStatus = function (status) {
  const warranties = JSON.parse(localStorage.getItem("wiiu_warranties")) || [];
  renderWarrantiesTable(
    status === "todos"
      ? warranties
      : warranties.filter((w) => w.status === status),
  );
};

window.showToast = function (message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const infoIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono-notificacion"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "toast-error" : ""}`;
  toast.innerHTML = `${infoIcon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4000);
};
