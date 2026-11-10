document.addEventListener("DOMContentLoaded", () => {
  initializeProduct();
});

async function initializeProduct() {
  const products = readProducts();
  const productId = new URLSearchParams(window.location.search).get("id");
  let product =
    products.find((item) => item.id === productId) ||
    products.find((item) => String(item.id) === String(productId));

  if (!product && productId) {
    product = await loadProductFromApi(productId);
  }
  product ||= products[0] || getFallbackProduct();

  updateProductHeader(product);
  replaceFixedSections(product);
  configureCartButton(product);
}

function readProducts() {
  try {
    return JSON.parse(localStorage.getItem("wiiu_products") || "[]");
  } catch {
    return [];
  }
}

async function loadProductFromApi(productId) {
  try {
    const response = await fetch("http://localhost:3000/api/productos");
    if (!response.ok) {
      throw new Error(`La API respondió con estado ${response.status}`);
    }

    const products = await response.json();
    const product = Array.isArray(products)
      ? products.find((item) => String(item.id_producto) === String(productId))
      : null;
    if (!product || !product.id_producto) {
      throw new Error("La API no encontró el producto solicitado.");
    }
    return {
      id: product.id_producto,
      name: product.nombre,
      price: Number(product.precio),
      imageUrl: product.imagen_url,
      description: product.descripcion,
      category: product.nombre_cat,
      condition: "Nuevo Sellado",
      warranty: "12 Meses",
      platform: product.nombre_marca,
      stock: Number(product.stock_total) || 0,
    };
  } catch (error) {
    console.error("No se pudo cargar el producto desde la API:", error);
    return null;
  }
}

function getFallbackProduct() {
  return {
    id: "demo",
    name: "Producto WiiU Games",
    category: "Producto",
    description:
      "Consulta la información disponible de este producto antes de comprar.",
    imageUrl: "../Assets/MSI.png",
    condition: "Consultar disponibilidad",
    warranty: "Según disponibilidad",
    platform: "Ver descripción",
    stock: 0,
  };
}

function updateProductHeader(product) {
  const description =
    product.description || "Este producto no tiene una descripción adicional.";
  const name = product.name || "Producto WiiU Games";
  const category = product.category || "Productos";

  document.title = `${name} - WiiU Games`;
  setText(".sku strong", name);
  setText(".categoria-ruta", `Inicio > ${category} > ${name}`);
  setText(".info-producto h1", name);
  setText(".descripcion-corta", description);

  const image = document.querySelector(".imagen-hero");
  if (image && product.imageUrl) {
    image.src = product.imageUrl;
    image.alt = name;
  }
}

function replaceFixedSections(product) {
  document.querySelector(".banner-publicitario")?.remove();
  document.querySelector(".seccion-soporte")?.remove();
  document.querySelector(".seccion-caracteristicas")?.remove();

  const main = document.querySelector("main");
  const detailSection = document.querySelector(".detalle-principal");
  if (!main || !detailSection) return;

  const description =
    product.description || "Este producto no tiene una descripción adicional.";
  const fields = [
    ["Categoría", product.category],
    ["Estado", product.condition],
    ["Garantía", product.warranty],
    ["Formato", product.platform],
    [
      "Disponibilidad",
      Number(product.stock) > 0
        ? `${product.stock} unidades disponibles`
        : "Consultar disponibilidad",
    ],
  ].filter(([, value]) => value);

  const section = document.createElement("section");
  section.className = "seccion-caracteristicas informacion-dinamica";
  section.setAttribute("aria-labelledby", "titulo-informacion-producto");

  const title = document.createElement("h2");
  title.id = "titulo-informacion-producto";
  title.textContent = "Información del producto";

  const subtitle = document.createElement("p");
  subtitle.className = "subtitulo-caracteristicas";
  subtitle.textContent = description;

  const grid = document.createElement("div");
  grid.className = "grid-caracteristicas";
  fields.forEach(([label, value]) => {
    const item = document.createElement("article");
    item.className = "item-caracteristica";

    const heading = document.createElement("h3");
    heading.textContent = label;

    const text = document.createElement("p");
    text.textContent = value;

    item.append(heading, text);
    grid.appendChild(item);
  });

  section.append(title, subtitle, grid);
  main.insertBefore(
    section,
    document.querySelector(".seccion-beneficios") || null,
  );
}

function configureCartButton(product) {
  const button = document.querySelector(".btn-añadir");
  const quantityInput = document.querySelector(".input-cantidad");
  if (!button) return;

  const stock = Number(product.stock ?? product.stock_total);
  if (Number.isFinite(stock)) {
    quantityInput?.setAttribute("max", String(stock));
    button.disabled = stock <= 0;
    if (stock <= 0) button.textContent = "Agotado";
  }

  let feedback = button.parentElement.querySelector(".cart-feedback");
  if (!feedback) {
    feedback = document.createElement("span");
    feedback.className = "cart-feedback";
    feedback.setAttribute("aria-live", "polite");
    button.insertAdjacentElement("afterend", feedback);
  }

  button.addEventListener("click", () => {
    const quantity = Math.floor(Number(quantityInput?.value));
    if (!Number.isInteger(quantity) || quantity < 1) {
      feedback.textContent = "Ingresa una cantidad válida.";
      return;
    }
    const result = window.WiiUGamesCart?.add(product, quantity);
    if (!result?.ok) {
      feedback.textContent =
        result?.reason === "stock"
          ? `Solo hay ${result.stock} unidades disponibles.`
          : result?.reason === "unavailable"
            ? "Este producto está agotado."
            : "No se pudo agregar el producto al carrito.";
      return;
    }
    feedback.textContent = "Producto agregado al carrito.";
    button.textContent = "Agregado al carrito";
    button.disabled = true;
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = "Añadir al carrito";
      button.disabled = Number.isFinite(stock) && stock <= 0;
    }, 1400);
  });
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}
