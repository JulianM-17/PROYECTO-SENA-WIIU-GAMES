const API_URL = 'http://localhost:3000/api';
const filtrosCatalogo = {
  categoria: '',
  marca: '',
  precioMin: 0,
  precioMax: Infinity
};
let productosCatalogo = [];

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

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const catUrl = urlParams.get('categoria');
  if (catUrl) {
    filtrosCatalogo.categoria = normalizar(catUrl);
  }

  configurarFiltros();
  configurarAgregarAlCarrito();
  cargarProductos();
  cargarCategorias();
  cargarMarcas();
});

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
    renderizarProductos();
  } catch (error) {
    productosCatalogo = PRODUCTOS_DEFAULT;
    renderizarProductos();
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

  botonAplicar?.addEventListener('click', () => { console.log('Aplicar filtros clicked'); renderizarProductos(); });
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
        <p class="descripcion-producto">${escapeHtml(prod.descripcion || '')}</p>
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

    event.preventDefault();
    event.stopPropagation();

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

    const feedback = button.nextElementSibling;
    let agregadoExitoso = false;

    if (window.WiiUGamesCart && typeof window.WiiUGamesCart.add === 'function') {
      const result = window.WiiUGamesCart.add(product, 1);
      if (result.ok) {
        agregadoExitoso = true;
      } else if (result.reason === 'stock') {
        if (feedback) feedback.textContent = `Solo hay ${result.stock} disponibles.`;
        return;
      } else if (result.reason === 'unavailable') {
        if (feedback) feedback.textContent = 'Producto agotado.';
        return;
      }
    }

    if (!agregadoExitoso) {
      try {
        const cart = JSON.parse(localStorage.getItem('wiiu_cart') || '[]');
        const existing = cart.find(i => String(i.productId) === String(productId));
        if (existing) {
          existing.quantity = (Number(existing.quantity) || 1) + 1;
        } else {
          cart.push({
            productId: String(productId),
            name: product.nombre,
            price: Number(product.precio) || 0,
            imageUrl: product.imagen_url || '../Assets/lenovolegion.webp',
            quantity: 1,
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
      if (feedback) {
        feedback.textContent = '¡Añadido al carrito con éxito!';
        feedback.style.color = '#22c55e';
      }

      setTimeout(() => {
        if (!button.isConnected) return;
        button.textContent = textoOriginal;
        button.style.backgroundColor = '';
        button.style.color = '';
        if (feedback) feedback.textContent = '';
      }, 1500);
    }
  });
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
  return String(value ?? '').trim().toLocaleLowerCase('es');
}
