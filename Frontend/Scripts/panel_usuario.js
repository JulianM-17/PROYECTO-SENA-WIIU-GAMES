// =====================================================
//   PANEL DE USUARIO — Navegación SPA
//   WiiU-Games
// =====================================================

const navItems   = document.querySelectorAll('.nav-item[data-vista]');
const vistas     = document.querySelectorAll('.vista-panel');
const migaActiva = document.getElementById('miga-activa');

// Etiquetas para el breadcrumb
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
  // Ocultar todas las vistas
  vistas.forEach(v => v.classList.remove('activa'));

  // Quitar active de todos los nav-item
  navItems.forEach(n => n.classList.remove('active'));

  // Mostrar vista seleccionada
  const vista = document.getElementById(vistaId);
  if (vista) vista.classList.add('activa');

  // Activar nav correspondiente
  const navEl = document.getElementById(navId);
  if (navEl) navEl.classList.add('active');

  // Actualizar breadcrumb
  if (migaActiva) migaActiva.textContent = etiquetas[vistaId] || 'Mi Cuenta';
}

// Sidebar navigation
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const vistaId = item.dataset.vista;
    const navId   = item.id;
    activarVista(vistaId, navId);
  });
});

// Tarjetas del dashboard (redirigen al nav)
const tarjetasNav = document.querySelectorAll('[data-nav]');
tarjetasNav.forEach(tarjeta => {
  tarjeta.addEventListener('click', (e) => {
    e.preventDefault();
    const navId = tarjeta.dataset.nav;
    const navEl = document.getElementById(navId);
    if (navEl) {
      const vistaId = navEl.dataset.vista;
      activarVista(vistaId, navId);
      // Scroll al top del contenido
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});
