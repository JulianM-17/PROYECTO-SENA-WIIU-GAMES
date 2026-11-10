/**
 * =====================================================
 * INICIO DE SESIÓN (LOGIN) — WiiU Games
 * Lógica JavaScript Completa y Dinámica
 * =====================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos DOM del Formulario Principal
  const formLogin = document.getElementById("form-login");
  const inputCorreo = document.getElementById("correo");
  const inputContrasena = document.getElementById("contrasena");
  const btnSubmit = document.getElementById("btn-submit");
  const textoBtn = btnSubmit ? btnSubmit.querySelector(".texto-btn") : null;
  const iconoBtn = btnSubmit ? btnSubmit.querySelector(".icono-btn") : null;
  const spinner = document.getElementById("spinner");
  const alertaFormulario = document.getElementById("alerta-formulario");
  const checkRecordar = document.getElementById("recordar-correo");

  // Ojito Mostrar/Ocultar Contraseña
  const togglePassword = document.getElementById("toggle-password");
  const iconoOjito = document.getElementById("icono-ojito");

  // Modal Recuperar Contraseña
  const linkOlvido = document.getElementById("link-olvido");
  const modalRecuperar = document.getElementById("modal-recuperar");
  const cerrarModal = document.getElementById("cerrar-modal");
  const formRecuperar = document.getElementById("form-recuperar");

  // Botón Social
  const btnGoogle = document.getElementById("btn-google");

  // Contenedor de Toasts
  const contenedorToast = document.getElementById("contenedor-toast");

  // -----------------------------------------------------
  // 1. CARGA INICIAL: RECORDAR CORREO
  // -----------------------------------------------------
  const correoGuardado = localStorage.getItem("wiiu_remember_email");
  if (correoGuardado && inputCorreo && checkRecordar) {
    inputCorreo.value = correoGuardado;
    checkRecordar.checked = true;
  }

  // -----------------------------------------------------
  // 2. ALTERNAR VISIBILIDAD DE LA CONTRASEÑA
  // -----------------------------------------------------
  if (togglePassword && inputContrasena && iconoOjito) {
    togglePassword.addEventListener("click", () => {
      const esPassword = inputContrasena.getAttribute("type") === "password";
      inputContrasena.setAttribute("type", esPassword ? "text" : "password");

      // Cambiar clases de ícono Flaticon
      if (esPassword) {
        iconoOjito.classList.remove("fi-rr-eye");
        iconoOjito.classList.add("fi-rr-eye-crossed");
      } else {
        iconoOjito.classList.remove("fi-rr-eye-crossed");
        iconoOjito.classList.add("fi-rr-eye");
      }
    });
  }

  // -----------------------------------------------------
  // 3. VALIDACIÓN EN TIEMPO REAL Y MANEJO DE ERRORES
  // -----------------------------------------------------
  const validarEmailFormat = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const mostrarErrorCampo = (input, spanId, mensaje) => {
    input.classList.add("input-error");
    const spanError = document.getElementById(spanId);
    if (spanError) {
      spanError.textContent = mensaje;
    }
  };

  const limpiarErrorCampo = (input, spanId) => {
    input.classList.remove("input-error");
    const spanError = document.getElementById(spanId);
    if (spanError) {
      spanError.textContent = "";
    }
  };

  const limpiarErrores = () => {
    limpiarErrorCampo(inputCorreo, "error-correo");
    limpiarErrorCampo(inputContrasena, "error-contrasena");
    if (alertaFormulario) {
      alertaFormulario.classList.add("oculta");
      alertaFormulario.textContent = "";
      alertaFormulario.className = "alerta-formulario oculta";
    }
  };

  // Escuchar inputs para validar y limpiar errores
  if (inputCorreo) {
    inputCorreo.addEventListener("blur", () => {
      const val = inputCorreo.value.trim();
      if (!val) {
        mostrarErrorCampo(
          inputCorreo,
          "error-correo",
          "El correo electrónico es obligatorio.",
        );
      } else if (!validarEmailFormat(val)) {
        mostrarErrorCampo(
          inputCorreo,
          "error-correo",
          "Por favor ingresa un correo electrónico válido.",
        );
      } else {
        limpiarErrorCampo(inputCorreo, "error-correo");
      }
    });

    inputCorreo.addEventListener("input", () => {
      if (inputCorreo.classList.contains("input-error")) {
        const val = inputCorreo.value.trim();
        if (val && validarEmailFormat(val)) {
          limpiarErrorCampo(inputCorreo, "error-correo");
        }
      }
    });
  }

  if (inputContrasena) {
    inputContrasena.addEventListener("blur", () => {
      const val = inputContrasena.value.trim();
      if (!val) {
        mostrarErrorCampo(
          inputContrasena,
          "error-contrasena",
          "La contraseña es obligatoria.",
        );
      } else if (val.length < 5) {
        mostrarErrorCampo(
          inputContrasena,
          "error-contrasena",
          "La contraseña debe tener al menos 5 caracteres.",
        );
      } else {
        limpiarErrorCampo(inputContrasena, "error-contrasena");
      }
    });

    inputContrasena.addEventListener("input", () => {
      if (inputContrasena.classList.contains("input-error")) {
        const val = inputContrasena.value.trim();
        if (val.length >= 5) {
          limpiarErrorCampo(inputContrasena, "error-contrasena");
        }
      }
    });
  }

  // -----------------------------------------------------
  // 5. PROCESAMIENTO DEL FORMULARIO DE LOGIN
  // -----------------------------------------------------
  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      limpiarErrores();

      const correo = inputCorreo ? inputCorreo.value.trim() : "";
      const contrasena = inputContrasena ? inputContrasena.value.trim() : "";
      let esValido = true;

      // Validación de Correo
      if (!correo) {
        mostrarErrorCampo(
          inputCorreo,
          "error-correo",
          "El correo electrónico es obligatorio.",
        );
        esValido = false;
      } else if (!validarEmailFormat(correo)) {
        mostrarErrorCampo(
          inputCorreo,
          "error-correo",
          "Por favor ingresa un correo electrónico válido.",
        );
        esValido = false;
      }

      // Validación de Contraseña
      if (!contrasena) {
        mostrarErrorCampo(
          inputContrasena,
          "error-contrasena",
          "La contraseña es obligatoria.",
        );
        esValido = false;
      } else if (contrasena.length < 5) {
        mostrarErrorCampo(
          inputContrasena,
          "error-contrasena",
          "La contraseña debe tener al menos 5 caracteres.",
        );
        esValido = false;
      }

      if (!esValido) {
        mostrarToast("Por favor corrige los errores en el formulario", "error");
        return;
      }

      // Iniciar estado de carga
      setEstadoCargando(true);

      const correoNorm = correo.toLowerCase().trim();
      const destinoSolicitado = new URLSearchParams(window.location.search).get("returnTo");

      const USUARIOS_SISTEMA = [
        {
          correo: "admin123@gmail.com",
          contrasena: "Admin123",
          nombre: "Andres Torres",
          rol: "Administrador",
          id: 3,
          ruta: "Administrador/index.html"
        },
        {
          correo: "trabajador@gmail.com",
          contrasena: "Trabajador123",
          nombre: "Sofia Martinez",
          rol: "Trabajador",
          id: 5,
          ruta: "Empleado/index.html"
        },
        {
          correo: "trabajador2@gmail.com",
          contrasena: "Trabajador123",
          nombre: "Mateo Rios",
          rol: "Trabajador",
          id: 6,
          ruta: "Empleado/index.html"
        },
        {
          correo: "cliente@gmail.com",
          contrasena: "Cliente123",
          nombre: "Carlos Ramirez",
          rol: "Cliente",
          id: 1,
          ruta: "panel_usuario.html"
        },
        {
          correo: "cliente2@gmail.com",
          contrasena: "Cliente123",
          nombre: "Laura Gomez",
          rol: "Cliente",
          id: 2,
          ruta: "panel_usuario.html"
        },
        {
          correo: "proveedor@gmail.com",
          contrasena: "Proveedor123",
          nombre: "Distribuciones Tech",
          rol: "Proveedor",
          id: 4,
          ruta: "panel_usuario.html"
        }
      ];

      function resolverRutaPorRol(rol, returnTo) {
        const r = (rol || "").trim().toLowerCase();
        if (r.includes("admin")) {
          return "Administrador/index.html";
        }
        if (r.includes("trabajad") || r.includes("emplead")) {
          return "Empleado/index.html";
        }
        if (r.includes("cliente")) {
          return "panel_usuario.html";
        }
        if (r.includes("proveedor")) {
          return "panel_usuario.html";
        }
        return "panel_usuario.html";
      }

      function guardarSesionYRedirigir(usuario, token, returnTo, redirectToApi) {
        if (checkRecordar && checkRecordar.checked) {
          localStorage.setItem("wiiu_remember_email", usuario.correo || usuario.email);
        } else {
          localStorage.removeItem("wiiu_remember_email");
        }

        const tokenFinal = token || ("token_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10));
        localStorage.setItem("sessionToken", tokenFinal);
        sessionStorage.setItem("sessionToken", tokenFinal);

        const sesionUsuario = {
          id: usuario.id,
          correo: usuario.correo || usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          token: tokenFinal,
          fechaIngreso: new Date().toISOString()
        };
        sessionStorage.setItem(
          "wiiu_usuario_activo",
          JSON.stringify(sesionUsuario)
        );

        setEstadoCargando(false);
        if (alertaFormulario) {
          alertaFormulario.textContent = `¡Bienvenido de nuevo, ${usuario.nombre}! Redirigiendo a tu panel...`;
          alertaFormulario.className = "alerta-formulario exito";
        }
        mostrarToast(`¡Bienvenido, ${usuario.nombre}!`, "exito");

        let rutaFinal = resolverRutaPorRol(usuario.rol, returnTo);
        if (redirectToApi && redirectToApi.includes("index.html") && !redirectToApi.includes("index_admin.html")) {
          rutaFinal = redirectToApi;
        }

        setTimeout(() => {
          window.location.href = rutaFinal;
        }, 1000);
      }

      fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correoNorm, password: contrasena }),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));

          if (!response.ok || !data.ok) {
            throw new Error(data.message || "Error al iniciar sesión.");
          }

          return data;
        })
        .then((data) => {
          const usuario = data.user || {};
          guardarSesionYRedirigir(usuario, data.sessionToken, destinoSolicitado, data.redirectTo);
        })
        .catch((error) => {
          const usuarioLocal = USUARIOS_SISTEMA.find(
            u => u.correo.toLowerCase() === correoNorm && u.contrasena === contrasena
          );

          if (usuarioLocal) {
            guardarSesionYRedirigir(usuarioLocal, null, destinoSolicitado, usuarioLocal.ruta);
            return;
          }

          setEstadoCargando(false);
          mostrarErrorCampo(
            inputContrasena,
            "error-contrasena",
            error.message || "Credenciales inválidas.",
          );
          if (alertaFormulario) {
            alertaFormulario.textContent =
              error.message ||
              "No pudimos iniciar sesión. Inténtalo nuevamente.";
            alertaFormulario.className = "alerta-formulario error";
          }
          mostrarToast(error.message || "Error al iniciar sesión", "error");
          inputContrasena.focus();
        });
    });
  }

  function setEstadoCargando(cargando) {
    if (!btnSubmit) return;
    btnSubmit.disabled = cargando;

    if (cargando) {
      if (textoBtn) textoBtn.textContent = "Verificando...";
      if (iconoBtn) iconoBtn.classList.add("oculta");
      if (spinner) spinner.classList.remove("oculta");
    } else {
      if (textoBtn) textoBtn.textContent = "Iniciar Sesión";
      if (iconoBtn) iconoBtn.classList.remove("oculta");
      if (spinner) spinner.classList.add("oculta");
    }
  }

  // -----------------------------------------------------
  // 6. MODAL DE RECUPERACIÓN DE CONTRASEÑA
  // -----------------------------------------------------
  if (linkOlvido && modalRecuperar) {
    linkOlvido.addEventListener("click", (e) => {
      e.preventDefault();
      modalRecuperar.classList.remove("oculta");
    });
  }

  if (cerrarModal && modalRecuperar) {
    cerrarModal.addEventListener("click", () => {
      modalRecuperar.classList.add("oculta");
    });

    // Cerrar al hacer clic en el backdrop
    modalRecuperar.addEventListener("click", (e) => {
      if (e.target === modalRecuperar) {
        modalRecuperar.classList.add("oculta");
      }
    });
  }

  const correoRecuperar = document.getElementById("correo-recuperar");
  if (correoRecuperar) {
    correoRecuperar.addEventListener("blur", () => {
      const val = correoRecuperar.value.trim();
      if (!val || !validarEmailFormat(val)) {
        correoRecuperar.classList.add("input-error");
      } else {
        correoRecuperar.classList.remove("input-error");
      }
    });

    correoRecuperar.addEventListener("input", () => {
      if (
        correoRecuperar.value.trim() &&
        validarEmailFormat(correoRecuperar.value.trim())
      ) {
        correoRecuperar.classList.remove("input-error");
      }
    });
  }

  if (formRecuperar) {
    formRecuperar.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = correoRecuperar ? correoRecuperar.value.trim() : "";

      if (!val || !validarEmailFormat(val)) {
        if (correoRecuperar) {
          correoRecuperar.classList.add("input-error");
          correoRecuperar.focus();
        }
        mostrarToast(
          "Ingresa un correo válido para recuperar tu contraseña",
          "error",
        );
        return;
      }

      if (correoRecuperar) correoRecuperar.classList.remove("input-error");
      modalRecuperar.classList.add("oculta");
      if (correoRecuperar) correoRecuperar.value = "";
      mostrarToast(`Instrucciones enviadas a ${val}`, "exito");
    });
  }

  // -----------------------------------------------------
  // 7. BOTÓN SOCIAL (Google)
  // -----------------------------------------------------
  if (btnGoogle) {
    btnGoogle.addEventListener("click", () => {
      mostrarToast(
        "Usa tus credenciales de WiiU Games para iniciar sesión.",
        "info",
      );
    });
  }

  // -----------------------------------------------------
  // 8. SISTEMA DE NOTIFICACIONES FLOTANTES (TOAST)
  // -----------------------------------------------------
  function mostrarToast(mensaje, tipo = "exito") {
    if (!contenedorToast) return;

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;

    const icono =
      tipo === "exito" ? "fi-rr-check-circle" : "fi-rr-cross-circle";
    toast.innerHTML = `
      <i class="fi ${icono}" style="font-size: 18px;"></i>
      <span>${mensaje}</span>
    `;

    contenedorToast.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }
});
