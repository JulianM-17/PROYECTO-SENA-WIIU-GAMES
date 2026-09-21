/**
 * Validación y Manejo del Formulario de Agendar Cita
 * WiiU-Games
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-cita") || document.querySelector(".formulario");
  if (!form) return;

  const nombreInput = document.getElementById("nombre");
  const equipoInput = document.getElementById("equipo") || document.getElementById("email");
  const telefonoInput = document.getElementById("telefono");
  const fechaInput = document.getElementById("fecha");
  const servicioInput = document.getElementById("servicio");

  // Configurar fecha mínima permitida (Hoy)
  if (fechaInput) {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    fechaInput.min = `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Muestra mensaje de error en un campo
   */
  function mostrarError(input, mensaje) {
    const campo = input.closest(".campo");
    if (!campo) return;
    campo.classList.add("campo-invalido");
    campo.classList.remove("campo-valido");

    let errorSpan = campo.querySelector(".error-mensaje");
    if (!errorSpan) {
      errorSpan = document.createElement("span");
      errorSpan.className = "error-mensaje";
      campo.appendChild(errorSpan);
    }
    errorSpan.textContent = mensaje;
  }

  /**
   * Limpia mensaje de error en un campo
   */
  function limpiarError(input) {
    const campo = input.closest(".campo");
    if (!campo) return;
    campo.classList.remove("campo-invalido");
    const errorSpan = campo.querySelector(".error-mensaje");
    if (errorSpan) {
      errorSpan.textContent = "";
    }
  }

  /**
   * Marca campo como válido
   */
  function marcarValido(input) {
    const campo = input.closest(".campo");
    if (!campo) return;
    campo.classList.remove("campo-invalido");
    campo.classList.add("campo-valido");
    const errorSpan = campo.querySelector(".error-mensaje");
    if (errorSpan) {
      errorSpan.textContent = "";
    }
  }

  // ============================================================
  // 1. CAMPO NOMBRE: NO PERMITIR NÚMEROS NI SÍMBOLOS
  // ============================================================
  if (nombreInput) {
    // Bloqueo directo en keypress para teclas numéricas
    nombreInput.addEventListener("keypress", (e) => {
      // Permitir teclas de control (BackSpace, Tab, Enter, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;

      // Si es un número o símbolo no permitido, prevenir tipeo
      const esLetraOEspacio = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]$/.test(e.key);
      if (!esLetraOEspacio) {
        e.preventDefault();
        mostrarError(nombreInput, "No se permiten números ni caracteres especiales en el nombre.");
        setTimeout(() => {
          if (nombreInput.value.trim().length >= 3) {
            limpiarError(nombreInput);
          }
        }, 1800);
      }
    });

    // Filtro inmediato en input (cubre autocompletado y dictado)
    nombreInput.addEventListener("input", () => {
      const valorLimpio = nombreInput.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, "");
      if (nombreInput.value !== valorLimpio) {
        nombreInput.value = valorLimpio;
        mostrarError(nombreInput, "Solo se admiten letras y espacios.");
      } else if (valorLimpio.trim().length >= 3) {
        marcarValido(nombreInput);
      } else {
        limpiarError(nombreInput);
      }
    });

    // Control al pegar texto
    nombreInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const textoPegado = (e.clipboardData || window.clipboardData).getData("text");
      const textoFiltrado = textoPegado.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, "");
      document.execCommand("insertText", false, textoFiltrado);
      if (textoPegado !== textoFiltrado) {
        mostrarError(nombreInput, "Se eliminaron números o símbolos no válidos del texto pegado.");
      }
    });

    nombreInput.addEventListener("blur", () => {
      const val = nombreInput.value.trim();
      if (!val) {
        mostrarError(nombreInput, "El nombre es obligatorio.");
      } else if (val.length < 3) {
        mostrarError(nombreInput, "El nombre debe tener al menos 3 caracteres.");
      } else {
        marcarValido(nombreInput);
      }
    });
  }

  // ============================================================
  // 2. CAMPO EQUIPO / DISPOSITIVO: NO CARACTERES DAÑINOS
  // ============================================================
  if (equipoInput) {
    equipoInput.addEventListener("input", () => {
      const valorLimpio = equipoInput.value.replace(/[<>{}%$~|\\]/g, "");
      if (equipoInput.value !== valorLimpio) {
        equipoInput.value = valorLimpio;
        mostrarError(equipoInput, "No se permiten símbolos especiales como < > { } % $ ~ |");
      } else if (valorLimpio.trim().length >= 2) {
        marcarValido(equipoInput);
      } else {
        limpiarError(equipoInput);
      }
    });

    equipoInput.addEventListener("blur", () => {
      const val = equipoInput.value.trim();
      if (!val) {
        mostrarError(equipoInput, "Debes ingresar el nombre del equipo.");
      } else if (val.length < 2) {
        mostrarError(equipoInput, "Nombre de equipo muy corto.");
      } else {
        marcarValido(equipoInput);
      }
    });
  }

  // ============================================================
  // 3. CAMPO TELÉFONO: SOLO NÚMEROS (10 DÍGITOS)
  // ============================================================
  if (telefonoInput) {
    // Bloqueo directo de cualquier tecla no numérica
    telefonoInput.addEventListener("keypress", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        mostrarError(telefonoInput, "Solo puedes ingresar números en el teléfono.");
        setTimeout(() => limpiarError(telefonoInput), 1800);
      }
    });

    telefonoInput.addEventListener("input", () => {
      const soloNumeros = telefonoInput.value.replace(/\D/g, "").slice(0, 10);
      if (telefonoInput.value !== soloNumeros) {
        telefonoInput.value = soloNumeros;
      }
      if (soloNumeros.length === 10) {
        marcarValido(telefonoInput);
      } else {
        limpiarError(telefonoInput);
      }
    });

    telefonoInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const pegado = (e.clipboardData || window.clipboardData).getData("text");
      const soloNums = pegado.replace(/\D/g, "").slice(0, 10);
      telefonoInput.value = soloNums;
      if (soloNums.length === 10) {
        marcarValido(telefonoInput);
      } else {
        mostrarError(telefonoInput, "Ingresa un número de 10 dígitos.");
      }
    });

    telefonoInput.addEventListener("blur", () => {
      const val = telefonoInput.value.trim();
      if (!val) {
        mostrarError(telefonoInput, "El número de teléfono es obligatorio.");
      } else if (val.length !== 10) {
        mostrarError(telefonoInput, "El teléfono debe contener exactamente 10 dígitos (ej: 3046616081).");
      } else {
        marcarValido(telefonoInput);
      }
    });
  }

  // ============================================================
  // 4. CAMPO FECHA: NO PERMITIR FECHAS PASADAS
  // ============================================================
  if (fechaInput) {
    fechaInput.addEventListener("change", () => {
      if (!fechaInput.value) {
        mostrarError(fechaInput, "Selecciona una fecha.");
        return;
      }
      const fechaSeleccionada = new Date(fechaInput.value + "T00:00:00");
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaSeleccionada < hoy) {
        mostrarError(fechaInput, "La fecha no puede ser anterior al día de hoy.");
        fechaInput.value = "";
      } else {
        marcarValido(fechaInput);
      }
    });
  }

  // ============================================================
  // 5. CAMPO SERVICIO: DEBE SELECCIONAR UNA OPCIÓN VÁLIDA
  // ============================================================
  if (servicioInput) {
    servicioInput.addEventListener("change", () => {
      if (!servicioInput.value || servicioInput.value === "") {
        mostrarError(servicioInput, "Debes seleccionar un tipo de servicio.");
      } else {
        marcarValido(servicioInput);
      }
    });
  }

  // ============================================================
  // ENVÍO DEL FORMULARIO
  // ============================================================
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let esValido = true;

    // Validar Nombre
    const nombre = nombreInput ? nombreInput.value.trim() : "";
    if (!nombre) {
      mostrarError(nombreInput, "El nombre es obligatorio.");
      esValido = false;
    } else if (nombre.length < 3) {
      mostrarError(nombreInput, "El nombre debe tener al menos 3 caracteres.");
      esValido = false;
    } else if (/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/.test(nombre)) {
      mostrarError(nombreInput, "No se permiten números ni caracteres especiales.");
      esValido = false;
    }

    // Validar Equipo
    const equipo = equipoInput ? equipoInput.value.trim() : "";
    if (!equipo) {
      mostrarError(equipoInput, "Debes ingresar el nombre del equipo.");
      esValido = false;
    } else if (equipo.length < 2) {
      mostrarError(equipoInput, "El nombre del equipo es demasiado corto.");
      esValido = false;
    }

    // Validar Teléfono
    const tel = telefonoInput ? telefonoInput.value.trim() : "";
    if (!tel) {
      mostrarError(telefonoInput, "El teléfono es obligatorio.");
      esValido = false;
    } else if (!/^\d{10}$/.test(tel)) {
      mostrarError(telefonoInput, "El teléfono debe tener 10 dígitos numéricos.");
      esValido = false;
    }

    // Validar Fecha
    if (!fechaInput || !fechaInput.value) {
      mostrarError(fechaInput, "Debes seleccionar una fecha para la cita.");
      esValido = false;
    } else {
      const fechaSel = new Date(fechaInput.value + "T00:00:00");
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaSel < hoy) {
        mostrarError(fechaInput, "La fecha no puede ser anterior al día de hoy.");
        esValido = false;
      }
    }

    // Validar Servicio
    if (!servicioInput || !servicioInput.value) {
      mostrarError(servicioInput, "Debes seleccionar un servicio.");
      esValido = false;
    }

    if (!esValido) {
      const primerError = form.querySelector(".campo-invalido input, .campo-invalido select");
      if (primerError) primerError.focus();
      return;
    }

    // Si todo es válido: Mostrar confirmación exitosa
    mostrarModalExito({
      nombre,
      equipo,
      telefono: tel,
      fecha: fechaInput.value,
      servicio: servicioInput.value
    });

    form.reset();
    document.querySelectorAll(".campo-valido").forEach((c) => c.classList.remove("campo-valido"));
  });

  /**
   * Modal elegante de confirmación
   */
  function mostrarModalExito(datos) {
    const modalExistente = document.getElementById("modal-confirmacion-cita");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modal-confirmacion-cita";
    overlay.className = "modal-overlay-a11y";
    overlay.innerHTML = `
      <div class="modal-tarjeta-exito">
        <div class="icono-check-exito">✓</div>
        <h2>¡Cita Agendada con Éxito!</h2>
        <p>Tu solicitud ha sido registrada correctamente en nuestro sistema de taller.</p>
        <div class="detalles-resumen-cita">
          <div><strong>Cliente:</strong> ${escapeHTML(datos.nombre)}</div>
          <div><strong>Equipo:</strong> ${escapeHTML(datos.equipo)}</div>
          <div><strong>Teléfono:</strong> ${escapeHTML(datos.telefono)}</div>
          <div><strong>Fecha:</strong> ${escapeHTML(datos.fecha)}</div>
          <div><strong>Servicio:</strong> ${escapeHTML(datos.servicio)}</div>
        </div>
        <button type="button" class="btn-cerrar-modal" id="btnCerrarModalCita">Entendido</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#btnCerrarModalCita").addEventListener("click", () => {
      overlay.remove();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
