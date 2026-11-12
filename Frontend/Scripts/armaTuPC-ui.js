const CATEGORIAS_PC = [
  {
    nombre: "Procesador",
    catalogo: "Procesadores",
    descripcion: "Elige el procesador que será el centro de tu equipo.",
  },
  {
    nombre: "Tarjeta gráfica",
    catalogo: "Tarjetas Graficas",
    descripcion: "Selecciona la potencia gráfica para tus juegos y proyectos.",
  },
  {
    nombre: "Memoria RAM",
    catalogo: "Memorias RAM",
    descripcion: "Escoge la memoria que necesitas para trabajar y jugar.",
  },
  {
    nombre: "Almacenamiento",
    catalogo: "Almacenamiento",
    descripcion: "Agrega espacio y velocidad para tus archivos y juegos.",
  },
  {
    nombre: "Placa madre",
    catalogo: "Motherboards",
    descripcion: "Elige una placa madre para conectar tus componentes.",
  },
];

const COLORES_PC = ["#00d4ff", "#8b5cf6", "#ff4f81", "#45df94", "#ffb020"];
const API_PRODUCTOS_PC =
  window.location.port === "3000"
    ? `${window.location.origin}/api/productos`
    : "http://localhost:3000/api/productos";
const formatoPrecioPC = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", iniciarConfiguradorPC);

