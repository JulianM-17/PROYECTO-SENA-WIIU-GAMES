const EMPLOYEE_API = "http://localhost:3000/api/employee";
const employeeState = {
  branch: null,
  products: [],
  clients: [],
  warranties: [],
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

function configurarOrdenamientoTodasLasTablasEmpleado() {
  document.querySelectorAll(".tabla-empleado").forEach((tabla) => {
    tabla.querySelectorAll("thead th").forEach((encabezado) => {
      encabezado.setAttribute("title", "Ordenar por " + encabezado.textContent.trim());
      encabezado.setAttribute("aria-sort", "none");
    });

    tabla.addEventListener("click", (evento) => {
      const encabezado = evento.target.closest("thead th");
      if (!encabezado || !tabla.contains(encabezado)) return;

      const tbody = tabla.tBodies[0];
      if (!tbody) return;
      const indice = Array.prototype.indexOf.call(
        encabezado.parentElement.children,
        encabezado,
      );
      const descendente = encabezado.getAttribute("aria-sort") === "ascending";

      tabla.querySelectorAll("thead th").forEach((otro) => {
        otro.setAttribute("aria-sort", "none");
      });
      encabezado.setAttribute("aria-sort", descendente ? "descending" : "ascending");

      const filas = Array.from(tbody.rows).filter(
        (fila) =>
          !fila.querySelector(".mensaje-vacio") && fila.cells[indice],
      );
      const collator = new Intl.Collator("es", {
        numeric: true,
        sensitivity: "base",
      });

      filas.sort((a, b) => {
        const textoA = (a.cells[indice].textContent || "").trim();
        const textoB = (b.cells[indice].textContent || "").trim();
        const numeroA = Number(
          textoA.replace(/[^0-9,-]/g, "").replace(",", "."),
        );
        const numeroB = Number(
          textoB.replace(/[^0-9,-]/g, "").replace(",", "."),
        );

        let comparacion;
        if (
          textoA &&
          textoB &&
          Number.isFinite(numeroA) &&
          Number.isFinite(numeroB) &&
          (/[$%]|\d[.,]\d/.test(textoA) || /^-?\d/.test(textoA))
        ) {
          comparacion = numeroA - numeroB;
        } else {
          const fechaA = Date.parse(textoA);
          const fechaB = Date.parse(textoB);
          comparacion =
            Number.isFinite(fechaA) && Number.isFinite(fechaB)
              ? fechaA - fechaB
              : collator.compare(textoA, textoB);
        }
        return descendente ? -comparacion : comparacion;
      });

      filas.forEach((fila) => tbody.appendChild(fila));
    });
  });
}

function initializeEmployeePanel() {
  configurarMenuLateral();
  configurarOrdenamientoTodasLasTablasEmpleado();
  window.matchMedia("(max-width: 768px)").addEventListener(
    "change",
    configurarMenuLateral,
  );
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

  cargarDatosPanel();
}

function cambiarPestana(idVista, botonClickeado) {
  document.querySelectorAll(".seccion-vista").forEach((section) => {
    section.classList.toggle("activa", section.id === idVista);
  });
  document.querySelectorAll(".boton-menu").forEach((button) => {
    button.classList.toggle("activo", button === botonClickeado);
  });
  const navegacion = document.getElementById("menuNavegacion");
  const botonHamburguesa = document.querySelector(".boton-hamburguesa");
  const esMovil = window.matchMedia("(max-width: 768px)").matches;
  const panel = document.querySelector(".panel-empleado");
  if (esMovil) navegacion.classList.remove("abierto");
  const colapsado = panel.classList.contains("menu-colapsado");
  botonHamburguesa.setAttribute(
    "aria-expanded",
    String(!esMovil && !colapsado),
  );
  botonHamburguesa.setAttribute(
    "aria-label",
    esMovil
      ? "Abrir menú de navegación"
      : colapsado
        ? "Expandir menú de navegación"
        : "Contraer menú de navegación",
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenuMovil() {
  const navegacion = document.getElementById("menuNavegacion");
  const botonHamburguesa = document.querySelector(".boton-hamburguesa");
  if (window.matchMedia("(max-width: 768px)").matches) {
    const abierto = navegacion.classList.toggle("abierto");

    botonHamburguesa.setAttribute("aria-expanded", String(abierto));
    botonHamburguesa.setAttribute(
      "aria-label",
      abierto ? "Cerrar menú de navegación" : "Abrir menú de navegación",
    );
    return;
  }

  const panel = document.querySelector(".panel-empleado");
  const colapsado = panel.classList.toggle("menu-colapsado");
  botonHamburguesa.setAttribute("aria-expanded", String(!colapsado));
  botonHamburguesa.setAttribute(
    "aria-label",
    colapsado ? "Expandir menú de navegación" : "Contraer menú de navegación",
  );
  document.querySelectorAll("#menuNavegacion .boton-menu").forEach((button) => {
    const label = button.querySelector("span")?.textContent.trim();
    if (colapsado && label) {
      button.title = label;
      button.setAttribute("aria-label", label);
    } else {
      button.removeAttribute("title");
      button.removeAttribute("aria-label");
    }
  });
}

function configurarMenuLateral() {
  const panel = document.querySelector(".panel-empleado");
  const navegacion = document.getElementById("menuNavegacion");
  const botonHamburguesa = document.querySelector(".boton-hamburguesa");
  if (!panel || !navegacion || !botonHamburguesa) return;

  const esMovil = window.matchMedia("(max-width: 768px)").matches;
  const colapsado = !esMovil && panel.classList.contains("menu-colapsado");
  navegacion.classList.remove("abierto");
  botonHamburguesa.setAttribute("aria-expanded", String(!esMovil && !colapsado));
  botonHamburguesa.setAttribute(
    "aria-label",
    esMovil
      ? "Abrir menú de navegación"
      : colapsado
        ? "Expandir menú de navegación"
        : "Contraer menú de navegación",
  );
  document.querySelectorAll("#menuNavegacion .boton-menu").forEach((button) => {
    const label = button.querySelector("span")?.textContent.trim();
    if (colapsado && label) {
      button.title = label;
      button.setAttribute("aria-label", label);
    } else {
      button.removeAttribute("title");
      button.removeAttribute("aria-label");
    }
  });
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
    const cell = createCell("No hay productos registrados en esta sucursal.", "mensaje-vacio");
    cell.colSpan = 6;
    row.appendChild(cell);
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
      createCell(Number(product.stock) > 0 ? "Disponible" : "No disponible"),
    );
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
      createCell(
        warranty.quantity > 1
          ? `${warranty.product} (x${warranty.quantity})`
          : warranty.product,
      ),
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
  if (control.required) {
    const indicator = document.createElement("span");
    indicator.className = "obligatorio";
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = "*";
    label.append(" ", indicator);
  }
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
    input.value = input.value
      .normalize("NFC")
      .replace(/[^\p{L}\s'-]/gu, "")
      .replace(/\s+/g, " ")
      .replace(/^[\s'-]+|[\s'-]+$/g, "");
    input.setCustomValidity(validatePersonName(input.value));
  } else if (input.id === "empDocumento") {
    const documentType = document.getElementById("empTipoDocumento")?.value;
    input.value = documentType === "PAS"
      ? input.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase()
      : input.value.replace(/\D/g, "");
  } else if (input.dataset.validation === "phone") {
    input.value = input.value.replace(/[^+\d()\s-]/g, "");
  } else if (input.id === "empNacimiento") {
    input.setCustomValidity(validateBirthDate(input.value));
  } else if (input.id === "empConfirmarCorreo") {
    input.setCustomValidity("");
  } else if (input.id === "empConfirmarContrasena") {
    input.setCustomValidity("");
  }
}

function validatePersonName(value) {
  const name = String(value || "").normalize("NFC").trim();
  if (name.length < 2) return "El nombre debe tener al menos 2 caracteres.";
  if (name.length > 30) return "El nombre no puede superar 30 caracteres.";
  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(name)) {
    return "Ingresa un nombre válido sin números ni símbolos.";
  }
  return "";
}

function validateBirthDate(value) {
  if (!value) return "Selecciona la fecha de nacimiento.";
  const today = new Date();
  const minimumDate = new Date("1940-01-01T00:00:00");
  const selectedDate = new Date(`${value}T00:00:00`);
  const maximumDate = new Date(today);
  maximumDate.setFullYear(maximumDate.getFullYear() - 10);

  if (Number.isNaN(selectedDate.getTime())) return "Ingresa una fecha válida.";
  if (selectedDate < minimumDate) return "La fecha de nacimiento no puede ser anterior a 1940.";
  if (selectedDate > maximumDate) return "El cliente debe tener al menos 10 años.";
  return "";
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

const COLOMBIAN_LOCATIONS = {
  "Boyacá": ["Sogamoso", "Tunja", "Duitama", "Paipa", "Chiquinquirá", "Nobsa", "Garagoa"],
  "Cundinamarca": ["Bogotá D.C.", "Soacha", "Chía", "Zipaquirá", "Facatativá", "Girardot"],
  "Antioquia": ["Medellín", "Bello", "Envigado", "Itagüí", "Rionegro", "Apartadó"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
  "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Buga", "Cartago"],
  "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia"],
  "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda", "Chaparral"],
  "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López"],
  "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Los Patios", "Villa del Rosario"],
};

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
  const modalBox = modal.querySelector(".caja-modal-empleado");
  fields.replaceChildren();
  fields.classList.remove("campos-cliente-completo");
  modalBox.classList.remove("modal-cliente-amplio");
  form.reset();

  if (tipo === "taller") {
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
    modal.querySelector(".caja-modal-empleado").classList.add("modal-cliente-amplio");
    const name = createInput("empNombre", "text", "Ej. Carlos");
    name.minLength = 2;
    name.maxLength = 30;
    name.dataset.validation = "name";
    const lastName = createInput("empApellido", "text", "Ej. Ramírez");
    lastName.minLength = 2;
    lastName.maxLength = 30;
    lastName.dataset.validation = "name";
    const birthDate = createInput("empNacimiento", "date", "");
    birthDate.min = "1940-01-01";
    birthDate.max = new Date(new Date().setFullYear(new Date().getFullYear() - 10))
      .toISOString().slice(0, 10);
    birthDate.setAttribute("lang", "es");
    const documentType = createSelect("empTipoDocumento", "Tipo de documento", [
      { value: "CC", label: "Cédula de ciudadanía" },
      { value: "TI", label: "Tarjeta de identidad" },
      { value: "CE", label: "Cédula de extranjería" },
      { value: "PAS", label: "Pasaporte" },
      { value: "NIT", label: "NIT" },
    ]);
    documentType.value = "CC";
    const documentNumber = createInput("empDocumento", "text", "Ej. 1075654321");
    documentNumber.maxLength = 20;
    documentNumber.minLength = 6;
    documentNumber.inputMode = "numeric";
    documentNumber.pattern = "[0-9]{6,20}";
    documentNumber.dataset.validation = "document";
    documentType.addEventListener("change", () => {
      if (documentType.value === "PAS") {
        documentNumber.inputMode = "text";
        documentNumber.pattern = "[A-Za-z0-9-]{5,20}";
        documentNumber.placeholder = "Ej. AB123456";
      } else {
        documentNumber.inputMode = "numeric";
        documentNumber.pattern = "[0-9]{6,20}";
        documentNumber.placeholder = "Ej. 1075654321";
      }
      documentNumber.value = "";
      documentNumber.setCustomValidity("");
    });
    const department = createSelect(
      "empDepartamento",
      "Selecciona un departamento",
      Object.keys(COLOMBIAN_LOCATIONS).map((name) => ({ value: name, label: name })),
    );
    department.value = "Boyacá";
    const city = createSelect("empCiudad", "Selecciona municipio / ciudad", []);
    const address = createInput("empDireccion", "text", "Ej. Carrera 11 #14-14 Local 126");
    address.minLength = 5;
    address.maxLength = 40;
    const phone = createInput("empTelefono", "tel", "Ej. 3123456789");
    phone.pattern = "[0-9 +()-]{7,20}";
    phone.inputMode = "tel";
    phone.maxLength = 20;
    phone.dataset.validation = "phone";
    const secondaryPhone = createInput("empTelefonoSecundario", "tel", "Ej. 6087701234", false);
    secondaryPhone.pattern = "[0-9 +()-]{7,20}";
    secondaryPhone.inputMode = "tel";
    secondaryPhone.maxLength = 20;
    secondaryPhone.dataset.validation = "phone";
    const email = createInput("empCorreo", "email", "Ej. cliente@email.com");
    email.maxLength = 120;
    const confirmEmail = createInput("empConfirmarCorreo", "email", "Repite el correo electrónico");
    confirmEmail.maxLength = 120;
    const password = createInput("empContrasena", "password", "Mínimo 8 caracteres");
    password.minLength = 8;
    password.maxLength = 128;
    const confirmPassword = createInput("empConfirmarContrasena", "password", "Repite la contraseña");
    confirmPassword.minLength = 8;
    confirmPassword.maxLength = 128;

    function updateCities() {
      city.replaceChildren(new Option("Selecciona municipio / ciudad", ""));
      (COLOMBIAN_LOCATIONS[department.value] || []).forEach((cityName) => {
        city.add(new Option(cityName, cityName));
      });
    }
    department.addEventListener("change", updateCities);
    updateCities();
    city.value = "Sogamoso";

    fields.append(
      createField("Nombre", name),
      createField("Apellido", lastName),
      createField("Fecha de nacimiento", birthDate),
      createField("Tipo de documento", documentType),
      createField("Número de documento", documentNumber),
      createField("Departamento", department),
      createField("Municipio / Ciudad", city),
      createField("Dirección principal", address),
      createField("Teléfono de contacto", phone),
      createField("Teléfono secundario (opcional)", secondaryPhone),
      createField("Correo electrónico", email),
      createField("Confirmar correo electrónico", confirmEmail),
      createField("Contraseña", password),
      createField("Confirmar contraseña", confirmPassword),
    );
    fields.classList.add("campos-cliente-completo");
    form.querySelector('[type="submit"]').disabled = false;
  } else {
    fields.classList.remove("campos-cliente-completo");
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

  if (tipoRegistroActual === "cliente") {
    const email = document.getElementById("empCorreo");
    const confirmEmail = document.getElementById("empConfirmarCorreo");
    const password = document.getElementById("empContrasena");
    const confirmPassword = document.getElementById("empConfirmarContrasena");
    const birthDate = document.getElementById("empNacimiento");
    const documentType = document.getElementById("empTipoDocumento");
    const documentNumber = document.getElementById("empDocumento");
    const phone = document.getElementById("empTelefono");
    const secondaryPhone = document.getElementById("empTelefonoSecundario");
    const firstName = document.getElementById("empNombre");
    const lastName = document.getElementById("empApellido");

    firstName.setCustomValidity(validatePersonName(firstName.value));
    lastName.setCustomValidity(validatePersonName(lastName.value));
    birthDate.setCustomValidity(validateBirthDate(birthDate.value));
    documentNumber.setCustomValidity(
      documentType.value === "PAS"
        ? (/^[A-Za-z0-9-]{5,20}$/.test(documentNumber.value)
          ? ""
          : "Usa entre 5 y 20 caracteres alfanuméricos.")
        : (/^[0-9]{6,20}$/.test(documentNumber.value)
          ? ""
          : "El documento seleccionado debe contener solo números."),
    );
    phone.setCustomValidity(
      /^[0-9]{7,15}$/.test(phone.value.replace(/\D/g, ""))
        ? ""
        : "El teléfono debe contener entre 7 y 15 dígitos.",
    );
    secondaryPhone.setCustomValidity(
      !secondaryPhone.value ||
      /^[0-9]{7,15}$/.test(secondaryPhone.value.replace(/\D/g, ""))
        ? ""
        : "El teléfono secundario debe contener entre 7 y 15 dígitos.",
    );
    confirmEmail.setCustomValidity(
      confirmEmail.value.trim().toLowerCase() === email.value.trim().toLowerCase()
        ? ""
        : "Los correos electrónicos no coinciden.",
    );
    confirmPassword.setCustomValidity(
      confirmPassword.value === password.value
        ? ""
        : "Las contraseñas no coinciden.",
    );
    if (!event.currentTarget.reportValidity()) return;
  }
  submitButton.disabled = true;

  try {
    let path;
    let body;
    if (tipoRegistroActual === "taller") {
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
      const firstNameValue = document.getElementById("empNombre").value.trim();
      const lastNameValue = document.getElementById("empApellido").value.trim();
      body = {
        name: `${firstNameValue} ${lastNameValue}`.trim(),
        firstName: firstNameValue,
        lastName: lastNameValue,
        birthDate: document.getElementById("empNacimiento").value,
        documentType: document.getElementById("empTipoDocumento").value,
        documentNumber: document.getElementById("empDocumento").value.trim(),
        department: document.getElementById("empDepartamento").value,
        city: document.getElementById("empCiudad").value,
        address: document.getElementById("empDireccion").value.trim(),
        phone: document.getElementById("empTelefono").value.trim(),
        secondaryPhone: document.getElementById("empTelefonoSecundario").value.trim(),
        email: document.getElementById("empCorreo").value.trim(),
        confirmEmail: document.getElementById("empConfirmarCorreo").value.trim(),
        password: document.getElementById("empContrasena").value,
        confirmPassword: document.getElementById("empConfirmarContrasena").value,
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

    const successMessage = result.message;
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
  if (!(await window.confirmarCierreSesion())) return;

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
    localStorage.removeItem("wiiu_cart");
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
