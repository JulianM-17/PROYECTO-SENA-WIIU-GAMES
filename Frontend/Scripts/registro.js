/**
 * =====================================================
 * REGISTRO DE USUARIO — WiiU Games
 * Lógica Completa, Validaciones y Dinamismo
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM del Formulario
  const formRegistro = document.getElementById('form-registro');
  const inputNombre = document.getElementById('nombre');
  const inputApellido = document.getElementById('apellido');
  const selectDia = document.getElementById('nacimiento-dia');
  const selectMes = document.getElementById('nacimiento-mes');
  const selectAnio = document.getElementById('nacimiento-anio');
  const inputCorreo = document.getElementById('correo');
  const inputConfirmarCorreo = document.getElementById('confirmar-correo');
  const inputContrasena = document.getElementById('contrasena');
  const inputConfirmarContrasena = document.getElementById('confirmar-contrasena');
  const barraSeguridad = document.getElementById('barra-seguridad');
  const textoSeguridad = document.getElementById('texto-seguridad');
  const checkTerminos = document.getElementById('aceptar-terminos');
  const btnRegistro = document.getElementById('btn-registro');

  // Modal Términos y Condiciones
  const enlaceTerminos = document.getElementById('abrir-terminos');
  const modalTerminos = document.getElementById('modal-terminos');
  const btnCerrarTerminos = document.getElementById('btn-cerrar-terminos');
  const btnCancelarTerminos = document.getElementById('btn-cancelar-terminos');
  const btnAceptarTerminos = document.getElementById('btn-aceptar-terminos');

  // -----------------------------------------------------
  // 1. POBLAR MENÚS DESPLEGABLES (DÍA, MES, AÑO)
  // -----------------------------------------------------
  if (selectDia) {
    for (let i = 1; i <= 31; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      selectDia.appendChild(opt);
    }
  }

  if (selectMes) {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    meses.forEach((mes, idx) => {
      const opt = document.createElement('option');
      opt.value = idx + 1;
      opt.textContent = mes;
      selectMes.appendChild(opt);
    });
  }

  if (selectAnio) {
    const anioActual = new Date().getFullYear();
    for (let y = anioActual - 10; y >= 1940; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      selectAnio.appendChild(opt);
    }
  }

  // -----------------------------------------------------
  // 2. FUNCIONALIDAD DEL OJITO (MOSTRAR / OCULTAR TEXTO)
  // -----------------------------------------------------
  document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      if (!input || !icon) return;

      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');

      if (isPassword) {
        icon.classList.remove('fi-rr-eye');
        icon.classList.add('fi-rr-eye-crossed');
        btn.setAttribute('aria-label', 'Ocultar contraseña');
      } else {
        icon.classList.remove('fi-rr-eye-crossed');
        icon.classList.add('fi-rr-eye');
        btn.setAttribute('aria-label', 'Mostrar contraseña');
      }
    });
  });

  // -----------------------------------------------------
  // 3. INDICADOR DE ÍNDICE DE SEGURIDAD DE CONTRASEÑA
  // -----------------------------------------------------
  if (inputContrasena && barraSeguridad && textoSeguridad) {
    inputContrasena.addEventListener('input', () => {
      const val = inputContrasena.value;
      if (!val) {
        barraSeguridad.className = 'barra-seguridad';
        textoSeguridad.className = 'texto-seguridad';
        textoSeguridad.textContent = 'Ingresa al menos 8 caracteres';
        return;
      }

      let score = 0;
      if (val.length >= 8) score++;
      if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
      if (/\d/.test(val)) score++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) score++;

      barraSeguridad.className = 'barra-seguridad';
      textoSeguridad.className = 'texto-seguridad';

      if (val.length < 8 || score <= 1) {
        barraSeguridad.classList.add('nivel-debil');
        textoSeguridad.classList.add('nivel-debil');
        textoSeguridad.textContent = 'Seguridad: Débil (mínimo 8 caracteres)';
      } else if (score === 2 || score === 3) {
        barraSeguridad.classList.add('nivel-medio');
        textoSeguridad.classList.add('nivel-medio');
        textoSeguridad.textContent = 'Seguridad: Media (agrega símbolos o mayúsculas)';
      } else {
        barraSeguridad.classList.add('nivel-fuerte');
        textoSeguridad.classList.add('nivel-fuerte');
        textoSeguridad.textContent = 'Seguridad: Fuerte y confiable';
      }
    });
  }

  // -----------------------------------------------------
  // 4. MODAL DE TÉRMINOS Y CONDICIONES
  // -----------------------------------------------------
  function abrirModalTerminos(e) {
    if (e) e.preventDefault();
    if (modalTerminos) modalTerminos.classList.add('activo');
  }

  function cerrarModalTerminos() {
    if (modalTerminos) modalTerminos.classList.remove('activo');
  }

  if (enlaceTerminos) {
    enlaceTerminos.addEventListener('click', abrirModalTerminos);
  }

  if (btnCerrarTerminos) {
    btnCerrarTerminos.addEventListener('click', cerrarModalTerminos);
  }

  if (btnCancelarTerminos) {
    btnCancelarTerminos.addEventListener('click', cerrarModalTerminos);
  }

  if (btnAceptarTerminos) {
    btnAceptarTerminos.addEventListener('click', () => {
      if (checkTerminos) checkTerminos.checked = true;
      cerrarModalTerminos();
      mostrarToast('Has aceptado los términos y condiciones de WiiU-Games.', 'exito');
    });
  }

  if (modalTerminos) {
    modalTerminos.addEventListener('click', (e) => {
      if (e.target === modalTerminos) cerrarModalTerminos();
    });
  }

  // -----------------------------------------------------
  // 5. TOAST NOTIFICACIONES
  // -----------------------------------------------------
  function mostrarToast(mensaje, tipo = 'exito') {
    let contenedor = document.getElementById('contenedor-toast');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'contenedor-toast';
      contenedor.className = 'contenedor-toast';
      document.body.appendChild(contenedor);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const iconClass = tipo === 'exito' ? 'fi fi-rr-check-circle' : 'fi fi-rr-exclamation';
    toast.innerHTML = `<i class="${iconClass}"></i> <span>${mensaje}</span>`;

    contenedor.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // -----------------------------------------------------
  // 6. ENVÍO Y VALIDACIÓN DEL FORMULARIO DE REGISTRO
  // -----------------------------------------------------
  if (formRegistro) {
    formRegistro.addEventListener('submit', (e) => {
      e.preventDefault();

      // Validar coincidencia de correos
      if (inputCorreo.value.trim().toLowerCase() !== inputConfirmarCorreo.value.trim().toLowerCase()) {
        mostrarToast('Los correos electrónicos no coinciden.', 'error');
        inputConfirmarCorreo.focus();
        return;
      }

      // Validar longitud de contraseña
      if (inputContrasena.value.length < 8) {
        mostrarToast('La contraseña debe tener al menos 8 caracteres.', 'error');
        inputContrasena.focus();
        return;
      }

      // Validar coincidencia de contraseñas
      if (inputContrasena.value !== inputConfirmarContrasena.value) {
        mostrarToast('Las contraseñas no coinciden.', 'error');
        inputConfirmarContrasena.focus();
        return;
      }

      // Validar fecha de nacimiento
      if (!selectDia.value || !selectMes.value || !selectAnio.value || 
          selectDia.value === 'Día' || selectMes.value === 'Mes' || selectAnio.value === 'Año') {
        mostrarToast('Por favor selecciona tu fecha de nacimiento completa.', 'error');
        selectDia.focus();
        return;
      }

      // Validar términos y condiciones
      if (checkTerminos && !checkTerminos.checked) {
        mostrarToast('Debes aceptar los términos y condiciones para continuar.', 'error');
        checkTerminos.focus();
        return;
      }

      // Deshabilitar botón durante proceso
      if (btnRegistro) {
        btnRegistro.disabled = true;
        btnRegistro.innerHTML = '<i class="fi fi-rr-spinner fi-spin"></i> Registrando cuenta...';
      }

      // Guardar usuario en localStorage para persistencia y login demo
      const nuevoUsuario = {
        nombre: inputNombre.value.trim(),
        apellido: inputApellido.value.trim(),
        email: inputCorreo.value.trim().toLowerCase(),
        telefono: document.getElementById('telefono-principal')?.value.trim() || '',
        telefonoSecundario: document.getElementById('telefono-secundario')?.value.trim() || '',
        direccion: document.getElementById('direccion')?.value.trim() || '',
        ciudad: document.getElementById('ciudad')?.value.trim() || '',
        nacimiento: `${selectDia.value}/${selectMes.value}/${selectAnio.value}`
      };

      try {
        localStorage.setItem('wiiu_user', JSON.stringify(nuevoUsuario));
        const usuariosGuardados = JSON.parse(localStorage.getItem('wiiu_registered_users') || '[]');
        usuariosGuardados.push(nuevoUsuario);
        localStorage.setItem('wiiu_registered_users', JSON.stringify(usuariosGuardados));
      } catch (err) {
        console.warn('Error guardando en localStorage:', err);
      }

      mostrarToast('¡Cuenta creada exitosamente! Redirigiendo a Iniciar Sesión...', 'exito');

      setTimeout(() => {
        window.location.href = 'Login.html';
      }, 1800);
    });
  }
});
