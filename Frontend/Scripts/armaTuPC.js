const COMPONENTS = [
  {
    id: "torre",
    label: "Torre y fuente",
    description: "La base del equipo y su alimentación.",
    icon: "01",
    options: [
      { name: "Torre gamer con fuente 650 W", price: 499900 },
      { name: "Torre gamer RGB con fuente 750 W", price: 699900 },
      { name: "Torre profesional con fuente 850 W", price: 949900 },
    ],
  },
  {
    id: "procesador",
    label: "Procesador",
    description: "El motor principal de tu PC.",
    icon: "02",
    options: [
      { name: "AMD Ryzen 5 5600G", price: 629900, socket: "AM4" },
      { name: "AMD Ryzen 7 5700X", price: 999900, socket: "AM4" },
      { name: "Intel Core i5 12400F", price: 899900, socket: "LGA1700" },
    ],
  },
  {
    id: "placa",
    label: "Placa madre",
    description: "Conecta y coordina todos los componentes.",
    icon: "03",
    options: [
      { name: "Placa madre AM4 B550", price: 529900, socket: "AM4" },
      { name: "Placa madre Intel B660", price: 649900, socket: "LGA1700" },
    ],
  },
  {
    id: "grafica",
    label: "Tarjeta gráfica",
    description: "Más potencia para juegos y creación.",
    icon: "04",
    options: [
      { name: "Gráficos integrados", price: 0 },
      { name: "NVIDIA GeForce RTX 4060", price: 1599900 },
      { name: "NVIDIA GeForce RTX 4070", price: 2699900 },
    ],
  },
  {
    id: "memoria",
    label: "Memoria RAM",
    description: "Fluidez para tus programas y juegos.",
    icon: "05",
    options: [
      { name: "16 GB DDR4", price: 249900 },
      { name: "32 GB DDR4", price: 449900 },
      { name: "32 GB DDR5", price: 699900 },
    ],
  },
  {
    id: "almacenamiento",
    label: "Almacenamiento",
    description: "Espacio y velocidad para tus archivos.",
    icon: "06",
    options: [
      { name: "SSD NVMe 500 GB", price: 189900 },
      { name: "SSD NVMe 1 TB", price: 329900 },
      { name: "SSD NVMe 1 TB + HDD 2 TB", price: 529900 },
    ],
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const componentContainer = document.getElementById("componentes");
  const summaryContainer = document.getElementById("resumen-componentes");
  const totalElement = document.getElementById("total-configuracion");
  const compatibilityElement = document.getElementById("compatibilidad");
  const requestButton = document.getElementById("btn-solicitar");
  const selections = {};

  COMPONENTS.forEach((component) => {
    const card = document.createElement("article");
    card.className = "componente-card";

    const icon = document.createElement("span");
    icon.className = "componente-icono";
    icon.textContent = component.icon;

    const copy = document.createElement("div");
    copy.innerHTML = `<h3>${escapeHtml(component.label)}</h3><p>${escapeHtml(component.description)}</p>`;

    const select = document.createElement("select");
    select.id = `selector-${component.id}`;
    select.setAttribute("aria-label", component.label);
    select.innerHTML = '<option value="">Selecciona una opción</option>';

    component.options.forEach((option, index) => {
      const optionElement = document.createElement("option");
      optionElement.value = String(index);
      optionElement.textContent = `${option.name} - ${formatPrice(option.price)}`;
      select.appendChild(optionElement);
    });

    select.addEventListener("change", () => {
      const selectedIndex = select.value;
      selections[component.id] =
        selectedIndex === "" ? null : component.options[Number(selectedIndex)];
      updateSummary();
    });

    card.append(icon, copy, select);
    componentContainer.appendChild(card);
  });

  function updateSummary() {
    const selectedItems = Object.entries(selections).filter(
      ([, option]) => option,
    );
    const total = selectedItems.reduce(
      (sum, [, option]) => sum + option.price,
      0,
    );
    const processor = selections.procesador;
    const motherboard = selections.placa;
    const hasCompatibilityError =
      processor && motherboard && processor.socket !== motherboard.socket;

    summaryContainer.innerHTML = selectedItems.length
      ? selectedItems
          .map(([id, option]) => {
            const component = COMPONENTS.find((item) => item.id === id);
            return `<div class="resumen-linea"><span>${escapeHtml(component.label)}</span><strong>${escapeHtml(option.name)}</strong></div>`;
          })
          .join("")
      : '<p class="nota-resumen">Aún no has seleccionado componentes.</p>';

    totalElement.textContent = formatPrice(total);
    compatibilityElement.textContent = hasCompatibilityError
      ? "La placa madre y el procesador no son compatibles. Elige componentes con el mismo socket."
      : selectedItems.length > 1
        ? "Configuración compatible hasta ahora."
        : "Selecciona componentes para revisar la compatibilidad.";
    compatibilityElement.classList.toggle(
      "error",
      Boolean(hasCompatibilityError),
    );
    requestButton.disabled =
      Boolean(hasCompatibilityError) || selectedItems.length === 0;
  }

  requestButton.addEventListener("click", () => {
    const selectedItems = Object.entries(selections).filter(
      ([, option]) => option,
    );
    const total = selectedItems.reduce(
      (sum, [, option]) => sum + option.price,
      0,
    );
    const request = {
      id: Date.now(),
      type: "configuracion-pc",
      components: selectedItems.map(([id, option]) => ({
        id,
        name: option.name,
        price: option.price,
      })),
      total,
      createdAt: new Date().toISOString(),
    };
    const savedRequests = JSON.parse(
      localStorage.getItem("wiiu_pc_configurations") || "[]",
    );
    savedRequests.unshift(request);
    localStorage.setItem(
      "wiiu_pc_configurations",
      JSON.stringify(savedRequests),
    );
    requestButton.textContent = "Configuración guardada";
    window.setTimeout(() => {
      requestButton.textContent = "Solicitar esta configuración";
    }, 1600);
  });

  updateSummary();
});

function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
