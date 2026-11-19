document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.querySelector(".productos-carrusel-wrapper");
  const productGrid = carousel?.querySelector(".grid-productos");
  const previousButton = carousel?.querySelector(".flecha-izq");
  const nextButton = carousel?.querySelector(".flecha-der");

  if (!productGrid || !previousButton || !nextButton) return;

  productGrid.setAttribute("aria-live", "off");
  productGrid.setAttribute("aria-label", "Productos nuevos");
  productGrid.setAttribute("tabindex", "0");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const scrollBehavior = reduceMotion ? "auto" : "smooth";
  let autoplayTimer;

  const updateControls = () => {
    const maxScrollLeft = productGrid.scrollWidth - productGrid.clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    previousButton.disabled =
      !hasOverflow || productGrid.scrollLeft <= 1;
    nextButton.disabled =
      !hasOverflow || productGrid.scrollLeft >= maxScrollLeft - 1;
  };

  const getScrollAmount = () => {
    const firstCard = productGrid.querySelector(".tarjeta-producto");
    if (!firstCard) return productGrid.clientWidth * 0.85;

    const gap = Number.parseFloat(getComputedStyle(productGrid).columnGap) || 0;
    return firstCard.getBoundingClientRect().width + gap;
  };

  const stopAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = undefined;
  };

  const canAutoplay = () =>
    !reduceMotion &&
    !document.hidden &&
    !carousel.matches(":hover") &&
    !carousel.contains(document.activeElement);

  const startAutoplay = () => {
    if (autoplayTimer || !canAutoplay()) return;

    autoplayTimer = window.setInterval(() => {
      const maxScrollLeft = productGrid.scrollWidth - productGrid.clientWidth;
      if (maxScrollLeft <= 1) return;

      if (productGrid.scrollLeft >= maxScrollLeft - 1) {
        productGrid.scrollTo({ left: 0, behavior: scrollBehavior });
      } else {
        productGrid.scrollBy({
          left: getScrollAmount(),
          behavior: scrollBehavior,
        });
      }
    }, 2000);
  };

  const scrollPrevious = () => {
    productGrid.scrollBy({
      left: -getScrollAmount(),
      behavior: scrollBehavior,
    });
  };

  const scrollNext = () => {
    const maxScrollLeft = productGrid.scrollWidth - productGrid.clientWidth;
    if (productGrid.scrollLeft >= maxScrollLeft - 1) {
      productGrid.scrollTo({ left: 0, behavior: scrollBehavior });
      return;
    }
    productGrid.scrollBy({
      left: getScrollAmount(),
      behavior: scrollBehavior,
    });
  };

  loadProducts(productGrid).finally(() => {
    updateControls();
    startAutoplay();
  });

  previousButton.addEventListener("click", scrollPrevious);
  nextButton.addEventListener("click", scrollNext);

  productGrid.addEventListener("scroll", updateControls, { passive: true });
  window.addEventListener("resize", updateControls);
  updateControls();

  carousel.addEventListener("pointerenter", stopAutoplay);
  carousel.addEventListener("pointerleave", startAutoplay);
  carousel.addEventListener("focusin", stopAutoplay);
  carousel.addEventListener("focusout", startAutoplay);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  productGrid.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      productGrid.scrollLeft += event.deltaY;
    },
    { passive: false },
  );
});

async function loadProducts(container) {
  container.setAttribute("aria-busy", "true");
  renderStatus(container, "Cargando productos...");

  try {
    const response = await fetch("http://localhost:3000/api/productos");
    if (!response.ok) {
      throw new Error(`La API respondió con estado ${response.status}.`);
    }

    const products = await response.json();
    if (!Array.isArray(products)) {
      throw new Error("La API devolvió un formato de productos no válido.");
    }
    if (products.length === 0) {
      renderStatus(container, "No hay productos activos disponibles.");
      return;
    }

    renderProducts(container, products);
  } catch (error) {
    console.error("No se pudieron cargar los productos de inicio:", error);
    renderStatus(container, "No se pudieron cargar los productos. Intenta de nuevo más tarde.");
  } finally {
    container.setAttribute("aria-busy", "false");
  }
}

