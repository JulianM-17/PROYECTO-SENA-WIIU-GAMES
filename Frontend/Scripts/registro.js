

document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('wiiu_user');
  localStorage.removeItem('wiiu_registered_users');

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
  const inputCodigoPostal = document.getElementById('codigo-postal');
  const checkMismaDireccion = document.getElementById('misma-direccion');
  const checkTerminos = document.getElementById('aceptar-terminos');
  const btnRegistro = document.getElementById('btn-registro');

  // Modal Términos y Condiciones
  const enlaceTerminos = document.getElementById('abrir-terminos');
  const modalTerminos = document.getElementById('modal-terminos');
  const btnCerrarTerminos = document.getElementById('btn-cerrar-terminos');
  const btnCancelarTerminos = document.getElementById('btn-cancelar-terminos');
  const btnAceptarTerminos = document.getElementById('btn-aceptar-terminos');


  // DICCIONARIO DE DEPARTAMENTOS Y MUNICIPIOS DE COLOMBIA

  const departamentosColombia = {
    "Boyacá": [
      "Sogamoso", "Tunja", "Duitama", "Paipa", "Chiquinquirá", "Villa de Leyva",
      "Moniquirá", "Nobsa", "Tibarría", "Garagoa", "Guateque", "Puerto Boyacá",
      "Santa Rosa de Viterbo", "Soatá", "Samacá"
    ],
    "Cundinamarca": [
      "Bogotá D.C.", "Soacha", "Chía", "Zipaquirá", "Facatativá", "Fusagasugá",
      "Mosquera", "Madrid", "Funza", "Cajicá", "Girardot", "Cota", "Sopó", "Tocancipá"
    ],
    "Antioquia": [
      "Medellín", "Bello", "Itagüí", "Envigado", "Rionegro", "Apartadó",
      "Sabaneta", "La Estrella", "Caldas", "Copacabana", "Marinilla", "Caucasia"
    ],
    "Santander": [
      "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
      "San Gil", "Socorro", "Málaga", "Barbosa", "Zapatoca"
    ],
    "Valle del Cauca": [
      "Cali", "Palmira", "Buenaventura", "Tuluá", "Buga", "Cartago",
      "Jamundí", "Yumbo", "Candelaria", "Sevilla"
    ],
    "Atlántico": [
      "Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia",
      "Baranoa", "Galapa", "Palmar de Varela"
    ],
    "Bolívar": [
      "Cartagena", "Magangué", "El Carmen de Bolívar", "Turbaco", "Arjona", "Mompox"
    ],
    "Tolima": [
      "Ibagué", "Espinal", "Melgar", "Chaparral", "Mariquita", "Líbano", "Honda"
    ],
    "Meta": [
      "Villavicencio", "Acacías", "Granada", "Puerto López", "Cumaral"
    ],
    "Norte de Santander": [
      "Cúcuta", "Ocaña", "Pamplona", "Los Patios", "Villa del Rosario", "Tibú"
    ],
    "Caldas": [
      "Manizales", "La Dorada", "Chinchiná", "Villamaría", "Anserma", "Riosucio"
    ],
    "Risaralda": [
      "Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia", "Belén de Umbría"
    ],
    "Quindío": [
      "Armenia", "Calarcá", "La Tebaida", "Circasia", "Montenegro", "Quimbaya"
    ],
    "Huila": [
      "Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre"
    ],
    "Nariño": [
      "Pasto", "Tumaco", "Ipiales", "Túquerres", "La Unión"
    ],
    "Cauca": [
      "Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía", "Piendamó"
    ],
    "Cesar": [
      "Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia", "Curumaní"
    ],
    "Córdoba": [
      "Montería", "Lorica", "Cereté", "Sahagún", "Montelíbano", "Tierralta"
    ],
    "Magdalena": [
      "Santa Marta", "Ciénaga", "Fundación", "Plato", "El Banco"
    ],
    "Casanare": [
      "Yopal", "Aguazul", "Villanueva", "Paz de Ariporo", "Tauramena"
    ]
  };

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
    inputFechaNacimiento.max = `${anioActual - 10}-12-31`;
  }

  // -----------------------------------------------------
  // 3. FUNCIONALIDAD DEL OJITO (MOSTRAR / OCULTAR TEXTO)
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
  // 4. INDICADOR DE ÍNDICE DE SEGURIDAD DE CONTRASEÑA
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
  // 5. MODAL DE TÉRMINOS Y CONDICIONES
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
      if (checkTerminos) {
        checkTerminos.checked = true;
        validarTerminos();
      }
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
  // 6. TOAST NOTIFICACIONES
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
  // 7. SISTEMA DE VALIDACIONES EN TIEMPO REAL
  // -----------------------------------------------------
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
  const patronNombre = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;
  const patronTelefono = /^[+\d()\s-]{7,20}$/;

  function validarNombreCompleto(input, idSpan, campo) {
    const val = input.value.trim();
    if (!val) {
      return mostrarError(input, idSpan, `${campo} es obligatorio.`);
    }
    if (val.length < 2 || val.length > 30 || !patronNombre.test(val)) {
      return mostrarError(input, idSpan, 'Usa solo letras, espacios, apóstrofes o guiones (máximo 30 caracteres).');
    }
    return limpiarError(input, idSpan);
  }

  function validarNombre() {
    return validarNombreCompleto(inputNombre, 'error-nombre', 'El nombre');
  }

  function validarApellido() {
    return validarNombreCompleto(inputApellido, 'error-apellido', 'El apellido');
  }

  function validarFechaNacimiento() {
    const val = inputFechaNacimiento.value;
    if (!val) {
      return mostrarError(inputFechaNacimiento, 'error-nacimiento', 'Selecciona tu fecha de nacimiento.');
    }
    const fecha = new Date(`${val}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(val) ||
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== val ||
      val < inputFechaNacimiento.min ||
      val > inputFechaNacimiento.max
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
    if (!regexEmail.test(val) || val.length > 120) {
      return mostrarError(inputCorreo, 'error-correo', 'Ingresa un correo válido de máximo 120 caracteres.');
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
    if (new TextEncoder().encode(val).length > 72) {
      return mostrarError(inputContrasena, 'error-contrasena', 'La contraseña no puede superar 72 bytes.');
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
    if (val.length < 5 || val.length > 40 || /[\u0000-\u001f\u007f]/.test(val)) {
      return mostrarError(inputDireccion, 'error-direccion', 'Ingresa una dirección de 5 a 40 caracteres.');
    }
    return limpiarError(inputDireccion, 'error-direccion');
  }

  function validarDepartamento() {
    if (!Object.prototype.hasOwnProperty.call(departamentosColombia, selectDepartamento.value)) {
      return mostrarError(selectDepartamento, 'error-departamento', 'Selecciona un departamento.');
    }
    return limpiarError(selectDepartamento, 'error-departamento');
  }

  function validarMunicipio() {
    const municipios = departamentosColombia[selectDepartamento.value] || [];
    if (!municipios.includes(selectMunicipio.value)) {
      return mostrarError(selectMunicipio, 'error-municipio', 'Selecciona un municipio o ciudad.');
    }
    return limpiarError(selectMunicipio, 'error-municipio');
  }

  function validarTelefono() {
    const val = inputTelefonoPrincipal.value.trim();
    if (!val) {
      return mostrarError(inputTelefonoPrincipal, 'error-telefono', 'El teléfono principal es obligatorio.');
    }
    const cleanDigits = val.replace(/\D/g, '');
    if (!patronTelefono.test(val) || cleanDigits.length < 7) {
      return mostrarError(inputTelefonoPrincipal, 'error-telefono', 'Ingresa un teléfono válido de 7 a 20 caracteres.');
    }
    return limpiarError(inputTelefonoPrincipal, 'error-telefono');
  }

  function validarTelefonoSecundario() {
    const val = inputTelefonoSecundario.value.trim();
    if (!val) {
      return limpiarError(inputTelefonoSecundario, 'error-telefono-secundario');
    }
    if (!patronTelefono.test(val) || val.replace(/\D/g, '').length < 7) {
      return mostrarError(inputTelefonoSecundario, 'error-telefono-secundario', 'Ingresa un teléfono válido de 7 a 20 caracteres.');
    }
    return limpiarError(inputTelefonoSecundario, 'error-telefono-secundario');
  }

  function validarCodigoPostal() {
    const val = inputCodigoPostal.value.trim();
    if (!val) {
      return limpiarError(inputCodigoPostal, 'error-codigo-postal');
    }
    if (!/^\d{6}$/.test(val)) {
      return mostrarError(inputCodigoPostal, 'error-codigo-postal', 'El código postal debe tener 6 dígitos.');
    }
    return limpiarError(inputCodigoPostal, 'error-codigo-postal');
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
    inputNombre.addEventListener('input', () => { if (inputNombre.classList.contains('input-error')) validarNombre(); });
  }

  if (inputApellido) {
    inputApellido.addEventListener('blur', validarApellido);
    inputApellido.addEventListener('input', () => { if (inputApellido.classList.contains('input-error')) validarApellido(); });
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

  if (inputCodigoPostal) {
    inputCodigoPostal.addEventListener('blur', validarCodigoPostal);
    inputCodigoPostal.addEventListener('input', () => {
      if (inputCodigoPostal.classList.contains('input-error')) validarCodigoPostal();
    });
  }

  if (checkTerminos) {
    checkTerminos.addEventListener('change', validarTerminos);
  }

  // -----------------------------------------------------
  // 8. ENVÍO Y VALIDACIÓN GENERAL DEL FORMULARIO
  // -----------------------------------------------------
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
      const vCodigoPostal = validarCodigoPostal();
      const vTerm = validarTerminos();

      const esValido = vNombre && vApellido && vFecha && vCorreo && vConfCorreo &&
                        vPass && vConfPass && vDir && vDep && vMun && vTel &&
                        vTelSecundario && vCodigoPostal && vTerm;

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

      const nuevoUsuario = {
        nombre: inputNombre.value.trim(),
        apellido: inputApellido.value.trim(),
        email: inputCorreo.value.trim().toLowerCase(),
        password: inputContrasena.value,
        telefono: inputTelefonoPrincipal.value.trim(),
        telefono_secundario: inputTelefonoSecundario ? inputTelefonoSecundario.value.trim() : '',
        direccion: inputDireccion.value.trim(),
        departamento: selectDepartamento.value,
        ciudad: selectMunicipio.value,
        codigoPostal: inputCodigoPostal ? inputCodigoPostal.value.trim() : '',
        nacimiento: inputFechaNacimiento.value,
        rol: 'Cliente'
      };

      try {
        // Enviar datos al backend para crear el usuario
        const response = await fetch('http://localhost:3000/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nuevoUsuario),
        });
        const result = await response.json();
        if (!response.ok) {
          mostrarToast(result.message || 'Error al registrar usuario.', 'error');
          return;
        }
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
