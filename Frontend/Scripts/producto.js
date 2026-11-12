document.addEventListener("DOMContentLoaded", () => {
  initializeProduct();
});

async function initializeProduct() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const storedProducts = readProducts();
  let products = storedProducts;
  let product = products.find((item) => String(item.id) === String(productId));

  if ((!products.length || (productId && !product))) {
    const apiProducts = await loadProductsFromApi();
    if (apiProducts?.length) {
      products = apiProducts;
      product = products.find((item) => String(item.id) === String(productId));
    }
  }
  product ||= products[0] || getFallbackProduct();

  updateProductHeader(product);
  renderProductSections(product, products);
  configureCartButton(product);
}

function readProducts() {
  try {
    const products = JSON.parse(localStorage.getItem("wiiu_products") || "[]");
    return Array.isArray(products) ? products.map(normalizeProduct) : [];
  } catch (error) {
    console.error("No se pudo leer el catálogo guardado:", error);
    return [];
  }
}

async function loadProductsFromApi() {
  try {
    const response = await fetch("http://localhost:3000/api/productos");
    if (!response.ok) {
      throw new Error(`La API respondió con estado ${response.status}`);
    }

    const products = await response.json();
    if (!Array.isArray(products)) {
      throw new Error("La API devolvió un catálogo con formato inválido.");
    }

    const normalizedProducts = products.map(normalizeProduct);
    try {
      localStorage.setItem("wiiu_products", JSON.stringify(normalizedProducts));
    } catch (error) {
      console.error("No se pudo guardar el catálogo de productos:", error);
    }
    return normalizedProducts;
  } catch (error) {
    console.error("No se pudo cargar el producto desde la API:", error);
    return null;
  }
}

function normalizeProduct(product) {
  const images = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.imageUrl ?? product.imagen_url,
    product.imagen_url_2 ?? product.imageUrl2,
    product.imagen_url_3 ?? product.imageUrl3,
    product.imagen_url_4 ?? product.imageUrl4,
  ]
    .filter((image) => typeof image === "string" && image.trim())
    .map((image) => image.trim())
    .filter((image, index, list) => list.indexOf(image) === index);

  return {
    ...product,
    id: product.id ?? product.id_producto ?? product.productId,
    name: product.name ?? product.nombre,
    price: product.price ?? product.precio,
    imageUrl: product.imageUrl ?? product.imagen_url ?? images[0],
    images,
    description: product.description ?? product.descripcion,
    category: product.category ?? product.nombre_cat,
    condition: product.condition ?? "Nuevo sellado",
    warranty: product.warranty ?? "12 meses",
    platform: product.platform ?? product.nombre_marca,
    stock: product.stock ?? product.stock_total,
  };
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
  setText(".info-producto h1", name);

  const rutaEl = document.querySelector(".categoria-ruta");
  if (rutaEl) {
    rutaEl.replaceChildren();
    [
      { text: "Inicio", href: "../Index.html" },
      { text: category, href: "Catalog.html" },
      { text: name },
    ].forEach((crumb, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "miga-separador";
        separator.textContent = "›";
        rutaEl.append(separator);
      }

      const element = document.createElement(crumb.href ? "a" : "span");
      element.textContent = crumb.text;
      if (crumb.href) element.setAttribute("href", crumb.href);
      if (!crumb.href) element.className = "miga-activa";
      rutaEl.append(element);
    });
  }

  const price = Number(product.price);
  if (Number.isFinite(price)) {
    setText(
      ".precio-producto-hero",
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(price),
    );
  }

  const stock = Number(product.stock);
  const inStock = Number.isFinite(stock) && stock > 0;
  setText(
    ".estado-disponibilidad",
    inStock ? "¡Disponible en tienda!" : Number.isFinite(stock) ? "Agotado" : "Consulta disponibilidad",
  );
  setText(
    ".unidades-disponibles",
    inStock ? `Unidades disponibles: ${stock}` : "Consulta la disponibilidad con nuestro equipo.",
  );
  setText(".insignia-stock", inStock ? "En stock" : "Consulta disponibilidad");

  const image = document.querySelector(".imagen-hero");
  if (image) {
    image.alt = name;
    image.onerror = function() {
      // Si la imagen falla o no existe, asignar un fallback visual elegante
      const cat = (product.category || "").toLowerCase();
      if (cat.includes("consola")) {
        image.src = "../Assets/Consolas_Juegos.png";
      } else if (cat.includes("portatil")) {
        image.src = "../Assets/Portatiles.png";
      } else if (cat.includes("grafica")) {
        image.src = "../Assets/Tarjetas_Graficas.png";
      } else if (cat.includes("periferico") || name.toLowerCase().includes("mouse")) {
        image.src = "../Assets/Perifericos.png";
      } else if (cat.includes("almacenamiento") || name.toLowerCase().includes("ssd")) {
        image.src = "../Assets/Almacenamiento.png";
      } else if (cat.includes("monitor")) {
        image.src = "../Assets/MONITOR.png";
      } else if (cat.includes("ram")) {
        image.src = "../Assets/ram.png";
      } else if (cat.includes("procesador")) {
        image.src = "../Assets/procesadores.png";
      } else {
        image.src = "../Assets/MSI.png";
      }
    };

    image.src = resolveProductImage(product.imageUrl);
    renderProductGallery(product, image, name);
  }
}

