const EMPLOYEE_API = "http://localhost:3000/api/employee";
const employeeState = {
  branch: null,
  products: [],
  clients: [],
  warranties: [],
  warrantyPurchases: [],
  workshopOrders: [],
};
const cart = new Map();
let tipoRegistroActual = "";
let employeeSession = null;

try {
  employeeSession = JSON.parse(
    sessionStorage.getItem("wiiu_usuario_activo") || "null",
  );
} catch (error) {
  employeeSession = null;
}

if (!employeeSession?.token || employeeSession.rol !== "Trabajador") {
  window.location.href = "../../Pages/Login.html";
} else {
  initializeEmployeePanel();
}

function initializeEmployeePanel() {
  const fullName = employeeSession.nombre || "Empleado";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  document.querySelector(".info-empleado .nombre").textContent = fullName;
  document.querySelector(".avatar-cm").textContent = initials || "EM";
  document.querySelector(".info-empleado .rol").textContent =
    employeeSession.rol;

  document
    .getElementById("contenedorProductosPos")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-product]");
      if (button) addProductToCart(Number(button.dataset.addProduct));
    });

  document
    .getElementById("posItemsContainer")
    .addEventListener("change", (event) => {
      const input = event.target.closest("[data-cart-quantity]");
      if (!input) return;
      updateCartQuantity(Number(input.dataset.cartQuantity), input.value);
    });

  document
    .getElementById("posItemsContainer")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-product]");
      if (!button) return;
      cart.delete(Number(button.dataset.removeProduct));
      renderCart();
    });

  document
    .getElementById("tablaTallerBody")
    .addEventListener("click", updateWorkshopStatus);

  document
    .getElementById("tablaGarantiasBody")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-print-warranty]");
      if (button) printWarranty(Number(button.dataset.printWarranty));
    });

  document
    .getElementById("formEmpleado")
    .addEventListener("submit", guardarRegistroEmpleado);
  document
    .getElementById("formEmpleado")
    .addEventListener("input", filterEmployeeFormInput);

  document
    .getElementById("menuPerfil")
    .querySelector(".enlace-rojo")
    .addEventListener("click", logoutEmployee);

  document
    .getElementById("modalEmpleado")
    .addEventListener("click", (event) => {
      if (event.target.id === "modalEmpleado") cerrarModalEmpleado();
    });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrarModalEmpleado();
  });

  cargarDatosPanel();
}

