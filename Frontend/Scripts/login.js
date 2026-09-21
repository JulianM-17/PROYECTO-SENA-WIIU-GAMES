/**
 * =====================================================
 * INICIO DE SESIÓN (LOGIN) — WiiU Games
 * Lógica JavaScript Completa y Dinámica
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM del Formulario Principal
  const formLogin = document.getElementById('form-login');
  const inputCorreo = document.getElementById('correo');
  const inputContrasena = document.getElementById('contrasena');
  const btnSubmit = document.getElementById('btn-submit');
  const textoBtn = btnSubmit ? btnSubmit.querySelector('.texto-btn') : null;
  const iconoBtn = btnSubmit ? btnSubmit.querySelector('.icono-btn') : null;
  const spinner = document.getElementById('spinner');
  const alertaFormulario = document.getElementById('alerta-formulario');
  const checkRecordar = document.getElementById('recordar-correo');

  // Ojito Mostrar/Ocultar Contraseña
  const togglePassword = document.getElementById('toggle-password');
  const iconoOjito = document.getElementById('icono-ojito');

  // Botones de Prueba (Demo)
  const btnDemoCliente = document.getElementById('demo-cliente');
  const btnDemoAdmin = document.getElementById('demo-admin');

  // Modal Recuperar Contraseña
  const linkOlvido = document.getElementById('link-olvido');
  const modalRecuperar = document.getElementById('modal-recuperar');
  const cerrarModal = document.getElementById('cerrar-modal');
  const formRecuperar = document.getElementById('form-recuperar');

  // Botón Social
  const btnGoogle = document.getElementById('btn-google');

  // Contenedor de Toasts
  const contenedorToast = document.getElementById('contenedor-toast');

  // -----------------------------------------------------
  // 1. CARGA INICIAL: RECORDAR CORREO
  // -----------------------------------------------------
  const correoGuardado = localStorage.getItem('wiiu_remember_email');
  if (correoGuardado && inputCorreo && checkRecordar) {
    inputCorreo.value = correoGuardado;
    checkRecordar.checked = true;
  }

  // -----------------------------------------------------
  // 2. ALTERNAR VISIBILIDAD DE LA CONTRASEÑA
  // -----------------------------------------------------
  if (togglePassword && inputContrasena && iconoOjito) {
    togglePassword.addEventListener('click', () => {
      const esPassword = inputContrasena.getAttribute('type') === 'password';
      inputContrasena.setAttribute('type', esPassword ? 'text' : 'password');
      
      // Cambiar clases de ícono Flaticon
      if (esPassword) {
        iconoOjito.classList.remove('fi-rr-eye');
        iconoOjito.classList.add('fi-rr-eye-crossed');
      } else {
        iconoOjito.classList.remove('fi-rr-eye-crossed');
        iconoOjito.classList.add('fi-rr-eye');
      }
    });
  }

  // -----------------------------------------------------
  // 3. ACCESOS RÁPIDOS DE PRUEBA (DEMO)
  // -----------------------------------------------------
  if (btnDemoCliente) {
    btnDemoCliente.addEventListener('click', () => {
      cargarCredencialesDemo('cliente@wiiugames.com', '123456');
      mostrarToast('Credenciales de Cliente cargadas', 'exito');
    });
  }

  if (btnDemoAdmin) {
    btnDemoAdmin.addEventListener('click', () => {
      cargarCredencialesDemo('admin@wiiugames.com', 'admin123');
      mostrarToast('Credenciales de Administrador cargadas', 'exito');
    });
  }

  function cargarCredencialesDemo(correo, contrasena) {
    if (inputCorreo) inputCorreo.value = correo;
    if (inputContrasena) inputContrasena.value = contrasena;
    limpiarErrores();
  }

  // -----------------------------------------------------
  // 4. VALIDACIÓN EN TIEMPO REAL Y MANEJO DE ERRORES
  // -----------------------------------------------------
  const validarEmailFormat = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const mostrarErrorCampo = (input, spanId, mensaje) => {
    input.classList.add('input-error');
    const spanError = document.getElementById(spanId);
    if (spanError) {
      spanError.textContent = mensaje;
    }
  };

  const limpiarErrorCampo = (input, spanId) => {
    input.classList.remove('input-error');
    const spanError = document.getElementById(spanId);
    if (spanError) {
      spanError.textContent = '';
    }
  };

  const limpiarErrores = () => {
    limpiarErrorCampo(inputCorreo, 'error-correo');
    limpiarErrorCampo(inputContrasena, 'error-contrasena');
    if (alertaFormulario) {
      alertaFormulario.classList.add('oculta');
      alertaFormulario.textContent = '';
      alertaFormulario.className = 'alerta-formulario oculta';
    }
  };

  // Escuchar inputs para limpiar errores al escribir
  if (inputCorreo) {
    inputCorreo.addEventListener('input', () => limpiarErrorCampo(inputCorreo, 'error-correo'));
  }
  if (inputContrasena) {
    inputContrasena.addEventListener('input', () => limpiarErrorCampo(inputContrasena, 'error-contrasena'));
  }

  // -----------------------------------------------------
  // 5. PROCESAMIENTO DEL FORMULARIO DE LOGIN
  // -----------------------------------------------------
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      limpiarErrores();

      const correo = inputCorreo ? inputCorreo.value.trim() : '';
      const contrasena = inputContrasena ? inputContrasena.value.trim() : '';
      let esValido = true;

      // Validación de Correo
      if (!correo) {
        mostrarErrorCampo(inputCorreo, 'error-correo', 'El correo electrónico es obligatorio.');
        esValido = false;
      } else if (!validarEmailFormat(correo)) {
        mostrarErrorCampo(inputCorreo, 'error-correo', 'Por favor ingresa un correo electrónico válido.');
        esValido = false;
      }

      // Validación de Contraseña
      if (!contrasena) {
        mostrarErrorCampo(inputContrasena, 'error-contrasena', 'La contraseña es obligatoria.');
        esValido = false;
      } else if (contrasena.length < 5) {
        mostrarErrorCampo(inputContrasena, 'error-contrasena', 'La contraseña debe tener al menos 5 caracteres.');
        esValido = false;
      }

      if (!esValido) {
        mostrarToast('Por favor corrige los errores en el formulario', 'error');
        return;
      }

      // Iniciar estado de carga
      setEstadoCargando(true);

      setTimeout(() => {
        // Cuentas de demostración predefinidas
        const cuentasDemo = [
          { email: 'cliente@wiiugames.com', pass: '123456', nombre: 'Fabian Mora', rol: 'Cliente' },
          { email: 'admin@wiiugames.com', pass: 'admin123', nombre: 'Administrador WiiU', rol: 'Administrador' }
        ];

        // Obtener usuarios registrados desde localStorage
        let usuariosRegistrados = [];
        try {
          usuariosRegistrados = JSON.parse(localStorage.getItem('wiiu_registered_users') || '[]');
          const usuarioUnico = JSON.parse(localStorage.getItem('wiiu_user') || 'null');
          if (usuarioUnico && !usuariosRegistrados.some(u => u.email === usuarioUnico.email)) {
            usuariosRegistrados.push(usuarioUnico);
          }
        } catch (err) {
          console.warn('Error leyendo usuarios de localStorage:', err);
        }

        // Buscar coincidencia de correo
        const correoNormalizado = correo.toLowerCase();
        let usuarioEncontrado = cuentasDemo.find(c => c.email.toLowerCase() === correoNormalizado);
        let passwordCorrecta = usuarioEncontrado ? usuarioEncontrado.pass : null;

        if (!usuarioEncontrado) {
          const regUser = usuariosRegistrados.find(u => u.email && u.email.toLowerCase() === correoNormalizado);
          if (regUser) {
            usuarioEncontrado = {
              email: regUser.email,
              nombre: `${regUser.nombre || ''} ${regUser.apellido || ''}`.trim() || 'Usuario WiiU',
              rol: regUser.rol || 'Cliente'
            };
            passwordCorrecta = regUser.password;
          }
        }

        // 1. Caso: El correo no existe
        if (!usuarioEncontrado) {
          setEstadoCargando(false);
          mostrarErrorCampo(inputCorreo, 'error-correo', 'No existe ninguna cuenta registrada con este correo electrónico.');
          if (alertaFormulario) {
            alertaFormulario.textContent = 'No encontramos tu cuenta. Verifica el correo o crea una cuenta nueva en "Regístrate".';
            alertaFormulario.className = 'alerta-formulario error';
          }
          mostrarToast('Correo electrónico no registrado.', 'error');
          inputCorreo.focus();
          return;
        }

        // 2. Caso: Contraseña incorrecta
        if (passwordCorrecta && contrasena !== passwordCorrecta) {
          setEstadoCargando(false);
          mostrarErrorCampo(inputContrasena, 'error-contrasena', 'La contraseña ingresada es incorrecta.');
          if (alertaFormulario) {
            alertaFormulario.textContent = 'La contraseña ingresada no es válida para este usuario. Inténtalo nuevamente.';
            alertaFormulario.className = 'alerta-formulario error';
          }
          mostrarToast('Contraseña incorrecta. Por favor intenta de nuevo.', 'error');
          inputContrasena.focus();
          return;
        }

        // 3. Caso: Credenciales exitosas
        if (checkRecordar && checkRecordar.checked) {
          localStorage.setItem('wiiu_remember_email', correo);
        } else {
          localStorage.removeItem('wiiu_remember_email');
        }

        const sesionUsuario = {
          correo: usuarioEncontrado.email,
          nombre: usuarioEncontrado.nombre,
          rol: usuarioEncontrado.rol,
          fechaIngreso: new Date().toISOString()
        };
        sessionStorage.setItem('wiiu_usuario_activo', JSON.stringify(sesionUsuario));

        setEstadoCargando(false);
        if (alertaFormulario) {
          alertaFormulario.textContent = `¡Bienvenido de nuevo, ${usuarioEncontrado.nombre}! Redirigiendo a tu panel...`;
          alertaFormulario.className = 'alerta-formulario exito';
        }
        mostrarToast(`¡Bienvenido, ${usuarioEncontrado.nombre}!`, 'exito');

        setTimeout(() => {
          window.location.href = 'panel_usuario.html';
        }, 1200);
      }, 900);
    });
  }

  function setEstadoCargando(cargando) {
    if (!btnSubmit) return;
    btnSubmit.disabled = cargando;

    if (cargando) {
      if (textoBtn) textoBtn.textContent = 'Verificando...';
      if (iconoBtn) iconoBtn.classList.add('oculta');
      if (spinner) spinner.classList.remove('oculta');
    } else {
      if (textoBtn) textoBtn.textContent = 'Iniciar Sesión';
      if (iconoBtn) iconoBtn.classList.remove('oculta');
      if (spinner) spinner.classList.add('oculta');
    }
  }

  // -----------------------------------------------------
  // 6. MODAL DE RECUPERACIÓN DE CONTRASEÑA
  // -----------------------------------------------------
  if (linkOlvido && modalRecuperar) {
    linkOlvido.addEventListener('click', (e) => {
      e.preventDefault();
      modalRecuperar.classList.remove('oculta');
    });
  }

  if (cerrarModal && modalRecuperar) {
    cerrarModal.addEventListener('click', () => {
      modalRecuperar.classList.add('oculta');
    });

    // Cerrar al hacer clic en el backdrop
    modalRecuperar.addEventListener('click', (e) => {
      if (e.target === modalRecuperar) {
        modalRecuperar.classList.add('oculta');
      }
    });
  }

  if (formRecuperar) {
    formRecuperar.addEventListener('submit', (e) => {
      e.preventDefault();
      const correoRecuperar = document.getElementById('correo-recuperar');
      const val = correoRecuperar ? correoRecuperar.value.trim() : '';

      if (!val || !validarEmailFormat(val)) {
        mostrarToast('Ingresa un correo válido para recuperar tu contraseña', 'error');
        return;
      }

      modalRecuperar.classList.add('oculta');
      if (correoRecuperar) correoRecuperar.value = '';
      mostrarToast(`Instrucciones enviadas a ${val}`, 'exito');
    });
  }

  // -----------------------------------------------------
  // 7. BOTÓN SOCIAL (Google)
  // -----------------------------------------------------
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      mostrarToast('Conectando con Google...', 'exito');
      setTimeout(() => {
        const sesionUsuario = {
          correo: 'usuario.google@gmail.com',
          nombre: 'Gamer Google',
          rol: 'Cliente',
          fechaIngreso: new Date().toISOString()
        };
        sessionStorage.setItem('wiiu_usuario_activo', JSON.stringify(sesionUsuario));
        window.location.href = 'panel_usuario.html';
      }, 1000);
    });
  }

  // -----------------------------------------------------
  // 8. SISTEMA DE NOTIFICACIONES FLOTANTES (TOAST)
  // -----------------------------------------------------
  function mostrarToast(mensaje, tipo = 'exito') {
    if (!contenedorToast) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const icono = tipo === 'exito' ? 'fi-rr-check-circle' : 'fi-rr-cross-circle';
    toast.innerHTML = `
      <i class="fi ${icono}" style="font-size: 18px;"></i>
      <span>${mensaje}</span>
    `;

    contenedorToast.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }
});
