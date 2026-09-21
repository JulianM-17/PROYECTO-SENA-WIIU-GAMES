document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.querySelector(".grid-productos");
  const previousButton = document.querySelector(".flecha-izq");
  const nextButton = document.querySelector(".flecha-der");

  if (!productGrid || !previousButton || !nextButton) return;

  const products = JSON.parse(localStorage.getItem("wiiu_products") || "[]");

  if (products.length > 0) {
    renderProducts(productGrid, products);
  }

  productGrid.style.overflowX = "auto";
  productGrid.style.scrollBehavior = "smooth";
  productGrid.style.scrollbarWidth = "none";

  const getScrollAmount = () => Math.max(productGrid.clientWidth * 0.85, 280);

  previousButton.addEventListener("click", () => {
    productGrid.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
  });

  nextButton.addEventListener("click", () => {
    productGrid.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
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

function renderProducts(container, products) {
  container.innerHTML = products
    .map((product) => {
      const stockClass = product.stock > 0 ? "disponible" : "consultar";
      const stockText = product.stock > 0 ? "Con stock" : "Agotado";
      const image = product.imageUrl || "../Assets/lenovolegion.webp";
      const price = formatPrice(product.price);
      const description =
        product.description ||
        product.category ||
        "Producto disponible en WiiU Games";

      return `
      <a href="Pages/Product.html?id=${encodeURIComponent(product.id)}" class="enlace-producto">
        <article class="tarjeta-producto">
          <div class="estado-stock ${stockClass}">${stockText}</div>
          <img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.name)}" class="imagen-producto" loading="lazy">
          <div class="calificacion">★★★★★ <span class="resenas">${escapeHtml(product.category || "Producto")}</span></div>
          <h3 class="titulo-producto">${escapeHtml(product.name)}</h3>
          <p class="descripcion">${escapeHtml(description)}</p>
          <div class="precio-actual">${price}</div>
        </article>
      </a>
    `;
    })
    .join("");
}

function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return "Consultar precio";
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
