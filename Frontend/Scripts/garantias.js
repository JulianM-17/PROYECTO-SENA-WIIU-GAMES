document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-garantia");
  if (!form) return;

  const productoSelect = document.getElementById("producto-comprado");
  const pedidoInput = document.getElementById("id-pedido");
  const categoriaInput = document.getElementById("categoria-producto");
  const descripcionInput = document.getElementById("consulta");
  const feedback = document.getElementById("garantia-feedback");
  const submitButton = form.querySelector('[type="submit"]');
  let products = [];
  let isSubmitting = false;

  function setFeedback(message, type = "") {
    feedback.textContent = message;
    feedback.className = `garantia-feedback${type ? ` ${type}` : ""}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }

  function renderWarrantyRequests(requests) {
    const container = document.getElementById("lista-solicitudes-garantia");
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML =
        '<p class="garantia-solicitudes-mensaje">Aún no has enviado solicitudes de garantía.</p>';
      return;
    }

    const labels = {
      RECIBIDA: "Recibida",
      EN_REVISION: "En revisión",
      APROBADA: "Aprobada",
      RECHAZADA: "Rechazada",
      CERRADA: "Cerrada",
    };
    container.innerHTML = requests
      .map((request) => {
        const status = labels[request.status] ? request.status : "RECIBIDA";
        return `
          <article class="garantia-solicitud-card">
            <header class="garantia-solicitud-cabecera">
              <div>
                <h3>${escapeHtml(request.productName)}</h3>
                <p class="garantia-solicitud-referencia">
                  Pedido ${escapeHtml(request.orderNumber)} · Solicitud #${escapeHtml(request.id)}
                </p>
              </div>
              <span class="garantia-solicitud-estado estado-${status.toLowerCase()}">
                ${labels[status]}
              </span>
            </header>
            <p class="garantia-solicitud-fecha">
              <strong>Enviada:</strong> ${escapeHtml(request.requestedAt)}
              · <strong>Garantía:</strong> desde ${escapeHtml(request.warrantyStartsAt)}
              hasta ${escapeHtml(request.warrantyExpiresAt)}
            </p>
            <p class="garantia-solicitud-descripcion">${escapeHtml(request.description)}</p>
          </article>`;
      })
      .join("");
  }

  async function loadMyWarrantyRequests() {
    const container = document.getElementById("lista-solicitudes-garantia");
    if (!container) return;

    try {
      const response = await fetch(
        "http://localhost:3000/api/my-warranty-requests",
        {
          headers: { Authorization: `Bearer ${sessionUser.token}` },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !Array.isArray(data.requests)) {
        throw new Error(
          data.message || "No se pudieron cargar tus solicitudes de garantía.",
        );
      }
      renderWarrantyRequests(data.requests);
    } catch (error) {
      const message = document.createElement("p");
      message.className = "garantia-solicitudes-mensaje";
      message.textContent =
        error.message || "No se pudieron cargar tus solicitudes de garantía.";
      container.replaceChildren(message);
    }
  }

  function showFieldError(input, errorId, message) {
    const error = document.getElementById(errorId);
    input.closest(".campo, .consulta")?.classList.add("campo-invalido");
    input.setAttribute("aria-invalid", "true");
    if (error) error.textContent = message;
  }

  function clearFieldError(input, errorId) {
    const error = document.getElementById(errorId);
    input.closest(".campo, .consulta")?.classList.remove("campo-invalido");
    input.removeAttribute("aria-invalid");
    if (error) error.textContent = "";
  }

  function selectedProduct() {
    return products.find(
      (product) => String(product.detailId) === productoSelect.value,
    );
  }

  function updateSelectedProduct() {
    const product = selectedProduct();
    pedidoInput.value = product?.orderNumber || "";
    categoriaInput.value = product?.category || "";
    if (product?.hasRequest) {
      showFieldError(
        productoSelect,
        "error-producto-comprado",
        "Ya existe una solicitud de garantía para este producto.",
      );
    } else if (product && !product.warrantyActive) {
      showFieldError(
        productoSelect,
        "error-producto-comprado",
        `El plazo de garantía venció el ${product.warrantyExpiresAt}.`,
      );
    } else {
      clearFieldError(productoSelect, "error-producto-comprado");
    }
  }

  function renderProducts() {
    const selectedId = productoSelect.value;
    productoSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona un producto comprado...";
    productoSelect.append(placeholder);

    for (const product of products) {
      const option = document.createElement("option");
      option.value = String(product.detailId);
      const unitReference =
        product.unitReference ||
        `${product.orderNumber}-U${product.detailId}`;
      const remainingDays =
        product.warrantyDaysRemaining == null
          ? null
          : Number(product.warrantyDaysRemaining);
      let remainingTime = "Sin información";
      if (["ANULADA", "SUSPENDIDA"].includes(product.warrantyStatus)) {
        remainingTime = "Cobertura suspendida";
      } else if (Number.isFinite(remainingDays)) {
        if (remainingDays < 0) {
          remainingTime = "Garantía vencida";
        } else if (remainingDays === 0) {
          remainingTime = "Vence hoy";
        } else {
          remainingTime = `Quedan ${remainingDays} día${remainingDays === 1 ? "" : "s"}`;
        }
      }
      option.textContent = [
        product.productName,
        `Cantidad ${product.quantity}`,
        `Código ${unitReference}`,
        `Tiempo restante ${remainingTime}`,
      ]
        .filter(Boolean)
        .join(" · ");
      option.disabled = product.hasRequest || !product.warrantyActive;
      productoSelect.append(option);
    }

    const currentProduct = products.find(
      (product) =>
        String(product.detailId) === selectedId &&
        !product.hasRequest &&
        product.warrantyActive,
    );
    productoSelect.value = currentProduct ? selectedId : "";
    productoSelect.disabled = products.length === 0;
    submitButton.disabled =
      isSubmitting ||
      !products.some(
        (product) => !product.hasRequest && product.warrantyActive,
      );
    updateSelectedProduct();
  }

  async function loadPurchasedProducts() {
    setFeedback("Cargando tus productos comprados...");
    try {
      const response = await fetch(
        "http://localhost:3000/api/my-warranty-products",
        {
          headers: { Authorization: `Bearer ${sessionUser.token}` },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !Array.isArray(data.products)) {
        throw new Error(
          data.message || "No se pudieron cargar tus productos comprados.",
        );
      }

      products = data.products;
      renderProducts();
      if (products.length === 0) {
        setFeedback(
          "Aún no tienes compras confirmadas disponibles para solicitar garantía.",
        );
      } else if (
        products.every(
          (product) => product.hasRequest || !product.warrantyActive,
        )
      ) {
        setFeedback(
          "No hay productos disponibles: el plazo venció o ya tienen una solicitud registrada.",
        );
      } else {
        setFeedback("Selecciona el producto comprado para iniciar tu solicitud.");
      }
      return true;
    } catch (error) {
      setFeedback(error.message, "error");
      return false;
    }
  }

  function validateDescription() {
    const length = descripcionInput.value.trim().length;
    let message = "";
    if (length < 15) {
      message = "Describe la falla con al menos 15 caracteres.";
    } else if (length > 2000) {
      message = "La descripción no puede superar los 2000 caracteres.";
    }
    if (message) {
      showFieldError(descripcionInput, "error-consulta", message);
      return false;
    }
    clearFieldError(descripcionInput, "error-consulta");
    return true;
  }

  function validateForm() {
    const product = selectedProduct();
    if (!product) {
      showFieldError(
        productoSelect,
        "error-producto-comprado",
        "Selecciona uno de tus productos comprados.",
      );
    } else if (product.hasRequest) {
      showFieldError(
        productoSelect,
        "error-producto-comprado",
        "Ya existe una solicitud de garantía para este producto.",
      );
    } else if (!product.warrantyActive) {
      showFieldError(
        productoSelect,
        "error-producto-comprado",
        `El plazo de garantía venció el ${product.warrantyExpiresAt}.`,
      );
    } else {
      clearFieldError(productoSelect, "error-producto-comprado");
    }

    const descriptionIsValid = validateDescription();
    const valid =
      Boolean(
        product && !product.hasRequest && product.warrantyActive,
      ) && descriptionIsValid;
    if (!valid) {
      form
        .querySelector('[aria-invalid="true"]')
        ?.focus();
    }
    return valid;
  }

  function handleRequestError(data) {
    if (
      data.code === "INVALID_PURCHASE" ||
      data.code === "REQUEST_ALREADY_EXISTS" ||
      data.code === "WARRANTY_EXPIRED" ||
      data.code === "WARRANTY_INACTIVE"
    ) {
      showFieldError(
        productoSelect,
        "error-producto-comprado",
        data.message,
      );
      productoSelect.focus();
      return true;
    }
    if (data.code === "INVALID_DESCRIPTION") {
      showFieldError(descripcionInput, "error-consulta", data.message);
      descripcionInput.focus();
      return true;
    }
    return false;
  }

  productoSelect.addEventListener("change", updateSelectedProduct);
  descripcionInput.addEventListener("input", () => {
    if (descripcionInput.getAttribute("aria-invalid") === "true") {
      validateDescription();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting || !validateForm()) return;

    const product = selectedProduct();
    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "Enviando solicitud...";
    setFeedback("Registrando tu solicitud...");

    try {
      const response = await fetch(
        "http://localhost:3000/api/my-warranty-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionUser.token}`,
          },
          body: JSON.stringify({
            detailId: product.detailId,
            description: descripcionInput.value.trim(),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (!handleRequestError(data)) {
          setFeedback(
            data.message || "No se pudo registrar tu solicitud.",
            "error",
          );
        }
        return;
      }

      product.hasRequest = true;
      product.requestStatus = data.request.status;
      descripcionInput.value = "";
      clearFieldError(descripcionInput, "error-consulta");
      renderProducts();
      await loadMyWarrantyRequests();
      setFeedback(
        `✓ ${
          data.message ||
          "Solicitud enviada correctamente. Nuestro equipo la revisará y podrás consultar el estado en esta sección."
        }`,
        "success",
      );
    } catch (error) {
      setFeedback(error.message || "No se pudo registrar tu solicitud.", "error");
    } finally {
      isSubmitting = false;
      submitButton.textContent = "Enviar solicitud de garantía";
      submitButton.disabled = !products.some(
        (purchase) => !purchase.hasRequest && purchase.warrantyActive,
      );
    }
  });

  let sessionUser = null;
  try {
    sessionUser = JSON.parse(
      sessionStorage.getItem("wiiu_usuario_activo") || "null",
    );
  } catch (error) {
    setFeedback("No se pudo validar tu sesión.", "error");
  }

  if (!sessionUser?.token) {
    productoSelect.disabled = true;
    submitButton.disabled = true;
    setFeedback("Inicia sesión para consultar tus productos comprados.", "error");
    return;
  }

  document
    .getElementById("nav-garantias")
    ?.addEventListener("click", loadMyWarrantyRequests);
  loadPurchasedProducts();
  loadMyWarrantyRequests();
});
