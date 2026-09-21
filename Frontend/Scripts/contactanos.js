/**
 * Validación y Manejo del Formulario de Contáctanos
 * WiiU-Games
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-contacto") || document.querySelector(".formulario-cita .formulario");
  if (!form) return;

  const nombreInput = document.getElementById("nombre");
  const emailInput = document.getElementById("email");
  const telefonoInput = document.getElementById("telefono");
  const consultaTextarea = document.getElementById("consulta");

  /**
   * Muestra mensaje de error en un campo y resalta con borde rojo
   */
  function mostrarError(input, mensaje) {
    if (!input) return;
    const contenedor = input.closest(".campo") || input.closest(".consulta");
    if (!contenedor) return;
    contenedor.classList.add("campo-invalido");
    contenedor.classList.remove("campo-valido");

    let errorSpan = contenedor.querySelector(".error-mensaje");
    if (!errorSpan) {
      errorSpan = document.createElement("span");
      errorSpan.className = "error-mensaje";
      contenedor.appendChild(errorSpan);
    }
    errorSpan.textContent = mensaje;
  }

  /**
   * Limpia mensaje de error en un campo
   */
  function limpiarError(input) {
    if (!input) return;
    const contenedor = input.closest(".campo") || input.closest(".consulta");
    if (!contenedor) return;
    contenedor.classList.remove("campo-invalido");
    const errorSpan = contenedor.querySelector(".error-mensaje");
    if (errorSpan) {
      errorSpan.textContent = "";
    }
  }

  /**
   * Marca campo como válido
   */
  function marcarValido(input) {
    if (!input) return;
    const contenedor = input.closest(".campo") || input.closest(".consulta");
    if (!contenedor) return;
    contenedor.classList.remove("campo-invalido");
    contenedor.classList.add("campo-valido");
    const errorSpan = contenedor.querySelector(".error-mensaje");
    if (errorSpan) {
      errorSpan.textContent = "";
    }
  }

  // 1. CAMPO NOMBRE
  if (nombreInput) {
    nombreInput.addEventListener("input", () => {
      const val = nombreInput.value.trim();
      if (val.length >= 2) {
        marcarValido(nombreInput);
      } else {
        limpiarError(nombreInput);
      }
    });

    nombreInput.addEventListener("blur", () => {
      const val = nombreInput.value.trim();
      if (!val) {
        mostrarError(nombreInput, "El nombre es obligatorio.");
      } else if (val.length < 2) {
        mostrarError(nombreInput, "El nombre debe contener al menos 2 letras.");
      } else {
        marcarValido(nombreInput);
      }
    });
  }

  // 2. CAMPO CORREO
  if (emailInput) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    emailInput.addEventListener("input", () => {
      const val = emailInput.value.trim();
      if (regexEmail.test(val)) {
        marcarValido(emailInput);
      } else {
        limpiarError(emailInput);
      }
    });

    emailInput.addEventListener("blur", () => {
      const val = emailInput.value.trim();
      if (!val) {
        mostrarError(emailInput, "El correo electrónico es obligatorio.");
      } else if (!regexEmail.test(val)) {
        mostrarError(emailInput, "Ingresa un correo electrónico válido (ej: usuario@gmail.com).");
      } else {
        marcarValido(emailInput);
      }
    });
  }

  // 3. CAMPO TELÉFONO
  if (telefonoInput) {
    telefonoInput.addEventListener("keypress", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        mostrarError(telefonoInput, "Solo se admiten números.");
        setTimeout(() => limpiarError(telefonoInput), 1800);
      }
    });

    telefonoInput.addEventListener("input", () => {
      const soloNums = telefonoInput.value.replace(/\D/g, "").slice(0, 10);
      if (telefonoInput.value !== soloNums) {
        telefonoInput.value = soloNums;
      }
      if (soloNums.length === 10) {
        marcarValido(telefonoInput);
      } else {
        limpiarError(telefonoInput);
      }
    });

    telefonoInput.addEventListener("blur", () => {
      const val = telefonoInput.value.trim();
      if (!val) {
        mostrarError(telefonoInput, "El teléfono es obligatorio.");
      } else if (val.length < 7) {
        mostrarError(telefonoInput, "Ingresa un teléfono válido de al menos 7 dígitos.");
      } else {
        marcarValido(telefonoInput);
      }
    });
  }

  // 4. CAMPO CONSULTA
  if (consultaTextarea) {
    consultaTextarea.addEventListener("input", () => {
      const val = consultaTextarea.value.trim();
      if (val.length >= 10) {
        marcarValido(consultaTextarea);
      } else {
        limpiarError(consultaTextarea);
      }
    });

    consultaTextarea.addEventListener("blur", () => {
      const val = consultaTextarea.value.trim();
      if (!val) {
        mostrarError(consultaTextarea, "Por favor ingresa tu consulta.");
      } else if (val.length < 10) {
        mostrarError(consultaTextarea, "La consulta debe tener al menos 10 caracteres.");
      } else {
        marcarValido(consultaTextarea);
      }
    });
  }

  // ENVÍO DEL FORMULARIO
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let esValido = true;

    // Validar nombre
    const nombre = nombreInput ? nombreInput.value.trim() : "";
    if (!nombre) {
      mostrarError(nombreInput, "El nombre es obligatorio.");
      esValido = false;
    } else if (nombre.length < 2) {
      mostrarError(nombreInput, "El nombre debe contener al menos 2 letras.");
      esValido = false;
    }

    // Validar email
    const email = emailInput ? emailInput.value.trim() : "";
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      mostrarError(emailInput, "El correo electrónico es obligatorio.");
      esValido = false;
    } else if (!regexEmail.test(email)) {
      mostrarError(emailInput, "Ingresa un correo electrónico válido.");
      esValido = false;
    }

    // Validar teléfono
    const tel = telefonoInput ? telefonoInput.value.trim() : "";
    if (!tel) {
      mostrarError(telefonoInput, "El teléfono es obligatorio.");
      esValido = false;
    } else if (tel.length < 7) {
      mostrarError(telefonoInput, "Ingresa un teléfono válido.");
      esValido = false;
    }

    // Validar consulta
    const consulta = consultaTextarea ? consultaTextarea.value.trim() : "";
    if (!consulta) {
      mostrarError(consultaTextarea, "Por favor ingresa tu consulta.");
      esValido = false;
    } else if (consulta.length < 10) {
      mostrarError(consultaTextarea, "La consulta debe tener al menos 10 caracteres.");
      esValido = false;
    }

    if (!esValido) {
      const primerError = form.querySelector(".campo-invalido input, .campo-invalido textarea");
      if (primerError) primerError.focus();
      return;
    }

    // Mensaje de éxito
    alert(`¡Muchas gracias ${nombre}! Tu consulta ha sido enviada exitosamente. Te responderemos pronto a ${email}.`);
    form.reset();
    document.querySelectorAll(".campo-valido").forEach((c) => c.classList.remove("campo-valido"));
  });
});