async function iniciarConfiguradorPC() {
  const menu = document.getElementById("cfgMenu");
  const fila = document.getElementById("cfgFila");
  const titulo = document.getElementById("cfgTitulo");
  const descripcion = document.getElementById("cfgDesc");
  const precio = document.getElementById("precioTotal");
  const resumen = document.getElementById("cfgSpecs");
  const configurador = document.getElementById("configurador");
  const imagen = document.getElementById("cfgImg");
  const placeholder = document.getElementById("cfgPlaceholder");
  const botonComprar = document.getElementById("btnComprar");
  const feedbackCompra = document.getElementById("cfgCompraFeedback");

  if (
    !menu ||
    !fila ||
    !titulo ||
    !descripcion ||
    !precio ||
    !resumen ||
    !configurador ||
    !imagen ||
    !placeholder ||
    !botonComprar ||
    !feedbackCompra
  ) {
    console.error("Faltan elementos necesarios para el configurador de PC.");
    return;
  }

  botonComprar.disabled = true;

  imagen.addEventListener("error", () => {
    imagen.hidden = true;
    placeholder.hidden = false;
  });

  COLORES_PC.forEach((color, index) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.style.backgroundColor = color;
    boton.setAttribute("aria-label", `Cambiar iluminación al color ${index + 1}`);
    boton.addEventListener("click", () => {
      configurador.style.setProperty("--luz", color);
    });
    document.getElementById("cfgColores")?.appendChild(boton);
  });

  let categorias = [];
  let categoriaActual = 0;
  const seleccionados = new Map();

  titulo.textContent = "Cargando componentes";
  descripcion.textContent = "Estamos consultando los componentes disponibles.";

  try {
    const respuesta = await fetch(API_PRODUCTOS_PC, {
      headers: { Accept: "application/json" },
    });
    if (!respuesta.ok) {
      throw new Error(`El servidor respondió con estado ${respuesta.status}.`);
    }

    const productos = await respuesta.json();
    if (!Array.isArray(productos)) {
      throw new Error("La respuesta del catálogo no tiene el formato esperado.");
    }

    const normalizar = (valor) =>
      String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    categorias = CATEGORIAS_PC.map((categoria) => ({
      ...categoria,
      opciones: productos
        .filter(
          (producto) =>
            normalizar(producto.nombre_cat) === normalizar(categoria.catalogo) &&
            Number(producto.stock_total) > 0 &&
            Number.isFinite(Number(producto.precio)),
        )
        .map((producto) => ({
          id: String(producto.id_producto),
          nombre: String(producto.nombre),
          precio: Number(producto.precio),
          stock: Number(producto.stock_total),
          imagen: String(producto.imagen_url || ""),
        })),
    })).filter((categoria) => categoria.opciones.length > 0);

    if (categorias.length === 0) {
      throw new Error("No hay componentes disponibles en el catálogo.");
    }
  } catch (error) {
    console.error("No se pudieron cargar los componentes:", error);
    titulo.textContent = "No se pudieron cargar los componentes";
    descripcion.textContent =
      "Inicia el servidor Backend en localhost:3000 y verifica la conexión a MySQL.";
    fila.textContent = "Los componentes no están disponibles en este momento.";
    return;
  }

  function pintarMenu() {
    menu.replaceChildren();
    categorias.forEach((categoria, indice) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = categoria.nombre;
      boton.className = indice === categoriaActual ? "activo" : "";
      boton.setAttribute(
        "aria-current",
        indice === categoriaActual ? "true" : "false",
      );
      boton.addEventListener("click", () => {
        categoriaActual = indice;
        pintarMenu();
        pintarOpciones();
      });
      menu.appendChild(boton);
    });
  }

  function pintarOpciones() {
    const categoria = categorias[categoriaActual];
    titulo.textContent = categoria.nombre;
    descripcion.textContent = categoria.descripcion;
    fila.replaceChildren();

    categoria.opciones.forEach((opcion) => {
      const boton = document.createElement("button");
      const activo = seleccionados.get(categoria.nombre)?.id === opcion.id;
      boton.type = "button";
      boton.className = `cfg-card${activo ? " activo" : ""}`;
      boton.setAttribute("aria-pressed", String(activo));

      const nombre = document.createElement("span");
      nombre.textContent = opcion.nombre;
      const costo = document.createElement("em");
      costo.textContent = `$${formatoPrecioPC.format(opcion.precio)}`;
      const existencias = document.createElement("small");
      existencias.className = "cfg-stock";
      existencias.textContent = `Disponibles: ${opcion.stock}`;

      boton.append(nombre, costo, existencias);
      boton.addEventListener("click", () => {
        seleccionados.set(categoria.nombre, opcion);
        feedbackCompra.textContent = "";
        pintarOpciones();
        actualizarResumen();
      });
      fila.appendChild(boton);
    });
  }

  function actualizarResumen() {
    const seleccion = categorias
      .map((categoria) => ({
        categoria: categoria.nombre,
        opcion: seleccionados.get(categoria.nombre),
      }))
      .filter((elemento) => elemento.opcion);
    const total = seleccion.reduce(
      (suma, elemento) => suma + elemento.opcion.precio,
      0,
    );

    precio.textContent = formatoPrecioPC.format(total);
    botonComprar.disabled = seleccion.length === 0;
    resumen.replaceChildren();

    if (seleccion.length === 0) {
      const nota = document.createElement("p");
      nota.className = "cfg-nota";
      nota.textContent = "Selecciona componentes para ver el resumen.";
      resumen.appendChild(nota);
      return;
    }

    seleccion.forEach(({ categoria, opcion }) => {
      const linea = document.createElement("div");
      linea.className = "cfg-spec";
      const etiqueta = document.createElement("span");
      etiqueta.textContent = categoria;
      const nombre = document.createElement("strong");
      nombre.textContent = opcion.nombre;
      linea.append(etiqueta, nombre);
      resumen.appendChild(linea);
    });
  }

  botonComprar.addEventListener("click", () => {
    const seleccion = categorias
      .map((categoria) => ({
        categoria: categoria.nombre,
        opcion: seleccionados.get(categoria.nombre),
      }))
      .filter((elemento) => elemento.opcion);
    const carrito = window.WiiUGamesCart;

    if (seleccion.length === 0) {
      feedbackCompra.textContent = "Selecciona al menos un componente.";
      return;
    }

    if (!carrito) {
      console.error("El carrito no está disponible en esta página.");
      feedbackCompra.textContent =
        "No se pudo acceder al carrito. Recarga la página e inténtalo de nuevo.";
      return;
    }

    const carritoActual = carrito.read();
    const agotado = seleccion.find(({ opcion }) => {
      const cantidadEnCarrito =
        carritoActual.find(
          (item) => String(item.productId) === opcion.id,
        )?.quantity || 0;
      return cantidadEnCarrito >= opcion.stock;
    });

    if (agotado) {
      feedbackCompra.textContent =
        `${agotado.opcion.nombre} ya alcanzó el stock disponible en tu carrito.`;
      return;
    }

    botonComprar.disabled = true;
    let agregados = 0;
    try {
      for (const { opcion } of seleccion) {
        const resultado = carrito.add(
          {
            productId: opcion.id,
            name: opcion.nombre,
            price: opcion.precio,
            imageUrl: opcion.imagen,
            stock: opcion.stock,
          },
          1,
        );

        if (!resultado.ok) {
          const mensaje =
            resultado.reason === "stock"
              ? `Solo quedan ${resultado.stock} unidades de ${opcion.nombre}.`
              : `No se pudo agregar ${opcion.nombre} al carrito.`;
          throw new Error(mensaje);
        }
        agregados += 1;
      }

      feedbackCompra.textContent =
        `Se ${agregados === 1 ? "agregó" : "agregaron"} ${agregados} componente${agregados === 1 ? "" : "s"} al carrito.`;
    } catch (error) {
      console.error("No se pudieron agregar los componentes al carrito:", error);
      feedbackCompra.textContent =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar los componentes en el carrito.";
    } finally {
      botonComprar.disabled = seleccionados.size === 0;
    }
  });

  pintarMenu();
  pintarOpciones();
  actualizarResumen();
}
