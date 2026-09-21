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

  function initialize() {
    createUI();
    applyPreferences();

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

  function setupNotificationWatcher() {
    let updateTimer = null;

    function adjustPosition() {
      const activeToasts = document.querySelectorAll(
        ".toast, .notificacion-alerta, .toast-notification, .contenedor-notificacion .toast, .contenedor-toast .toast, #toastContainer .toast"
      );

      if (!activeToasts || activeToasts.length === 0) {
        document.documentElement.style.setProperty("--a11y-shift-y", "0px");
        return;
      }

      const toastContainers = document.querySelectorAll(
        "#toastContainer, .contenedor-notificacion, .contenedor-toast, #contenedor-toast, #contenedor-notificacion"
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
      document.documentElement.style.setProperty("--a11y-shift-y", `-${shiftPx}px`);
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
