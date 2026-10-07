const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  cargarCategorias();
  cargarMarcas();
});

//Cargar y renderizar productos
async function cargarProductos() {
  const contenedor = document.getElementById('grid-productos');
  try {
    const respuesta = await fetch(`${API_URL}/productos`);
    const productos = await respuesta.json();

    contenedor.innerHTML = ''; // Limpiar cuadrícula

    if (productos.length === 0) {
      contenedor.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
      return;
    }

    productos.forEach(prod => {
      const tieneStock = prod.stock_total > 0;
      const precioFormateado = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(prod.precio);

      contenedor.innerHTML += `
        <a href="Product.html?id=${prod.id_producto}" class="enlace-producto">
          <article class="tarjeta-producto">
            <div class="estado-stock ${tieneStock ? 'disponible' : 'agotado'}">
              ${tieneStock ? 'Con Stock' : 'Agotado'}
            </div>
            <img
              src="${prod.imagen_url}"
              alt="${prod.nombre}"
              class="imagen-producto"
              onerror="this.src='../Assets/lenovolegion.webp'"
            />
            <div class="calificacion">
              ★★★★★ <span class="resenas">${prod.nombre_marca}</span>
            </div>
            <h3 class="titulo-producto">${prod.nombre}</h3>
            <div class="precio-actual">${precioFormateado}</div>
          </article>
        </a>
      `;
    });
  } catch (error) {
    console.error('Error al cargar catálogo:', error);
    contenedor.innerHTML = '<p>Error al conectar con la base de datos.</p>';
  }
}

//Cargar categorías en el menú lateral
async function cargarCategorias() {
  const listaCategorias = document.getElementById('lista-categorias');
  try {
    const res = await fetch(`${API_URL}/categorias`);
    const categorias = await res.json();

    listaCategorias.innerHTML = '';
    categorias.forEach(cat => {
      listaCategorias.innerHTML += `
        <li>
          <span>${cat.nombre_cat}</span>
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
  try {
    const res = await fetch(`${API_URL}/marcas`);
    const marcas = await res.json();

    contenedorMarcas.innerHTML = '';
    marcas.forEach(m => {
      contenedorMarcas.innerHTML += `<span>${m.nombre_marca}</span>`;
    });
  } catch (error) {
    console.error('Error al cargar marcas:', error);
  }
}