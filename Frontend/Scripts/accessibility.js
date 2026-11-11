(function () {
  "use strict";

  const STORAGE_KEY = "wiiu_a11y_preferences";
  const MODES = [
    "dark-mode",
    "large-text",
    "high-contrast",
    "grayscale",
    "underline-links",
    "reduced-motion",
  ];
  let preferences = loadPreferences();
  let isMenuOpen = false;

  function loadPreferences() {
    const defaults = Object.fromEntries(MODES.map((mode) => [mode, false]));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const legacyMode = localStorage.getItem("wiiu_a11y_active_mode");
      if (legacyMode === "large-text") defaults["large-text"] = true;
      if (legacyMode === "high-contrast") defaults["high-contrast"] = true;
      if (legacyMode === "grayscale") defaults.grayscale = true;
      return {
        ...defaults,
        ...Object.fromEntries(
          MODES.map((mode) => [mode, saved[mode] === true]),
        ),
      };
    } catch (error) {
      return defaults;
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      localStorage.removeItem("wiiu_a11y_active_mode");
    } catch (error) {}
  }

  function applyPreferences() {
    const root = document.documentElement;
    const body = document.body;
    MODES.forEach((mode) => {
      const className = `a11y-mode-${mode}`;
      root.classList.toggle(className, preferences[mode]);
      body.classList.toggle(className, preferences[mode]);
    });

    const hasActivePreference = MODES.some((mode) => preferences[mode]);
    document
      .getElementById("a11y-trigger-btn")
      ?.classList.toggle("has-active-mode", hasActivePreference);
    document.querySelectorAll(".a11y-option-item").forEach((item) => {
      item.classList.toggle(
        "selected",
        preferences[item.dataset.mode] === true,
      );
      item.setAttribute(
        "aria-pressed",
        String(preferences[item.dataset.mode] === true),
      );
    });
  }

  function resetPreferences() {
    MODES.forEach((mode) => {
      preferences[mode] = false;
    });
    savePreferences();
    applyPreferences();
  }

  function createUI() {
    if (document.getElementById("a11y-trigger-btn")) return;

    const trigger = document.createElement("button");
    trigger.id = "a11y-trigger-btn";
    trigger.type = "button";
    trigger.setAttribute("aria-label", "Abrir opciones de accesibilidad");
    trigger.setAttribute("title", "Opciones de accesibilidad");
    trigger.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>';

    const menu = document.createElement("div");
    menu.id = "a11y-menu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "Opciones de accesibilidad");
    menu.innerHTML = `
      <div class="a11y-menu-header">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>Accesibilidad</span>
        <button class="a11y-menu-close" id="a11y-close-btn" type="button" aria-label="Cerrar">&times;</button>
      </div>
      <p class="a11y-menu-help">Activa una o varias ayudas para adaptar la página.</p>
      <div class="a11y-options-list">
        <button class="a11y-option-item" type="button" data-mode="dark-mode"><span><b aria-hidden="true">◐</b> Modo oscuro</span><span class="a11y-switch"></span></button>
        <button class="a11y-option-item" type="button" data-mode="large-text"><span><b aria-hidden="true">A+</b> Texto grande</span><span class="a11y-switch"></span></button>
        <button class="a11y-option-item" type="button" data-mode="high-contrast"><span><b aria-hidden="true">◑</b> Alto contraste</span><span class="a11y-switch"></span></button>
        <button class="a11y-option-item" type="button" data-mode="grayscale"><span><b aria-hidden="true">◒</b> Escala de grises</span><span class="a11y-switch"></span></button>
        <button class="a11y-option-item" type="button" data-mode="underline-links"><span><b aria-hidden="true">U</b> Subrayar enlaces</span><span class="a11y-switch"></span></button>
        <button class="a11y-option-item" type="button" data-mode="reduced-motion"><span><b aria-hidden="true">||</b> Reducir movimiento</span><span class="a11y-switch"></span></button>
      </div>
      <button class="a11y-reset-btn" id="a11y-reset-btn" type="button">Restablecer opciones</button>
    `;

    document.body.append(trigger, menu);

    const closeMenu = () => {
      isMenuOpen = false;
      menu.classList.remove("a11y-open");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      isMenuOpen = !isMenuOpen;
      menu.classList.toggle("a11y-open", isMenuOpen);
      trigger.setAttribute("aria-expanded", String(isMenuOpen));
    });

    menu.querySelector("#a11y-close-btn").addEventListener("click", closeMenu);
    menu
      .querySelector("#a11y-reset-btn")
      .addEventListener("click", resetPreferences);
    menu.querySelectorAll(".a11y-option-item").forEach((item) => {
      item.addEventListener("click", () => {
        const mode = item.dataset.mode;
        preferences[mode] = !preferences[mode];
        savePreferences();
        applyPreferences();
      });
    });

    document.addEventListener("click", (event) => {
      if (
        isMenuOpen &&
        !menu.contains(event.target) &&
        event.target !== trigger
      )
        closeMenu();
    });
  }

  function getContactStylesheetPath() {
    const pathParts = window.location.pathname.split("/");
    const pagesIndex = pathParts.lastIndexOf("Pages");
    const depth = pagesIndex === -1 ? 0 : pathParts.length - pagesIndex - 1;
    const prefix = depth === 0 ? "" : "../".repeat(depth);
    return `${prefix}Styles/contactanos.css`;
  }

  function setupContactModal() {
    if (document.body.dataset.contactModalReady === "true") return;

    const stylesheetPath = getContactStylesheetPath();
    if (!document.querySelector(`link[href="${stylesheetPath}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = stylesheetPath;
      document.head.appendChild(stylesheet);
    }

    if (!document.getElementById("contacto-panel")) {
      const panel = document.createElement("div");
      panel.id = "contacto-panel";
      panel.className = "panel-lateral";
      panel.innerHTML = `
        <button id="cerrar-panel" class="btn-cerrar" type="button" aria-label="Cerrar contacto">&times;</button>
        <div class="panel-header">
          <h2>Contáctanos</h2>
          <p>
            Si tienes alguna pregunta, inquietud o comentario, no dudes en
            comunicarte con nosotros. Nuestro equipo de atención al cliente
            estará encantado de ayudarte y brindarte la asistencia que
            necesites.
          </p>
        </div>
        <div class="panel-body">
          <div class="formulario-contacto">
            <div class="input-row">
              <div class="input-group">
                <label>Nombre</label>
                <input type="text" placeholder="Tu nombre" />
              </div>
              <div class="input-group">
                <label>Gmail</label>
                <input type="email" placeholder="Ej: tuemail@gmail.com" />
              </div>
            </div>
            <div class="input-group">
              <label>Teléfono</label>
              <input type="text" placeholder="Ej: 3001234567" />
            </div>
            <div class="input-group">
              <label>Agrega tu consulta</label>
              <textarea placeholder="Escribe tu consulta aquí" rows="4"></textarea>
            </div>
            <button type="button" class="btn-enviar">Enviar Consulta</button>
          </div>
          <div class="info-contacto">
            <div class="info-card">
              <h4>DIRECCIÓN:</h4>
              <p>Centro Comercial Meditrópoli 1, Cra. 11 #14 - 14 Local 126, Sogamoso, Boyacá</p>
            </div>
            <div class="info-card">
              <h4>TELÉFONO:</h4>
              <p>3046616081</p>
            </div>
            <div class="info-card">
              <h4>HORARIOS:</h4>
              <p>
                Lunes a viernes: 8:30 a.m. a 12:00 p.m, 2:30 p.m a 6:30 p.m.<br />
                Sabado: 8:30 a.m a 12:30 p.m, 2:30 p.m a 6:30 p.m.<br />
                Domingo: 10:00 a.m a 1:00 p.m
              </p>
            </div>
            <div class="info-card">
              <h4>CORREO ELECTRÓNICO:</h4>
              <p><span class="badge-correo">shop@email.com</span></p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
    }

    if (!document.getElementById("contacto-overlay")) {
      const overlay = document.createElement("div");
      overlay.id = "contacto-overlay";
      overlay.className = "overlay";
      document.body.appendChild(overlay);
    }

    const panel = document.getElementById("contacto-panel");
    const overlay = document.getElementById("contacto-overlay");
    const closeButton = document.getElementById("cerrar-panel");

    function togglePanel(event) {
      if (event) event.preventDefault();
      panel.classList.toggle("activo");
      overlay.classList.toggle("activo");
    }

    document.querySelectorAll('#btn-abrir-contacto, .link-contacto').forEach((trigger) => {
      trigger.removeEventListener(
        "click",
        trigger._contactModalHandler || null,
      );
      const handler = (event) => {
        event.preventDefault();
        togglePanel(event);
      };
      trigger._contactModalHandler = handler;
      trigger.addEventListener("click", handler);
    });

    closeButton?.removeEventListener(
      "click",
      closeButton._contactCloseHandler || null,
    );
    closeButton._contactCloseHandler = (event) => togglePanel(event);
    closeButton?.addEventListener("click", closeButton._contactCloseHandler);

    overlay?.removeEventListener(
      "click",
      overlay._contactOverlayHandler || null,
    );
    overlay._contactOverlayHandler = (event) => togglePanel(event);
    overlay?.addEventListener("click", overlay._contactOverlayHandler);

    document.body.dataset.contactModalReady = "true";
  }

  function setupMobileMenu() {
    const navbar = document.querySelector(".menu-principal");
    const menu = navbar?.querySelector(".contenido-menu");
    if (!navbar || !menu || navbar.dataset.mobileMenuReady === "true") return;
    const userIcons = menu.querySelector(".iconos-usuario");
    const topBar = navbar.parentElement?.querySelector(".barra-superior");
    const topBarParent = topBar?.parentElement;
    const topBarNextSibling = topBar?.nextSibling;

    // Crea los controles para abrir y cerrar el menú en pantallas pequeñas.
    const actions = document.createElement("div");
    actions.className = "menu-movil-acciones";
    navbar.appendChild(actions);

    const menuButton = document.createElement("button");
    menuButton.className = "menu-movil-boton";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Abrir menú");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "menu-navegacion");
    menuButton.innerHTML =
      '<span></span><span></span><span></span>';
    navbar.appendChild(menuButton);
    menu.id = "menu-navegacion";

    const closeButton = document.createElement("button");
    closeButton.className = "menu-movil-cerrar";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Cerrar menú");
    closeButton.innerHTML = "";
    menu.prepend(closeButton);

    const overlay = document.createElement("button");
    overlay.className = "menu-movil-overlay";
    overlay.type = "button";
    overlay.setAttribute("aria-label", "Cerrar menú");
    document.body.appendChild(overlay);

    // Mantiene sincronizado el estado visual y accesible del menú.
    function setMenuOpen(isOpen) {
      navbar.classList.toggle("menu-movil-abierto", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
      document.body.classList.toggle("menu-movil-bloqueo", isOpen);
    }

    // Cierra el menú al navegar, tocar fuera, pulsar Escape o volver a escritorio.
    menuButton.addEventListener("click", () => {
      setMenuOpen(!navbar.classList.contains("menu-movil-abierto"));
    });
    closeButton.addEventListener("click", () => setMenuOpen(false));
    overlay.addEventListener("click", () => setMenuOpen(false));
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });
    topBar?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    // Reubica los iconos y la información superior según el tamaño de pantalla.
    function syncMobileLayout() {
      if (window.innerWidth <= 768) {
        if (userIcons && userIcons.parentElement !== actions) {
          actions.appendChild(userIcons);
        }
        if (topBar && topBar.parentElement !== menu) {
          menu.appendChild(topBar);
        }
        return;
      }

      if (userIcons && userIcons.parentElement !== menu) {
        menu.appendChild(userIcons);
      }
      if (topBar && topBar.parentElement !== topBarParent) {
        topBarParent.insertBefore(
          topBar,
          topBarNextSibling?.parentElement === topBarParent
            ? topBarNextSibling
            : null,
        );
      }
      setMenuOpen(false);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });
    window.addEventListener("resize", syncMobileLayout);
    syncMobileLayout();

    // Evita inicializar los controles más de una vez.
    navbar.dataset.mobileMenuReady = "true";
  }

  function initialize() {
    createUI();
    applyPreferences();
    setupMobileMenu();
    setupContactModal();
    setupSessionHeader();

    // Ocultar burbuja del carrito si no tiene productos
    document.querySelectorAll(".burbuja-carrito").forEach((burbuja) => {
      const texto = burbuja.textContent.trim();
      if (!texto || texto === "0") {
        burbuja.textContent = "";
        burbuja.style.display = "none";
      }
    });

    setupNotificationWatcher();
  }

  function setupSessionHeader() {
    let user;
    try {
      user = JSON.parse(
        sessionStorage.getItem("wiiu_usuario_activo") || "null",
      );
    } catch (error) {
      return;
    }
    if (!user?.token) return;

    document.body.classList.add("usuario-autenticado");
    const homeLink = document.querySelector(".seccion-logo a");
    const baseUrl = homeLink?.href || document.baseURI;
    const destinations = {
      Administrador: "Pages/Administrador/index_admin.html",
      Trabajador: "Pages/Empleado/index.html",
      Cliente: "Pages/panel_usuario.html",
      Proveedor: "Pages/panel_usuario.html",
    };
    const destination = new URL(
      destinations[user.rol] || destinations.Cliente,
      baseUrl,
    ).href;
    const initials = String(user.nombre || "Usuario")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    const existingAvatar = document.querySelector(".foto-perfil");
    const avatar = document.createElement("a");
    avatar.className = existingAvatar
      ? `avatar-sesion ${existingAvatar.className}`
      : "avatar-sesion";
    avatar.href = destination;
    avatar.title = user.nombre || "Mi cuenta";
    avatar.setAttribute(
      "aria-label",
      `Abrir cuenta de ${user.nombre || "usuario"}`,
    );
    avatar.textContent = initials || "U";

    if (existingAvatar) {
      existingAvatar.replaceWith(avatar);
    } else {
      const userIcons = document.querySelector(".iconos-usuario");
      if (userIcons) userIcons.appendChild(avatar);
    }
  }

  function setupNotificationWatcher() {
    let updateTimer = null;

    function adjustPosition() {
      const activeToasts = document.querySelectorAll(
        ".toast, .notificacion-alerta, .toast-notification, .contenedor-notificacion .toast, .contenedor-toast .toast, #toastContainer .toast",
      );

      if (!activeToasts || activeToasts.length === 0) {
        document.documentElement.style.setProperty("--a11y-shift-y", "0px");
        return;
      }

      const toastContainers = document.querySelectorAll(
        "#toastContainer, .contenedor-notificacion, .contenedor-toast, #contenedor-toast, #contenedor-notificacion",
      );

      let maxOffset = 0;
      toastContainers.forEach((container) => {
        if (container && container.children.length > 0) {
          const rect = container.getBoundingClientRect();
          if (rect.height > maxOffset) {
            maxOffset = rect.height;
          }
        }
      });

      if (maxOffset === 0) {
        maxOffset = activeToasts.length * 66;
      }

      const shiftPx = Math.round(maxOffset + 16);
      document.documentElement.style.setProperty(
        "--a11y-shift-y",
        `-${shiftPx}px`,
      );
    }

    const observer = new MutationObserver(() => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(adjustPosition, 30);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    adjustPosition();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();