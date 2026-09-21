/**
 * =====================================================
 * REGISTRO DE USUARIO — WiiU Games
 * Lógica Completa, Validaciones en Tiempo Real y Dinamismo
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

  // -----------------------------------------------------
  // 1. DICCIONARIO DE DEPARTAMENTOS Y MUNICIPIOS DE COLOMBIA
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // 2. POBLAR MENÚS DESPLEGABLES (DÍA, MES, AÑO)
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
  function validarNombre() {
    const val = inputNombre.value.trim();
    if (!val) {
      return mostrarError(inputNombre, 'error-nombre', 'El nombre es obligatorio.');
    }
    if (val.length < 2) {
      return mostrarError(inputNombre, 'error-nombre', 'Ingresa un nombre válido (mínimo 2 letras).');
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
    return limpiarError(inputApellido, 'error-apellido');
  }

  function validarFechaNacimiento() {
    if (!selectDia.value || !selectMes.value || !selectAnio.value) {
      return mostrarError(null, 'error-nacimiento', 'Selecciona tu fecha de nacimiento completa.');
    }
    const span = document.getElementById('error-nacimiento');
    if (span) {
      span.textContent = '';
      span.classList.remove('visible');
    }
    return true;
  }

  function validarCorreo() {
    const val = inputCorreo.value.trim();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      return mostrarError(inputCorreo, 'error-correo', 'El correo electrónico es obligatorio.');
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
    const cleanDigits = val.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      return mostrarError(inputTelefonoPrincipal, 'error-telefono', 'Ingresa un número telefónico válido (mínimo 7 dígitos).');
    }
    return limpiarError(inputTelefonoPrincipal, 'error-telefono');
  }

  function validarTerminos() {
    if (!checkTerminos.checked) {
      const span = document.getElementById('error-terminos');
      if (span) {
        span.textContent = 'Debes aceptar los términos y condiciones.';
        span.classList.add('visible');
      }
      return false;
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

  if (selectDia) selectDia.addEventListener('change', validarFechaNacimiento);
  if (selectMes) selectMes.addEventListener('change', validarFechaNacimiento);
  if (selectAnio) selectAnio.addEventListener('change', validarFechaNacimiento);

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

  if (selectMunicipio) selectMunicipio.addEventListener('change', validarMunicipio);

  if (inputTelefonoPrincipal) {
    inputTelefonoPrincipal.addEventListener('blur', validarTelefono);
    inputTelefonoPrincipal.addEventListener('input', () => { if (inputTelefonoPrincipal.classList.contains('input-error')) validarTelefono(); });
  }

  if (checkTerminos) {
    checkTerminos.addEventListener('change', validarTerminos);
  }

  // -----------------------------------------------------
  // 8. ENVÍO Y VALIDACIÓN GENERAL DEL FORMULARIO
  // -----------------------------------------------------
  if (formRegistro) {
    formRegistro.addEventListener('submit', (e) => {
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
      const vTerm = validarTerminos();

      const esValido = vNombre && vApellido && vFecha && vCorreo && vConfCorreo &&
                        vPass && vConfPass && vDir && vDep && vMun && vTel && vTerm;

      if (!esValido) {
        mostrarToast('Por favor completa y corrige todos los campos obligatorios.', 'error');
        const primerError = formRegistro.querySelector('.input-error');
        if (primerError) primerError.focus();
        return;
      }

      // Deshabilitar botón durante proceso
      if (btnRegistro) {
        btnRegistro.disabled = true;
        btnRegistro.innerHTML = '<i class="fi fi-rr-spinner fi-spin"></i> Registrando cuenta...';
      }

      // Guardar usuario en localStorage para persistencia y validación en Login
      const nuevoUsuario = {
        nombre: inputNombre.value.trim(),
        apellido: inputApellido.value.trim(),
        email: inputCorreo.value.trim().toLowerCase(),
        password: inputContrasena.value,
        telefono: inputTelefonoPrincipal.value.trim(),
        telefonoSecundario: inputTelefonoSecundario ? inputTelefonoSecundario.value.trim() : '',
        direccion: inputDireccion.value.trim(),
        departamento: selectDepartamento.value,
        ciudad: selectMunicipio.value,
        codigoPostal: inputCodigoPostal ? inputCodigoPostal.value.trim() : '',
        nacimiento: `${selectDia.value}/${selectMes.value}/${selectAnio.value}`,
        rol: 'Cliente'
      };

      try {
        localStorage.setItem('wiiu_user', JSON.stringify(nuevoUsuario));
        const usuariosGuardados = JSON.parse(localStorage.getItem('wiiu_registered_users') || '[]');
        // Verificar si ya existe ese correo para actualizarlo o agregarlo
        const indexExistente = usuariosGuardados.findIndex(u => u.email === nuevoUsuario.email);
        if (indexExistente >= 0) {
          usuariosGuardados[indexExistente] = nuevoUsuario;
        } else {
          usuariosGuardados.push(nuevoUsuario);
        }
        localStorage.setItem('wiiu_registered_users', JSON.stringify(usuariosGuardados));
      } catch (err) {
        console.warn('Error guardando en localStorage:', err);
      }

      mostrarToast('¡Cuenta creada exitosamente! Redirigiendo a Iniciar Sesión...', 'exito');

      setTimeout(() => {
        window.location.href = 'Login.html';
      }, 1600);
    });
  }
});