function renderProductGallery(product, mainImage, productName) {
  const thumbnails = document.querySelector(".miniaturas-producto");
  if (!thumbnails) return;

  const images = product.images?.length
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  thumbnails.replaceChildren();

  images.forEach((imageUrl, index) => {
    const thumbnail = document.createElement("button");
    thumbnail.type = "button";
    thumbnail.className = "miniatura-producto";
    thumbnail.setAttribute("aria-label", `Ver imagen ${index + 1} de ${productName}`);
    thumbnail.setAttribute("aria-pressed", String(index === 0));
    if (index === 0) thumbnail.classList.add("activo");

    const image = document.createElement("img");
    image.src = resolveProductImage(imageUrl);
    image.alt = `${productName}, imagen ${index + 1}`;
    image.loading = "lazy";
    image.addEventListener("error", () => thumbnail.remove(), { once: true });
    thumbnail.append(image);

    thumbnail.addEventListener("click", () => {
      mainImage.src = resolveProductImage(imageUrl);
      mainImage.alt = image.alt;
      thumbnails.querySelectorAll(".miniatura-producto").forEach((item) => {
        const active = item === thumbnail;
        item.classList.toggle("activo", active);
        item.setAttribute("aria-pressed", String(active));
      });
    });

    thumbnails.append(thumbnail);
  });
}

function resolveProductImage(imageUrl) {
  const source = String(imageUrl || "").trim();
  if (!source) return "../Assets/MSI.png";
  return source.startsWith("http") || source.startsWith("../")
    ? source
    : `../${source}`;
}

function renderProductSections(product, products) {
  setText(
    ".texto-descripcion-producto",
    product.description || "Consulta con nuestro equipo para conocer más detalles de este producto.",
  );

  const recommendations = products
    .filter((item) => item.id && String(item.id) !== String(product.id))
    .slice(0, 4);
  const container = document.querySelector("#productos-sugeridos");
  if (!container) return;

  if (recommendations.length === 0) {
    container.innerHTML = '<p class="sin-sugerencias">Por ahora no hay otros productos para mostrar.</p>';
    return;
  }

  container.innerHTML = recommendations
    .map((item) => {
      const name = escapeHtml(item.name || "Producto WiiU Games");
      const image = escapeHtml(item.imageUrl || "../Assets/lenovolegion.webp");
      const id = encodeURIComponent(String(item.id));
      const price = Number(item.price);
      const formattedPrice = Number.isFinite(price)
        ? new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          }).format(price)
        : "Consultar precio";

      return `
        <a class="tarjeta-sugerencia" href="Product.html?id=${id}">
          <span class="imagen-sugerencia">
            <img src="${image}" alt="${name}" loading="lazy" onerror="this.src='../Assets/lenovolegion.webp'">
          </span>
          <span class="nombre-sugerencia">${name}</span>
          <span class="precio-sugerencia">${escapeHtml(formattedPrice)}</span>
        </a>
      `;
    })
    .join("");
}

function configureCartButton(product) {
  const button = document.querySelector(".btn-añadir");
  const quantityInput = document.querySelector("#cantidad-producto");
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}