function cambiarPestana(idVista, botonClickeado) {
  document.querySelectorAll(".seccion-vista").forEach((section) => {
    section.classList.toggle("activa", section.id === idVista);
  });
  document.querySelectorAll(".boton-menu").forEach((button) => {
    button.classList.toggle("activo", button === botonClickeado);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenuPerfil() {
  document.getElementById("menuPerfil").classList.toggle("abierto");
}

function mostrarNotificaciones() {
  showEmployeeToast("No tienes notificaciones pendientes.", "info");
}

async function employeeRequest(path, options = {}) {
  const response = await fetch(`${EMPLOYEE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${employeeSession.token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    sessionStorage.removeItem("wiiu_usuario_activo");
    sessionStorage.removeItem("sessionToken");
    localStorage.removeItem("sessionToken");
    window.location.href = "../../Pages/Login.html";
    throw new Error("Tu sesión venció. Inicia sesión nuevamente.");
  }
  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud.");
  }
  return data;
}

async function cargarDatosPanel() {
  try {
    const data = await employeeRequest("/dashboard");
    employeeState.branch = data.branch;
    employeeState.products = data.products || [];
    employeeState.clients = data.clients || [];
    employeeState.warranties = data.warranties || [];
    employeeState.warrantyPurchases = data.warrantyPurchases || [];
    employeeState.workshopOrders = data.workshopOrders || [];

    const subtitle = document.querySelector(".saludo p");
    if (subtitle && employeeState.branch) {
      subtitle.textContent =
        `${employeeState.branch.name} · ${employeeState.branch.city}. ` +
        "Registra ventas, atiende garantías y gestiona servicios de taller.";
    }

    renderCategoryOptions();
    renderProductCards();
    renderCatalog();
    renderClients();
    renderWarranties();
    renderWorkshopOrders();
    renderClientOptions();
    renderCart();
  } catch (error) {
    console.error("No se pudo cargar el panel del empleado:", error);
    showEmployeeToast(error.message, "error");
  }
}

function formatCurrency(value) {
  return `$ ${Number(value || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  })}`;
}

function createCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text ?? "";
  if (className) cell.className = className;
  return cell;
}

function renderCategoryOptions() {
  const select = document.getElementById("filtroCategoriaPos");
  const selected = select.value;
  const categories = [
    ...new Set(employeeState.products.map((product) => product.category)),
  ].sort((a, b) => a.localeCompare(b, "es"));

  select.replaceChildren(new Option("Todas las categorías", ""));
  categories.forEach((category) => {
    select.add(new Option(category, category));
  });
  if (categories.includes(selected)) select.value = selected;
}

function getFilteredProducts() {
  const search = document.getElementById("buscadorPos").value
    .trim()
    .toLocaleLowerCase("es");
  const category = document.getElementById("filtroCategoriaPos").value;
  return employeeState.products.filter((product) => {
    const matchesText = `${product.name} ${product.sku} ${product.category}`
      .toLocaleLowerCase("es")
      .includes(search);
    return matchesText && (!category || product.category === category);
  });
}

function renderProductCards() {
  const container = document.getElementById("contenedorProductosPos");
  const products = getFilteredProducts();
  container.replaceChildren();
  container.classList.toggle("productos-pos-lista", products.length > 0);

  if (!products.length) {
    const message = document.createElement("p");
    message.textContent = employeeState.products.length
      ? "No hay productos que coincidan con la búsqueda."
      : "No hay productos registrados para esta sucursal.";
    container.appendChild(message);
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "producto-pos-card";

    const name = document.createElement("strong");
    name.textContent = product.name;
    const category = document.createElement("small");
    category.textContent = `${product.category} · ${product.sku}`;
    const price = document.createElement("span");
    price.className = "producto-pos-precio";
    price.textContent = formatCurrency(product.price);
    const stock = document.createElement("small");
    stock.textContent = `Stock: ${product.stock}`;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.addProduct = product.id;
    button.textContent = product.stock > 0 ? "Agregar a la orden" : "Agotado";
    button.disabled = Number(product.stock) < 1;

    card.append(name, category, price, stock, button);
    container.appendChild(card);
  });
}

function renderCatalog() {
  const tbody = document.getElementById("tablaCatalogoBody");
  tbody.replaceChildren();
  if (!employeeState.products.length) {
    const row = tbody.insertRow();
    row.appendChild(createCell("No hay productos registrados en esta sucursal.", "mensaje-vacio"));
    return;
  }

  employeeState.products.forEach((product) => {
    const row = tbody.insertRow();
    row.append(
      createCell(product.name),
      createCell(product.sku),
      createCell(product.category),
      createCell(formatCurrency(product.price)),
      createCell(String(product.stock)),
      createCell(Number(product.stock) > 0 ? "Disponible" : "Agotado"),
    );
    const actions = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "boton-tabla";
    button.textContent = Number(product.stock) > 0 ? "Agregar al POS" : "Sin stock";
    button.disabled = Number(product.stock) < 1;
    button.addEventListener("click", () => addProductToCart(Number(product.id)));
    actions.appendChild(button);
    row.appendChild(actions);
  });
}

function renderClients() {
  const tbody = document.getElementById("tablaClientesBody");
  tbody.replaceChildren();
  if (!employeeState.clients.length) {
    const row = tbody.insertRow();
    const cell = createCell("No hay clientes registrados.", "mensaje-vacio");
    cell.colSpan = 5;
    row.appendChild(cell);
    return;
  }

  employeeState.clients.forEach((client) => {
    const row = tbody.insertRow();
    row.append(
      createCell(client.name),
      createCell(client.phone),
      createCell(client.email),
      createCell(formatCurrency(client.totalSpent)),
      createCell(client.level),
    );
  });
}

function renderClientOptions() {
  const select = document.getElementById("posCliente");
  const selected = select.value;
  select.replaceChildren(
    new Option("Cliente Mostrador (Venta Rápida)", ""),
  );
  employeeState.clients.forEach((client) => {
    select.add(new Option(client.name, String(client.id)));
  });
  if (employeeState.clients.some((client) => String(client.id) === selected)) {
    select.value = selected;
  }
}

function renderWarranties() {
  const tbody = document.getElementById("tablaGarantiasBody");
  tbody.replaceChildren();
  if (!employeeState.warranties.length) {
    const row = tbody.insertRow();
    const cell = createCell("No hay garantías registradas en esta sucursal.", "mensaje-vacio");
    cell.colSpan = 7;
    row.appendChild(cell);
    return;
  }

  employeeState.warranties.forEach((warranty) => {
    const row = tbody.insertRow();
    row.append(
      createCell(`GAR-${warranty.id}`),
      createCell(warranty.client),
      createCell(warranty.product),
      createCell(warranty.buyDate),
      createCell(warranty.expDate),
      createCell(warranty.status),
    );
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "boton-tabla";
    button.dataset.printWarranty = warranty.id;
    button.textContent = "Comprobante";
    action.appendChild(button);
    row.appendChild(action);
  });
}

function renderWorkshopOrders() {
  const tbody = document.getElementById("tablaTallerBody");
  tbody.replaceChildren();
  if (!employeeState.workshopOrders.length) {
    const row = tbody.insertRow();
    const cell = createCell("No hay órdenes de taller asignadas.", "mensaje-vacio");
    cell.colSpan = 7;
    row.appendChild(cell);
    return;
  }

  employeeState.workshopOrders.forEach((order) => {
    const row = tbody.insertRow();
    row.append(
      createCell(order.ticket),
      createCell(order.equipment),
      createCell(order.defect),
      createCell(order.client),
      createCell(formatCurrency(order.cost)),
      createCell(order.status),
    );
    const action = document.createElement("td");
    if (order.status === "Completado" || order.status === "Cancelado") {
      action.textContent = "Sin acciones";
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "boton-tabla";
      button.dataset.serviceId = order.id;
      button.dataset.nextStatus =
        order.status === "Pendiente" ? "EN PROCESO" : "COMPLETO";
      button.textContent =
        order.status === "Pendiente" ? "Iniciar" : "Marcar listo";
      action.appendChild(button);
    }
    row.appendChild(action);
  });
}

function addProductToCart(productId) {
  const product = employeeState.products.find(
    (item) => Number(item.id) === productId,
  );
  if (!product || Number(product.stock) <= 0) return;

  const currentQuantity = cart.get(productId) || 0;
  if (currentQuantity >= Number(product.stock)) {
    showEmployeeToast("No hay más unidades disponibles de este producto.", "error");
    return;
  }
  cart.set(productId, currentQuantity + 1);
  renderCart();
}

function updateCartQuantity(productId, rawValue) {
  const product = employeeState.products.find(
    (item) => Number(item.id) === productId,
  );
  if (!product) {
    cart.delete(productId);
    renderCart();
    return;
  }

  const quantity = Math.min(
    Number(product.stock),
    Math.max(1, Math.floor(Number(rawValue) || 1)),
  );
  cart.set(productId, quantity);
  renderCart();
}

function renderCart() {
  const container = document.getElementById("posItemsContainer");
  const subtotalElement = document.getElementById("posSubtotal");
  const totalElement = document.getElementById("posTotal");
  const subtotal = [...cart.entries()].reduce((sum, [productId, quantity]) => {
    const product = employeeState.products.find(
      (item) => Number(item.id) === productId,
    );
    return sum + (product ? Number(product.price) * quantity : 0);
  }, 0);

  container.replaceChildren();
  if (!cart.size) {
    container.textContent = "Selecciona un producto del catálogo para agregar a la venta.";
  } else {
    cart.forEach((quantity, productId) => {
      const product = employeeState.products.find(
        (item) => Number(item.id) === productId,
      );
      if (!product) return;

      const item = document.createElement("div");
      item.className = "item-orden-pos";
      const name = document.createElement("span");
      name.textContent = product.name;
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.min = "1";
      quantityInput.max = String(product.stock);
      quantityInput.value = String(quantity);
      quantityInput.setAttribute("aria-label", `Cantidad de ${product.name}`);
      quantityInput.dataset.cartQuantity = productId;
      const price = document.createElement("strong");
      price.textContent = formatCurrency(Number(product.price) * quantity);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "boton-quitar-pos";
      remove.dataset.removeProduct = productId;
      remove.setAttribute("aria-label", `Quitar ${product.name}`);
      remove.textContent = "×";
      item.append(name, quantityInput, price, remove);
      container.appendChild(item);
    });
  }

  subtotalElement.textContent = formatCurrency(subtotal);
  totalElement.textContent = formatCurrency(subtotal);
  document.getElementById("posDescuento").textContent = formatCurrency(0);
}

function vaciarOrden() {
  cart.clear();
  renderCart();
}

async function completarVenta() {
  if (!cart.size) {
    showEmployeeToast("Agrega al menos un producto antes de completar la venta.", "error");
    return;
  }

  const submitButton = document.querySelector(".btn-completar-venta");
  submitButton.disabled = true;
  try {
    const result = await employeeRequest("/sales", {
      method: "POST",
      body: JSON.stringify({
        customerId: document.getElementById("posCliente").value || null,
        paymentMethod: document.querySelector('input[name="pago"]:checked').value,
        items: [...cart.entries()].map(([productId, quantity]) => ({
          productId,
          quantity,
        })),
      }),
    });
    cart.clear();
    showEmployeeToast(
      `Venta #${result.sale.id} registrada. Total: ${formatCurrency(result.sale.total)}.`,
      "success",
    );
    await cargarDatosPanel();
  } catch (error) {
    console.error("No se pudo completar la venta:", error);
    showEmployeeToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

function filtrarProductosPos() {
  renderProductCards();
}

function filtrarCategoriaPos() {
  renderProductCards();
}

function filtrarTablaGenerica(idTbody, texto) {
  const tbody = document.getElementById(idTbody);
  if (!tbody) return;
  const filter = texto.trim().toLocaleLowerCase("es");
  [...tbody.rows].forEach((row) => {
    if (row.querySelector(".mensaje-vacio")) return;
    row.hidden = !row.textContent.toLocaleLowerCase("es").includes(filter);
  });
}

function createField(labelText, control) {
  const wrapper = document.createElement("div");
  wrapper.className = "grupo-campo";
  const label = document.createElement("label");
  label.htmlFor = control.id;
  label.textContent = labelText;
  wrapper.append(label, control);
  return wrapper;
}

function createInput(id, type, placeholder, required = true) {
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = type;
  input.placeholder = placeholder;
  input.required = required;
  return input;
}

function filterEmployeeFormInput(event) {
  const input = event.target;
  if (input.dataset.validation === "name") {
    input.value = input.value.replace(/[^\p{L}\s'-]/gu, "");
  } else if (input.dataset.validation === "phone") {
    input.value = input.value.replace(/[^+\d()\s-]/g, "");
  }
}

function createSelect(id, placeholder, options) {
  const select = document.createElement("select");
  select.id = id;
  select.name = id;
  select.required = true;
  select.add(new Option(placeholder, ""));
  options.forEach((option) => {
    select.add(new Option(option.label, option.value));
  });
  return select;
}

function getClientOptions() {
  return employeeState.clients.map((client) => ({
    value: String(client.id),
    label: client.name,
  }));
}

function abrirModalEmpleado(tipo) {
  tipoRegistroActual = tipo;
  const modal = document.getElementById("modalEmpleado");
  const title = document.getElementById("modalEmpleadoTitulo");
  const fields = document.getElementById("modalEmpleadoCampos");
  const form = document.getElementById("formEmpleado");
  fields.replaceChildren();
  form.reset();

  if (tipo === "garantia") {
    title.textContent = "Registrar Nueva Garantía";
    const purchaseOptions = employeeState.warrantyPurchases.map((purchase) => ({
      value: String(purchase.detailId),
      label: `${purchase.client} — ${purchase.product} — ${purchase.buyDate}`,
    }));
    const purchaseSelect = createSelect(
      "empCompra",
      purchaseOptions.length ? "Selecciona una compra" : "No hay compras pendientes",
      purchaseOptions,
    );
    purchaseSelect.disabled = !purchaseOptions.length;
    const durationSelect = createSelect("empDuracion", "Duración de la garantía", [
      { value: "3", label: "3 meses" },
      { value: "6", label: "6 meses" },
      { value: "12", label: "12 meses" },
      { value: "24", label: "24 meses" },
    ]);
    fields.append(
      createField("Compra del cliente", purchaseSelect),
      createField("Duración", durationSelect),
    );
    form.querySelector('[type="submit"]').disabled = !purchaseOptions.length;
  } else if (tipo === "taller") {
    title.textContent = "Ingresar Orden a Taller Técnico";
    const clients = getClientOptions();
    const clientSelect = createSelect("empCliente", "Selecciona un cliente", clients);
    const equipmentType = createSelect("empTipoEquipo", "Selecciona el tipo de equipo", [
      { value: "Portatil", label: "Portátil" },
      { value: "Torre", label: "Torre / PC de escritorio" },
      { value: "Consola", label: "Consola" },
      { value: "Control", label: "Control" },
      { value: "All in one", label: "All in one" },
    ]);
    const serviceType = createSelect("empTipoServicio", "Selecciona el servicio", [
      { value: "Reparacion", label: "Reparación" },
      { value: "Mantenimiento preventivo", label: "Mantenimiento preventivo" },
    ]);
    const device = createInput("empDispositivo", "text", "Ej. Wii U, portátil o consola");
    device.maxLength = 100;
    const defect = document.createElement("textarea");
    defect.id = "empFalla";
    defect.name = "empFalla";
    defect.placeholder = "Describe la falla o el trabajo solicitado";
    defect.required = true;
    defect.maxLength = 100;
    const cost = createInput("empPresupuesto", "number", "Ej. 65000");
    cost.min = "1";
    cost.step = "1";
    fields.append(
      createField("Cliente", clientSelect),
      createField("Tipo de equipo", equipmentType),
      createField("Tipo de servicio", serviceType),
      createField("Dispositivo", device),
      createField("Falla reportada", defect),
      createField("Presupuesto estimado ($)", cost),
    );
    form.querySelector('[type="submit"]').disabled = !clients.length;
  } else if (tipo === "cliente") {
    title.textContent = "Registrar Nuevo Cliente";
    const name = createInput("empNombre", "text", "Ej. Carlos Ramírez");
    name.maxLength = 61;
    name.dataset.validation = "name";
    const phone = createInput("empTelefono", "tel", "Ej. 312 345 6789");
    phone.maxLength = 20;
    phone.dataset.validation = "phone";
    const email = createInput("empCorreo", "email", "Ej. cliente@email.com");
    email.maxLength = 120;
    fields.append(
      createField("Nombre completo", name),
      createField("Teléfono de contacto", phone),
      createField("Correo electrónico", email),
    );
    form.querySelector('[type="submit"]').disabled = false;
  }

  modal.classList.add("activo");
}

function cerrarModalEmpleado() {
  document.getElementById("modalEmpleado").classList.remove("activo");
}

async function guardarRegistroEmpleado(event) {
  event.preventDefault();
  const submitButton = event.currentTarget.querySelector('[type="submit"]');
  if (!event.currentTarget.reportValidity() || submitButton.disabled) return;
  submitButton.disabled = true;

  try {
    let path;
    let body;
    if (tipoRegistroActual === "garantia") {
      path = "/warranties";
      body = {
        detailId: document.getElementById("empCompra").value,
        durationMonths: document.getElementById("empDuracion").value,
      };
    } else if (tipoRegistroActual === "taller") {
      path = "/workshop-orders";
      body = {
        customerId: document.getElementById("empCliente").value,
        equipmentType: document.getElementById("empTipoEquipo").value,
        serviceType: document.getElementById("empTipoServicio").value,
        device: document.getElementById("empDispositivo").value.trim(),
        defect: document.getElementById("empFalla").value.trim(),
        cost: document.getElementById("empPresupuesto").value,
      };
    } else if (tipoRegistroActual === "cliente") {
      path = "/clients";
      body = {
        name: document.getElementById("empNombre").value.trim(),
        phone: document.getElementById("empTelefono").value.trim(),
        email: document.getElementById("empCorreo").value.trim(),
      };
    } else {
      return;
    }

    const result = await employeeRequest(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    cerrarModalEmpleado();
    await cargarDatosPanel();

    const successMessage =
      tipoRegistroActual === "cliente" && result.temporaryPassword
        ? `${result.message} Contraseña temporal para entregar al cliente: ${result.temporaryPassword}`
        : result.message;
    showEmployeeToast(successMessage, "success");
  } catch (error) {
    console.error("No se pudo guardar el registro del empleado:", error);
    showEmployeeToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function updateWorkshopStatus(event) {
  const button = event.target.closest("[data-service-id]");
  if (!button) return;
  button.disabled = true;
  try {
    await employeeRequest(`/workshop-orders/${button.dataset.serviceId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: button.dataset.nextStatus }),
    });
    await cargarDatosPanel();
    showEmployeeToast("Estado de la orden actualizado.", "success");
  } catch (error) {
    console.error("No se pudo actualizar la orden:", error);
    showEmployeeToast(error.message, "error");
    button.disabled = false;
  }
}

function printWarranty(warrantyId) {
  const warranty = employeeState.warranties.find(
    (item) => Number(item.id) === warrantyId,
  );
  if (!warranty) return;

  const printWindow = window.open("", "_blank", "width=600,height=600");
  if (!printWindow) {
    showEmployeeToast("Permite las ventanas emergentes para imprimir el comprobante.", "error");
    return;
  }

  const document = printWindow.document;
  document.title = `Garantía GAR-${warranty.id}`;
  const heading = document.createElement("h1");
  heading.textContent = "Comprobante de garantía WiiU-Games";
  const lines = [
    `Garantía: GAR-${warranty.id}`,
    `Cliente: ${warranty.client}`,
    `Producto: ${warranty.product}`,
    `Fecha de compra: ${warranty.buyDate}`,
    `Vencimiento: ${warranty.expDate}`,
    `Estado: ${warranty.status}`,
  ];
  document.body.appendChild(heading);
  lines.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    document.body.appendChild(paragraph);
  });
  printWindow.focus();
  printWindow.print();
}

async function logoutEmployee(event) {
  event.preventDefault();
  try {
    await fetch(`${window.location.origin}/api/session`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${employeeSession.token}` },
    });
  } catch (error) {
    console.error("No se pudo cerrar la sesión en el servidor:", error);
  } finally {
    sessionStorage.removeItem("wiiu_usuario_activo");
    sessionStorage.removeItem("sessionToken");
    localStorage.removeItem("sessionToken");
    window.location.href = "../../Pages/Login.html";
  }
}

function showEmployeeToast(message, type = "success") {
  let container = document.getElementById("notificacionesEmpleado");
  if (!container) {
    container = document.createElement("div");
    container.id = "notificacionesEmpleado";
    container.className = "notificaciones-empleado";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `notificacion-empleado ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), 5000);
}
