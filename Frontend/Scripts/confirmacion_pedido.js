document.addEventListener("DOMContentLoaded", () => {
  let confirmation;
  try {
    confirmation = JSON.parse(
      sessionStorage.getItem("wiiu_checkout_confirmation") || "null",
    );
  } catch (error) {
    console.error("No se pudo leer la confirmación del pedido:", error);
  }

  if (!confirmation?.items?.length || !confirmation?.totals) {
    window.location.replace("metodos_pago.html");
    return;
  }

  const formatCOP = (amount) =>
    "$" + Math.round(Number(amount) || 0).toLocaleString("es-CO") + " COP";
  const formatDate = (date) =>
    new Intl.DateTimeFormat("es-CO", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(date));
  const setText = (id, value) => {
    document.getElementById(id).textContent = value;
  };

  setText(
    "numero-pedido",
    `${confirmation.orderNumber} · ${formatDate(confirmation.createdAt)}`,
  );
  document.getElementById("lista-productos-confirmacion").innerHTML =
    confirmation.items
      .map(
        (item) => `
          <div class="fila-producto-confirmacion">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${Number(item.quantity)} × ${formatCOP(item.unitPrice)}</span>
            </div>
            <strong>${formatCOP(item.quantity * item.unitPrice)}</strong>
          </div>
        `,
      )
      .join("");

  setText("confirmacion-subtotal", formatCOP(confirmation.totals.subtotal));
  setText("confirmacion-envio", formatCOP(confirmation.totals.shipping));
  setText("confirmacion-impuestos", formatCOP(confirmation.totals.taxes));
  setText("confirmacion-tasa", formatCOP(confirmation.totals.serviceFee));
  setText("confirmacion-total", formatCOP(confirmation.totals.total));

  const paymentDetails = confirmation.paymentDetails || {};
  const details =
    confirmation.method === "tarjeta"
      ? [
          ["Método", "Tarjeta débito o crédito"],
          ["Titular", paymentDetails.holder],
          ["Tarjeta", `•••• •••• •••• ${paymentDetails.lastFour}`],
          ["Vencimiento", paymentDetails.expiry],
        ]
      : confirmation.method === "transferencia"
        ? [
            ["Método", "Transferencia bancaria"],
            ["Titular", paymentDetails.holder],
            ["Banco de origen", paymentDetails.bank],
            ["Referencia", paymentDetails.reference],
            ["Fecha de transferencia", paymentDetails.date],
          ]
        : null;

  if (!details) {
    window.location.replace("metodos_pago.html");
    return;
  }

  document.getElementById("detalle-pago").innerHTML = details
    .map(
      ([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value || "No disponible")}</dd>
        </div>
      `,
    )
    .join("");

  window.WiiUGamesCart.clear();
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
