const API_URL = 'http://localhost:3000/api';
const filtrosCatalogo = {
  categoria: '',
  marca: '',
  busqueda: '',
  precioMin: 0,
  precioMax: Infinity
};
let productosCatalogo = [];
const productosPorPagina = 20;
let paginaActual = 1;

const CATEGORIAS_DEFAULT = [
  { nombre_cat: 'Portátiles' },
  { nombre_cat: 'PC Escritorio' },
  { nombre_cat: 'Tarjetas Gráficas' },
  { nombre_cat: 'Monitores' },
  { nombre_cat: 'Periféricos' },
  { nombre_cat: 'Almacenamiento' },
  { nombre_cat: 'Memorias RAM' },
  { nombre_cat: 'Motherboards' },
  { nombre_cat: 'Procesadores' },
  { nombre_cat: 'Consolas y Videojuegos' }
];

const MARCAS_DEFAULT = [
  'Lenovo', 'Logitech', 'Kingston', 'ASUS', 'NVIDIA', 'Corsair', 'Intel', 'AMD', 'Nintendo', 'Sony', 'MSI'
];

const PRODUCTOS_DEFAULT = [
  {
    id_producto: 1,
    nombre: 'Portatil Lenovo IdeaPad 3',
    precio: 2200000,
    imagen_url: '../Assets/lenovolegion.webp',
    descripcion: 'Ryzen 5, 16GB RAM, 512GB SSD, 15.6 pulgadas',
    nombre_marca: 'Lenovo',
    nombre_cat: 'Portátiles',
    stock_total: 5
  },
  {
    id_producto: 2,
    nombre: 'Mouse Logitech M185',
    precio: 45000,
    imagen_url: '../Assets/Perifericos.png',
    descripcion: 'Mouse inalambrico con receptor USB',
    nombre_marca: 'Logitech',
    nombre_cat: 'Periféricos',
    stock_total: 50
  },
  {
    id_producto: 3,
    nombre: 'SSD Kingston A400 480GB',
    precio: 180000,
    imagen_url: '../Assets/Almacenamiento.png',
    descripcion: 'Unidad de estado solido SATA 2.5 pulgadas',
    nombre_marca: 'Kingston',
    nombre_cat: 'Almacenamiento',
    stock_total: 20
  },
  {
    id_producto: 4,
    nombre: 'Portatil Gamer ASUS ROG Strix G16',
    precio: 5800000,
    imagen_url: '../Assets/Portatiles.png',
    descripcion: 'Intel Core i7-13650HX, RTX 4060, 16GB RAM DDR5, 512GB SSD',
    nombre_marca: 'ASUS',
    nombre_cat: 'Portátiles',
    stock_total: 8
  },
  {
    id_producto: 5,
    nombre: 'PC Gamer Torre Custom Ryzen 7',
    precio: 4500000,
    imagen_url: '../Assets/TORRECUSTOM.png',
    descripcion: 'AMD Ryzen 7 5700X, RTX 4060 Ti, 32GB RAM, 1TB NVMe, Fuente 750W',
    nombre_marca: 'AMD',
    nombre_cat: 'PC Escritorio',
    stock_total: 6
  },
  {
    id_producto: 6,
    nombre: 'Tarjeta Grafica NVIDIA GeForce RTX 4060 8GB',
    precio: 1650000,
    imagen_url: '../Assets/Tarjetas_Graficas.png',
    descripcion: 'Arquitectura Ada Lovelace, DLSS 3, Ray Tracing, 8GB GDDR6',
    nombre_marca: 'NVIDIA',
    nombre_cat: 'Tarjetas Gráficas',
    stock_total: 12
  },
  {
    id_producto: 7,
    nombre: 'Monitor Gaming ASUS TUF 27 165Hz',
    precio: 1150000,
    imagen_url: '../Assets/Monitores.png',
    descripcion: 'Pantalla IPS 27 pulgadas, 165Hz, 1ms, FreeSync Premium, HDR10',
    nombre_marca: 'ASUS',
    nombre_cat: 'Monitores',
    stock_total: 15
  },
  {
    id_producto: 8,
    nombre: 'Memoria RAM Corsair Vengeance RGB 16GB DDR4',
    precio: 210000,
    imagen_url: '../Assets/ram.png',
    descripcion: 'Kit 16GB (2x8GB) 3200MHz CL16 con iluminacion dinamica RGB',
    nombre_marca: 'Corsair',
    nombre_cat: 'Memorias RAM',
    stock_total: 30
  },
  {
    id_producto: 9,
    nombre: 'Motherboard MSI B550M PRO-VDH WiFi',
    precio: 490000,
    imagen_url: '../Assets/placa.jpg',
    descripcion: 'Socket AM4, PCIe 4.0, Dual M.2, WiFi integrado, soporte Ryzen 5000',
    nombre_marca: 'MSI',
    nombre_cat: 'Motherboards',
    stock_total: 10
  },
  {
    id_producto: 10,
    nombre: 'Procesador Intel Core i7-13700K 16 Nucleos',
    precio: 1890000,
    imagen_url: '../Assets/procesadores.png',
    descripcion: 'Hasta 5.4 GHz, 30MB Cache, Socket LGA1700, Graficos Intel UHD 770',
    nombre_marca: 'Intel',
    nombre_cat: 'Procesadores',
    stock_total: 14
  },
  {
    id_producto: 11,
    nombre: 'Consola Nintendo Switch OLED 64GB',
    precio: 1450000,
    imagen_url: '../Assets/Switch.jpg',
    descripcion: 'Pantalla OLED 7 pulgadas, soporte ajustable, 64GB almacenamiento interno',
    nombre_marca: 'Nintendo',
    nombre_cat: 'Consolas y Videojuegos',
    stock_total: 22
  },
  {
    id_producto: 12,
    nombre: 'Consola PlayStation 5 Slim Digital 1TB',
    precio: 2490000,
    imagen_url: '../Assets/Consolas_Juegos.png',
    descripcion: 'SSD 1TB de ultra alta velocidad, Tempest 3D AudioTech, soporte 4K 120Hz',
    nombre_marca: 'Sony',
    nombre_cat: 'Consolas y Videojuegos',
    stock_total: 9
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const catUrl = urlParams.get('categoria');
  const inputBusqueda = document.getElementById('busqueda-catalogo');
  const busquedaInicial = urlParams.get('q') || '';
  filtrosCatalogo.busqueda = normalizarBusqueda(busquedaInicial);
  if (inputBusqueda) inputBusqueda.value = busquedaInicial;

  if (urlParams.get('buscar') === '1' && inputBusqueda) {
    inputBusqueda.focus();
    inputBusqueda.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (catUrl) {
    filtrosCatalogo.categoria = normalizar(catUrl);
  }

  configurarFiltros();
  configurarFavoritos();
  configurarAgregarAlCarrito();
  await cargarFavoritosDesdeServidor();
  cargarProductos();
  cargarCategorias();
  cargarMarcas();
});

function toggleFiltrosCatalogo() {
  const contenedor = document.querySelector('.contenedor-principal-catalogo');
  const boton = document.querySelector('.btn-toggle-filtros');
  if (!contenedor || !boton) return;

  const abierto = contenedor.classList.toggle('filtros-abiertos');
  boton.setAttribute('aria-expanded', String(abierto));
}

async function cargarProductos() {
  const contenedor = document.getElementById('grid-productos');
  if (!contenedor) return;

  try {
    const respuesta = await fetch(`${API_URL}/productos`);
    if (!respuesta.ok) {
      throw new Error(`Estado ${respuesta.status}`);
    }

    const productos = await respuesta.json();
    if (!Array.isArray(productos) || productos.length === 0) {
      throw new Error('Lista vacía');
    }

    productosCatalogo = productos;
    guardarProductosCatalogo(productosCatalogo);
    renderizarProductos();
  } catch (error) {
    productosCatalogo = PRODUCTOS_DEFAULT;
    guardarProductosCatalogo(productosCatalogo);
    renderizarProductos();
  }
}

function guardarProductosCatalogo(productos) {
  try {
    localStorage.setItem("wiiu_products", JSON.stringify(productos));
  } catch (error) {
    console.error("No se pudo guardar el catálogo para las sugerencias:", error);
  }
}

function configurarFiltros() {
  const listaCategorias = document.getElementById('lista-categorias');
  const filtroPrecio = document.getElementById('filtro-precio');
  const contenedorMarcas = document.getElementById('contenedor-marcas');
  const botonLimpiar = document.querySelector('.btn-limpiar');
  const botonAplicar = document.querySelector('.btn-aplicar');
  const botonTodasMarcas = document.getElementById('btn-todas-marcas');
  const inputBusqueda = document.getElementById('busqueda-catalogo');

  inputBusqueda?.addEventListener('input', () => {
    filtrosCatalogo.busqueda = normalizarBusqueda(inputBusqueda.value);
    reiniciarPaginaYRenderizar();
  });

  listaCategorias?.addEventListener('click', event => {
    const opcion = event.target.closest('li');
    if (!opcion || !listaCategorias.contains(opcion)) return;

    const categoria = opcion.dataset.categoria || '';
    filtrosCatalogo.categoria =
      filtrosCatalogo.categoria === categoria ? '' : categoria;
    listaCategorias.querySelectorAll('li').forEach(item => {
      item.classList.toggle('activo', item === opcion && filtrosCatalogo.categoria !== '');
    });
    reiniciarPaginaYRenderizar();
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
    reiniciarPaginaYRenderizar();
  });

  contenedorMarcas?.addEventListener('click', event => {
    const opcion = event.target.closest('span');
    if (!opcion || !contenedorMarcas.contains(opcion)) return;

    const marca = normalizar(opcion.textContent);
    filtrosCatalogo.marca = filtrosCatalogo.marca === marca ? '' : marca;
    contenedorMarcas.querySelectorAll('span').forEach(item => {
      item.classList.toggle('activo', item === opcion && filtrosCatalogo.marca !== '');
    });
    reiniciarPaginaYRenderizar();
  });

  botonLimpiar?.addEventListener('click', () => {
    filtrosCatalogo.categoria = '';
    filtrosCatalogo.marca = '';
    filtrosCatalogo.busqueda = '';
    filtrosCatalogo.precioMin = 0;
    filtrosCatalogo.precioMax = Infinity;
    if (inputBusqueda) inputBusqueda.value = '';
    document.querySelectorAll(
      '#lista-categorias li.activo, #filtro-precio li.activo, #contenedor-marcas span.activo'
    ).forEach(item => item.classList.remove('activo'));
    reiniciarPaginaYRenderizar();
  });

  botonTodasMarcas?.addEventListener('click', () => {
    filtrosCatalogo.marca = '';
    contenedorMarcas?.querySelectorAll('span.activo').forEach(item => {
      item.classList.remove('activo');
    });
    reiniciarPaginaYRenderizar();
  });

  botonAplicar?.addEventListener('click', reiniciarPaginaYRenderizar);
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
    const textoProducto = normalizarBusqueda([
      producto.nombre,
      producto.nombre_marca,
      producto.nombre_cat,
      producto.descripcion
    ].join(' '));
    const coincideBusqueda =
      !filtrosCatalogo.busqueda ||
      textoProducto.includes(filtrosCatalogo.busqueda);
    const precio = Number(producto.precio);
    const coincidePrecio =
      precio >= filtrosCatalogo.precioMin &&
      precio <= filtrosCatalogo.precioMax;
    return (
      coincideCategoria &&
      coincideMarca &&
      coincideBusqueda &&
      coincidePrecio
    );
  });

  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
  if (totalPaginas > 0 && paginaActual > totalPaginas) {
    paginaActual = totalPaginas;
  }

  const inicio = (paginaActual - 1) * productosPorPagina;
  const productosPagina = productosFiltrados.slice(inicio, inicio + productosPorPagina);

  if (productosCatalogo.length > 0 && productosFiltrados.length === 0) {
    contenedor.innerHTML = '<p class="mensaje-sin-productos">No encontramos productos con esos filtros.</p>';
  } else {
    contenedor.innerHTML = productosPagina.map(crearTarjetaProducto).join('');
  }

  if (botonAplicar) {
    botonAplicar.textContent = `Aplicar Filtros (${productosFiltrados.length})`;
  }

  renderizarBotones(productosFiltrados.length);
  actualizarBotonesFavoritos();
}

