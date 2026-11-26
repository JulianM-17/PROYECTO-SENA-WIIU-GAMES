// Registro de usuario

document.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM del Formulario
  const formRegistro = document.getElementById('form-registro');
  const inputNombre = document.getElementById('nombre');
  const inputApellido = document.getElementById('apellido');
  const inputFechaNacimiento = document.getElementById('fecha-nacimiento');
  const inputCorreo = document.getElementById('correo');
  const inputConfirmarCorreo = document.getElementById('confirmar-correo');
  const inputContrasena = document.getElementById('contrasena');
  const inputConfirmarContrasena = document.getElementById('confirmar-contrasena');
  const barraSeguridad = document.getElementById('barra-seguridad');
  const textoSeguridad = document.getElementById('texto-seguridad');
  const inputDireccion = document.getElementById('direccion');
  const selectDepartamento = document.getElementById('departamento');
  const selectMunicipio = document.getElementById('municipio');
  const inputTelefonoPrincipal = document.getElementById('telefono-principal');
  const inputTelefonoSecundario = document.getElementById('telefono-secundario');
  const selectPrefijoPrincipal = document.getElementById('prefijo-telefono-principal');
  const selectPrefijoSecundario = document.getElementById('prefijo-telefono-secundario');
  const inputCodigoPostal = document.getElementById('codigo-postal');
  const checkMismaDireccion = document.getElementById('misma-direccion');
  const checkTerminos = document.getElementById('aceptar-terminos');
  const btnRegistro = document.getElementById('btn-registro');

  function formatearTelefono(input, selectPrefijo) {
    const localDigits = String(input?.value || '').replace(/\D/g, '').replace(/^0+/, '');
    const prefijo = selectPrefijo?.value || '+57';
    return localDigits ? `${prefijo} ${localDigits}` : '';
  }

  const departamentosColombia = window.departamentosColombia;

  // Poblado de Departamentos
  if (selectDepartamento) {
    selectDepartamento.innerHTML = '<option value="">Selecciona un departamento</option>';
    Object.keys(departamentosColombia).forEach(dep => {
      const opt = document.createElement('option');
      opt.value = dep;
      opt.textContent = dep;
      if (dep === 'Boyacá') opt.selected = true;
      selectDepartamento.appendChild(opt);
    });

    // Función para actualizar municipios
    function actualizarMunicipios(depSeleccionado, preseleccionar = null) {
      if (!selectMunicipio) return;
      selectMunicipio.innerHTML = '';

      const municipios = departamentosColombia[depSeleccionado];
      if (municipios && municipios.length > 0) {
        selectMunicipio.disabled = false;
        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Selecciona tu municipio';
        selectMunicipio.appendChild(optDefault);

        municipios.forEach(muni => {
          const opt = document.createElement('option');
          opt.value = muni;
          opt.textContent = muni;
          if (preseleccionar && muni === preseleccionar) {
            opt.selected = true;
          }
          selectMunicipio.appendChild(opt);
        });
      } else {
        selectMunicipio.disabled = true;
        const optVacio = document.createElement('option');
        optVacio.value = '';
        optVacio.textContent = 'Primero elige un departamento';
        selectMunicipio.appendChild(optVacio);
      }
    }

    selectDepartamento.addEventListener('change', (e) => {
      actualizarMunicipios(e.target.value);
      validarDepartamento();
    });

    actualizarMunicipios('Boyacá', 'Sogamoso');
  }

  if (inputFechaNacimiento) {
    const anioActual = new Date().getFullYear();
    const fechaMaxima = new Date();
    fechaMaxima.setFullYear(anioActual - 10);
    inputFechaNacimiento.max = [
      fechaMaxima.getFullYear(),
      String(fechaMaxima.getMonth() + 1).padStart(2, '0'),
      String(fechaMaxima.getDate()).padStart(2, '0')
    ].join('-');
  }

  // Alternar la visibilidad de las contraseñas
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

  // Indicador de seguridad de la contraseña
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

  document.addEventListener('click', (event) => {
    if (!event.target?.closest?.('#aceptar-terminos-panel')) return;
    if (checkTerminos) {
      checkTerminos.checked = true;
      validarTerminos();
    }
    document.getElementById('cerrar-panel-terminos')?.click();
    mostrarToast('Has aceptado los términos y condiciones de WiiU-Games.', 'exito');
  });

  // Notificaciones flotantes
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

  // Validaciones en tiempo real
  function mostrarError(input, idSpan, mensaje) {
    if (input) {
      input.classList.add('input-error');
      input.classList.remove('input-valido');
    }
    const span = document.getElementById(idSpan);
    if (span) {
      span.textContent = mensaje;
      span.classList.add('visible');
    }
    return false;
  }

  function limpiarError(input, idSpan) {
    if (input) {
      input.classList.remove('input-error');
      input.classList.add('input-valido');
    }
    const span = document.getElementById(idSpan);
    if (span) {
      span.textContent = '';
      span.classList.remove('visible');
    }
    return true;
  }

  // Validaciones individuales
  function validarNombre() {
    const val = inputNombre.value.trim();
    if (!val) {
      return mostrarError(inputNombre, 'error-nombre', 'El nombre es obligatorio.');
    }
    if (val.length < 2) {
      return mostrarError(inputNombre, 'error-nombre', 'Ingresa un nombre válido (mínimo 2 letras).');
    }
    if (!/^[\p{L}][\p{L}\s'-]*$/u.test(val)) {
      return mostrarError(inputNombre, 'error-nombre', 'El nombre solo puede contener letras, espacios, apóstrofes o guiones.');
    }
    if (val.length > 30) {
      return mostrarError(inputNombre, 'error-nombre', 'El nombre no puede superar 30 caracteres.');
    }
    return limpiarError(inputNombre, 'error-nombre');
  }

  function validarApellido() {
    const val = inputApellido.value.trim();
    if (!val) {
      return mostrarError(inputApellido, 'error-apellido', 'El apellido es obligatorio.');
    }
    if (val.length < 2) {
      return mostrarError(inputApellido, 'error-apellido', 'Ingresa un apellido válido (mínimo 2 letras).');
    }
    if (!/^[\p{L}][\p{L}\s'-]*$/u.test(val)) {
      return mostrarError(inputApellido, 'error-apellido', 'El apellido solo puede contener letras, espacios, apóstrofes o guiones.');
    }
    if (val.length > 30) {
      return mostrarError(inputApellido, 'error-apellido', 'El apellido no puede superar 30 caracteres.');
    }
    return limpiarError(inputApellido, 'error-apellido');
  }

  function validarFechaNacimiento() {
    if (!inputFechaNacimiento.value) {
      return mostrarError(inputFechaNacimiento, 'error-nacimiento', 'Selecciona tu fecha de nacimiento.');
    }
    if (
      inputFechaNacimiento.value < inputFechaNacimiento.min ||
      inputFechaNacimiento.value > inputFechaNacimiento.max
    ) {
      return mostrarError(inputFechaNacimiento, 'error-nacimiento', 'Selecciona una fecha dentro del rango permitido.');
    }
    return limpiarError(inputFechaNacimiento, 'error-nacimiento');
  }

  function validarCorreo() {
    const val = inputCorreo.value.trim();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      return mostrarError(inputCorreo, 'error-correo', 'El correo electrónico es obligatorio.');
    }
    if (val.length > 120) {
      return mostrarError(inputCorreo, 'error-correo', 'El correo no puede superar 120 caracteres.');
    }
    if (!regexEmail.test(val)) {
      return mostrarError(inputCorreo, 'error-correo', 'Ingresa un formato de correo válido (ej: nombre@dominio.com).');
    }
    return limpiarError(inputCorreo, 'error-correo');
  }

  function validarConfirmarCorreo() {
    const val = inputConfirmarCorreo.value.trim();
    if (!val) {
      return mostrarError(inputConfirmarCorreo, 'error-confirmar-correo', 'Confirma tu correo electrónico.');
    }
    if (val.toLowerCase() !== inputCorreo.value.trim().toLowerCase()) {
      return mostrarError(inputConfirmarCorreo, 'error-confirmar-correo', 'Los correos electrónicos no coinciden.');
    }
    return limpiarError(inputConfirmarCorreo, 'error-confirmar-correo');
  }

  function validarContrasena() {
    const val = inputContrasena.value;
    if (!val) {
      return mostrarError(inputContrasena, 'error-contrasena', 'La contraseña es obligatoria.');
    }
    if (val.length < 8) {
      return mostrarError(inputContrasena, 'error-contrasena', 'La contraseña debe tener al menos 8 caracteres.');
    }
    if (val.length > 128) {
      return mostrarError(inputContrasena, 'error-contrasena', 'La contraseña no puede superar 128 caracteres.');
    }
    return limpiarError(inputContrasena, 'error-contrasena');
  }

  function validarConfirmarContrasena() {
    const val = inputConfirmarContrasena.value;
    if (!val) {
      return mostrarError(inputConfirmarContrasena, 'error-confirmar-contrasena', 'Confirma tu contraseña.');
    }
    if (val !== inputContrasena.value) {
      return mostrarError(inputConfirmarContrasena, 'error-confirmar-contrasena', 'Las contraseñas no coinciden.');
    }
    return limpiarError(inputConfirmarContrasena, 'error-confirmar-contrasena');
  }

  function validarDireccion() {
    const val = inputDireccion.value.trim();
    if (!val) {
      return mostrarError(inputDireccion, 'error-direccion', 'La dirección es obligatoria.');
    }
    if (val.length < 5) {
      return mostrarError(inputDireccion, 'error-direccion', 'Ingresa una dirección completa.');
    }
    if (val.length > 40) {
      return mostrarError(inputDireccion, 'error-direccion', 'La dirección no puede superar 40 caracteres.');
    }
    return limpiarError(inputDireccion, 'error-direccion');
  }

  function validarDepartamento() {
    if (!selectDepartamento.value) {
      return mostrarError(selectDepartamento, 'error-departamento', 'Selecciona un departamento.');
    }
    return limpiarError(selectDepartamento, 'error-departamento');
  }

  function validarMunicipio() {
    if (!selectMunicipio.value) {
      return mostrarError(selectMunicipio, 'error-municipio', 'Selecciona un municipio o ciudad.');
    }
    return limpiarError(selectMunicipio, 'error-municipio');
  }

  function validarTelefono() {
    const val = inputTelefonoPrincipal.value.trim();
    if (!val) {
      return mostrarError(inputTelefonoPrincipal, 'error-telefono', 'El teléfono principal es obligatorio.');
    }
    if (!/^[\d()\s-]{7,16}$/.test(val)) {
      return mostrarError(inputTelefonoPrincipal, 'error-telefono', 'El teléfono contiene caracteres no válidos.');
    }
    const cleanDigits = val.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      return mostrarError(inputTelefonoPrincipal, 'error-telefono', 'Ingresa un número telefónico válido (mínimo 7 dígitos).');
    }
    return limpiarError(inputTelefonoPrincipal, 'error-telefono');
  }

  function validarTelefonoSecundario() {
    if (!inputTelefonoSecundario) return true;
    const val = inputTelefonoSecundario.value.trim();
    if (!val) return limpiarError(inputTelefonoSecundario, 'error-telefono-secundario');
    if (!/^[\d()\s-]{7,16}$/.test(val) || val.replace(/\D/g, '').length < 7) {
      return mostrarError(inputTelefonoSecundario, 'error-telefono-secundario', 'Ingresa un teléfono secundario válido.');
    }
    return limpiarError(inputTelefonoSecundario, 'error-telefono-secundario');
  }

  function validarTerminos() {
    const cajaCheck = checkTerminos ? checkTerminos.closest('.control-seleccion')?.querySelector('.caja-check') : null;
    if (!checkTerminos.checked) {
      if (cajaCheck) {
        cajaCheck.style.borderColor = '#ef4444';
        cajaCheck.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      }
      const span = document.getElementById('error-terminos');
      if (span) {
        span.textContent = 'Debes aceptar los términos y condiciones.';
        span.classList.add('visible');
      }
      return false;
    }
    if (cajaCheck) {
      cajaCheck.style.borderColor = '';
      cajaCheck.style.boxShadow = '';
    }
    const span = document.getElementById('error-terminos');
    if (span) {
      span.textContent = '';
      span.classList.remove('visible');
    }
    return true;
  }

  // Asignar eventos de escucha en tiempo real
  if (inputNombre) {
    inputNombre.addEventListener('blur', validarNombre);
    inputNombre.addEventListener('input', () => {
      inputNombre.value = inputNombre.value.replace(/[^\p{L}\s'-]/gu, '');
      if (inputNombre.classList.contains('input-error')) validarNombre();
    });
  }

  if (inputApellido) {
    inputApellido.addEventListener('blur', validarApellido);
    inputApellido.addEventListener('input', () => {
      inputApellido.value = inputApellido.value.replace(/[^\p{L}\s'-]/gu, '');
      if (inputApellido.classList.contains('input-error')) validarApellido();
    });
  }

  if (inputFechaNacimiento) {
    inputFechaNacimiento.addEventListener('change', validarFechaNacimiento);
    inputFechaNacimiento.addEventListener('blur', validarFechaNacimiento);
  }

  if (inputCorreo) {
    inputCorreo.addEventListener('blur', validarCorreo);
    inputCorreo.addEventListener('input', () => { if (inputCorreo.classList.contains('input-error')) validarCorreo(); });
  }

  if (inputConfirmarCorreo) {
    inputConfirmarCorreo.addEventListener('blur', validarConfirmarCorreo);
    inputConfirmarCorreo.addEventListener('input', () => { if (inputConfirmarCorreo.classList.contains('input-error')) validarConfirmarCorreo(); });
  }

  if (inputContrasena) {
    inputContrasena.addEventListener('blur', validarContrasena);
    inputContrasena.addEventListener('input', () => {
      if (inputContrasena.classList.contains('input-error')) validarContrasena();
      if (inputConfirmarContrasena.value) validarConfirmarContrasena();
    });
  }

  if (inputConfirmarContrasena) {
    inputConfirmarContrasena.addEventListener('blur', validarConfirmarContrasena);
    inputConfirmarContrasena.addEventListener('input', () => { if (inputConfirmarContrasena.classList.contains('input-error')) validarConfirmarContrasena(); });
  }

  if (inputDireccion) {
    inputDireccion.addEventListener('blur', validarDireccion);
    inputDireccion.addEventListener('input', () => { if (inputDireccion.classList.contains('input-error')) validarDireccion(); });
  }

  if (selectDepartamento) {
    selectDepartamento.addEventListener('blur', validarDepartamento);
    selectDepartamento.addEventListener('change', validarDepartamento);
  }

  if (selectMunicipio) {
    selectMunicipio.addEventListener('blur', validarMunicipio);
    selectMunicipio.addEventListener('change', validarMunicipio);
  }

  if (inputTelefonoPrincipal) {
    inputTelefonoPrincipal.addEventListener('blur', validarTelefono);
    inputTelefonoPrincipal.addEventListener('input', () => { if (inputTelefonoPrincipal.classList.contains('input-error')) validarTelefono(); });
  }

  if (inputTelefonoSecundario) {
    inputTelefonoSecundario.addEventListener('blur', validarTelefonoSecundario);
    inputTelefonoSecundario.addEventListener('input', () => {
      if (inputTelefonoSecundario.classList.contains('input-error')) validarTelefonoSecundario();
    });
  }

  if (checkTerminos) {
    checkTerminos.addEventListener('change', validarTerminos);
  }

  // Envío y validación del formulario
  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();

      const vNombre = validarNombre();
      const vApellido = validarApellido();
      const vFecha = validarFechaNacimiento();
      const vCorreo = validarCorreo();
      const vConfCorreo = validarConfirmarCorreo();
      const vPass = validarContrasena();
      const vConfPass = validarConfirmarContrasena();
      const vDir = validarDireccion();
      const vDep = validarDepartamento();
      const vMun = validarMunicipio();
      const vTel = validarTelefono();
      const vTelSecundario = validarTelefonoSecundario();
      const vTerm = validarTerminos();

      const esValido = vNombre && vApellido && vFecha && vCorreo && vConfCorreo &&
                        vPass && vConfPass && vDir && vDep && vMun && vTel &&
                        vTelSecundario && vTerm;

      if (!esValido) {
        mostrarToast('Por favor completa y corrige todos los campos obligatorios.', 'error');
        const primerError = formRegistro.querySelector('.input-error');
        if (primerError) primerError.focus();
        return;
      }

      // Deshabilitar botón durante proceso
      const textoOriginalBoton = btnRegistro?.innerHTML;
      if (btnRegistro) {
        btnRegistro.disabled = true;
        btnRegistro.innerHTML = '<i class="fi fi-rr-spinner fi-spin"></i> Registrando cuenta...';
      }
      let registroExitoso = false;

      // Guardar usuario en localStorage para persistencia y validación en Login
      const nuevoUsuario = {
        nombre: inputNombre.value.trim(),
        apellido: inputApellido.value.trim(),
        email: inputCorreo.value.trim().toLowerCase(),
        telefono: formatearTelefono(inputTelefonoPrincipal, selectPrefijoPrincipal),
        telefono_secundario: inputTelefonoSecundario
          ? formatearTelefono(inputTelefonoSecundario, selectPrefijoSecundario)
          : '',
        direccion: inputDireccion.value.trim(),
        departamento: selectDepartamento.value,
        ciudad: selectMunicipio.value,
        codigoPostal: inputCodigoPostal ? inputCodigoPostal.value.trim() : '',
        nacimiento: inputFechaNacimiento.value,
        rol: 'Cliente'
      };
      const datosRegistro = {
        ...nuevoUsuario,
        password: inputContrasena.value,
      };

      try {
        // Enviar datos al backend para crear el usuario
        const response = await fetch('http://localhost:3000/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(datosRegistro),
        });
        const result = await response.json();
        if (!response.ok) {
          mostrarToast(result.message || 'Error al registrar usuario.', 'error');
          return;
        }
        // Guardar usuario en localStorage para sesión actual
        localStorage.setItem('wiiu_user', JSON.stringify(nuevoUsuario));
        // Mantener lista de usuarios registrados en localStorage
        const usuariosGuardados = JSON.parse(localStorage.getItem('wiiu_registered_users') || '[]');
        const indexExistente = usuariosGuardados.findIndex(u => u.email === nuevoUsuario.email);
        if (indexExistente >= 0) {
          usuariosGuardados[indexExistente] = nuevoUsuario;
        } else {
          usuariosGuardados.push(nuevoUsuario);
        }
        localStorage.setItem('wiiu_registered_users', JSON.stringify(usuariosGuardados));
        registroExitoso = true;
        mostrarToast('¡Cuenta creada exitosamente! Redirigiendo a Iniciar Sesión...', 'exito');
        setTimeout(() => {
          window.location.href = 'Login.html';
        }, 1600);
      } catch (err) {
        console.error('Error al registrar usuario:', err);
        mostrarToast('Error de red al registrar usuario.', 'error');
      } finally {
        if (!registroExitoso && btnRegistro) {
          btnRegistro.disabled = false;
          btnRegistro.innerHTML = textoOriginalBoton;
        }
      }
    });
  }
});