function renderStatus(container, message) {
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = message;
  status.style.width = "100%";
  status.style.padding = "24px";
  status.style.textAlign = "center";
  status.style.color = "#ffffff";
  container.replaceChildren(status);
}

function renderProducts(container, products) {
  const productsById = new Map(
    products.map((product) => [String(product.id_producto), product]),
  );

  container.innerHTML = products
    .map((product) => {
      const stock = Number(product.stock_total) || 0;
      const stockClass = stock > 0 ? "disponible" : "consultar";
      const stockText = stock > 0 ? "Con stock" : "Agotado";
      const image = product.imagen_url || "Assets/lenovolegion.webp";

      return `
      <article class="tarjeta-producto">
        <div class="estado-stock ${stockClass}">${stockText}</div>
        <a href="Pages/Product.html?id=${encodeURIComponent(product.id_producto)}" class="enlace-detalle-producto">
          <img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.nombre)}" class="imagen-producto" loading="lazy">
          <div class="calificacion"><span class="resenas">${escapeHtml(product.nombre_marca || product.nombre_cat || "Producto")}</span></div>
          <h3 class="titulo-producto">${escapeHtml(product.nombre)}</h3>
        </a>
        <div class="precio-actual">${formatPrice(product.precio)}</div>
        <div class="acciones-compra-producto">
          <input
            class="cantidad-producto"
            type="number"
            min="1"
            max="${stock}"
            step="1"
            value="1"
            aria-label="Cantidad de ${escapeAttribute(product.nombre)}"
            ${stock > 0 ? "" : "disabled"}
          >
          <button class="btn-agregar-carrito" type="button" data-product-id="${escapeAttribute(product.id_producto)}" ${stock > 0 ? "" : "disabled"}>
            ${stock > 0 ? "Agregar al carrito" : "Agotado"}
          </button>
        </div>
        <span class="mensaje-carrito" aria-live="polite"></span>
      </article>
    `;
    })
    .join("");

  container.querySelectorAll(".imagen-producto").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.src = "Assets/lenovolegion.webp";
      },
      { once: true },
    );
  });

  container.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-agregar-carrito");
    if (!button || !container.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    const product = productsById.get(button.dataset.productId);
    const card = button.closest(".tarjeta-producto");
    const quantityInput = card?.querySelector(".cantidad-producto");
    const feedback = card?.querySelector(".mensaje-carrito");
    const quantity = Number(quantityInput?.value);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > Number(product?.stock_total)
    ) {
      if (feedback) {
        feedback.textContent = `Selecciona una cantidad entre 1 y ${Number(product?.stock_total) || 0}.`;
        feedback.style.color = "#b91c1c";
      }
      quantityInput?.focus();
      return;
    }

    const result = window.WiiUGamesCart?.add(product, quantity);
    if (!result?.ok) {
      if (feedback) {
        if (result?.reason === "stock") {
          const currentQuantity =
            window.WiiUGamesCart?.read().find(
              (item) => String(item.productId) === String(product?.id_producto),
            )?.quantity || 0;
          const remaining = Math.max(0, result.stock - currentQuantity);
          feedback.textContent = remaining
            ? `Solo quedan ${remaining} disponibles.`
            : "Ya agregaste todas las unidades disponibles.";
        } else if (result?.reason === "unavailable") {
          feedback.textContent = "Producto agotado.";
        } else {
          feedback.textContent = "No se pudo agregar el producto al carrito.";
        }
        feedback.style.color = "#b91c1c";
      }
      return;
    }

    const originalText = button.textContent;
    button.textContent = "✔ ¡Agregado!";
    button.style.backgroundColor = "#22c55e";
    button.style.color = "#ffffff";
    if (feedback) {
      feedback.textContent = "¡Añadido al carrito con éxito!";
      feedback.style.color = "#22c55e";
    }
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = originalText;
      button.style.backgroundColor = "";
      button.style.color = "";
      if (feedback) {
        feedback.textContent = "";
        feedback.style.color = "";
      }
    }, 1500);
  });
}

function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return "Consultar precio";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
