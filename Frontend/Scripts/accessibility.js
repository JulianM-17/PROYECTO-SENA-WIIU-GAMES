/**
 * ACCESIBILIDAD — WiiU Games
 * Selección única: Solo una opción activa a la vez.
 * Al seleccionar una opción, se aplica inmediatamente y el menú se cierra
 * para no quedarse fijo en pantalla.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'wiiu_a11y_active_mode';
  // Modos disponibles: 'normal' | 'large-text' | 'high-contrast' | 'grayscale'
  let activeMode = 'normal';
  let isMenuOpen = false;

  // Cargar modo guardado
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['normal', 'large-text', 'high-contrast', 'grayscale'].includes(saved)) {
      activeMode = saved;
    }
  } catch (e) {}

  // Aplicar modo al documento
  function applyMode() {
    const html = document.documentElement;
    const body = document.body;
    const trigger = document.getElementById('a11y-trigger-btn');

    // 1. Limpiar todos los modos previos
    html.classList.remove('a11y-mode-large-text', 'a11y-mode-high-contrast', 'a11y-mode-grayscale');
    body.classList.remove('a11y-mode-large-text', 'a11y-mode-high-contrast', 'a11y-mode-grayscale');

    // 2. Aplicar el modo seleccionado si no es 'normal'
    if (activeMode === 'large-text') {
      body.classList.add('a11y-mode-large-text');
      html.classList.add('a11y-mode-large-text');
    } else if (activeMode === 'high-contrast') {
      body.classList.add('a11y-mode-high-contrast');
      html.classList.add('a11y-mode-high-contrast');
    } else if (activeMode === 'grayscale') {
      body.classList.add('a11y-mode-grayscale');
      html.classList.add('a11y-mode-grayscale');
    }

    // 3. Actualizar elementos visuales en el menú
    document.querySelectorAll('.a11y-option-item').forEach((item) => {
      const mode = item.getAttribute('data-mode');
      item.classList.toggle('selected', mode === activeMode);
    });

    // 4. Indicador en el botón flotante si hay un modo activo
    if (trigger) {
      trigger.classList.toggle('has-active-mode', activeMode !== 'normal');
    }
  }

  // Guardar en localStorage
  function saveMode() {
    try {
      localStorage.setItem(STORAGE_KEY, activeMode);
    } catch (e) {}
  }

  // Crear la interfaz
  function createUI() {
    if (document.getElementById('a11y-trigger-btn')) return;

    // Botón flotante
    const trigger = document.createElement('button');
    trigger.id = 'a11y-trigger-btn';
    trigger.setAttribute('aria-label', 'Accesibilidad');
    trigger.setAttribute('title', 'Accesibilidad');
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
      </svg>
    `;

    // Menú compacto de opciones exclusivas
    const menu = document.createElement('div');
    menu.id = 'a11y-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Opciones de accesibilidad');
    menu.innerHTML = `
      <div class="a11y-menu-header">
        <span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
          </svg>
          Accesibilidad
        </span>
        <button class="a11y-menu-close" id="a11y-close-btn" aria-label="Cerrar">&times;</button>
      </div>

      <div class="a11y-options-list">
        <div class="a11y-option-item" data-mode="normal">
          <span>Vista Normal</span>
          <span class="a11y-radio-circle"></span>
        </div>

        <div class="a11y-option-item" data-mode="large-text">
          <span>Texto Grande</span>
          <span class="a11y-radio-circle"></span>
        </div>

        <div class="a11y-option-item" data-mode="high-contrast">
          <span>Alto Contraste</span>
          <span class="a11y-radio-circle"></span>
        </div>

        <div class="a11y-option-item" data-mode="grayscale">
          <span>Escala de Grises</span>
          <span class="a11y-radio-circle"></span>
        </div>
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(menu);

    // Funciones para abrir y cerrar
    function closeMenu() {
      isMenuOpen = false;
      menu.classList.remove('a11y-open');
      trigger.blur();
    }

    function toggleMenu() {
      isMenuOpen = !isMenuOpen;
      menu.classList.toggle('a11y-open', isMenuOpen);
      if (!isMenuOpen) trigger.blur();
    }

    // Eventos
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    document.getElementById('a11y-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (isMenuOpen && !menu.contains(e.target) && e.target !== trigger) {
        closeMenu();
      }
    });

    // Selección exclusiva de opciones (solo una activa)
    menu.querySelectorAll('.a11y-option-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedMode = item.getAttribute('data-mode');

        // Si hace clic en la que ya está activa y no es normal, regresa a normal
        if (activeMode === selectedMode && selectedMode !== 'normal') {
          activeMode = 'normal';
        } else {
          activeMode = selectedMode;
        }

        applyMode();
        saveMode();

        // Cierra el menú tras seleccionar para que no quede fijo en pantalla
        setTimeout(closeMenu, 180);
      });
    });
  }

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createUI();
      applyMode();
    });
  } else {
    createUI();
    applyMode();
  }
})();
