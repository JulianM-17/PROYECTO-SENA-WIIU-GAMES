document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".seccion-productos-cat .grid-productos");
  const sidebar = document.querySelector(".barra-lateral");
  if (!grid || !sidebar) return;

  const products = readProducts();
  const state = {
    category: "",
    minPrice: 0,
    maxPrice: Infinity,
    brand: "",
    search: "",
  };

  addSearchControl(grid, state, renderCatalog);
  configureCategoryFilters(sidebar, state, renderCatalog);
  configurePriceFilters(sidebar, state, renderCatalog);
  configureBrandFilters(sidebar, state, renderCatalog);

  sidebar.querySelector(".btn-limpiar")?.addEventListener("click", () => {
    state.category = "";
    state.minPrice = 0;
    state.maxPrice = Infinity;
    state.brand = "";
    state.search = "";
    sidebar
      .querySelectorAll("li.activo, .cuadricula-marcas span.activo")
      .forEach((item) => item.classList.remove("activo"));
    const searchInput = document.getElementById("busqueda-catalogo");
    if (searchInput) searchInput.value = "";
    renderCatalog();
  });

  sidebar
    .querySelector(".btn-aplicar")
    ?.addEventListener("click", renderCatalog);
  sidebar.querySelector(".btn-todas-marcas")?.addEventListener("click", () => {
    state.brand = "";
    sidebar
      .querySelectorAll(".cuadricula-marcas span.activo")
      .forEach((item) => item.classList.remove("activo"));
    renderCatalog();
  });

  renderCatalog();

  function renderCatalog() {
    if (products.length === 0) return;

    const filteredProducts = products.filter((product) => {
      const searchableText =
        `${product.name} ${product.category} ${product.publisher}`.toLowerCase();
      const matchesSearch =
        !state.search || searchableText.includes(state.search);
      const matchesCategory =
        !state.category || matchesCategoryFilter(product, state.category);
      const price = Number(product.price) || 0;
      const matchesPrice = price >= state.minPrice && price <= state.maxPrice;
      const matchesBrand =
        !state.brand || (product.publisher || "").toLowerCase() === state.brand;
      return matchesSearch && matchesCategory && matchesPrice && matchesBrand;
    });

    grid.innerHTML = filteredProducts.length
      ? filteredProducts.map(productCard).join("")
      : '<p class="mensaje-sin-productos">No encontramos productos con esos filtros.</p>';

    updateFilterCounts(filteredProducts, sidebar);
  }
});

function readProducts() {
  try {
    return JSON.parse(localStorage.getItem("wiiu_products") || "[]");
  } catch {
    return [];
  }
}

function addSearchControl(grid, state, render) {
  const heading = grid
    .closest(".seccion-productos-cat")
    ?.querySelector(".carrusel-productos");
  if (!heading || document.getElementById("busqueda-catalogo")) return;

  const searchWrapper = document.createElement("label");
  searchWrapper.className = "busqueda-catalogo-wrapper";
  searchWrapper.innerHTML =
    '<span>Buscar productos</span><input id="busqueda-catalogo" type="search" placeholder="Nombre, categoría o marca...">';
  heading.insertAdjacentElement("beforebegin", searchWrapper);

  searchWrapper.querySelector("input").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });
}

function configureCategoryFilters(sidebar, state, render) {
  const categoryItems = sidebar.querySelectorAll(
    ".grupo-filtro:first-of-type li",
  );
  categoryItems.forEach((item) => {
    item.addEventListener("click", () => {
      state.category = item.textContent
        .replace(/\(\d+\)/g, "")
        .trim()
        .toLowerCase();
      categoryItems.forEach((option) => option.classList.remove("activo"));
      item.classList.add("activo");
      render();
    });
  });
}

function configurePriceFilters(sidebar, state, render) {
  const priceItems = Array.from(
    sidebar.querySelectorAll(".grupo-filtro")[1]?.querySelectorAll("li") || [],
  );
  priceItems.forEach((item) => {
    item.addEventListener("click", () => {
      const values = item.textContent.replace(/\./g, "").match(/\d+/g) || [];
      state.minPrice = Number(values[0]) || 0;
      state.maxPrice = values.length > 1 ? Number(values[1]) : Infinity;
      priceItems.forEach((option) => option.classList.remove("activo"));
      item.classList.add("activo");
      render();
    });
  });
}

function configureBrandFilters(sidebar, state, render) {
  sidebar.querySelectorAll(".cuadricula-marcas span").forEach((brand) => {
    brand.addEventListener("click", () => {
      state.brand = brand.textContent.trim().toLowerCase();
      sidebar
        .querySelectorAll(".cuadricula-marcas span")
        .forEach((item) => item.classList.remove("activo"));
      brand.classList.add("activo");
      render();
    });
  });
}

function matchesCategoryFilter(product, filter) {
  const category =
    `${product.category || ""} ${product.name || ""}`.toLowerCase();
  if (filter.includes("custom"))
    return category.includes("pc") || category.includes("comput");
  if (filter.includes("all-in-one"))
    return category.includes("all") || category.includes("comput");
  if (filter.includes("laptop"))
    return category.includes("laptop") || category.includes("portátil");
  return category.includes(filter);
}

function productCard(product) {
  const available = Number(product.stock) > 0;
  const image = product.imageUrl || "../Assets/lenovolegion.webp";
  const description =
    product.description ||
    product.category ||
    "Producto disponible en WiiU Games";
  const price =
    Number(product.price) > 0
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(product.price)
      : "Consultar precio";

  return `
    <a href="Product.html?id=${encodeURIComponent(product.id)}" class="enlace-producto">
      <article class="tarjeta-producto">
        <div class="estado-stock ${available ? "disponible" : "consultar"}">${available ? "Con stock" : "Agotado"}</div>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" class="imagen-producto" loading="lazy">
        <div class="calificacion">★★★★★ <span class="resenas">${escapeHtml(product.category || "Producto")}</span></div>
        <h3 class="titulo-producto">${escapeHtml(product.name)}</h3>
        <p class="descripcion">${escapeHtml(description)}</p>
        <div class="precio-actual">${price}</div>
      </article>
    </a>
  `;
}

function updateFilterCounts(products, sidebar) {
  const count = sidebar.querySelector(".btn-aplicar");
  if (count) count.textContent = `Mostrar resultados (${products.length})`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
