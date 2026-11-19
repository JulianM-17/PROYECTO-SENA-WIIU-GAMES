(function () {
  const pathname = window.location.pathname.replace(/\\/g, "/");
  const pagesIndex = pathname.lastIndexOf("/Pages/");
  const depth = pagesIndex === -1
    ? 0
    : pathname.split("/Pages/")[1].split("/").filter(Boolean).length;
  const prefix = depth === 0 ? "" : "../".repeat(depth);

  function indexPage() {
    if (depth === 0) return "Index.html";
    return `${prefix}Index.html`;
  }

  function catalogPage(extra = "") {
    if (depth === 0) return `Pages/Catalog.html${extra}`;
    if (depth === 1) return `Catalog.html${extra}`;
    return `../Catalog.html${extra}`;
  }

  function cartPage() {
    if (depth === 0) return "Pages/carrito.html";
    if (depth === 1) return "carrito.html";
    return "../carrito.html";
  }

  function servicesPage() {
    if (depth === 0) return "Pages/servicios.html";
    if (depth === 1) return "servicios.html";
    return "../servicios.html";
  }

  const footerTemplate = `
    <div class="cuadricula-footer">
      <div class="columna-footer">
        <h3>Información</h3>
        <ul>
          <li><a href="${servicesPage()}">Acerca de nosotros</a></li>
          <li><a href="${indexPage()}#categoriasGrid">Política de Privacidad</a></li>
          <li><a href="${catalogPage("?buscar=1")}">Buscar</a></li>
          <li><a href="#" class="link-terminos">Términos y Condiciones</a></li>
          <li><a href="${cartPage()}">Pedidos y devoluciones</a></li>
          <li><a href="#" class="link-contacto">Contáctanos</a></li>
        </ul>
      </div>
      <div class="columna-footer">
        <h3>Componentes de PC</h3>
        <ul>
          <li><a href="${catalogPage("?categoria=Procesadores")}">Procesadores</a></li>
          <li><a href="${catalogPage("?categoria=Almacenamiento")}">Discos Duros</a></li>
          <li><a href="${catalogPage("?categoria=Tarjetas%20Gráficas")}">Tarjetas Gráficas</a></li>
          <li><a href="${catalogPage("?categoria=Periféricos")}">Teclados / Mouse</a></li>
          <li><a href="${catalogPage("?categoria=Periféricos")}">Gabinetes / Fuentes / Refrigeración</a></li>
          <li><a href="${catalogPage("?categoria=Memorias%20RAM")}">RAM (Memoria)</a></li>
          <li><a href="${catalogPage("?categoria=Periféricos")}">Altavoces / Audífonos</a></li>
          <li><a href="${catalogPage("?categoria=Motherboards")}">Motherboards</a></li>
        </ul>
      </div>
      <div class="columna-footer">
        <h3>Computadores de escritorio</h3>
        <ul>
          <li><a href="${catalogPage("?categoria=PC%20Escritorio")}">PC personalizados</a></li>
          <li><a href="${catalogPage("?categoria=PC%20Escritorio")}">PCs todo en uno</a></li>
          <li><a href="${catalogPage("?categoria=PC%20Escritorio")}">HP/Compaq PCs</a></li>
          <li><a href="${catalogPage("?categoria=PC%20Escritorio")}">ASUS PCs</a></li>
          <li><a href="${catalogPage("?categoria=PC%20Escritorio")}">Tecs PCs</a></li>
        </ul>
      </div>
      <div class="columna-footer">
        <h3>Portátiles</h3>
        <ul>
          <li><a href="${catalogPage("?categoria=Portátiles")}">Portátiles para todos los días</a></li>
          <li><a href="${catalogPage("?categoria=Portátiles")}">Portátiles gaming</a></li>
        </ul>
      </div>
      <div class="columna-footer columna-contacto">
        <h3>Dirección</h3>
        <p>Centro Comercial Meditrópoli 1, Cra. 11 #14 - 14 Local 126, Sogamoso, Boyacá</p>
        <p>Teléfonos: <a href="tel:3046616081" class="enlace-resaltado">304 661 6081</a></p>
        <p>Lunes-Sábado: 8:00 a.m. - 12:30 p.m. / 2:00 - 7:00 p.m.</p>
        <p>Correo electrónico: <a href="mailto:wiiugames2026@gmail.com" class="enlace-resaltado">wiiugames2026@gmail.com</a></p>
      </div>
    </div>
    <div class="barra-inferior-footer">
      <div class="redes-footer">
        <a href="https://facebook.com/wiiugames" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fi fi-brands-facebook"></i></a>
        <a href="https://instagram.com/wiiugames" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fi fi-brands-instagram"></i></a>
      </div>
      <div class="metodos-pago">
        <span class="tarjeta-icono">PayPal</span>
        <span class="tarjeta-icono">Visa</span>
        <span class="tarjeta-icono">MasterCard</span>
      </div>
      <div class="copyright"><p>Copyright © 2026 WiiU-Games.</p></div>
    </div>
  `;

  function normalizarFooter() {
    document.querySelectorAll("footer.sitio-footer").forEach((footer) => {
      footer.innerHTML = footerTemplate;
    });

    if (!document.querySelector("footer.sitio-footer")) {
      const footer = document.createElement("footer");
      footer.className = "sitio-footer";
      footer.innerHTML = footerTemplate;
      document.body.appendChild(footer);
    }
    document.dispatchEvent(new CustomEvent("footer-normalized"));
  }

  document.addEventListener("DOMContentLoaded", normalizarFooter);
})();
