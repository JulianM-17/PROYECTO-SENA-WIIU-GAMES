const CATEGORIAS_PC = [
  { nombre: "Procesador", catalogo: "Procesadores", icono: "◉" },
  { nombre: "Tarjeta gráfica", catalogo: "Tarjetas Graficas", icono: "▣" },
  { nombre: "Memoria RAM", catalogo: "Memorias RAM", icono: "▤" },
  { nombre: "Almacenamiento", catalogo: "Almacenamiento", icono: "▧" },
  { nombre: "Placa madre", catalogo: "Motherboards", icono: "◇" },
  { nombre: "Fuente de poder", catalogo: null, icono: "▱" },
  { nombre: "Refrigeración", catalogo: null, icono: "❄" },
  { nombre: "Gabinete", catalogo: null, icono: "▣" },
];
const API_PRODUCTOS_PC =
  window.location.port === "3000"
    ? `${window.location.origin}/api/productos`
    : "http://localhost:3000/api/productos";
const formatoPrecioPC = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", iniciarConfiguradorPC);

async function iniciarConfiguradorPC() {
  const fila = document.getElementById("cfgFila");
  const descripcion = document.getElementById("cfgDesc");
  const precio = document.getElementById("precioTotal");
  const imagen = document.getElementById("cfgImg");
  const placeholder = document.getElementById("cfgPlaceholder");
  const botonComprar = document.getElementById("btnComprar");
  const feedbackCompra = document.getElementById("cfgCompraFeedback");
  const contador = document.getElementById("cfgCount");
  const porcentaje = document.getElementById("cfgPercent");
  const botonArmarIA = document.getElementById("btnArmarIA");
  const modalIA = document.getElementById("cfgModalIA");
  const botonCerrarModalIA = document.getElementById("btnCerrarModalIA");
  const formularioIA = document.getElementById("formArmarIA");
  const promptIA = document.getElementById("cfgPromptIA");
  const estadoIA = document.getElementById("cfgIADisponibilidad");
  const botonTema = document.getElementById("btnTemaConfigurador");
  const iconoTema = botonTema?.querySelector("i");
  const textoTema = botonTema?.querySelector("span");
  const contenidoPagina = document.querySelector("main");

  if (
    !fila ||
    !descripcion ||
    !precio ||
    !imagen ||
    !placeholder ||
    !botonComprar ||
    !feedbackCompra ||
    !contador ||
    !porcentaje ||
    !botonArmarIA ||
    !(modalIA instanceof HTMLDialogElement) ||
    !botonCerrarModalIA ||
    !formularioIA ||
    !(promptIA instanceof HTMLTextAreaElement) ||
    !estadoIA
  ) {
    console.error("Faltan elementos necesarios para el configurador de PC.");
    return;
  }

  botonComprar.disabled = true;

  botonArmarIA.addEventListener("click", () => {
    estadoIA.textContent = "";
    modalIA.showModal();
    promptIA.focus();
  });
  botonCerrarModalIA.addEventListener("click", () => modalIA.close());
  modalIA.addEventListener("click", (evento) => {
    if (evento.target === modalIA) modalIA.close();
  });
  promptIA.addEventListener("input", () => promptIA.setCustomValidity(""));
  formularioIA.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!promptIA.value.trim()) {
      promptIA.setCustomValidity("Describe para qué necesitas tu PC.");
      promptIA.reportValidity();
      return;
    }

    estadoIA.textContent =
      "La función de IA aún no está disponible. Tu texto no se envió.";
  });

  imagen.addEventListener("error", () => {
    imagen.hidden = true;
    placeholder.hidden = false;
  });

  let categorias = [];
  const seleccionados = new Map();

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
            categoria.catalogo &&
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
    }));
    descripcion.textContent = "";
  } catch (error) {
    console.error("No se pudieron cargar los componentes:", error);
    descripcion.textContent =
      "Inicia el servidor Backend en localhost:3000 y verifica la conexión a MySQL.";
    categorias = CATEGORIAS_PC.map((categoria) => ({
      ...categoria,
      opciones: [],
    }));
  }

  function pintarOpciones() {
    fila.replaceChildren();

    categorias.forEach((categoria, indice) => {
      const seleccion = seleccionados.get(categoria.nombre);
      const tarjeta = document.createElement("article");
      tarjeta.className = `cfg-componente${seleccion ? " seleccionado" : ""}`;
      tarjeta.dataset.categoriaIndex = String(indice);

      const numero = document.createElement("span");
      numero.className = "cfg-componente-numero";
      numero.textContent = String(indice + 1);
      const nombre = document.createElement("h3");
      nombre.textContent = categoria.nombre;

      const arte = document.createElement("div");
      arte.className = "cfg-componente-arte";
      const icono = document.createElement("span");
      icono.className = "cfg-componente-icono";
      icono.setAttribute("aria-hidden", "true");
      icono.textContent = categoria.icono;
      arte.appendChild(icono);

      const opcionImagen = seleccion || categoria.opciones[0];
      if (opcionImagen?.imagen) {
        const imagenProducto = document.createElement("img");
        imagenProducto.src = opcionImagen.imagen;
        imagenProducto.alt = "";
        imagenProducto.loading = "lazy";
        imagenProducto.addEventListener("load", () => {
          icono.hidden = true;
        });
        imagenProducto.addEventListener("error", () => {
          imagenProducto.remove();
        });
        arte.appendChild(imagenProducto);
      }

      const selector = document.createElement("select");
      selector.className = "cfg-componente-selector";
      selector.id = `cfgProducto-${indice}`;
      selector.hidden = true;
      selector.disabled = categoria.opciones.length === 0;
      selector.setAttribute("aria-label", `Producto para ${categoria.nombre}`);
      const opcionInicial = document.createElement("option");
      opcionInicial.value = "";
      opcionInicial.textContent = "Elige un producto";
      selector.appendChild(opcionInicial);
      categoria.opciones.forEach((opcion) => {
        const elemento = document.createElement("option");
        elemento.value = opcion.id;
        elemento.textContent = `${opcion.nombre} - $${formatoPrecioPC.format(opcion.precio)}`;
        selector.appendChild(elemento);
      });
      selector.value = seleccion?.id || "";
      selector.addEventListener("change", () => {
        if (!selector.value) {
          seleccionados.delete(categoria.nombre);
          feedbackCompra.textContent = "";
          pintarOpciones();
          actualizarResumen();
          return;
        }

        const opcion = categoria.opciones.find(
          (elemento) => elemento.id === selector.value,
        );
        if (!opcion) return;
        seleccionados.set(categoria.nombre, opcion);
        feedbackCompra.textContent = "";
        pintarOpciones();
        actualizarResumen();
      });

      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "cfg-componente-boton";
      boton.setAttribute("aria-controls", selector.id);
      boton.setAttribute("aria-expanded", "false");
      boton.textContent = seleccion ? "Cambiar →" : "Seleccionar →";
      if (!categoria.opciones.length) {
        boton.textContent = categoria.catalogo
          ? "Agotado"
          : "Próximamente";
        boton.disabled = true;
      } else {
        boton.addEventListener("click", () => {
          selector.hidden = !selector.hidden;
          boton.setAttribute("aria-expanded", String(!selector.hidden));
          if (!selector.hidden) selector.focus();
        });
      }

      const seleccionado = document.createElement("small");
      seleccionado.className = "cfg-componente-seleccionado";
      seleccionado.textContent = seleccion
        ? `${seleccion.nombre} · $${formatoPrecioPC.format(seleccion.precio)}`
        : "";

      tarjeta.append(numero, nombre, arte, seleccionado, boton, selector);
      fila.appendChild(tarjeta);
    });
  }

  function actualizarResumen() {
    const seleccion = categorias
      .map((categoria) => seleccionados.get(categoria.nombre))
      .filter(Boolean);
    const total = seleccion.reduce(
      (suma, opcion) => suma + opcion.precio,
      0,
    );

    precio.textContent = formatoPrecioPC.format(total);
    botonComprar.disabled = seleccion.length === 0;
    contador.textContent = `${seleccion.length}/${categorias.length} componentes`;
    const avance = Math.round((seleccion.length / categorias.length) * 100);
    porcentaje.parentElement?.style.setProperty("--avance", String(avance));
    porcentaje.textContent = `${avance}%`;
  }

  botonComprar.addEventListener("click", () => {
    const seleccion = categorias
      .map((categoria) => seleccionados.get(categoria.nombre))
      .filter(Boolean);
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
    const agotado = seleccion.find((opcion) => {
      const cantidadEnCarrito =
        carritoActual.find(
          (item) => String(item.productId) === opcion.id,
        )?.quantity || 0;
      return cantidadEnCarrito >= opcion.stock;
    });

    if (agotado) {
      feedbackCompra.textContent =
        `${agotado.nombre} ya alcanzó el stock disponible en tu carrito.`;
      return;
    }

    botonComprar.disabled = true;
    let agregados = 0;
    try {
      for (const opcion of seleccion) {
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

  pintarOpciones();
  actualizarResumen();
}
