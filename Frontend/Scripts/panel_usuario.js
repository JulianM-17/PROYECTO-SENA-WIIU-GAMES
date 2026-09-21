// =====================================================
//   PANEL DE USUARIO — LÓGICA COMPLETA E INTERACTIVIDAD
//   WiiU-Games
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
  // ===================================================
  // 1. ESTADO DE LA APLICACIÓN Y LOCALSTORAGE
  // ===================================================
  const STORAGE_KEY = 'wiiu_user_panel_data';

  const defaultState = {
    cartCount: 0,
    profile: {
      nombre: 'Fabian',
      apellidos: 'Mora Ríos',
      email: 'fabian@wiiu.com',
      telefono: '+57 310 456 7890',
      nacimiento: '1998-04-15',
      documento: '1098 765 432'
    },
    addresses: [
      {
        id: 'dir-1',
        tipo: 'Casa',
        nombre: 'Fabian Mora',
        detalle: 'Cra. 11 #14-14, Apto 302, Sogamoso, Boyacá, Colombia – 152210',
        telefono: '+57 310 456 7890',
        principal: true,
        iconClass: 'fi fi-rr-home'
      },
      {
        id: 'dir-2',
        tipo: 'Trabajo',
        nombre: 'Fabian Mora',
        detalle: 'Centro Comercial Meditrópoli 1, Local 126, Sogamoso, Boyacá, Colombia – 152210',
        telefono: '+57 300 123 4567',
        principal: false,
        iconClass: 'fi fi-rr-briefcase'
      }
    ],
    cards: [
      {
        id: 'card-1',
        tipo: 'visa',
        numero: '•••• •••• •••• 4821',
        rawNumero: '4532 8900 1234 4821',
        titular: 'FABIAN MORA',
        vence: '08/29',
        predeterminada: true
      },
      {
        id: 'card-2',
        tipo: 'mastercard',
        numero: '•••• •••• •••• 7743',
        rawNumero: '5412 7500 9812 7743',
        titular: 'FABIAN MORA',
        vence: '03/27',
        predeterminada: false
      }
    ],
    orders: [
      {
        id: 'ord-1',
        num: 'WG-20260901',
        fecha: '1 de septiembre, 2026',
        estado: 'entregado',
        badgeHtml: '<span class="insignia-entregado"><i class="fi fi-rr-check"></i> Entregado</span>',
        producto: 'MSI MEG Trident X — PC Gamer i7',
        cantidad: 1,
        total: '$4,349.000 COP',
        img: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=120&q=80',
        estimado: '1 de septiembre, 2026',
        timelineStep: 4,
        guia: 'SE-9912001-COL',
        transportadora: 'Servientrega'
      },
      {
        id: 'ord-2',
        num: 'WG-20260912',
        fecha: '12 de septiembre, 2026',
        estado: 'en-camino',
        badgeHtml: '<span class="insignia-en-camino"><i class="fi fi-rr-truck-side"></i> En camino</span>',
        producto: 'ASUS ROG Zephyrus G14 — Gaming Laptop',
        cantidad: 1,
        total: '$6,850.000 COP',
        img: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=120&q=80',
        estimado: '19 de septiembre, 2026',
        timelineStep: 3,
        guia: 'SE-7812349-COL',
        transportadora: 'Servientrega'
      },
      {
        id: 'ord-3',
        num: 'WG-20260815',
        fecha: '15 de agosto, 2026',
        estado: 'procesando',
        badgeHtml: '<span class="insignia-procesando"><i class="fi fi-rr-clock"></i> Procesando</span>',
        producto: 'Logitech G Pro X Superlight 2 — Mouse Gaming',
        cantidad: 2,
        total: '$580.000 COP',
        iconClass: 'fi fi-rr-mouse',
        isEmojiHolder: true,
        estimado: '25 de agosto, 2026',
        timelineStep: 1,
        guia: 'SE-5541092-COL',
        transportadora: 'Servientrega'
      }
    ],
    favorites: [
      {
        id: 'fav-1',
        nombre: 'MSI MEG Trident X — i7 10700K',
        categoria: 'PC Gamer',
        precioActual: '$3,697.000',
        precioTachado: '$4,349.000',
        badge: '-15%',
        badgeClass: 'insignia-descuento-favorito',
        img: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80'
      },
      {
        id: 'fav-2',
        nombre: 'ASUS ROG Zephyrus G14',
        categoria: 'Gaming Laptop',
        precioActual: '$6,850.000',
        img: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80'
      },
      {
        id: 'fav-3',
        nombre: 'LG UltraGear 27" 165Hz QHD',
        categoria: 'Monitor Gaming',
        precioActual: '$1,250.000',
        badge: 'Stock bajo',
        badgeClass: 'insignia-stock-favorito',
        img: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&q=80'
      },
      {
        id: 'fav-4',
        nombre: 'Logitech G Pro X Superlight 2',
        categoria: 'Periferico',
        precioActual: '$290.000',
        iconClass: 'fi fi-rr-mouse',
        isEmojiHolder: true
      },
      {
        id: 'fav-5',
        nombre: 'Keychron Q1 Pro — Mecánico TKL',
        categoria: 'Teclado',
        precioActual: '$680.000',
        iconClass: 'fi fi-rr-keyboard',
        isEmojiHolder: true
      }
    ]
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error al cargar estado de localStorage:', e);
    }
    return defaultState;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Error al guardar estado:', e);
    }
  }

  // ===================================================
  // 2. SISTEMA DE TOASTS Y MODALES
  // ===================================================
  const toastContainer = document.getElementById('contenedor-notificacion');

  function showToast(mensaje, tipo = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;

    let icon = 'fi fi-rr-check-circle';
    if (tipo === 'error') icon = 'fi fi-rr-cross-circle';
    if (tipo === 'info') icon = 'fi fi-rr-info';

    toast.innerHTML = `<i class="${icon}"></i> <span>${mensaje}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('activa');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('activa');
  }

  // Cerrar modales al hacer clic en botones de cierre o backdrop
  document.querySelectorAll('[data-close-modal], .fondo-modal').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el.hasAttribute('data-close-modal')) {
        const activeModal = el.closest('.fondo-modal') || el;
        activeModal.classList.remove('activa');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.fondo-modal.activa').forEach(m => m.classList.remove('activa'));
    }
  });

  // ===================================================
  // 3. NAVEGACIÓN SPA & BREADCRUMBS
  // ===================================================
  const navItems   = document.querySelectorAll('.elemento-nav[data-vista]');
  const vistas     = document.querySelectorAll('.vista-panel');
  const migaActiva = document.getElementById('miga-activa');

  const etiquetas = {
    'vista-inicio':      'Mi Cuenta',
    'vista-perfil':      'Mi Perfil',
    'vista-direcciones': 'Direcciones de Envío',
    'vista-pedidos':     'Mis Pedidos',
    'vista-pagos':       'Métodos de Pago',
    'vista-favoritos':   'Mi Lista de Favoritos',
    'vista-seguimiento': 'Sigue tu Pedido',
    'vista-factura':     'Descarga tu Factura',
  };

  function activarVista(vistaId, navId) {
    vistas.forEach(v => v.classList.remove('activa'));
    navItems.forEach(n => n.classList.remove('activo'));

    const vista = document.getElementById(vistaId);
    if (vista) vista.classList.add('activa');

    const navEl = document.getElementById(navId);
    if (navEl) navEl.classList.add('activo');

    if (migaActiva) migaActiva.textContent = etiquetas[vistaId] || 'Mi Cuenta';
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const vistaId = item.dataset.vista;
      const navId   = item.id;
      activarVista(vistaId, navId);
    });
  });

  // Tarjetas del dashboard (redirigen a la vista correspondiente)
  const tarjetasNav = document.querySelectorAll('[data-nav]');
  tarjetasNav.forEach(tarjeta => {
    tarjeta.addEventListener('click', (e) => {
      e.preventDefault();
      const navId = tarjeta.dataset.nav;
      const navEl = document.getElementById(navId);
      if (navEl) {
        const vistaId = navEl.dataset.vista;
        activarVista(vistaId, navId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // ===================================================
  // 4. ACTUALIZACIÓN GLOBAL DE INTERFAZ (RERENDER)
  // ===================================================
  function updateUI() {
    // 4.1 Carrito en Header
    const burbujaCarrito = document.querySelector('.burbuja-carrito');
    if (burbujaCarrito) burbujaCarrito.textContent = (state.cartCount && state.cartCount > 0) ? state.cartCount : '';

    // 4.2 Datos del Perfil (Header, Sidebar, Banner, Cards)
    const { nombre, apellidos, email, telefono, nacimiento, documento } = state.profile;
    const initial = (nombre && nombre.charAt(0)) ? nombre.charAt(0).toUpperCase() : 'U';

    document.querySelectorAll('.avatar-barra-lateral, .perfil-avatar-grande, .foto-perfil').forEach(el => {
      if (el.classList.contains('foto-perfil')) {
        el.textContent = initial;
      } else {
        el.textContent = initial;
      }
    });

    document.querySelectorAll('.info-perfil-barra-lateral .nombre, .perfil-avatar-nombre').forEach(el => {
      el.textContent = `${nombre} ${apellidos}`.trim();
    });

    document.querySelectorAll('.info-perfil-barra-lateral .email, .perfil-avatar-email').forEach(el => {
      el.textContent = email;
    });

    const bannerSaludo = document.querySelector('.banner-saludo span');
    if (bannerSaludo) bannerSaludo.textContent = `${nombre}!`;

    // Counters en perfil stat
    const statNumeroPedidos = document.querySelectorAll('.perfil-stat-numero')[0];
    const statNumeroFavs = document.querySelectorAll('.perfil-stat-numero')[1];
    const statNumeroDirs = document.querySelectorAll('.perfil-stat-numero')[2];

    if (statNumeroPedidos) statNumeroPedidos.textContent = state.orders.length;
    if (statNumeroFavs) statNumeroFavs.textContent = state.favorites.length;
    if (statNumeroDirs) statNumeroDirs.textContent = state.addresses.length;

    // Form inputs de perfil
    const inputNombre = document.querySelector('#vista-perfil input[type="text"]:nth-of-type(1)');
    const inputsPerfil = document.querySelectorAll('#vista-perfil .tarjeta-formulario:first-of-type .entrada-formulario');
    if (inputsPerfil.length >= 6) {
      inputsPerfil[0].value = nombre;
      inputsPerfil[1].value = apellidos;
      inputsPerfil[2].value = email;
      inputsPerfil[3].value = telefono;
      inputsPerfil[4].value = nacimiento;
      inputsPerfil[5].value = documento;
    }

    renderAddresses();
    renderCards();
    renderFavorites();
    renderOrders();
  }

  // ===================================================
  // 5. PERFIL — GUARDAR DATOS & CAMBIAR CONTRASEÑA
  // ===================================================
  const formPerfilDatos     = document.getElementById('form-perfil-datos');
  const btnCancelarPerfil   = document.getElementById('btn-cancelar-perfil');
  const formPerfilSeguridad = document.getElementById('form-perfil-seguridad');

  if (formPerfilDatos) {
    formPerfilDatos.addEventListener('submit', (e) => {
      e.preventDefault();
      const nuevoNombre     = document.getElementById('perfil-nombres')?.value.trim();
      const nuevosApellidos = document.getElementById('perfil-apellidos')?.value.trim() || '';
      const nuevoEmail      = document.getElementById('perfil-email')?.value.trim() || '';
      const nuevoTel        = document.getElementById('perfil-telefono')?.value.trim() || '';
      const nuevoNac        = document.getElementById('perfil-nacimiento')?.value || '';
      const nuevoDoc        = document.getElementById('perfil-documento')?.value.trim() || '';

      if (!nuevoNombre) {
        showToast('El campo Nombres no puede estar vacío.', 'error');
        return;
      }

      state.profile.nombre     = nuevoNombre;
      state.profile.apellidos  = nuevosApellidos;
      state.profile.email      = nuevoEmail;
      state.profile.telefono   = nuevoTel;
      state.profile.nacimiento = nuevoNac;
      state.profile.documento  = nuevoDoc;

      saveState();
      updateUI();
      showToast('¡Datos personales actualizados con éxito!', 'success');
    });
  }

  if (btnCancelarPerfil) {
    btnCancelarPerfil.addEventListener('click', (e) => {
      e.preventDefault();
      updateUI();
      showToast('Cambios cancelados.', 'info');
    });
  }

  if (formPerfilSeguridad) {
    formPerfilSeguridad.addEventListener('submit', (e) => {
      e.preventDefault();
      const actual  = document.getElementById('perfil-pass-actual')?.value;
      const nueva   = document.getElementById('perfil-pass-nueva')?.value;
      const confirm = document.getElementById('perfil-pass-confirm')?.value;

      if (!actual) {
        showToast('Ingresa tu contraseña actual.', 'error');
        return;
      }
      if (!nueva || nueva.length < 6) {
        showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }
      if (nueva !== confirm) {
        showToast('Las contraseñas no coinciden.', 'error');
        return;
      }

      const inputActual = document.getElementById('perfil-pass-actual');
      const inputNueva = document.getElementById('perfil-pass-nueva');
      const inputConfirm = document.getElementById('perfil-pass-confirm');
      if (inputActual) inputActual.value = '';
      if (inputNueva) inputNueva.value = '';
      if (inputConfirm) inputConfirm.value = '';

      showToast('¡Contraseña actualizada con éxito!', 'success');
    });
  }

  // ===================================================
  // 6. DIRECCIONES — AGREGAR / EDITAR / ELIMINAR
  // ===================================================
  const gridDirecciones = document.querySelector('.grid-direcciones');
  const btnAgregarDir = document.querySelector('#vista-direcciones .btn-agregar');
  const formDir = document.getElementById('form-modal-direccion');

  function renderAddresses() {
    if (!gridDirecciones) return;
    gridDirecciones.innerHTML = '';

    if (state.addresses.length === 0) {
      gridDirecciones.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No tienes direcciones registradas. ¡Agrega una nueva!</p>`;
      return;
    }

    state.addresses.forEach(dir => {
      const card = document.createElement('div');
      card.className = `dir-card ${dir.principal ? 'principal' : ''}`;
      card.innerHTML = `
        ${dir.principal ? '<span class="insignia-direccion-principal">Principal</span>' : ''}
        <div class="dir-encabezado">
          <div class="dir-icono ${!dir.principal ? 'secundario' : ''}">
            <i class="${dir.iconClass || (dir.tipo === 'Trabajo' ? 'fi fi-rr-briefcase' : 'fi fi-rr-home')}"></i>
          </div>
          <p class="dir-tipo">${dir.tipo}</p>
        </div>
        <p class="dir-nombre">${dir.nombre}</p>
        <p class="dir-detalle">${dir.detalle.replace(/,/g, '<br/>')}</p>
        <p class="dir-telefono"><i class="fi fi-rr-phone-call"></i>${dir.telefono}</p>
        <div class="dir-acciones">
          <button class="btn-dir-editar" data-id="${dir.id}">Editar</button>
          <button class="btn-dir-eliminar" data-id="${dir.id}">Eliminar</button>
        </div>
      `;
      gridDirecciones.appendChild(card);
    });

    // Event listeners botones editar/eliminar
    gridDirecciones.querySelectorAll('.btn-dir-editar').forEach(btn => {
      btn.addEventListener('click', () => editAddress(btn.dataset.id));
    });

    gridDirecciones.querySelectorAll('.btn-dir-eliminar').forEach(btn => {
      btn.addEventListener('click', () => deleteAddress(btn.dataset.id));
    });
  }

  if (btnAgregarDir) {
    btnAgregarDir.addEventListener('click', () => {
      document.getElementById('modal-direccion-titulo').innerHTML = '<i class="fi fi-rr-marker"></i> Agregar Dirección';
      formDir.reset();
      document.getElementById('dir-edit-id').value = '';
      openModal('modal-direccion');
    });
  }

  function editAddress(id) {
    const dir = state.addresses.find(d => d.id === id);
    if (!dir) return;

    document.getElementById('modal-direccion-titulo').innerHTML = '<i class="fi fi-rr-marker"></i> Editar Dirección';
    document.getElementById('dir-edit-id').value = dir.id;
    document.getElementById('dir-input-tipo').value = dir.tipo;
    document.getElementById('dir-input-nombre').value = dir.nombre;
    document.getElementById('dir-input-detalle').value = dir.detalle;
    document.getElementById('dir-input-telefono').value = dir.telefono;
    document.getElementById('dir-input-principal').checked = dir.principal;

    openModal('modal-direccion');
  }

  function deleteAddress(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      state.addresses = state.addresses.filter(d => d.id !== id);
      saveState();
      updateUI();
      showToast('Dirección eliminada correctamente.', 'info');
    }
  }

  if (formDir) {
    formDir.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('dir-edit-id').value;
      const tipo = document.getElementById('dir-input-tipo').value;
      const nombre = document.getElementById('dir-input-nombre').value.trim();
      const detalle = document.getElementById('dir-input-detalle').value.trim();
      const telefono = document.getElementById('dir-input-telefono').value.trim();
      const principal = document.getElementById('dir-input-principal').checked;

      if (principal) {
        state.addresses.forEach(d => d.principal = false);
      }

      if (id) {
        const dir = state.addresses.find(d => d.id === id);
        if (dir) {
          dir.tipo = tipo;
          dir.nombre = nombre;
          dir.detalle = detalle;
          dir.telefono = telefono;
          dir.principal = principal;
        }
      } else {
        const newDir = {
          id: 'dir-' + Date.now(),
          tipo,
          nombre,
          detalle,
          telefono,
          principal: principal || state.addresses.length === 0,
          iconClass: tipo === 'Trabajo' ? 'fi fi-rr-briefcase' : 'fi fi-rr-home'
        };
        state.addresses.push(newDir);
      }

      saveState();
      updateUI();
      closeModal('modal-direccion');
      showToast('¡Dirección guardada correctamente!', 'success');
    });
  }

  // ===================================================
  // 7. MÉTODOS DE PAGO — TARJETAS Y PAYPAL
  // ===================================================
  const gridTarjetas = document.querySelector('.grid-tarjetas-pago');
  const btnAgregarTarjeta = document.querySelector('#vista-pagos .btn-agregar');
  const formCard = document.getElementById('form-modal-tarjeta');

  function renderCards() {
    if (!gridTarjetas) return;
    gridTarjetas.innerHTML = '';

    if (state.cards.length === 0) {
      gridTarjetas.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No tienes tarjetas guardadas.</p>`;
      return;
    }

    state.cards.forEach(card => {
      const isVisa = card.tipo === 'visa';
      const el = document.createElement('div');
      el.className = `tarjeta-pago ${isVisa ? 'visa' : 'mastercard'}`;

      el.innerHTML = `
        <div class="tarjeta-deco-1"></div>
        <div class="tarjeta-deco-2"></div>
        <div class="tarjeta-top">
          <div class="tarjeta-info-predeterminada">
            ${card.predeterminada ? '<span class="etiqueta-tarjeta-predeterminada">Predeterminada</span>' : ''}
            <div class="tarjeta-chip ${!isVisa ? 'mc' : ''}"></div>
          </div>
          ${isVisa ? '<span class="tarjeta-visa-logo">VISA</span>' : `
            <div class="mc-logo">
              <div class="mc-circulo-rojo"></div>
              <div class="mc-circulo-naranja"></div>
            </div>
          `}
        </div>
        <p class="tarjeta-numero">${card.numero}</p>
        <div class="tarjeta-footer">
          <div>
            <p class="tarjeta-campo-label">Titular</p>
            <p class="tarjeta-campo-valor">${card.titular}</p>
          </div>
          <div class="tarjeta-campo-right">
            <p class="tarjeta-campo-label">Vence</p>
            <p class="tarjeta-campo-valor">${card.vence}</p>
          </div>
        </div>
        <div class="tarjeta-pago-btns">
          <button class="btn-tarjeta-editar" data-id="${card.id}">Editar</button>
          <button class="btn-tarjeta-eliminar" data-id="${card.id}">Eliminar</button>
        </div>
      `;
      gridTarjetas.appendChild(el);
    });

    gridTarjetas.querySelectorAll('.btn-tarjeta-editar').forEach(btn => {
      btn.addEventListener('click', () => editCard(btn.dataset.id));
    });

    gridTarjetas.querySelectorAll('.btn-tarjeta-eliminar').forEach(btn => {
      btn.addEventListener('click', () => deleteCard(btn.dataset.id));
    });
  }

  if (btnAgregarTarjeta) {
    btnAgregarTarjeta.addEventListener('click', () => {
      document.getElementById('modal-tarjeta-titulo').innerHTML = '<i class="fi fi-rr-credit-card"></i> Agregar Tarjeta de Pago';
      formCard.reset();
      document.getElementById('card-edit-id').value = '';
      openModal('modal-tarjeta');
    });
  }

  function editCard(id) {
    const card = state.cards.find(c => c.id === id);
    if (!card) return;

    document.getElementById('modal-tarjeta-titulo').innerHTML = '<i class="fi fi-rr-credit-card"></i> Editar Tarjeta';
    document.getElementById('card-edit-id').value = card.id;
    document.getElementById('card-input-tipo').value = card.tipo;
    document.getElementById('card-input-numero').value = card.rawNumero || card.numero;
    document.getElementById('card-input-titular').value = card.titular;
    document.getElementById('card-input-vence').value = card.vence;
    document.getElementById('card-input-predeterminada').checked = card.predeterminada;

    openModal('modal-tarjeta');
  }

  function deleteCard(id) {
    if (confirm('¿Deseas eliminar esta tarjeta?')) {
      state.cards = state.cards.filter(c => c.id !== id);
      saveState();
      updateUI();
      showToast('Tarjeta eliminada correctamente.', 'info');
    }
  }

  if (formCard) {
    formCard.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('card-edit-id').value;
      const tipo = document.getElementById('card-input-tipo').value;
      const rawNumero = document.getElementById('card-input-numero').value.trim();
      const titular = document.getElementById('card-input-titular').value.trim().toUpperCase();
      const vence = document.getElementById('card-input-vence').value.trim();
      const predeterminada = document.getElementById('card-input-predeterminada').checked;

      const maskedNumero = rawNumero.length >= 4 ? `•••• •••• •••• ${rawNumero.slice(-4)}` : rawNumero;

      if (predeterminada) {
        state.cards.forEach(c => c.predeterminada = false);
      }

      if (id) {
        const card = state.cards.find(c => c.id === id);
        if (card) {
          card.tipo = tipo;
          card.numero = maskedNumero;
          card.rawNumero = rawNumero;
          card.titular = titular;
          card.vence = vence;
          card.predeterminada = predeterminada;
        }
      } else {
        state.cards.push({
          id: 'card-' + Date.now(),
          tipo,
          numero: maskedNumero,
          rawNumero,
          titular,
          vence,
          predeterminada: predeterminada || state.cards.length === 0
        });
      }

      saveState();
      updateUI();
      closeModal('modal-tarjeta');
      showToast('¡Tarjeta guardada con éxito!', 'success');
    });
  }

  // ===================================================
  // 8. FAVORITOS — AGREGAR AL CARRITO / QUITAR
  // ===================================================
  const gridFavoritos = document.querySelector('.grid-favoritos');

  function renderFavorites() {
    if (!gridFavoritos) return;
    gridFavoritos.innerHTML = '';

    if (state.favorites.length === 0) {
      gridFavoritos.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fi fi-rr-heart" style="font-size: 40px; display: block; margin-bottom: 10px; color: var(--yellow-hover);"></i>
        Tu lista de favoritos está vacía.
      </div>`;
      return;
    }

    state.favorites.forEach(fav => {
      const card = document.createElement('div');
      card.className = 'fav-card';
      card.innerHTML = `
        ${fav.isEmojiHolder ? `
          <div class="fav-img-emoji">
            <i class="${fav.iconClass}"></i>
            <button class="btn-fav-quitar" data-id="${fav.id}" title="Quitar de favoritos"><i class="fi fi-sr-heart"></i></button>
          </div>
        ` : `
          <div class="fav-img-wrap">
            <img src="${fav.img}" alt="${fav.nombre}" />
            <button class="btn-fav-quitar" data-id="${fav.id}" title="Quitar de favoritos"><i class="fi fi-sr-heart"></i></button>
            ${fav.badge ? `<span class="${fav.badgeClass || 'insignia-descuento-favorito'}">${fav.badge}</span>` : ''}
          </div>
        `}
        <div class="fav-body">
          <p class="fav-categoria">${fav.categoria}</p>
          <p class="fav-nombre">${fav.nombre}</p>
          <div class="fav-precios">
            <p class="fav-precio-actual">${fav.precioActual}</p>
            ${fav.precioTachado ? `<p class="fav-precio-tachado">${fav.precioTachado}</p>` : ''}
          </div>
          <button class="btn-fav-carrito" data-name="${fav.nombre}">Agregar al carrito</button>
        </div>
      `;
      gridFavoritos.appendChild(card);
    });

    // Botones quitar
    gridFavoritos.querySelectorAll('.btn-fav-quitar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        removeFavorite(btn.dataset.id, btn.closest('.fav-card'));
      });
    });

    // Botones agregar al carrito
    gridFavoritos.querySelectorAll('.btn-fav-carrito').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        state.cartCount = (state.cartCount || 0) + 1;
        saveState();
        updateUI();
        showToast(`¡"${btn.dataset.name}" fue agregado al carrito!`, 'success');
      });
    });
  }

  function removeFavorite(id, cardElement) {
    if (cardElement) {
      cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
      cardElement.style.opacity = '0';
      cardElement.style.transform = 'scale(0.9)';
    }

    setTimeout(() => {
      state.favorites = state.favorites.filter(f => f.id !== id);
      saveState();
      updateUI();
      showToast('Producto eliminado de favoritos.', 'info');
    }, 300);
  }

  // ===================================================
  // 9. MIS PEDIDOS & FILTROS DE ESTADO
  // ===================================================
  const vistaPedidos = document.getElementById('vista-pedidos');
  let filtroPedidoActual = 'Todos';

  function renderOrders() {
    if (!vistaPedidos) return;
    const orderCards = vistaPedidos.querySelectorAll('.pedido-card');

    orderCards.forEach(card => {
      const reordenarBtn = card.querySelector('.btn-reordenar');
      const rastrearBtn = card.querySelector('.btn-rastrear');
      const cancelarBtn = card.querySelector('.btn-cancelar-pedido');
      const detalleBtn = card.querySelector('.btn-ver-detalle');

      if (reordenarBtn && !reordenarBtn.dataset.bound) {
        reordenarBtn.dataset.bound = 'true';
        reordenarBtn.addEventListener('click', () => {
          state.cartCount++;
          saveState();
          updateUI();
          showToast('¡Pedido reordenado! Producto añadido al carrito.', 'success');
        });
      }

      if (rastrearBtn && !rastrearBtn.dataset.bound) {
        rastrearBtn.dataset.bound = 'true';
        rastrearBtn.addEventListener('click', () => {
          const numEl = card.querySelector('.pedido-numero b');
          const num = numEl ? numEl.textContent : 'WG-20260912';
          activarVista('vista-seguimiento', 'nav-seguimiento');
          const segInput = document.querySelector('.seguimiento-input');
          if (segInput) {
            segInput.value = num;
            buscarSeguimiento(num);
          }
        });
      }

      if (cancelarBtn && !cancelarBtn.dataset.bound) {
        cancelarBtn.dataset.bound = 'true';
        cancelarBtn.addEventListener('click', () => {
          if (confirm('¿Deseas cancelar este pedido?')) {
            const badge = card.querySelector('.badge-procesando');
            if (badge) {
              badge.className = 'insignia-entregado';
              badge.style.background = '#fee2e2';
              badge.style.color = '#e74c3c';
              badge.style.borderColor = '#fca5a5';
              badge.innerHTML = '<i class="fi fi-rr-cross-circle"></i> Cancelado';
            }
            cancelarBtn.remove();
            showToast('El pedido ha sido cancelado.', 'info');
          }
        });
      }

      if (detalleBtn && !detalleBtn.dataset.bound) {
        detalleBtn.dataset.bound = 'true';
        detalleBtn.addEventListener('click', () => {
          const numEl = card.querySelector('.pedido-numero b');
          const num = numEl ? numEl.textContent : 'WG-20260901';
          const prodEl = card.querySelector('.pedido-producto')?.textContent;
          const precioEl = card.querySelector('.pedido-cantidad')?.textContent;

          mostrarModalDetallePedido(num, prodEl, precioEl);
        });
      }
    });
  }

  // Filtros de Pedidos
  const filtroBtns = document.querySelectorAll('.filtros-pedidos button');
  filtroBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filtroBtns.forEach(b => {
        b.className = 'btn-filtro';
      });
      btn.className = 'btn-filtro-activo';

      const filtro = btn.textContent.trim();
      const orderCards = vistaPedidos.querySelectorAll('.pedido-card');

      orderCards.forEach(card => {
        const badgeEntregado = card.querySelector('.insignia-entregado');
        const badgeCamino    = card.querySelector('.insignia-en-camino');
        const badgeProceso   = card.querySelector('.insignia-procesando');

        if (filtro === 'Todos') {
          card.style.display = 'block';
        } else if (filtro === 'En camino') {
          card.style.display = badgeCamino ? 'block' : 'none';
        } else if (filtro === 'Entregados') {
          card.style.display = badgeEntregado ? 'block' : 'none';
        } else if (filtro === 'Cancelados') {
          card.style.display = (badgeProceso && badgeProceso.textContent.includes('Cancelado')) ? 'block' : 'none';
        }
      });
    });
  });

  // Modal Detalle Pedido
  function mostrarModalDetallePedido(num, producto, cantidadTotal) {
    document.getElementById('det-pedido-num').textContent = `#${num}`;
    const contenido = document.getElementById('det-pedido-contenido');

    contenido.innerHTML = `
      <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
        <p style="font-size: 13px; color: var(--text-muted);">Comprador: <b>${state.profile.nombre} ${state.profile.apellidos}</b></p>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Dirección de entrega: <b>${state.addresses[0]?.detalle || 'Cra. 11 #14-14, Sogamoso'}</b></p>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Método de Pago: <b>VISA (•••• 4821)</b></p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1.5px solid var(--border); text-align: left; color: var(--text-muted);">
            <th style="padding: 8px 0;">Producto</th>
            <th style="padding: 8px 0; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px 0;">${producto || 'MSI MEG Trident X — PC Gamer i7'}</td>
            <td style="padding: 12px 0; text-align: right; font-weight: 700;">${cantidadTotal || '$4,349.000 COP'}</td>
          </tr>
        </tbody>
      </table>
    `;

    openModal('modal-pedido-detalle');
  }

  const btnImprimirFactura = document.getElementById('btn-imprimir-factura');
  if (btnImprimirFactura) {
    btnImprimirFactura.addEventListener('click', () => {
      showToast('Generando vista de impresión de la factura...', 'info');
      setTimeout(() => window.print(), 800);
    });
  }

  // ===================================================
  // 10. SIGUE TU PEDIDO (SEGUIMIENTO)
  // ===================================================
  const btnRastrearBuscar = document.querySelector('.btn-rastrear-buscar');
  const inputSeguimiento  = document.querySelector('.seguimiento-input');

  function buscarSeguimiento(guia) {
    const term = (guia || inputSeguimiento?.value || '').trim().toUpperCase();
    if (!term) {
      showToast('Por favor ingresa un número de pedido.', 'error');
      return;
    }

    const orderFound = state.orders.find(o => o.num.toUpperCase() === term || term.includes(o.num.toUpperCase()));

    const pedNumEl = document.querySelector('.seguimiento-pedido-num b');
    const estimadoEl = document.querySelector('.seguimiento-estimado b');

    if (orderFound) {
      if (pedNumEl) pedNumEl.textContent = `#${orderFound.num}`;
      if (estimadoEl) estimadoEl.textContent = orderFound.estimado || '19 de septiembre, 2026';
      showToast(`Mostrando estado del pedido #${orderFound.num}`, 'success');
    } else {
      if (pedNumEl) pedNumEl.textContent = `#${term}`;
      showToast('Pedido cargado en la red de la transportadora.', 'info');
    }
  }

  if (btnRastrearBuscar) {
    btnRastrearBuscar.addEventListener('click', () => buscarSeguimiento());
  }

  if (inputSeguimiento) {
    inputSeguimiento.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') buscarSeguimiento();
    });
  }

  const btnTransportadora = document.querySelector('.btn-transportadora');
  if (btnTransportadora) {
    btnTransportadora.addEventListener('click', () => {
      showToast('Redirigiendo a la plataforma oficial de Servientrega...', 'info');
    });
  }

  // ===================================================
  // 11. FACTURA — DESCARGAS PDF Y LOTES
  // ===================================================
  const btnsDescargarPdf = document.querySelectorAll('.btn-descargar-pdf');
  const btnDescargarTodas = document.querySelector('.btn-descargar-todas');

  btnsDescargarPdf.forEach(btn => {
    btn.addEventListener('click', () => {
      const fila = btn.closest('.tabla-fila');
      const numFac = fila ? fila.querySelector('.factura-num')?.textContent : '#FAC-2026';
      showToast(`Descargando factura ${numFac}.pdf...`, 'success');
    });
  });

  if (btnDescargarTodas) {
    btnDescargarTodas.addEventListener('click', () => {
      showToast('Generando archivo ZIP con todas tus facturas...', 'success');
    });
  }

  // ===================================================
  // 12. CERRAR SESIÓN
  // ===================================================
  const btnLogout = document.querySelector('.elemento-nav.logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        showToast('Cerrando sesión...', 'info');
        setTimeout(() => {
          window.location.href = 'Registro.html';
        }, 1000);
      }
    });
  }

  // Inicializar interfaz completa
  updateUI();
});
