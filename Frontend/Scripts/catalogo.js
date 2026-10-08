const API_URL = 'http://localhost:3000/api';
const filtrosCatalogo = {
  categoria: '',
  marca: '',
  precioMin: 0,
  precioMax: Infinity
};
let productosCatalogo = [];

document.addEventListener('DOMContentLoaded', () => {
  configurarFiltros();
  configurarAgregarAlCarrito();
  cargarProductos();
  cargarCategorias();
  cargarMarcas();
});

//Cargar y renderizar productos
async function cargarProductos() {
  const contenedor = document.getElementById('grid-productos');
  if (!contenedor) {
    console.error('No se encontró el contenedor #grid-productos.');
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL}/productos`);
    if (!respuesta.ok) {
      throw new Error(`La API respondió con estado ${respuesta.status}`);
    }

    const productos = await respuesta.json();
    if (!Array.isArray(productos)) {
      throw new Error('La respuesta de la API no es una lista de productos.');
    }

    if (productos.length === 0) {
      contenedor.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
      return;
    }

    productosCatalogo = productos;
    renderizarProductos();
  } catch (error) {
    console.error('Error al cargar catálogo:', error);
    contenedor.innerHTML = '<p>Error al conectar con la base de datos.</p>';
  }
}

function configurarFiltros() {
  const listaCategorias = document.getElementById('lista-categorias');
  const filtroPrecio = document.getElementById('filtro-precio');
  const contenedorMarcas = document.getElementById('contenedor-marcas');
  const botonLimpiar = document.querySelector('.btn-limpiar');
  const botonAplicar = document.querySelector('.btn-aplicar');
  const botonTodasMarcas = document.getElementById('btn-todas-marcas');

  listaCategorias?.addEventListener('click', event => {
    const opcion = event.target.closest('li');
    if (!opcion || !listaCategorias.contains(opcion)) return;

    const categoria = opcion.dataset.categoria || '';
    filtrosCatalogo.categoria =
      filtrosCatalogo.categoria === categoria ? '' : categoria;
    listaCategorias.querySelectorAll('li').forEach(item => {
      item.classList.toggle('activo', item === opcion && filtrosCatalogo.categoria !== '');
    });
    renderizarProductos();
  });

  filtroPrecio?.addEventListener('click', event => {
    const opcion = event.target.closest('li[data-min-price]');
    if (!opcion || !filtroPrecio.contains(opcion)) return;

    const min = Number(opcion.dataset.minPrice);
    const max = opcion.dataset.maxPrice === ''
      ? Infinity
      : Number(opcion.dataset.maxPrice);
    const mismoRango =
      filtrosCatalogo.precioMin === min && filtrosCatalogo.precioMax === max;

    filtrosCatalogo.precioMin = mismoRango ? 0 : min;
    filtrosCatalogo.precioMax = mismoRango ? Infinity : max;
    filtroPrecio.querySelectorAll('li[data-min-price]').forEach(item => {
      item.classList.toggle('activo', item === opcion && !mismoRango);
    });
    renderizarProductos();
  });

  contenedorMarcas?.addEventListener('click', event => {
    const opcion = event.target.closest('span');
    if (!opcion || !contenedorMarcas.contains(opcion)) return;

    const marca = normalizar(opcion.textContent);
    filtrosCatalogo.marca = filtrosCatalogo.marca === marca ? '' : marca;
    contenedorMarcas.querySelectorAll('span').forEach(item => {
      item.classList.toggle('activo', item === opcion && filtrosCatalogo.marca !== '');
    });
    renderizarProductos();
  });

  botonLimpiar?.addEventListener('click', () => {
    filtrosCatalogo.categoria = '';
    filtrosCatalogo.marca = '';
    filtrosCatalogo.precioMin = 0;
    filtrosCatalogo.precioMax = Infinity;
    document.querySelectorAll(
      '#lista-categorias li.activo, #filtro-precio li.activo, #contenedor-marcas span.activo'
    ).forEach(item => item.classList.remove('activo'));
    renderizarProductos();
  });

  botonTodasMarcas?.addEventListener('click', () => {
    filtrosCatalogo.marca = '';
    contenedorMarcas?.querySelectorAll('span.activo').forEach(item => {
      item.classList.remove('activo');
    });
    renderizarProductos();
  });

  botonAplicar?.addEventListener('click', renderizarProductos);
}

function renderizarProductos() {
  const contenedor = document.getElementById('grid-productos');
  if (!contenedor) return;

  const botonAplicar = document.querySelector('.btn-aplicar');
  const productosFiltrados = productosCatalogo.filter(producto => {
    const coincideCategoria =
      !filtrosCatalogo.categoria ||
      normalizar(producto.nombre_cat) === filtrosCatalogo.categoria;
    const coincideMarca =
      !filtrosCatalogo.marca ||
      normalizar(producto.nombre_marca) === filtrosCatalogo.marca;
    const precio = Number(producto.precio);
    const coincidePrecio =
      precio >= filtrosCatalogo.precioMin &&
      precio <= filtrosCatalogo.precioMax;
    return coincideCategoria && coincideMarca && coincidePrecio;
  });

  if (productosCatalogo.length > 0 && productosFiltrados.length === 0) {
    contenedor.innerHTML = '<p class="mensaje-sin-productos">No encontramos productos con esos filtros.</p>';
  } else {
    contenedor.innerHTML = productosFiltrados.map(crearTarjetaProducto).join('');
  }

  if (botonAplicar) {
    botonAplicar.textContent = `Aplicar Filtros (${productosFiltrados.length})`;
  }
}

function crearTarjetaProducto(prod) {
  const tieneStock = Number(prod.stock_total) > 0;
  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(prod.precio) || 0);

  return `
    <article class="tarjeta-producto">
      <div class="estado-stock ${tieneStock ? 'disponible' : 'agotado'}">
        ${tieneStock ? 'Con Stock' : 'Agotado'}
      </div>
      <a href="Product.html?id=${encodeURIComponent(prod.id_producto)}" class="enlace-producto">
        <img
          src="${escapeHtml(prod.imagen_url || '../Assets/lenovolegion.webp')}"
          alt="${escapeHtml(prod.nombre)}"
          class="imagen-producto"
          onerror="this.src='../Assets/lenovolegion.webp'"
        />
        <div class="calificacion">
          ★★★★★ <span class="resenas">${escapeHtml(prod.nombre_marca || '')}</span>
        </div>
        <h3 class="titulo-producto">${escapeHtml(prod.nombre)}</h3>
      </a>
      <div class="precio-actual">${precioFormateado}</div>
      <button
        class="btn-agregar-carrito"
        type="button"
        data-product-id="${escapeHtml(prod.id_producto)}"
        ${tieneStock ? '' : 'disabled'}
      >${tieneStock ? 'Agregar al carrito' : 'Agotado'}</button>
      <span class="mensaje-carrito" aria-live="polite"></span>
    </article>
  `;
}

function configurarAgregarAlCarrito() {
  const grid = document.getElementById('grid-productos');
  if (!grid) return;

  grid.addEventListener('click', event => {
    const button = event.target.closest('.btn-agregar-carrito');
    if (!button || !grid.contains(button)) return;

    const product = productosCatalogo.find(
      item => String(item.id_producto) === button.dataset.productId
    );
    const feedback = button.nextElementSibling;
    const cart = window.WiiUGamesCart;
    if (!product || !cart) {
      console.error('No se pudo agregar el producto: falta el producto o el carrito.');
      if (feedback) feedback.textContent = 'No se pudo agregar al carrito.';
      return;
    }

    const result = cart.add(product, 1);
    if (!result.ok) {
      if (feedback) {
        feedback.textContent =
          result.reason === 'stock'
            ? `Solo hay ${result.stock} unidades disponibles.`
            : result.reason === 'unavailable'
              ? 'Este producto está agotado.'
              : 'No se pudo agregar al carrito.';
      }
      return;
    }

    if (feedback) feedback.textContent = 'Producto agregado al carrito.';
    button.textContent = 'Agregado';
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = 'Agregar al carrito';
      if (feedback) feedback.textContent = '';
    }, 1800);
  });
}

//Cargar categorías en el menú lateral
async function cargarCategorias() {
  const listaCategorias = document.getElementById('lista-categorias');
  if (!listaCategorias) {
    console.error('No se encontró el contenedor #lista-categorias.');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/categorias`);
    if (!res.ok) {
      throw new Error(`La API respondió con estado ${res.status}`);
    }

    const categorias = await res.json();
    if (!Array.isArray(categorias)) {
      throw new Error('La respuesta de la API no es una lista de categorías.');
    }

    listaCategorias.innerHTML = '';
    categorias.forEach(cat => {
      listaCategorias.innerHTML += `
        <li data-categoria="${escapeHtml(normalizar(cat.nombre_cat))}">
          <span>${escapeHtml(cat.nombre_cat)}</span>
        </li>
      `;
    });
  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }
}

//Cargar marcas en el menú lateral
async function cargarMarcas() {
  const contenedorMarcas = document.getElementById('contenedor-marcas');
  if (!contenedorMarcas) {
    console.error('No se encontró el contenedor #contenedor-marcas.');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/marcas`);
    if (!res.ok) {
      throw new Error(`La API respondió con estado ${res.status}`);
    }

    const marcas = await res.json();
    if (!Array.isArray(marcas)) {
      throw new Error('La respuesta de la API no es una lista de marcas.');
    }

    contenedorMarcas.innerHTML = '';
    marcas.forEach(m => {
      contenedorMarcas.innerHTML += `<span>${escapeHtml(m.nombre_marca)}</span>`;
    });
  } catch (error) {
    console.error('Error al cargar marcas:', error);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizar(value) {
  return String(value ?? '').trim().toLocaleLowerCase('es');
}