// =====================================================
//   PANEL DE USUARIO — LÓGICA COMPLETA E INTERACTIVIDAD
//   WiiU-Games
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  // ===================================================
  // 1. ESTADO DE LA APLICACIÓN Y LOCALSTORAGE
  // ===================================================
  const STORAGE_KEY = "wiiu_user_panel_data";
  let sessionUser;
  try {
    sessionUser = JSON.parse(
      sessionStorage.getItem("wiiu_usuario_activo") || "null",
    );
  } catch (error) {
    sessionUser = null;
  }
  if (!sessionUser?.token) {
    window.location.href = "Login.html";
    return;
  }
  const nombreCompleto = sessionUser?.nombre || "Usuario";
  const partesNombre = nombreCompleto.trim().split(/\s+/);

  const defaultState = {
    cartCount: 0,
    profile: {
      nombre: partesNombre[0] || "Usuario",
      apellidos: partesNombre.slice(1).join(" ") || "",
      email: sessionUser?.correo || "usuario@wiiu.com",
      telefono: "",
      nacimiento: "",
      documento: "",
    },
    addresses: [],
    cards: [],
    orders: [],
    favorites: [],
  };

  let state = loadState();
  let ordersLoading = true;
  let ordersLoadError = "";
  if (window.WiiUGamesCart) {
    state.cartCount = window.WiiUGamesCart.updateCount();
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasLegacyPanelData =
          Object.hasOwn(parsed, "profile") || Object.hasOwn(parsed, "orders");
        delete parsed.orders;
        if (Object.hasOwn(parsed, "profile")) {
          delete parsed.profile;
        }
        if (hasLegacyPanelData) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return {
          ...defaultState,
          ...parsed,
          orders: [],
          profile: defaultState.profile,
        };
      }
    } catch (e) {
      console.warn("Error al cargar estado de localStorage:", e);
    }
    return defaultState;
  }

  function saveState() {
    try {
      const panelData = { ...state };
      delete panelData.profile;
      delete panelData.orders;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panelData));
    } catch (e) {
      console.warn("Error al guardar estado:", e);
    }
  }

  async function loadProfileFromDatabase() {
    const response = await fetch("http://localhost:3000/api/profile", {
      headers: { Authorization: `Bearer ${sessionUser.token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem("wiiu_usuario_activo");
        window.location.href = "Login.html";
      }
      throw new Error(data.message || "No se pudo cargar el perfil.");
    }

    const profile = data.profile;
    state.profile = {
      nombre: profile.nombre || "",
      apellidos: profile.apellido || "",
      email: profile.correo || "",
      telefono: profile.telefono || "",
      nacimiento: profile.nacimiento || "",
      documento: profile.documento || "",
    };
    sessionUser.nombre =
      `${state.profile.nombre} ${state.profile.apellidos}`.trim();
    sessionUser.correo = state.profile.email;
    sessionStorage.setItem("wiiu_usuario_activo", JSON.stringify(sessionUser));
  }

  async function loadOrdersFromDatabase() {
    const response = await fetch("http://localhost:3000/api/my-orders", {
      headers: { Authorization: `Bearer ${sessionUser.token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sessionStorage.removeItem("wiiu_usuario_activo");
      sessionStorage.removeItem("sessionToken");
      localStorage.removeItem("sessionToken");
      window.location.replace("Login.html?returnTo=panel_usuario.html");
      throw new Error("Tu sesión venció. Inicia sesión nuevamente.");
    }
    if (!response.ok || !data.ok || !Array.isArray(data.orders)) {
      throw new Error(data.message || "No se pudieron cargar tus pedidos.");
    }

    state.orders = data.orders;
  }

  // ===================================================
  // 2. SISTEMA DE TOASTS Y MODALES
  // ===================================================
  const toastContainer = document.getElementById("contenedor-notificacion");

  function showToast(mensaje, tipo = "success") {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;

    let icon = "fi fi-rr-check-circle";
    if (tipo === "error") icon = "fi fi-rr-cross-circle";
    if (tipo === "info") icon = "fi fi-rr-info";

    toast.innerHTML = `<i class="${icon}"></i> <span>${mensaje}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "toastOut 0.3s ease forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("activa");
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("activa");
  }

  const typedFieldRules = {
    name: {
      normalize: (value) => value.replace(/[^\p{L}\s'-]/gu, ""),
      hasInvalidCharacters: (value) => /[^\p{L}\s'-]/u.test(value),
      validate: (value) =>
        /^[\p{L}][\p{L}\s'-]*$/u.test(value.trim())
          ? ""
          : "Ingresa solo letras, espacios, apóstrofes o guiones.",
      inputMessage: "Este campo solo admite letras, espacios, apóstrofes y guiones.",
    },
    phone: {
      normalize: (value) => value.replace(/[^+\d()\s-]/g, ""),
      hasInvalidCharacters: (value) => /[^+\d()\s-]/.test(value),
      validate: (value) =>
        /^[+\d()\s-]{7,20}$/.test(value) &&
        (value.match(/\d/g) || []).length >= 7
          ? ""
          : "El teléfono debe tener entre 7 y 20 caracteres y al menos 7 dígitos.",
      inputMessage: "El teléfono no admite letras.",
    },
    document: {
      normalize: (value) => value.replace(/[^\p{L}\p{N}.-]/gu, ""),
      hasInvalidCharacters: (value) => /[^\p{L}\p{N}.-]/u.test(value),
      validate: (value) =>
        /^[\p{L}\p{N}.-]{4,20}$/u.test(value)
          ? ""
          : "El documento debe tener entre 4 y 20 letras, números, puntos o guiones.",
      inputMessage: "El documento solo admite letras, números, puntos y guiones.",
    },
    "card-number": {
      normalize: (value, input) =>
        value.replace(/[\s-]/g, "").replace(/\D/g, "").slice(0, input.maxLength),
      hasInvalidCharacters: (value) => /[^0-9\s-]/.test(value),
      validate: (value) =>
        /^\d{13,19}$/.test(value)
          ? ""
          : "El número de tarjeta debe tener entre 13 y 19 dígitos.",
      inputMessage: "El número de tarjeta solo admite dígitos.",
    },
    expiry: {
      normalize: (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 4);
        return digits.length > 2
          ? `${digits.slice(0, 2)}/${digits.slice(2)}`
          : digits;
      },
      hasInvalidCharacters: (value) => /[^0-9/]/.test(value),
      validate: (value) => {
        const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
        if (!match) return "Usa un vencimiento válido en formato MM/AA.";

        const month = Number(match[1]);
        const year = 2000 + Number(match[2]);
        const now = new Date();
        if (
          year < now.getFullYear() ||
          (year === now.getFullYear() && month < now.getMonth() + 1)
        ) {
          return "La tarjeta está vencida.";
        }
        return "";
      },
      inputMessage: "El vencimiento solo admite números en formato MM/AA.",
    },
    cvc: {
      normalize: (value, input) =>
        value.replace(/\D/g, "").slice(0, input.maxLength),
      hasInvalidCharacters: (value) => /\D/.test(value),
      validate: (value) =>
        /^\d{3,4}$/.test(value) ? "" : "El CVC debe tener 3 o 4 dígitos.",
      inputMessage: "El CVC solo admite números.",
    },
  };

  function setTypedFieldError(input, message) {
    const wrapper = input.closest(".campo-formulario");
    let feedback = wrapper?.querySelector(".error-mensaje-campo");
    if (message) {
      input.classList.add("input-error");
      if (wrapper && !feedback) {
        feedback = document.createElement("small");
        feedback.className = "error-mensaje-campo";
        wrapper.appendChild(feedback);
      }
      if (feedback) feedback.textContent = message;
      return;
    }

    input.classList.remove("input-error");
    feedback?.remove();
  }

  function validateTypedInput(input) {
    const rule = typedFieldRules[input.dataset.validation];
    if (!rule) return "";
    const value = input.value.trim();
    if (!value) {
      return input.required ? "Este campo es obligatorio." : "";
    }
    return rule.validate(value);
  }

  function validateTypedFields(form) {
    let firstInvalid = null;
    form.querySelectorAll("[data-validation]").forEach((input) => {
      const message = validateTypedInput(input);
      setTypedFieldError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      showToast("Revisa el formato de los campos señalados.", "error");
      return false;
    }
    return true;
  }

  document.querySelectorAll("[data-validation]").forEach((input) => {
    const rule = typedFieldRules[input.dataset.validation];
    if (!rule) return;

    input.addEventListener("input", () => {
      const previousValue = input.value;
      const hasInvalidCharacters = rule.hasInvalidCharacters(previousValue);
      input.value = rule.normalize(previousValue, input);
      if (hasInvalidCharacters) {
        setTypedFieldError(input, rule.inputMessage);
      } else {
        setTypedFieldError(input, "");
      }
    });

    input.addEventListener("blur", () => {
      setTypedFieldError(input, validateTypedInput(input));
    });
  });

  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        form
          .querySelectorAll("[data-validation]")
          .forEach((input) => setTypedFieldError(input, ""));
      }, 0);
    });
  });

  const birthDateInput = document.getElementById("perfil-nacimiento");
  if (birthDateInput) {
    const localDate = new Date(
      Date.now() - new Date().getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 10);
    birthDateInput.max = localDate;
  }

  // Cerrar modales al hacer clic en botones de cierre o backdrop
  document
    .querySelectorAll("[data-close-modal], .fondo-modal")
    .forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target === el || el.hasAttribute("data-close-modal")) {
          const activeModal = el.closest(".fondo-modal") || el;
          activeModal.classList.remove("activa");
        }
      });
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".fondo-modal.activa")
        .forEach((m) => m.classList.remove("activa"));
    }
  });

  // ===================================================
  // 3. NAVEGACIÓN SPA & BREADCRUMBS
  // ===================================================
  const navItems = document.querySelectorAll(".elemento-nav[data-vista]");
  const vistas = document.querySelectorAll(".vista-panel");
  const migaActiva = document.getElementById("miga-activa");

  const etiquetas = {
    "vista-inicio": "Mi Cuenta",
    "vista-perfil": "Mi Perfil",
    "vista-direcciones": "Direcciones de Envío",
    "vista-pedidos": "Mis Pedidos",
    "vista-pagos": "Métodos de Pago",
    "vista-favoritos": "Mi Lista de Favoritos",
    "vista-seguimiento": "Sigue tu Pedido",
    "vista-factura": "Descarga tu Factura",
    "vista-garantias": "Garantías",
  };

  function activarVista(vistaId, navId) {
    vistas.forEach((v) => v.classList.remove("activa"));
    navItems.forEach((n) => n.classList.remove("activo"));

    const vista = document.getElementById(vistaId);
    if (vista) vista.classList.add("activa");

    const navEl = document.getElementById(navId);
    if (navEl) navEl.classList.add("activo");

    if (migaActiva) migaActiva.textContent = etiquetas[vistaId] || "Mi Cuenta";
  }

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const vistaId = item.dataset.vista;
      const navId = item.id;
      activarVista(vistaId, navId);
    });
  });

  // Tarjetas del dashboard (redirigen a la vista correspondiente)
  const tarjetasNav = document.querySelectorAll("[data-nav]");
  tarjetasNav.forEach((tarjeta) => {
    tarjeta.addEventListener("click", (e) => {
      e.preventDefault();
      const navId = tarjeta.dataset.nav;
      const navEl = document.getElementById(navId);
      if (navEl) {
        const vistaId = navEl.dataset.vista;
        activarVista(vistaId, navId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  // ===================================================
  // 4. ACTUALIZACIÓN GLOBAL DE INTERFAZ (RERENDER)
  // ===================================================
  function updateUI() {
    // 4.1 Carrito en Header
    const burbujaCarrito = document.querySelector(".burbuja-carrito");
    if (burbujaCarrito)
      burbujaCarrito.textContent =
        state.cartCount && state.cartCount > 0 ? state.cartCount : "";

    // 4.2 Datos del Perfil (Header, Sidebar, Banner, Cards)
    const { nombre, apellidos, email, telefono, nacimiento, documento } =
      state.profile;
    const initial =
      nombre && nombre.charAt(0) ? nombre.charAt(0).toUpperCase() : "U";

    document
      .querySelectorAll(
        ".avatar-barra-lateral, .perfil-avatar-grande, .foto-perfil",
      )
      .forEach((el) => {
        if (el.classList.contains("foto-perfil")) {
          el.textContent = initial;
        } else {
          el.textContent = initial;
        }
      });

    document
      .querySelectorAll(
        ".info-perfil-barra-lateral .nombre, .perfil-avatar-nombre",
      )
      .forEach((el) => {
        el.textContent = `${nombre} ${apellidos}`.trim();
      });

    document
      .querySelectorAll(
        ".info-perfil-barra-lateral .email, .perfil-avatar-email",
      )
      .forEach((el) => {
        el.textContent = email;
      });

    const bannerSaludo = document.querySelector(".banner-saludo span");
    if (bannerSaludo) bannerSaludo.textContent = `${nombre}!`;

    // Counters en perfil stat
    const statNumeroPedidos = document.querySelectorAll(
      ".perfil-stat-numero",
    )[0];
    const statNumeroFavs = document.querySelectorAll(".perfil-stat-numero")[1];
    const statNumeroDirs = document.querySelectorAll(".perfil-stat-numero")[2];

    if (statNumeroPedidos) statNumeroPedidos.textContent = state.orders.length;
    if (statNumeroFavs) statNumeroFavs.textContent = state.favorites.length;
    if (statNumeroDirs) statNumeroDirs.textContent = state.addresses.length;

    const nacimientoVisible = nacimiento
      ? nacimiento.split("-").reverse().join("/")
      : "";
    [
      ["perfil-dato-nombres", nombre],
      ["perfil-dato-apellidos", apellidos],
      ["perfil-dato-email", email],
      ["perfil-dato-telefono", telefono],
      ["perfil-dato-nacimiento", nacimientoVisible],
      ["perfil-dato-documento", documento],
    ].forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field) field.textContent = value || "No registrado";
    });

    [
      ["perfil-nombres", nombre],
      ["perfil-apellidos", apellidos],
      ["perfil-email", email],
      ["perfil-telefono", telefono],
      ["perfil-nacimiento", nacimiento],
      ["perfil-documento", documento],
    ].forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) input.value = value || "";
    });

    renderAddresses();
    renderCards();
    renderFavorites();
    renderOrders();
  }

  // ===================================================
  // 5. PERFIL — GUARDAR DATOS & CAMBIAR CONTRASEÑA
  // ===================================================
  const formPerfilDatos = document.getElementById("form-perfil-datos");
  const btnEditarPerfil = document.getElementById("btn-editar-perfil");
  const btnCancelarPerfil = document.getElementById("btn-cancelar-perfil");
  const formPerfilSeguridad = document.getElementById("form-perfil-seguridad");

  btnEditarPerfil?.addEventListener("click", () => {
    formPerfilDatos
      ?.querySelectorAll("[data-validation]")
      .forEach((input) => setTypedFieldError(input, ""));
    updateUI();
    openModal("modal-editar-perfil");
    document.getElementById("perfil-nombres")?.focus();
  });

  // Validación en tiempo real para todos los campos de formularios del panel
  document
    .querySelectorAll(
      "#form-perfil-datos, #form-perfil-seguridad, #form-modal-direccion, #form-modal-tarjeta",
    )
    .forEach((f) => {
      f.querySelectorAll("input, select, textarea").forEach((input) => {
        if (input.hasAttribute("required")) {
          input.addEventListener("blur", () => {
            if (!input.value.trim()) {
              input.classList.add("input-error");
            } else if (
              !input.closest(".campo-formulario")?.querySelector(
                ".error-mensaje-campo",
              )
            ) {
              input.classList.remove("input-error");
            }
          });
          input.addEventListener("input", () => {
            if (
              input.value.trim() &&
              !input.closest(".campo-formulario")?.querySelector(
                ".error-mensaje-campo",
              )
            ) {
              input.classList.remove("input-error");
            }
          });
          input.addEventListener("change", () => {
            if (
              input.value.trim() &&
              !input.closest(".campo-formulario")?.querySelector(
                ".error-mensaje-campo",
              )
            ) {
              input.classList.remove("input-error");
            }
          });
        }
      });
    });

  if (formPerfilDatos) {
    formPerfilDatos.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateTypedFields(formPerfilDatos)) return;

      const inputNombre = document.getElementById("perfil-nombres");
      const inputApellidos = document.getElementById("perfil-apellidos");
      const inputEmail = document.getElementById("perfil-email");
      const nuevoNombre = inputNombre?.value.trim();
      const nuevosApellidos = inputApellidos?.value.trim() || "";
      const nuevoEmail = inputEmail?.value.trim() || "";
      const nuevoTel =
        document.getElementById("perfil-telefono")?.value.trim() || "";
      const nuevoNac =
        document.getElementById("perfil-nacimiento")?.value || "";
      const nuevoDoc =
        document.getElementById("perfil-documento")?.value.trim() || "";

      let valido = true;
      if (!nuevoNombre) {
        if (inputNombre) inputNombre.classList.add("input-error");
        valido = false;
      } else if (inputNombre) {
        inputNombre.classList.remove("input-error");
      }

      if (!nuevoEmail) {
        if (inputEmail) inputEmail.classList.add("input-error");
        valido = false;
      } else if (inputEmail) {
        inputEmail.classList.remove("input-error");
      }

      if (!valido) {
        showToast("Por favor completa los campos obligatorios.", "error");
        const primerError = formPerfilDatos.querySelector(".input-error");
        if (primerError) primerError.focus();
        return;
      }

      const saveButton = formPerfilDatos.querySelector('[type="submit"]');
      if (saveButton) saveButton.disabled = true;
      try {
        const response = await fetch("http://localhost:3000/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionUser.token}`,
          },
          body: JSON.stringify({
            nombre: nuevoNombre,
            apellido: nuevosApellidos,
            correo: nuevoEmail,
            telefono: nuevoTel,
            nacimiento: nuevoNac,
            documento: nuevoDoc,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.message || "No se pudieron guardar los datos.");
        }

        const profile = data.profile;
        state.profile = {
          nombre: profile.nombre || "",
          apellidos: profile.apellido || "",
          email: profile.correo || "",
          telefono: profile.telefono || "",
          nacimiento: profile.nacimiento || "",
          documento: profile.documento || "",
        };
        sessionUser.nombre =
          `${state.profile.nombre} ${state.profile.apellidos}`.trim();
        sessionUser.correo = state.profile.email;
        sessionStorage.setItem(
          "wiiu_usuario_activo",
          JSON.stringify(sessionUser),
        );
        updateUI();
        closeModal("modal-editar-perfil");
        showToast("¡Datos personales actualizados con éxito!", "success");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    });
  }

  if (btnCancelarPerfil) {
    btnCancelarPerfil.addEventListener("click", (e) => {
      e.preventDefault();
      formPerfilDatos
        ?.querySelectorAll("[data-validation]")
        .forEach((input) => setTypedFieldError(input, ""));
      updateUI();
      closeModal("modal-editar-perfil");
      showToast("Cambios cancelados.", "info");
    });
  }

  if (formPerfilSeguridad) {
    formPerfilSeguridad.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputActual = document.getElementById("perfil-pass-actual");
      const inputNueva = document.getElementById("perfil-pass-nueva");
      const inputConfirm = document.getElementById("perfil-pass-confirm");
      const actual = inputActual?.value;
      const nueva = inputNueva?.value;
      const confirm = inputConfirm?.value;

      let valido = true;
      if (!actual) {
        if (inputActual) inputActual.classList.add("input-error");
        valido = false;
      } else if (inputActual) {
        inputActual.classList.remove("input-error");
      }

      if (!nueva || nueva.length < 8) {
        if (inputNueva) inputNueva.classList.add("input-error");
        valido = false;
      } else if (inputNueva) {
        inputNueva.classList.remove("input-error");
      }

      if (!confirm || nueva !== confirm) {
        if (inputConfirm) inputConfirm.classList.add("input-error");
        valido = false;
      } else if (inputConfirm) {
        inputConfirm.classList.remove("input-error");
      }

      if (!valido) {
        if (!actual) {
          showToast("Ingresa tu contraseña actual.", "error");
        } else if (!nueva || nueva.length < 8) {
          showToast(
            "La nueva contraseña debe tener al menos 8 caracteres.",
            "error",
          );
        } else {
          showToast("Las contraseñas no coinciden.", "error");
        }
        const primerError = formPerfilSeguridad.querySelector(".input-error");
        if (primerError) primerError.focus();
        return;
      }

      const saveButton = formPerfilSeguridad.querySelector('[type="submit"]');
      if (saveButton) saveButton.disabled = true;
      try {
        const response = await fetch(
          "http://localhost:3000/api/profile/password",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionUser.token}`,
            },
            body: JSON.stringify({
              currentPassword: actual,
              newPassword: nueva,
            }),
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(
            data.message || "No se pudo actualizar la contraseña.",
          );
        }
        if (inputActual) inputActual.value = "";
        if (inputNueva) inputNueva.value = "";
        if (inputConfirm) inputConfirm.value = "";
        showToast("¡Contraseña actualizada con éxito!", "success");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    });
  }

  // ===================================================
  // 6. DIRECCIONES — AGREGAR / EDITAR / ELIMINAR
  // ===================================================
  const gridDirecciones = document.querySelector(".grid-direcciones");
  const btnAgregarDir = document.querySelector(
    "#vista-direcciones .btn-agregar",
  );
  const formDir = document.getElementById("form-modal-direccion");

  function renderAddresses() {
    if (!gridDirecciones) return;
    gridDirecciones.innerHTML = "";

    if (state.addresses.length === 0) {
      gridDirecciones.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No tienes direcciones registradas. ¡Agrega una nueva!</p>`;
      return;
    }

    state.addresses.forEach((dir) => {
      const card = document.createElement("div");
      card.className = `dir-card ${dir.principal ? "principal" : ""}`;
      card.innerHTML = `
        ${dir.principal ? '<span class="insignia-direccion-principal">Principal</span>' : ""}
        <div class="dir-encabezado">
          <div class="dir-icono ${!dir.principal ? "secundario" : ""}">
            <i class="${dir.iconClass || (dir.tipo === "Trabajo" ? "fi fi-rr-briefcase" : "fi fi-rr-home")}"></i>
          </div>
          <p class="dir-tipo">${dir.tipo}</p>
        </div>
        <p class="dir-nombre">${dir.nombre}</p>
        <p class="dir-detalle">${dir.detalle.replace(/,/g, "<br/>")}</p>
        <p class="dir-telefono"><i class="fi fi-rr-phone-call"></i>${dir.telefono}</p>
        <div class="dir-acciones">
          <button class="btn-dir-editar" data-id="${dir.id}">Editar</button>
          <button class="btn-dir-eliminar" data-id="${dir.id}">Eliminar</button>
        </div>
      `;
      gridDirecciones.appendChild(card);
    });

    // Event listeners botones editar/eliminar
    gridDirecciones.querySelectorAll(".btn-dir-editar").forEach((btn) => {
      btn.addEventListener("click", () => editAddress(btn.dataset.id));
    });

    gridDirecciones.querySelectorAll(".btn-dir-eliminar").forEach((btn) => {
      btn.addEventListener("click", () => deleteAddress(btn.dataset.id));
    });
  }

  if (btnAgregarDir) {
    btnAgregarDir.addEventListener("click", () => {
      document.getElementById("modal-direccion-titulo").innerHTML =
        '<i class="fi fi-rr-marker"></i> Agregar Dirección';
      formDir.reset();
      document.getElementById("dir-edit-id").value = "";
      openModal("modal-direccion");
    });
  }

  function editAddress(id) {
    const dir = state.addresses.find((d) => d.id === id);
    if (!dir) return;

    document.getElementById("modal-direccion-titulo").innerHTML =
      '<i class="fi fi-rr-marker"></i> Editar Dirección';
    document.getElementById("dir-edit-id").value = dir.id;
    document.getElementById("dir-input-tipo").value = dir.tipo;
    document.getElementById("dir-input-nombre").value = dir.nombre;
    document.getElementById("dir-input-detalle").value = dir.detalle;
    document.getElementById("dir-input-telefono").value = dir.telefono;
    document.getElementById("dir-input-principal").checked = dir.principal;

    openModal("modal-direccion");
  }

  function deleteAddress(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta dirección?")) {
      state.addresses = state.addresses.filter((d) => d.id !== id);
      saveState();
      updateUI();
      showToast("Dirección eliminada correctamente.", "info");
    }
  }

  if (formDir) {
    formDir.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateTypedFields(formDir)) return;

      const id = document.getElementById("dir-edit-id").value;
      const tipo = document.getElementById("dir-input-tipo").value;
      const inputNombre = document.getElementById("dir-input-nombre");
      const inputDetalle = document.getElementById("dir-input-detalle");
      const inputTelefono = document.getElementById("dir-input-telefono");
      const nombre = inputNombre.value.trim();
      const detalle = inputDetalle.value.trim();
      const telefono = inputTelefono.value.trim();
      const principal = document.getElementById("dir-input-principal").checked;

      let valido = true;
      if (!nombre) {
        inputNombre.classList.add("input-error");
        valido = false;
      } else {
        inputNombre.classList.remove("input-error");
      }

      if (!detalle) {
        inputDetalle.classList.add("input-error");
        valido = false;
      } else {
        inputDetalle.classList.remove("input-error");
      }

      if (!telefono) {
        inputTelefono.classList.add("input-error");
        valido = false;
      } else {
        inputTelefono.classList.remove("input-error");
      }

      if (!valido) {
        showToast(
          "Por favor completa todos los campos requeridos de la dirección.",
          "error",
        );
        const primerError = formDir.querySelector(".input-error");
        if (primerError) primerError.focus();
        return;
      }

      if (principal) {
        state.addresses.forEach((d) => (d.principal = false));
      }

      if (id) {
        const dir = state.addresses.find((d) => d.id === id);
        if (dir) {
          dir.tipo = tipo;
          dir.nombre = nombre;
          dir.detalle = detalle;
          dir.telefono = telefono;
          dir.principal = principal;
        }
      } else {
        const newDir = {
          id: "dir-" + Date.now(),
          tipo,
          nombre,
          detalle,
          telefono,
          principal: principal || state.addresses.length === 0,
          iconClass:
            tipo === "Trabajo" ? "fi fi-rr-briefcase" : "fi fi-rr-home",
        };
        state.addresses.push(newDir);
      }

      saveState();
      updateUI();
      closeModal("modal-direccion");
      showToast("¡Dirección guardada correctamente!", "success");
    });
  }

  // ===================================================
  // 7. MÉTODOS DE PAGO — TARJETAS Y PAYPAL
  // ===================================================
  const gridTarjetas = document.querySelector(".grid-tarjetas-pago");
  const btnAgregarTarjeta = document.querySelector("#vista-pagos .btn-agregar");
  const formCard = document.getElementById("form-modal-tarjeta");

  function renderCards() {
    if (!gridTarjetas) return;
    gridTarjetas.innerHTML = "";

    if (state.cards.length === 0) {
      gridTarjetas.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No tienes tarjetas guardadas.</p>`;
      return;
    }

    state.cards.forEach((card) => {
      const isVisa = card.tipo === "visa";
      const el = document.createElement("div");
      el.className = `tarjeta-pago ${isVisa ? "visa" : "mastercard"}`;

      el.innerHTML = `
        <div class="tarjeta-deco-1"></div>
        <div class="tarjeta-deco-2"></div>
        <div class="tarjeta-top">
          <div class="tarjeta-info-predeterminada">
            ${card.predeterminada ? '<span class="etiqueta-tarjeta-predeterminada">Predeterminada</span>' : ""}
            <div class="tarjeta-chip ${!isVisa ? "mc" : ""}"></div>
          </div>
          ${
            isVisa
              ? '<span class="tarjeta-visa-logo">VISA</span>'
              : `
            <div class="mc-logo">
              <div class="mc-circulo-rojo"></div>
              <div class="mc-circulo-naranja"></div>
            </div>
          `
          }
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

    gridTarjetas.querySelectorAll(".btn-tarjeta-editar").forEach((btn) => {
      btn.addEventListener("click", () => editCard(btn.dataset.id));
    });

    gridTarjetas.querySelectorAll(".btn-tarjeta-eliminar").forEach((btn) => {
      btn.addEventListener("click", () => deleteCard(btn.dataset.id));
    });
  }

  if (btnAgregarTarjeta) {
    btnAgregarTarjeta.addEventListener("click", () => {
      document.getElementById("modal-tarjeta-titulo").innerHTML =
        '<i class="fi fi-rr-credit-card"></i> Agregar Tarjeta de Pago';
      formCard.reset();
      document.getElementById("card-edit-id").value = "";
      openModal("modal-tarjeta");
    });
  }

  function editCard(id) {
    const card = state.cards.find((c) => c.id === id);
    if (!card) return;

    document.getElementById("modal-tarjeta-titulo").innerHTML =
      '<i class="fi fi-rr-credit-card"></i> Editar Tarjeta';
    document.getElementById("card-edit-id").value = card.id;
    document.getElementById("card-input-tipo").value = card.tipo;
    document.getElementById("card-input-numero").value =
      card.rawNumero || card.numero;
    document.getElementById("card-input-titular").value = card.titular;
    document.getElementById("card-input-vence").value = card.vence;
    document.getElementById("card-input-predeterminada").checked =
      card.predeterminada;

    openModal("modal-tarjeta");
  }

  function deleteCard(id) {
    if (confirm("¿Deseas eliminar esta tarjeta?")) {
      state.cards = state.cards.filter((c) => c.id !== id);
      saveState();
      updateUI();
      showToast("Tarjeta eliminada correctamente.", "info");
    }
  }

  if (formCard) {
    formCard.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateTypedFields(formCard)) return;

      const id = document.getElementById("card-edit-id").value;
      const tipo = document.getElementById("card-input-tipo").value;
      const inputNumero = document.getElementById("card-input-numero");
      const inputTitular = document.getElementById("card-input-titular");
      const inputVence = document.getElementById("card-input-vence");
      const inputCvc = document.getElementById("card-input-cvc");
      const rawNumero = inputNumero ? inputNumero.value.trim() : "";
      const titular = inputTitular
        ? inputTitular.value.trim().toUpperCase()
        : "";
      const vence = inputVence ? inputVence.value.trim() : "";
      const cvc = inputCvc ? inputCvc.value.trim() : "";
      const predeterminada = document.getElementById(
        "card-input-predeterminada",
      ).checked;

      let valido = true;
      if (!rawNumero) {
        if (inputNumero) inputNumero.classList.add("input-error");
        valido = false;
      } else if (inputNumero) {
        inputNumero.classList.remove("input-error");
      }

      if (!titular) {
        if (inputTitular) inputTitular.classList.add("input-error");
        valido = false;
      } else if (inputTitular) {
        inputTitular.classList.remove("input-error");
      }

      if (!vence) {
        if (inputVence) inputVence.classList.add("input-error");
        valido = false;
      } else if (inputVence) {
        inputVence.classList.remove("input-error");
      }

      if (!cvc) {
        if (inputCvc) inputCvc.classList.add("input-error");
        valido = false;
      } else if (inputCvc) {
        inputCvc.classList.remove("input-error");
      }

      if (!valido) {
        showToast(
          "Por favor completa todos los campos de la tarjeta.",
          "error",
        );
        const primerError = formCard.querySelector(".input-error");
        if (primerError) primerError.focus();
        return;
      }

      const maskedNumero =
        rawNumero.length >= 4
          ? `•••• •••• •••• ${rawNumero.slice(-4)}`
          : rawNumero;

      if (predeterminada) {
        state.cards.forEach((c) => (c.predeterminada = false));
      }

      if (id) {
        const card = state.cards.find((c) => c.id === id);
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
          id: "card-" + Date.now(),
          tipo,
          numero: maskedNumero,
          rawNumero,
          titular,
          vence,
          predeterminada: predeterminada || state.cards.length === 0,
        });
      }

      saveState();
      updateUI();
      closeModal("modal-tarjeta");
      showToast("¡Tarjeta guardada con éxito!", "success");
    });
  }

  // ===================================================
  // 8. FAVORITOS — AGREGAR AL CARRITO / QUITAR
  // ===================================================
  const gridFavoritos = document.querySelector(".grid-favoritos");

  function renderFavorites() {
    if (!gridFavoritos) return;
    gridFavoritos.innerHTML = "";

    if (state.favorites.length === 0) {
      gridFavoritos.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fi fi-rr-heart" style="font-size: 40px; display: block; margin-bottom: 10px; color: var(--yellow-hover);"></i>
        Tu lista de favoritos está vacía.
      </div>`;
      return;
    }

    state.favorites.forEach((fav) => {
      const card = document.createElement("div");
      card.className = "fav-card";
      card.innerHTML = `
        ${
          fav.isEmojiHolder
            ? `
          <div class="fav-img-emoji">
            <i class="${fav.iconClass}"></i>
            <button class="btn-fav-quitar" data-id="${fav.id}" title="Quitar de favoritos"><i class="fi fi-sr-heart"></i></button>
          </div>
        `
            : `
          <div class="fav-img-wrap">
            <img src="${fav.img}" alt="${fav.nombre}" />
            <button class="btn-fav-quitar" data-id="${fav.id}" title="Quitar de favoritos"><i class="fi fi-sr-heart"></i></button>
            ${fav.badge ? `<span class="${fav.badgeClass || "insignia-descuento-favorito"}">${fav.badge}</span>` : ""}
          </div>
        `
        }
        <div class="fav-body">
          <p class="fav-categoria">${fav.categoria}</p>
          <p class="fav-nombre">${fav.nombre}</p>
          <div class="fav-precios">
            <p class="fav-precio-actual">${fav.precioActual}</p>
            ${fav.precioTachado ? `<p class="fav-precio-tachado">${fav.precioTachado}</p>` : ""}
          </div>
          <button class="btn-fav-carrito" data-name="${fav.nombre}">Agregar al carrito</button>
        </div>
      `;
      gridFavoritos.appendChild(card);
    });

    // Botones quitar
    gridFavoritos.querySelectorAll(".btn-fav-quitar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        removeFavorite(btn.dataset.id, btn.closest(".fav-card"));
      });
    });

    // Botones agregar al carrito
    gridFavoritos.querySelectorAll(".btn-fav-carrito").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        state.cartCount = (state.cartCount || 0) + 1;
        saveState();
        updateUI();
        showToast(`¡"${btn.dataset.name}" fue agregado al carrito!`, "success");
      });
    });
  }

  function removeFavorite(id, cardElement) {
    if (cardElement) {
      cardElement.style.transition = "opacity 0.3s, transform 0.3s";
      cardElement.style.opacity = "0";
      cardElement.style.transform = "scale(0.9)";
    }

    setTimeout(() => {
      state.favorites = state.favorites.filter((f) => f.id !== id);
      saveState();
      updateUI();
      showToast("Producto eliminado de favoritos.", "info");
    }, 300);
  }

  // ===================================================
  // 9. MIS PEDIDOS & FILTROS DE ESTADO
  // ===================================================
  const listaPedidos = document.getElementById("lista-pedidos");
  let filtroPedidoActual = "todos";
  const formatCOP = (amount) =>
    "$" + Math.round(Number(amount) || 0).toLocaleString("es-CO") + " COP";
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function renderOrders() {
    if (!listaPedidos) return;
    if (ordersLoading) {
      listaPedidos.innerHTML =
        '<p class="pedidos-mensaje" role="status">Cargando tus pedidos...</p>';
      return;
    }
    if (ordersLoadError) {
      listaPedidos.innerHTML =
        `<p class="pedidos-mensaje" role="alert">${escapeHtml(ordersLoadError)}</p>`;
      return;
    }
    if (state.orders.length === 0) {
      listaPedidos.innerHTML =
        '<p class="pedidos-mensaje">Aún no tienes compras registradas.</p>';
      return;
    }

    const filteredOrders = state.orders.filter(
      (order) =>
        filtroPedidoActual === "todos" ||
        order.status === filtroPedidoActual,
    );
    if (filteredOrders.length === 0) {
      listaPedidos.innerHTML =
        '<p class="pedidos-mensaje">No tienes pedidos con ese estado.</p>';
      return;
    }

    listaPedidos.innerHTML = filteredOrders
      .map((order) => {
        const status =
          order.status === "PAGADA"
            ? {
                label: "Pago confirmado",
                icon: "fi-rr-check",
                className: "insignia-entregado",
              }
            : order.status === "ANULADA"
              ? {
                  label: "Anulado",
                  icon: "fi-rr-cross-circle",
                  className: "insignia-anulado",
                }
              : {
                  label: order.status || "Pendiente",
                  icon: "fi-rr-clock",
                  className: "insignia-procesando",
                };
        const firstItem = order.items[0];
        const productSummary = firstItem
          ? `${escapeHtml(firstItem.name)}${order.items.length > 1 ? ` y ${order.items.length - 1} producto(s) más` : ""}`
          : "Pedido sin productos";
        const date = order.createdAt ? new Date(order.createdAt) : null;
        const dateLabel = !date || Number.isNaN(date.getTime())
          ? "Fecha no disponible"
          : `Realizado el ${new Intl.DateTimeFormat("es-CO", {
              dateStyle: "long",
            }).format(date)}`;
        const imageMarkup = firstItem?.imageUrl
          ? `<div class="pedido-img"><img src="${escapeHtml(firstItem.imageUrl)}" alt="${escapeHtml(firstItem.name)}" onerror="this.src='../Assets/lenovolegion.webp'"></div>`
          : '<div class="pedido-img-emoji"><i class="fi fi-rr-box"></i></div>';

        return `
          <article class="pedido-card" data-order-id="${escapeHtml(order.id)}">
            <div class="pedido-header">
              <div>
                <p class="pedido-numero">Pedido #<b>${escapeHtml(order.number)}</b></p>
                <p class="pedido-fecha">${dateLabel}</p>
              </div>
              <span class="${status.className}">
                <i class="fi ${status.icon}" aria-hidden="true"></i> ${status.label}
              </span>
            </div>
            <div class="pedido-cuerpo">
              ${imageMarkup}
              <div class="pedido-info">
                <p class="pedido-producto">${productSummary}</p>
                <p class="pedido-cantidad">
                  Cantidad: ${Number(order.itemCount)} &nbsp;|&nbsp; ${formatCOP(order.total)}
                </p>
              </div>
              <div class="pedido-btns">
                <button class="btn-ver-detalle" type="button" data-order-id="${escapeHtml(order.id)}">
                  Ver detalle
                </button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  const filtroBtns = document.querySelectorAll(".filtros-pedidos button");
  filtroBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filtroPedidoActual = btn.dataset.pedidoFiltro || "todos";
      filtroBtns.forEach((filterButton) => {
        filterButton.className =
          filterButton === btn ? "btn-filtro-activo" : "btn-filtro";
      });
      renderOrders();
    });
  });

  listaPedidos?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const detailButton = event.target.closest(".btn-ver-detalle");
    if (!detailButton) return;
    const order = state.orders.find(
      (item) => String(item.id) === detailButton.dataset.orderId,
    );
    if (order) mostrarModalDetallePedido(order);
  });

  function mostrarModalDetallePedido(order) {
    document.getElementById("det-pedido-num").textContent = `#${order.number}`;
    const contenido = document.getElementById("det-pedido-contenido");
    const paymentMethods = {
      TARJETA: "Tarjeta débito o crédito",
      TRANSFERENCIA: "Transferencia bancaria",
      EFECTIVO: "Efectivo",
    };
    const statusLabels = {
      PAGADA: "Pago confirmado",
      ANULADA: "Anulado",
    };
    contenido.innerHTML = `
      <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Estado: <b>${escapeHtml(statusLabels[order.status] || order.status)}</b></p>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Método de pago: <b>${escapeHtml(paymentMethods[order.paymentMethod] || order.paymentMethod || "No registrado")}</b></p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1.5px solid var(--border); text-align: left; color: var(--text-muted);">
            <th style="padding: 8px 0;">Producto</th>
            <th style="padding: 8px 0; text-align: right;">Cantidad</th>
            <th style="padding: 8px 0; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${order.items
          .map(
            (item) => `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px 8px 12px 0;">${escapeHtml(item.name)}</td>
                <td style="padding: 12px 0; text-align: right;">${Number(item.quantity)}</td>
                <td style="padding: 12px 0 12px 8px; text-align: right; font-weight: 700;">${formatCOP(item.subtotal)}</td>
              </tr>`,
          )
          .join("")}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px 0; font-weight: 700;">Total</td>
            <td style="padding: 12px 0; text-align: right; font-weight: 700;">${formatCOP(order.total)}</td>
          </tr>
        </tfoot>
      </table>
    `;

    openModal("modal-pedido-detalle");
  }

  const btnImprimirFactura = document.getElementById("btn-imprimir-factura");
  if (btnImprimirFactura) {
    btnImprimirFactura.addEventListener("click", () => {
      showToast("Generando vista de impresión de la factura...", "info");
      setTimeout(() => window.print(), 800);
    });
  }

  // ===================================================
  // 10. SIGUE TU PEDIDO (SEGUIMIENTO)
  // ===================================================
  const btnRastrearBuscar = document.querySelector(".btn-rastrear-buscar");
  const inputSeguimiento = document.querySelector(".seguimiento-input");

  function buscarSeguimiento(guia) {
    const term = (guia || inputSeguimiento?.value || "").trim().toUpperCase();
    if (!term) {
      showToast("Por favor ingresa un número de pedido.", "error");
      return;
    }

    const orderFound = state.orders.find((order) => {
      const orderNumber = String(order.number || "").toUpperCase();
      return orderNumber === term || term.includes(orderNumber);
    });

    const pedNumEl = document.querySelector(".seguimiento-pedido-num b");
    const estimadoEl = document.querySelector(".seguimiento-estimado b");
    const estadoEl = document.getElementById("estado-seguimiento");
    const detalleEl = document.getElementById("detalle-seguimiento");

    if (orderFound) {
      if (pedNumEl) pedNumEl.textContent = `#${orderFound.number}`;
      const statusLabel =
        orderFound.status === "PAGADA"
          ? "Pago confirmado"
          : orderFound.status === "ANULADA"
            ? "Anulado"
            : orderFound.status || "Pendiente";
      if (estadoEl) {
        estadoEl.textContent = statusLabel;
        estadoEl.className =
          orderFound.status === "PAGADA"
            ? "insignia-entregado"
            : orderFound.status === "ANULADA"
              ? "insignia-anulado"
              : "insignia-procesando";
      }
      if (estimadoEl) {
        estimadoEl.textContent = orderFound.trackingNumber || "Sin asignar";
      }
      if (detalleEl) {
        detalleEl.textContent =
          "No hay eventos de envío registrados para este pedido todavía.";
      }
      if (!orderFound.trackingNumber) {
        showToast(
          `El pedido #${orderFound.number} aún no tiene una guía de envío registrada.`,
          "info",
        );
        return;
      }
      showToast(
        `Guía registrada para el pedido #${orderFound.number}: ${orderFound.trackingNumber}`,
        "success",
      );
    } else {
      if (pedNumEl) pedNumEl.textContent = `#${term}`;
      if (estadoEl) {
        estadoEl.textContent = "No encontrado";
        estadoEl.className = "insignia-procesando";
      }
      if (estimadoEl) estimadoEl.textContent = "Sin asignar";
      if (detalleEl) {
        detalleEl.textContent = "No encontramos ese pedido en tu historial.";
      }
      showToast("No encontramos ese pedido en tu historial.", "error");
    }
  }

  if (btnRastrearBuscar) {
    btnRastrearBuscar.addEventListener("click", () => buscarSeguimiento());
  }

  if (inputSeguimiento) {
    inputSeguimiento.addEventListener("keyup", (e) => {
      if (e.key === "Enter") buscarSeguimiento();
    });
  }

  const btnTransportadora = document.querySelector(".btn-transportadora");
  if (btnTransportadora) {
    btnTransportadora.addEventListener("click", () => {
      showToast(
        "El seguimiento externo no está disponible todavía.",
        "info",
      );
    });
  }

  // ===================================================
  // 11. FACTURA — DESCARGAS PDF Y LOTES
  // ===================================================
  const btnsDescargarPdf = document.querySelectorAll(".btn-descargar-pdf");
  const btnDescargarTodas = document.querySelector(".btn-descargar-todas");

  btnsDescargarPdf.forEach((btn) => {
    btn.addEventListener("click", () => {
      const fila = btn.closest(".tabla-fila");
      const numFac = fila
        ? fila.querySelector(".factura-num")?.textContent
        : "#FAC-2026";
      showToast(`Descargando factura ${numFac}.pdf...`, "success");
    });
  });

  if (btnDescargarTodas) {
    btnDescargarTodas.addEventListener("click", () => {
      showToast("Generando archivo ZIP con todas tus facturas...", "success");
    });
  }

  // ===================================================
  // 12. CERRAR SESIÓN
  // ===================================================
  const btnLogout = document.querySelector(".elemento-nav.logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
        showToast("Cerrando sesión...", "info");
        try {
          await fetch("http://localhost:3000/api/session", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionUser.token}` },
          });
        } catch (error) {}
        sessionStorage.removeItem("wiiu_usuario_activo");
        window.location.href = "Login.html";
      }
    });
  }

  try {
    await loadProfileFromDatabase();
  } catch (error) {
    showToast(error.message, "error");
  }

  try {
    await loadOrdersFromDatabase();
  } catch (error) {
    ordersLoadError = error.message || "No se pudieron cargar tus pedidos.";
    showToast(ordersLoadError, "error");
  } finally {
    ordersLoading = false;
  }

  // Inicializar interfaz completa
  updateUI();
  if (new URLSearchParams(window.location.search).get("view") === "garantias") {
    activarVista("vista-garantias", "nav-garantias");
  }
});
