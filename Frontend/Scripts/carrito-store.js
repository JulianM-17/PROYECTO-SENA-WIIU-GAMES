(() => {
  const STORAGE_KEY = "wiiu_cart";

  function read() {
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      console.error("No se pudo leer el carrito guardado:", error);
      return [];
    }
  }

  function write(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCount(cart);
    window.dispatchEvent(new CustomEvent("wiiu-cart-change", { detail: cart }));
  }

  function updateCount(cart = read()) {
    const total = cart.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );
    document.querySelectorAll(".burbuja-carrito").forEach((badge) => {
      badge.textContent = total > 0 ? String(total) : "";
      badge.style.display = total > 0 ? "" : "none";
    });
    return total;
  }

  function add(product, quantity = 1) {
    const productId = String(
      product?.productId ?? product?.id_producto ?? product?.id ?? "",
    );
    const name = String(product?.name ?? product?.nombre ?? "").trim();
    const price = Number(product?.price ?? product?.precio);
    const requestedQuantity = Math.floor(Number(quantity));
    const stockValue = Number(product?.stock ?? product?.stock_total);
    const stock = Number.isFinite(stockValue) ? stockValue : null;

    if (
      !productId ||
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1
    ) {
      return { ok: false, reason: "invalid" };
    }
    if (stock !== null && stock <= 0) {
      return { ok: false, reason: "unavailable" };
    }

    const cart = read();
    const existing = cart.find((item) => String(item.productId) === productId);
    const nextQuantity = (Number(existing?.quantity) || 0) + requestedQuantity;
    if (stock !== null && nextQuantity > stock) {
      return { ok: false, reason: "stock", stock };
    }

    const cartItem = {
      productId,
      name,
      price,
      imageUrl: String(
        product?.imageUrl ?? product?.imagen_url ?? "../Assets/lenovolegion.webp",
      ),
      quantity: nextQuantity,
      stock,
    };

    if (existing) {
      Object.assign(existing, cartItem);
    } else {
      cart.push(cartItem);
    }
    write(cart);
    return { ok: true, cart };
  }

  function setQuantity(productId, quantity) {
    const cart = read();
    const item = cart.find(
      (entry) => String(entry.productId) === String(productId),
    );
    if (!item) return { ok: false, reason: "not-found" };

    const nextQuantity = Math.floor(Number(quantity));
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return { ok: false, reason: "invalid" };
    }
    if (
      item.stock !== null &&
      item.stock !== undefined &&
      Number.isFinite(Number(item.stock)) &&
      nextQuantity > Number(item.stock)
    ) {
      return { ok: false, reason: "stock", stock: Number(item.stock) };
    }

    item.quantity = nextQuantity;
    write(cart);
    return { ok: true, cart };
  }

  function remove(productId) {
    write(read().filter((item) => String(item.productId) !== String(productId)));
  }

  function clear() {
    write([]);
  }

  window.WiiUGamesCart = { read, add, setQuantity, remove, clear, updateCount };
  document.addEventListener("DOMContentLoaded", () => updateCount());
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) updateCount();
  });
})();
