/**
 * Validación y Manejo del Formulario de Garantías
 * WiiU-Games
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-garantia") || document.querySelector(".formulario");
  if (!form) return;

  const idPedidoInput = document.getElementById("id-pedido");
  const idProductoInput = document.getElementById("id-producto");
  const categoriaSelect = document.getElementById("categoria-producto");
  const consultaTextarea = document.getElementById("consulta");

  /**
   * Muestra mensaje de error en un campo
   */
  function mostrarError(input, mensaje) {
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
    const contenedor = input.closest(".campo") || input.closest(".consulta");
    if (!contenedor) return;
    contenedor.classList.remove("campo-invalido");
    contenedor.classList.add("campo-valido");
    const errorSpan = contenedor.querySelector(".error-mensaje");
    if (errorSpan) {
      errorSpan.textContent = "";
    }
  }

  // ============================================================
  // 1. NÚMERO DE PEDIDO / FACTURA: SOLO DÍGITOS
  // ============================================================
  if (idPedidoInput) {
    // Bloquear teclas no numéricas
    idPedidoInput.addEventListener("keypress", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        mostrarError(idPedidoInput, "El número de pedido solo puede contener números.");
        setTimeout(() => limpiarError(idPedidoInput), 1800);
      }
    });

    idPedidoInput.addEventListener("input", () => {
      const soloNumeros = idPedidoInput.value.replace(/\D/g, "").slice(0, 12);
      if (idPedidoInput.value !== soloNumeros) {
        idPedidoInput.value = soloNumeros;
        mostrarError(idPedidoInput, "Solo se admiten números.");
      } else if (soloNumeros.length >= 1) {
        marcarValido(idPedidoInput);
      } else {
        limpiarError(idPedidoInput);
      }
    });

    idPedidoInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const pegado = (e.clipboardData || window.clipboardData).getData("text");
      const soloNums = pegado.replace(/\D/g, "").slice(0, 12);
      idPedidoInput.value = soloNums;
      if (soloNums.length >= 1) {
        marcarValido(idPedidoInput);
      } else {
        mostrarError(idPedidoInput, "Ingresa un número de pedido válido.");
      }
    });

    idPedidoInput.addEventListener("blur", () => {
      const val = idPedidoInput.value.trim();
      if (!val) {
        mostrarError(idPedidoInput, "El número de pedido o factura es obligatorio.");
      } else if (!/^\d+$/.test(val)) {
        mostrarError(idPedidoInput, "Solo se permiten números.");
      } else {
        marcarValido(idPedidoInput);
      }
    });
  }

  // ============================================================
  // 2. NÚMERO DE SERIE DEL PRODUCTO: ALFANUMÉRICO Y GUIONES
  // ============================================================
  if (idProductoInput) {
    idProductoInput.addEventListener("keypress", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (!/^[a-zA-Z0-9-]$/.test(e.key)) {
        e.preventDefault();
        mostrarError(idProductoInput, "El serial solo admite letras, números y guiones (sin espacios).");
        setTimeout(() => limpiarError(idProductoInput), 1800);
      }
    });

    idProductoInput.addEventListener("input", () => {
      const limpio = idProductoInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 25);
      if (idProductoInput.value !== limpio) {
        idProductoInput.value = limpio;
      }
      if (limpio.length >= 5) {
        marcarValido(idProductoInput);
      } else {
        limpiarError(idProductoInput);
      }
    });

    idProductoInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const pegado = (e.clipboardData || window.clipboardData).getData("text");
      const limpio = pegado.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 25);
      idProductoInput.value = limpio;
      if (limpio.length >= 5) {
        marcarValido(idProductoInput);
      } else {
        mostrarError(idProductoInput, "El serial debe tener al menos 5 caracteres alfanuméricos.");
      }
    });

    idProductoInput.addEventListener("blur", () => {
      const val = idProductoInput.value.trim();
      if (!val) {
        mostrarError(idProductoInput, "El número de serie es obligatorio.");
      } else if (val.length < 5) {
        mostrarError(idProductoInput, "El número de serie debe tener al menos 5 caracteres.");
      } else {
        marcarValido(idProductoInput);
      }
    });
  }

  // ============================================================
  // 3. CATEGORÍA DEL PRODUCTO
  // ============================================================
  if (categoriaSelect) {
    categoriaSelect.addEventListener("change", () => {
      if (!categoriaSelect.value || categoriaSelect.value === "") {
        mostrarError(categoriaSelect, "Debes seleccionar una categoría válida.");
      } else {
        marcarValido(categoriaSelect);
      }
    });
  }

  // ============================================================
  // 4. DESCRIPCIÓN DEL PROBLEMA: MÍNIMO 15 CARACTERES
  // ============================================================
  if (consultaTextarea) {
    consultaTextarea.addEventListener("input", () => {
      const val = consultaTextarea.value.trim();
      if (val.length >= 15) {
        marcarValido(consultaTextarea);
      } else {
        limpiarError(consultaTextarea);
      }
    });

    consultaTextarea.addEventListener("blur", () => {
      const val = consultaTextarea.value.trim();
      if (!val) {
        mostrarError(consultaTextarea, "Debes detallar la falla del producto.");
      } else if (val.length < 15) {
        mostrarError(consultaTextarea, `Descripción muy corta (${val.length}/15 caracteres requeridos).`);
      } else {
        marcarValido(consultaTextarea);
      }
    });
  }

  // ============================================================
  // ENVÍO DEL FORMULARIO DE GARANTÍAS
  // ============================================================
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let esValido = true;

    // Validar Número de Pedido
    const pedido = idPedidoInput ? idPedidoInput.value.trim() : "";
    if (!pedido) {
      mostrarError(idPedidoInput, "El número de pedido es obligatorio.");
      esValido = false;
    } else if (!/^\d+$/.test(pedido)) {
      mostrarError(idPedidoInput, "El número de pedido solo debe contener dígitos.");
      esValido = false;
    }

    // Validar Serial
    const serial = idProductoInput ? idProductoInput.value.trim() : "";
    if (!serial) {
      mostrarError(idProductoInput, "El número de serie es obligatorio.");
      esValido = false;
    } else if (serial.length < 5) {
      mostrarError(idProductoInput, "El serial debe contener al menos 5 caracteres.");
      esValido = false;
    }

    // Validar Categoría
    if (!categoriaSelect || !categoriaSelect.value) {
      mostrarError(categoriaSelect, "Debes seleccionar una categoría de producto.");
      esValido = false;
    }

    // Validar Descripción
    const consulta = consultaTextarea ? consultaTextarea.value.trim() : "";
    if (!consulta) {
      mostrarError(consultaTextarea, "La descripción del problema es obligatoria.");
      esValido = false;
    } else if (consulta.length < 15) {
      mostrarError(consultaTextarea, "Por favor describe el problema con al menos 15 caracteres.");
      esValido = false;
    }

    if (!esValido) {
      const primerError = form.querySelector(".campo-invalido input, .campo-invalido select, .campo-invalido textarea");
      if (primerError) primerError.focus();
      return;
    }

    // Generar Ticket de Garantía ficticio
    const ticketId = "GAR-" + Math.floor(100000 + Math.random() * 900000);

    mostrarModalExitoGarantia({
      ticket: ticketId,
      pedido,
      serial,
      categoria: categoriaSelect.value,
      descripcion: consulta
    });

    form.reset();
    document.querySelectorAll(".campo-valido").forEach((c) => c.classList.remove("campo-valido"));
  });

  /**
   * Modal de confirmación para garantía
   */
  function mostrarModalExitoGarantia(datos) {
    const modalExistente = document.getElementById("modal-confirmacion-garantia");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modal-confirmacion-garantia";
    overlay.className = "modal-overlay-a11y";
    overlay.innerHTML = `
      <div class="modal-tarjeta-exito">
        <div class="icono-check-exito">🛡️</div>
        <h2>¡Garantía Registrada con Éxito!</h2>
        <p>Tu solicitud de garantía ha sido recibida y se encuentra en estado de revisión técnica.</p>
        <div class="detalles-resumen-cita">
          <div><strong>Ticket ID:</strong> <span style="color:#0077FF; font-weight:800;">${datos.ticket}</span></div>
          <div><strong>Pedido/Factura:</strong> ${escapeHTML(datos.pedido)}</div>
          <div><strong>Serial Producto:</strong> ${escapeHTML(datos.serial)}</div>
          <div><strong>Categoría:</strong> ${escapeHTML(datos.categoria)}</div>
          <div><strong>Estado:</strong> En proceso de revisión</div>
        </div>
        <button type="button" class="btn-cerrar-modal" id="btnCerrarModalGarantia">Aceptar</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#btnCerrarModalGarantia").addEventListener("click", () => {
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
