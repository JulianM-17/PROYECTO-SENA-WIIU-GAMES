document.addEventListener("DOMContentLoaded", () => {
  const products = readProducts();
  const productId = Number(
    new URLSearchParams(window.location.search).get("id"),
  );
  const product =
    products.find((item) => item.id === productId) ||
    products[0] ||
    getFallbackProduct();

  updateProductHeader(product);
  replaceFixedSections(product);
  configureCartButton(product);
});

function readProducts() {
  try {
    return JSON.parse(localStorage.getItem("wiiu_products") || "[]");
  } catch {
    return [];
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

  button.addEventListener("click", () => {
    const quantity = Math.max(1, Number(quantityInput?.value) || 1);
    const cart = readCart();
    const existing = cart.find((item) => item.productId === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        imageUrl: product.imageUrl || "../Assets/MSI.png",
        quantity,
      });
    }

    localStorage.setItem("wiiu_cart", JSON.stringify(cart));
    button.textContent = "Agregado al carrito";
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = "Añadir al carrito";
      button.disabled = false;
    }, 1400);
  });
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("wiiu_cart") || "[]");
  } catch {
    return [];
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}