function reiniciarPaginaYRenderizar() {
  paginaActual = 1;
  renderizarProductos();
}

function renderizarBotones(totalProductos) {
  const contenedorPaginacion = document.getElementById('paginacion');
  if (!contenedorPaginacion) return;

  contenedorPaginacion.innerHTML = '';
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  if (totalPaginas <= 1) return;

  for (let numeroPagina = 1; numeroPagina <= totalPaginas; numeroPagina++) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = numeroPagina;
    boton.setAttribute('aria-label', `Ir a la pagina ${numeroPagina}`);
    boton.setAttribute('aria-current', numeroPagina === paginaActual ? 'page' : 'false');

    if (numeroPagina === paginaActual) {
      boton.classList.add('activa');
    }

    boton.addEventListener('click', () => {
      paginaActual = numeroPagina;
      renderizarProductos();
      document.getElementById('grid-productos')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });

    contenedorPaginacion.appendChild(boton);
  }
}

function crearTarjetaProducto(prod) {
  const stockDisponible = Math.max(Number(prod.stock_total) || 0, 0);
  const tieneStock = stockDisponible > 0;
  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(prod.precio) || 0);

  return `
    <article class="tarjeta-producto">
      <div class="resumen-stock">
        <div class="estado-stock ${tieneStock ? 'disponible' : 'agotado'}">
          ${tieneStock ? 'Con Stock' : 'Agotado'}
        </div>
        <span class="cantidad-stock ${tieneStock ? '' : 'sin-stock'}">${stockDisponible} disponibles</span>
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
        <p class="descripcion-producto">${escapeHtml(prod.descripcion || '')}</p>
      </a>
      <div class="precio-actual">${precioFormateado}</div>
      <div class="contenedor-acciones-producto">
        <div class="cantidad-stepper">
          <input
            type="number"
            id="cantidad-${escapeHtml(prod.id_producto)}"
            min="1"
            max="${Math.max(Number(prod.stock_total) || 99, 1)}"
            value="1"
            class="cantidad-producto"
            aria-label="Cantidad para ${escapeHtml(prod.nombre)}"
            ${tieneStock ? '' : 'disabled'}
          />
          <div class="flechas-cantidad" aria-label="Controles de cantidad">
            <button
              type="button"
              class="btn-cantidad btn-cantidad-mas"
              aria-label="Aumentar cantidad"
              ${tieneStock ? '' : 'disabled'}
            >▲</button>
            <button
              type="button"
              class="btn-cantidad btn-cantidad-menos"
              aria-label="Disminuir cantidad"
              disabled
            >▼</button>
          </div>
        </div>
        <div class="acciones-carrito-favorito">
          <button
            class="btn-agregar-carrito"
            type="button"
            data-product-id="${escapeHtml(prod.id_producto)}"
            ${tieneStock ? '' : 'disabled'}
          >${tieneStock ? 'Agregar al carrito' : 'Agotado'}</button>
          <button
            class="btn-favorito-producto"
            type="button"
            data-product-id="${escapeHtml(prod.id_producto ?? prod.id ?? prod.productId ?? prod.nombre)}"
            data-product-name="${escapeHtml(prod.nombre || 'Producto')}"
            aria-label="Agregar ${escapeHtml(prod.nombre)} a favoritos"
            aria-pressed="false"
            title="Agregar a favoritos"
          ><i class="fi fi-rr-heart" aria-hidden="true"></i></button>
        </div>
      </div>
    </article>
  `;
}

