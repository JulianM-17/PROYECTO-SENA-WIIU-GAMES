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

  // Formatear miga de pan con enlaces y estilo
  const rutaEl = document.querySelector(".categoria-ruta");
  if (rutaEl) {
    rutaEl.innerHTML = `
      <a href="../Index.html">Inicio</a>
      <span class="miga-separador">›</span>
      <a href="Catalog.html">${category}</a>
      <span class="miga-separador">›</span>
      <span class="miga-activa">${name}</span>
    `;
  }

  // Mostrar precio formateado si existe el producto
  let precioEl = document.querySelector(".precio-producto-hero");
  if (!precioEl) {
    const contenedorAcciones = document.querySelector(".sub-nav-acciones");
    if (contenedorAcciones && product.price) {
      precioEl = document.createElement("span");
      precioEl.className = "precio-producto-hero";
      precioEl.style.cssText = "font-weight: 800; font-size: 18px; color: var(--dark-blue); margin-right: 12px;";
      contenedorAcciones.insertBefore(precioEl, contenedorAcciones.querySelector(".input-cantidad"));
    }
  }
  if (precioEl && product.price) {
    precioEl.textContent = `$ ${Number(product.price).toLocaleString("es-CO")}`;
  }

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

    if (product.imageUrl) {
      image.src = product.imageUrl.startsWith("http") || product.imageUrl.startsWith("../") 
        ? product.imageUrl 
        : `../${product.imageUrl}`;
    } else {
      image.onerror();
    }
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
    product.description || "Este producto cuenta con respaldo y garantía oficial de WiiU Games.";
  const fields = [
    { label: "Categoría", value: product.category, icon: "fi fi-rr-box-alt" },
    { label: "Condición", value: product.condition || "Nuevo Sellado", icon: "fi fi-rr-shield-check" },
    { label: "Garantía Oficial", value: product.warranty || "12 Meses", icon: "fi fi-rr-award" },
    { label: "Marca / Fabricante", value: product.platform || "Original", icon: "fi fi-rr-tag" },
    {
      label: "Disponibilidad",
      value: Number(product.stock) > 0 ? `${product.stock} unidades en stock` : "Consultar disponibilidad",
      icon: "fi fi-rr-check-circle"
    },
    { label: "Envío Nacional", value: "Asegurado a todo Colombia", icon: "fi fi-rr-truck-side" }
  ].filter((f) => f.value);

  const section = document.createElement("section");
  section.className = "seccion-caracteristicas informacion-dinamica";
  section.setAttribute("aria-labelledby", "titulo-informacion-producto");

  section.innerHTML = `
    <div class="contenedor-acerca-producto">
      <span class="etiqueta-dorada">Especificaciones y Detalles</span>
      <h2 id="titulo-informacion-producto">Acerca de este Producto</h2>
      <p class="subtitulo-caracteristicas">${description}</p>
      
      <div class="grid-tarjetas-acerca">
        ${fields.map(f => `
          <div class="tarjeta-info-acerca">
            <div class="icono-acerca"><i class="${f.icon}"></i></div>
            <div class="texto-acerca">
              <span class="label-acerca">${f.label}</span>
              <strong class="valor-acerca">${f.value}</strong>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="banner-garantia-acerca">
        <div class="icono-garantia-grande"><i class="fi fi-rr-badge-check"></i></div>
        <div class="texto-garantia">
          <h4>Garantía y Soporte Técnico Directo</h4>
          <p>Todos nuestros productos son 100% originales, cuentan con inspección técnica previa y soporte garantizado en nuestra tienda física en Sogamoso, Boyacá.</p>
        </div>
      </div>
    </div>
  `;

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
