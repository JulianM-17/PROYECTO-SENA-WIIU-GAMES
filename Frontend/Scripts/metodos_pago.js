document.addEventListener("DOMContentLoaded", () => {
  let usuarioActivo;
  try {
    usuarioActivo = JSON.parse(
      sessionStorage.getItem("wiiu_usuario_activo") || "null",
    );
  } catch (error) {
    console.error("No se pudo validar la sesión del usuario:", error);
  }

  if (!usuarioActivo?.token) {
    window.location.replace("Login.html?returnTo=metodos_pago.html");
    return;
  }

  const cart = window.WiiUGamesCart.read();
  if (cart.length === 0) {
    window.location.replace("carrito.html");
    return;
  }

  const formatCOP = (amount) =>
    "$" + Math.round(amount).toLocaleString("es-CO") + " COP";
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
  const shipping = 25000;
  const taxes = subtotal * 0.19;
  const serviceFee = subtotal * 0.1;

  document.getElementById("productos-resumen").innerHTML = cart
    .map(
      (item) => `
        <div class="producto-resumen">
          <span>${escapeHtml(item.name)} × ${Number(item.quantity)}</span>
          <strong>${formatCOP(Number(item.price) * Number(item.quantity))}</strong>
        </div>
      `,
    )
    .join("");
  document.getElementById("subtotal-pedido").textContent = formatCOP(subtotal);
  document.getElementById("envio-pedido").textContent = formatCOP(shipping);
  document.getElementById("impuestos-pedido").textContent = formatCOP(taxes);
  document.getElementById("tasa-pedido").textContent = formatCOP(serviceFee);
  document.getElementById("total-pedido").textContent = formatCOP(
    subtotal + shipping + taxes + serviceFee,
  );

  const formMetodoPago = document.getElementById("form-metodo-pago");
  const mensajeMetodo = document.getElementById("mensaje-metodo");
  const paymentDetails = {
    tarjeta: document.getElementById("datos-tarjeta"),
    transferencia: document.getElementById("datos-transferencia"),
  };
  let metodoSeleccionado = null;

  function getTodayLocalDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}`;
  }

  const transferDateInput = document.getElementById("fecha-transferencia");
  transferDateInput.min = getTodayLocalDate();

  function getValidationError(input) {
    const value = input.value.trim();
    if (!value) return "Este campo es obligatorio.";

    switch (input.dataset.validation) {
      case "name":
        if (/\d/.test(value)) {
          return "Escribe el nombre usando letras, no números.";
        }
        if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(value)) {
          return "Usa solo letras, espacios, apóstrofes o guiones.";
        }
        return "";
      case "card-number": {
        if (/[^\d\s]/.test(value)) {
          return "El número de tarjeta solo puede contener números.";
        }
        const digits = value.replace(/\s/g, "");
        return digits.length >= 13 && digits.length <= 19
          ? ""
          : "Ingresa un número de tarjeta de 13 a 19 dígitos.";
      }
      case "cvv":
        if (/\D/.test(value)) {
          return "El código de seguridad solo puede contener números.";
        }
        return /^\d{3,4}$/.test(value)
          ? ""
          : "Ingresa un código de seguridad de 3 o 4 dígitos.";
      case "expiry": {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(
          now.getMonth() + 1,
        ).padStart(2, "0")}`;
        if (!/^\d{4}-\d{2}$/.test(value)) {
          return "Selecciona el vencimiento de la tarjeta.";
        }
        return value >= currentMonth
          ? ""
          : "La tarjeta está vencida. Ingresa una fecha vigente.";
      }
      case "reference":
        if (value.length < 4) {
          return "La referencia debe tener al menos 4 caracteres.";
        }
        return /^[\p{L}\p{N}\s._/#-]+$/u.test(value)
          ? ""
          : "La referencia contiene caracteres no permitidos.";
      case "transfer-date": {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return "Selecciona la fecha de la transferencia.";
        }
        return value >= getTodayLocalDate()
          ? ""
          : "La fecha de transferencia no puede ser anterior a hoy.";
      }
      default:
        return "";
    }
  }

  function validateField(input) {
    const errorMessage = getValidationError(input);
    const errorElement = document.getElementById(
      input.getAttribute("aria-describedby"),
    );

    input.setAttribute("aria-invalid", String(Boolean(errorMessage)));
    input.classList.toggle("input-error", Boolean(errorMessage));
    input.classList.toggle("input-valido", !errorMessage);
    if (errorElement) errorElement.textContent = errorMessage;
    return !errorMessage;
  }

  function clearFieldState(fieldset) {
    fieldset.querySelectorAll("input").forEach((input) => {
      input.classList.remove("input-error", "input-valido");
      input.removeAttribute("aria-invalid");
      const errorElement = document.getElementById(
        input.getAttribute("aria-describedby"),
      );
      if (errorElement) errorElement.textContent = "";
    });
  }

  function mostrarDatosMetodo(method) {
    Object.entries(paymentDetails).forEach(([key, fieldset]) => {
      const visible = key === method;
      if (!visible && key === metodoSeleccionado) {
        fieldset.querySelectorAll("input").forEach((input) => {
          input.value = "";
        });
        clearFieldState(fieldset);
      }
      fieldset.hidden = !visible;
      fieldset.disabled = !visible;
    });
    metodoSeleccionado = method;
    mensajeMetodo.textContent = "";
  }

  formMetodoPago
    .querySelectorAll('input[name="metodo"]')
    .forEach((input) => {
      input.addEventListener("click", () => {
        const debeDeseleccionar = metodoSeleccionado === input.value;
        if (!debeDeseleccionar) return;

        window.setTimeout(() => {
          if (metodoSeleccionado === input.value && input.checked) {
            input.checked = false;
            mostrarDatosMetodo(null);
          }
        });
      });

      input.addEventListener("change", () => {
        mostrarDatosMetodo(input.checked ? input.value : null);
      });
    });

  Object.values(paymentDetails).forEach((fieldset) => {
    fieldset.querySelectorAll("input[data-validation]").forEach((input) => {
      input.addEventListener("input", () => validateField(input));
      input.addEventListener("change", () => validateField(input));
      input.addEventListener("blur", () => validateField(input));
    });
  });

  const submitButton = formMetodoPago.querySelector('button[type="submit"]');
  formMetodoPago.addEventListener("submit", async (event) => {
    event.preventDefault();
    const method = new FormData(formMetodoPago).get("metodo");
    const names = {
      tarjeta: "Tarjeta débito o crédito",
      transferencia: "Transferencia bancaria",
    };

    if (!method || !names[method]) {
      mensajeMetodo.textContent = "Selecciona un método de pago para continuar.";
      return;
    }

    const activeFields = paymentDetails[method].querySelectorAll(
      "input[data-validation]",
    );
    const invalidFields = [...activeFields].filter(
      (input) => !validateField(input),
    );
    if (invalidFields.length > 0) {
      mensajeMetodo.textContent =
        "Revisa los campos marcados antes de continuar.";
      invalidFields[0].focus();
      return;
    }

    submitButton.disabled = true;
    mensajeMetodo.textContent = "Registrando la compra...";
    let purchaseRecorded = false;
    let recordedReference = "";

    try {
      const response = await fetch("http://localhost:3000/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${usuarioActivo.token}`,
        },
        body: JSON.stringify({
          method,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) {
        throw new Error(
          "El backend está desactualizado. Reinícialo desde Backend con `node index.js`.",
        );
      }
      if (response.status === 401) {
        sessionStorage.removeItem("wiiu_usuario_activo");
        sessionStorage.removeItem("sessionToken");
        localStorage.removeItem("sessionToken");
        window.location.replace("Login.html?returnTo=metodos_pago.html");
        return;
      }
      if (!response.ok || !data.ok || !data.purchase) {
        throw new Error(data.message || "No se pudo registrar la compra.");
      }
      purchaseRecorded = true;
      recordedReference = data.purchase.orderNumber;

      const confirmation = {
        ...data.purchase,
        paymentDetails:
          method === "tarjeta"
            ? {
                holder: document.getElementById("titular-tarjeta").value.trim(),
                lastFour: document
                  .getElementById("numero-tarjeta")
                  .value.replace(/\D/g, "")
                  .slice(-4),
                expiry: document.getElementById("vencimiento-tarjeta").value,
              }
            : {
                holder: document
                  .getElementById("titular-transferencia")
                  .value.trim(),
                bank: document
                  .getElementById("banco-transferencia")
                  .value.trim(),
                reference: document
                  .getElementById("referencia-transferencia")
                  .value.trim(),
                date: document.getElementById("fecha-transferencia").value,
              },
      };
      paymentDetails.tarjeta.querySelector("#numero-tarjeta").value = "";
      paymentDetails.tarjeta.querySelector("#cvv-tarjeta").value = "";
      sessionStorage.setItem(
        "wiiu_checkout_confirmation",
        JSON.stringify(confirmation),
      );
      window.location.href = "confirmacion_pedido.html";
    } catch (error) {
      console.error("Error procesando la compra:", error.message);
      if (purchaseRecorded) {
        mensajeMetodo.textContent =
          `La compra quedó registrada. No se pudo mostrar el comprobante. ` +
          `Conserva esta referencia y no vuelvas a enviar el pago: ${recordedReference}.`;
      } else {
        mensajeMetodo.textContent =
          error instanceof TypeError
            ? "No se pudo conectar con el servidor. Verifica que el backend esté activo."
            : error.message || "No se pudo registrar la compra. Intenta nuevamente.";
        submitButton.disabled = false;
      }
    }
  });
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
