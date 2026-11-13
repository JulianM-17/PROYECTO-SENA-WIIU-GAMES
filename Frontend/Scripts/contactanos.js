(function () {
  function getContactStylesheetPath() {
    const pathParts = window.location.pathname.split('/');
    const pagesIndex = pathParts.lastIndexOf('Pages');
    const depth = pagesIndex === -1 ? 0 : pathParts.length - pagesIndex - 1;
    const prefix = depth === 0 ? '' : '../'.repeat(depth);
    return `${prefix}Styles/contactanos.css`;
  }

  function ensureContactModal() {
    if (document.body.dataset.contactModalReady === 'true') return;

    const href = getContactStylesheetPath();
    if (!document.querySelector(`link[href="${href}"]`)) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = href;
      document.head.appendChild(cssLink);
    }

    if (!document.getElementById('contacto-panel')) {
      const panel = document.createElement('div');
      panel.id = 'contacto-panel';
      panel.className = 'panel-lateral';
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

    if (!document.getElementById('contacto-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'contacto-overlay';
      overlay.className = 'overlay';
      document.body.appendChild(overlay);
    }

    const panel = document.getElementById('contacto-panel');
    const overlay = document.getElementById('contacto-overlay');
    const closeBtn = document.getElementById('cerrar-panel');

    function togglePanel(event) {
      if (event) event.preventDefault();
      panel.classList.toggle('activo');
      overlay.classList.toggle('activo');
    }

    document.querySelectorAll('#btn-abrir-contacto, .link-contacto, a[href*="contactanos.html"]').forEach((button) => {
      button.removeEventListener('click', button._contactModalHandler || null);
      const handler = (event) => {
        const href = button.getAttribute('href') || '';
        if (href && !href.includes('contactanos.html') && href !== '#') {
          return;
        }
        togglePanel(event);
      };
      button._contactModalHandler = handler;
      button.addEventListener('click', handler);
    });

    closeBtn?.removeEventListener('click', closeBtn._contactCloseHandler || null);
    closeBtn._contactCloseHandler = (event) => togglePanel(event);
    closeBtn?.addEventListener('click', closeBtn._contactCloseHandler);

    overlay?.removeEventListener('click', overlay._contactOverlayHandler || null);
    overlay._contactOverlayHandler = (event) => togglePanel(event);
    overlay?.addEventListener('click', overlay._contactOverlayHandler);

    document.body.dataset.contactModalReady = 'true';
  }

  document.addEventListener('DOMContentLoaded', ensureContactModal);
})();