function actualizarBotonesFavoritos() {
  const grid = document.getElementById('grid-productos');
  if (!grid) return;

  const favorites = cargarFavoritos();
  grid.querySelectorAll('.btn-favorito-producto').forEach(button => {
    const isFavorite = favorites.some(
      favorite => String(favorite.id) === String(button.dataset.productId)
    );
    button.classList.toggle('activo', isFavorite);
    button.setAttribute('aria-pressed', String(isFavorite));
    button.setAttribute(
      'aria-label',
      `${isFavorite ? 'Quitar' : 'Agregar'} ${button.dataset.productName} ${isFavorite ? 'de' : 'a'} favoritos`
    );
    button.title = isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos';
  });
}

function cargarFavoritos() {
  let sessionUser = null;
  try {
    sessionUser = JSON.parse(
      sessionStorage.getItem('wiiu_usuario_activo') || 'null'
    );
  } catch (error) {
    sessionUser = null;
  }
  if (!sessionUser?.token) {
    try {
      const panelData = JSON.parse(
        localStorage.getItem('wiiu_user_panel_data') || '{}'
      );
      if (panelData && typeof panelData === 'object' && !Array.isArray(panelData)) {
        panelData.favorites = [];
        localStorage.setItem('wiiu_user_panel_data', JSON.stringify(panelData));
      }
    } catch (error) {
      console.error('No se pudo limpiar los favoritos de invitado:', error);
    }
    return [];
  }

  try {
    let sessionUser = null;
    try {
      sessionUser = JSON.parse(
        sessionStorage.getItem('wiiu_usuario_activo') || 'null'
      );
    } catch (error) {
      sessionUser = null;
    }

    if (!sessionUser?.token) {
      const panelData = JSON.parse(
        localStorage.getItem('wiiu_user_panel_data') || '{}'
      );
      if (panelData && typeof panelData === 'object' && !Array.isArray(panelData)) {
        panelData.favorites = [];
        localStorage.setItem('wiiu_user_panel_data', JSON.stringify(panelData));
      }
      return [];
    }

    const data = JSON.parse(localStorage.getItem('wiiu_user_panel_data') || '{}');
    return data && Array.isArray(data.favorites) ? data.favorites : [];
  } catch (error) {
    console.error('No se pudieron cargar los favoritos:', error);
    return [];
  }
}

