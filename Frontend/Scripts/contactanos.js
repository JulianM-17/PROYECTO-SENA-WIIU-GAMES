(function () {
  let contactStylesheetPromise;

  function getContactStylesheetPath() {
    const pathParts = window.location.pathname.split('/');
    const pagesIndex = pathParts.lastIndexOf('Pages');
    const depth = pagesIndex === -1 ? 0 : pathParts.length - pagesIndex - 1;
    const prefix = depth === 0 ? '' : '../'.repeat(depth);
    return `${prefix}Styles/contactanos.css`;
  }

  function loadContactStylesheet() {
    const href = getContactStylesheetPath();
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink?.sheet) return Promise.resolve();
    if (contactStylesheetPromise) return contactStylesheetPromise;

    const cssLink = existingLink || document.createElement('link');
    contactStylesheetPromise = new Promise((resolve, reject) => {
      cssLink.addEventListener('load', resolve, { once: true });
      cssLink.addEventListener('error', () => {
        reject(new Error(`No se pudo cargar la hoja de estilos: ${href}`));
      }, { once: true });

      if (!existingLink) {
        cssLink.rel = 'stylesheet';
        cssLink.href = href;
        document.head.appendChild(cssLink);
      }
    });
    return contactStylesheetPromise;
  }

  function ensureContactModal() {
    loadContactStylesheet()
      .then(createContactModal)
      .catch((error) => console.error(error));
  }

  function createContactModal() {
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
                Lunes-Sabado: 8:00 a.m. – 12:30 p.m. 2:00–7:00 p.m.
              </p>
            </div>
            <div class="info-card">
              <h4>CORREO ELECTRÓNICO:</h4>
              <a href="mailto:wiiugames2026@gmail.com" class="correo-contactanos">wiiugames2026@gmail.com</a>
            </div>  
          </div>
        </div>
      `;  
      document.body.appendChild(panel);
    }

    if (!document.getElementById('terminos-panel')) {
      const panel = document.createElement('div');
      panel.id = 'terminos-panel';
      panel.className = 'panel-lateral';
      const termsAcceptAction = document.getElementById('aceptar-terminos')
        ? '<div class="terminos-acciones"><button id="aceptar-terminos-panel" class="btn-aceptar-terminos-panel" type="button">Aceptar y Continuar</button></div>'
        : '';
      panel.innerHTML = `
        <button id="cerrar-panel-terminos" class="btn-cerrar" type="button" aria-label="Cerrar términos y condiciones">&times;</button>
        <div class="panel-header">
          <h2 id="terminos-panel-titulo">Términos y Condiciones</h2>
          <p>Conoce las condiciones de uso de los servicios y productos de WiiU-Games.</p>
        </div>
        <div class="panel-body">
          <div class="terminos-contenido">
            <article class="termino-item">
              <h3>Aceptación del Servicio</h3>
              <p>Al crear una cuenta en la plataforma de WiiU-Games, usted manifiesta su conformidad con los presentes Términos y Condiciones, así como con nuestras políticas de entrega, garantías y privacidad de datos.</p>
            </article>
            <article class="termino-item">
              <h3>Registro y Seguridad de la Cuenta</h3>
              <p>El usuario es responsable de mantener la confidencialidad de su contraseña y de toda actividad realizada desde su cuenta. WiiU-Games no se hace responsable por accesos no autorizados derivados de negligencia en el resguardo de credenciales.</p>
            </article>
            <article class="termino-item">
              <h3>Garantías de Productos y Servicios</h3>
              <p>Todos nuestros computadores gamer, portátiles y consolas cuentan con un periodo de garantía de hasta 3 años según las especificaciones del fabricante y nuestros sellos autorizados de soporte técnico.</p>
            </article>
            <article class="termino-item">
              <h3>Protección y Tratamiento de Datos</h3>
              <p>Sus datos personales y direcciones de envío serán procesados bajo estrictos protocolos de cifrado y confidencialidad conforme a la legislación vigente de protección de datos personales.</p>
            </article>
          </div>
          ${termsAcceptAction}
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
    const termsPanel = document.getElementById('terminos-panel');
    const overlay = document.getElementById('contacto-overlay');
    const closeBtn = document.getElementById('cerrar-panel');
    const termsCloseBtn = document.getElementById('cerrar-panel-terminos');

    function closePanels(event) {
      if (event) event.preventDefault();
      panel.classList.remove('activo');
      termsPanel.classList.remove('activo');
      overlay.classList.remove('activo');
    }

    function openPanel(targetPanel, event) {
      if (event) event.preventDefault();
      const wasActive = targetPanel.classList.contains('activo');
      closePanels();
      if (!wasActive) {
        targetPanel.classList.add('activo');
        overlay.classList.add('activo');
      }
    }

    document.querySelectorAll('#btn-abrir-contacto, .link-contacto, a[href*="contactanos.html"]').forEach((button) => {
      button.removeEventListener('click', button._contactModalHandler || null);
      const handler = (event) => {
        const href = button.getAttribute('href') || '';
        if (href && !href.includes('contactanos.html') && href !== '#') {
          return;
        }
        openPanel(panel, event);
      };
      button._contactModalHandler = handler;
      button.addEventListener('click', handler);
    });

    document.querySelectorAll('.link-terminos').forEach((button) => {
      button.removeEventListener('click', button._termsModalHandler || null);
      const handler = (event) => openPanel(termsPanel, event);
      button._termsModalHandler = handler;
      button.addEventListener('click', handler);
    });

    closeBtn?.removeEventListener('click', closeBtn._contactCloseHandler || null);
    closeBtn._contactCloseHandler = closePanels;
    closeBtn?.addEventListener('click', closeBtn._contactCloseHandler);

    termsCloseBtn?.removeEventListener('click', termsCloseBtn._termsCloseHandler || null);
    termsCloseBtn._termsCloseHandler = closePanels;
    termsCloseBtn?.addEventListener('click', termsCloseBtn._termsCloseHandler);

    overlay?.removeEventListener('click', overlay._contactOverlayHandler || null);
    overlay._contactOverlayHandler = closePanels;
    overlay?.addEventListener('click', overlay._contactOverlayHandler);

    document.body.dataset.contactModalReady = 'true';
  }

  document.addEventListener('DOMContentLoaded', ensureContactModal);
  document.addEventListener('footer-normalized', ensureContactModal);
})();