function guardarFavoritosEnPanel(favorites) {
  const panelData =
    JSON.parse(localStorage.getItem('wiiu_user_panel_data') || '{}') || {};
  if (typeof panelData !== 'object' || Array.isArray(panelData)) {
    throw new Error('Los datos del panel de usuario no tienen un formato válido.');
  }

  panelData.favorites = favorites.map(favorite => ({
    id: String(favorite.id),
    nombre: favorite.nombre || 'Producto',
    categoria: favorite.categoria || 'Producto',
    precio: Number(favorite.precio) || 0,
    precioActual: new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(favorite.precio) || 0),
    img: favorite.img || '../Assets/lenovolegion.webp',
    stock_total: Number(favorite.stock_total) || 0
  }));
  localStorage.setItem('wiiu_user_panel_data', JSON.stringify(panelData));
}

async function cargarFavoritosDesdeServidor() {
  let sessionUser = null;
  try {
    sessionUser = JSON.parse(
      sessionStorage.getItem('wiiu_usuario_activo') || 'null'
    );
  } catch (error) {
    console.error('No se pudo validar la sesión para cargar favoritos:', error);
  }
  if (!sessionUser?.token) return;

  try {
    const response = await fetch(`${API_URL}/my-favorites`, {
      headers: { Authorization: `Bearer ${sessionUser.token}` }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sessionStorage.removeItem('wiiu_usuario_activo');
      window.location.href = 'Login.html?returnTo=Catalog.html';
      return;
    }
    if (!response.ok || !data.ok || !Array.isArray(data.favorites)) {
      throw new Error(data.message || 'No se pudieron cargar tus favoritos.');
    }

    guardarFavoritosEnPanel(data.favorites);
    actualizarBotonesFavoritos();
  } catch (error) {
    console.error('No se pudieron sincronizar los favoritos:', error);
  }
}

function configurarFavoritos() {
  const grid = document.getElementById('grid-productos');
  if (!grid) return;

  grid.addEventListener('click', async event => {
    const button = event.target.closest('.btn-favorito-producto');
    if (!button || !grid.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    let sessionUser = null;
    try {
      sessionUser = JSON.parse(
        sessionStorage.getItem('wiiu_usuario_activo') || 'null'
      );
    } catch (error) {
      console.error('No se pudo validar la sesión para guardar favoritos:', error);
    }

    if (!sessionUser?.token) {
      window.location.href = 'Login.html?returnTo=Catalog.html';
      return;
    }

    const productId = String(button.dataset.productId);
    const product = productosCatalogo.find(
      item => String(item.id_producto ?? item.id ?? item.productId ?? item.nombre) === productId
    );
    if (!product) {
      console.error(`No se encontró el producto ${productId} para guardarlo en favoritos.`);
      return;
    }

    button.disabled = true;
    try {
      const favorites = cargarFavoritos();
      const favoriteIndex = favorites.findIndex(
        favorite => String(favorite.id) === productId
      );

      const response = await fetch(
        favoriteIndex >= 0
          ? `${API_URL}/my-favorites/${encodeURIComponent(productId)}`
          : `${API_URL}/my-favorites`,
        {
          method: favoriteIndex >= 0 ? 'DELETE' : 'POST',
          headers: {
            Authorization: `Bearer ${sessionUser.token}`,
            ...(favoriteIndex >= 0 ? {} : { 'Content-Type': 'application/json' })
          },
          ...(favoriteIndex >= 0
            ? {}
            : { body: JSON.stringify({ productId }) })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        sessionStorage.removeItem('wiiu_usuario_activo');
        window.location.href = 'Login.html?returnTo=Catalog.html';
        return;
      }
      if (!response.ok || !data.ok || !Array.isArray(data.favorites)) {
        throw new Error(data.message || 'No se pudo actualizar tu lista de favoritos.');
      }

      guardarFavoritosEnPanel(data.favorites);
      actualizarBotonesFavoritos();
      mostrarToastCatalogo(
        favoriteIndex >= 0
          ? 'Producto eliminado de favoritos.'
          : 'Producto agregado a favoritos.'
      );
    } catch (error) {
      console.error('No se pudo actualizar la lista de favoritos:', error);
      mostrarToastCatalogo(
        error.message || 'No se pudo actualizar tu lista de favoritos.',
        'error'
      );
    } finally {
      button.disabled = false;
    }
  });
}

function configurarAgregarAlCarrito() {
  const grid = document.getElementById('grid-productos');
  if (!grid) return;

  grid.addEventListener('click', event => {
    const quantityButton = event.target.closest('.btn-cantidad');
    if (quantityButton && grid.contains(quantityButton)) {
      event.preventDefault();
      event.stopPropagation();

      const stepper = quantityButton.closest('.cantidad-stepper');
      const input = stepper?.querySelector('.cantidad-producto');
      if (!input || input.disabled) return;

      const min = Math.max(Number(input.min) || 1, 1);
      const max = Math.max(Number(input.max) || 1, min);
      const current = Math.floor(Number(input.value) || min);
      const next = quantityButton.classList.contains('btn-cantidad-mas')
        ? current + 1
        : current - 1;

      input.value = String(Math.min(Math.max(next, min), max));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const button = event.target.closest('.btn-agregar-carrito');
    if (!button || !grid.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    if (!window.WiiUGamesCart?.requireSession?.()) return;

    const contenedorAcciones = button.closest('.contenedor-acciones-producto');
    const inputCantidad = contenedorAcciones?.querySelector('.cantidad-producto');
    const cantidad = Math.max(Number(inputCantidad?.value) || 1, 1);

    const productId = button.getAttribute('data-product-id') || button.dataset.productId;
    let product = productosCatalogo.find(
      item => String(item.id_producto ?? item.id ?? item.productId) === String(productId)
    );

    if (!product) {
      const tarjeta = button.closest('.tarjeta-producto');
      const nombre = tarjeta?.querySelector('.titulo-producto')?.textContent?.trim() || 'Producto';
      const precioTexto = tarjeta?.querySelector('.precio-actual')?.textContent?.replace(/[^0-9]/g, '') || '0';
      const img = tarjeta?.querySelector('.imagen-producto')?.getAttribute('src') || '../Assets/lenovolegion.webp';
      product = {
        id_producto: productId || String(Date.now()),
        nombre: nombre,
        precio: Number(precioTexto) || 0,
        imagen_url: img,
        stock_total: 99
      };
    }

    const stockDisponible = Number(product.stock_total) || 99;
    let agregadoExitoso = false;

    if (cantidad > stockDisponible) {
      mostrarToastCatalogo(`Solo hay ${stockDisponible} disponibles.`, 'error');
      return;
    }

    if (window.WiiUGamesCart && typeof window.WiiUGamesCart.add === 'function') {
      const result = window.WiiUGamesCart.add(product, cantidad);
      if (result.ok) {
        agregadoExitoso = true;
      } else if (result.reason === 'stock') {
        mostrarToastCatalogo(`Solo hay ${result.stock} disponibles.`, 'error');
        return;
      } else if (result.reason === 'unavailable') {
        mostrarToastCatalogo('Producto agotado.', 'error');
        return;
      } else if (result.reason === 'login-required') {
        return;
      }
    }

    if (!agregadoExitoso) {
      try {
        const cart = JSON.parse(localStorage.getItem('wiiu_cart') || '[]');
        const existing = cart.find(i => String(i.productId) === String(productId));
        if (existing) {
          existing.quantity = (Number(existing.quantity) || 0) + cantidad;
        } else {
          cart.push({
            productId: String(productId),
            name: product.nombre,
            price: Number(product.precio) || 0,
            imageUrl: product.imagen_url || '../Assets/lenovolegion.webp',
            quantity: cantidad,
            stock: product.stock_total || 99
          });
        }
        localStorage.setItem('wiiu_cart', JSON.stringify(cart));
        const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        document.querySelectorAll('.burbuja-carrito').forEach(badge => {
          badge.textContent = total > 0 ? String(total) : '';
          badge.style.display = total > 0 ? '' : 'none';
        });
        window.dispatchEvent(new CustomEvent('wiiu-cart-change', { detail: cart }));
        agregadoExitoso = true;
      } catch (err) {
        console.error('Error al guardar en carrito:', err);
      }
    }

    if (agregadoExitoso) {
      const textoOriginal = button.textContent;
      button.textContent = '✔ ¡Agregado!';
      button.style.backgroundColor = '#22c55e';
      button.style.color = '#ffffff';
      mostrarToastCatalogo(`¡Añadido ${cantidad} al carrito con éxito!`);

      setTimeout(() => {
        if (!button.isConnected) return;
        button.textContent = textoOriginal;
        button.style.backgroundColor = '';
        button.style.color = '';
      }, 1500);
    }
  });

  grid.addEventListener('change', event => {
    const input = event.target.closest('.cantidad-producto');
    if (!input || !grid.contains(input)) return;

    const min = Math.max(Number(input.min) || 1, 1);
    const max = Math.max(Number(input.max) || min, min);
    const value = Math.floor(Number(input.value) || min);
    input.value = String(Math.min(Math.max(value, min), max));

    const stepper = input.closest('.cantidad-stepper');
    const minus = stepper?.querySelector('.btn-cantidad-menos');
    const plus = stepper?.querySelector('.btn-cantidad-mas');
    if (minus) minus.disabled = input.disabled || Number(input.value) <= min;
    if (plus) plus.disabled = input.disabled || Number(input.value) >= max;
  });

  grid.addEventListener('input', event => {
    const input = event.target.closest('.cantidad-producto');
    if (!input || input.value === '') return;

    const max = Math.max(Number(input.max) || 1, 1);
    if (Number(input.value) > max) input.value = String(max);
  });
}

function mostrarToastCatalogo(mensaje, tipo = 'exito') {
  const container = document.getElementById('contenedor-toast');
  if (!container) {
    console.error('No se encontró el contenedor de notificaciones del catálogo.');
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast${tipo === 'error' ? ' error' : ''}`;
  toast.setAttribute('role', 'status');

  const icon = document.createElement('i');
  icon.className = `fi ${tipo === 'error' ? 'fi-rr-cross-circle' : 'fi-rr-check-circle'}`;
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = mensaje;
  toast.append(icon, text);
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    window.setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function cargarCategorias() {
  const listaCategorias = document.getElementById('lista-categorias');
  if (!listaCategorias) return;

  let categorias = [];
  try {
    const res = await fetch(`${API_URL}/categorias`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        categorias = data;
      }
    }
  } catch (error) {
    categorias = CATEGORIAS_DEFAULT;
  }

  if (categorias.length === 0) {
    categorias = CATEGORIAS_DEFAULT;
  } else {
    const nombresExistentes = new Set(categorias.map(c => normalizar(c.nombre_cat)));
    CATEGORIAS_DEFAULT.forEach(cDefault => {
      if (!nombresExistentes.has(normalizar(cDefault.nombre_cat))) {
        categorias.push(cDefault);
      }
    });
  }

  listaCategorias.innerHTML = '';
  categorias.forEach(cat => {
    const catNorm = normalizar(cat.nombre_cat);
    const estaActiva = filtrosCatalogo.categoria && filtrosCatalogo.categoria === catNorm;
    listaCategorias.innerHTML += `
      <li data-categoria="${escapeHtml(catNorm)}" class="${estaActiva ? 'activo' : ''}">
        <span>${escapeHtml(cat.nombre_cat)}</span>
      </li>
    `;
  });
}

async function cargarMarcas() {
  const contenedorMarcas = document.getElementById('contenedor-marcas');
  if (!contenedorMarcas) return;

  let marcas = [];
  try {
    const res = await fetch(`${API_URL}/marcas`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        marcas = data.map(m => m.nombre_marca);
      }
    }
  } catch (error) {
    marcas = MARCAS_DEFAULT;
  }

  if (marcas.length === 0) {
    marcas = MARCAS_DEFAULT;
  }

  contenedorMarcas.innerHTML = '';
  marcas.forEach(marca => {
    contenedorMarcas.innerHTML += `<span>${escapeHtml(marca)}</span>`;
  });
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
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}

function normalizarBusqueda(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}



