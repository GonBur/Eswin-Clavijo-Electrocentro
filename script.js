const WHATSAPP_NUMBER = "51986743265";
const STORE_NAME = "Eswin Clavijo Electrocentro";

// =========================================================================
// 1. ARCHIVO DEL CATÁLOGO (AQUÍ SE LEEN LAS FOTOS, NOMBRES Y PRECIOS)
// Para agregar más productos, cambiar fotos o editar precios, abre el
// archivo "productos.json" en la carpeta principal de tu proyecto.
// =========================================================================
const CATALOG_URL = "productos.json";

let PRODUCTOS = [];
let CATEGORIAS_MAP = {};
let currentCategory = "todos";
let searchQuery = "";
let cart = JSON.parse(localStorage.getItem("electrocentro_cart")) || [];

// Referencias DOM
const productsGrid = document.getElementById("products-grid");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const resetFiltersBtn = document.getElementById("reset-filters-btn");

const cartDrawer = document.getElementById("cart-drawer");
const cartBackdrop = document.getElementById("cart-backdrop");
const cartOpenBtn = document.getElementById("cart-open-btn");
const cartCloseBtn = document.getElementById("cart-close-btn");
const cartItemsContainer = document.getElementById("cart-items");
const cartCountBadge = document.getElementById("cart-count");
const cartTotalEl = document.getElementById("cart-total");
const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout");
const clearCartBtn = document.getElementById("clear-cart-btn");
const directWaBtn = document.getElementById("direct-wa-btn");

const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");

// Formatea el precio en soles (si precio es 0, muestra "Consultar")
function formatPEN(amount) {
  const numeric = Number(amount);
  if (!numeric || numeric <= 0) {
    return "Consultar";
  }
  return `S/ ${numeric.toFixed(2)}`;
}

// =========================================================================
// 2. CARGA DINÁMICA DESDE productos.json
// =========================================================================
async function loadCatalog() {
  try {
    const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`);
    if (!response.ok) throw new Error("No se pudo cargar productos.json");

    // Permite escribir comentarios con // dentro de productos.json sin romper la carga
    const rawText = await response.text();
    const cleanJsonText = rawText.replace(/^\s*\/\/.*$/gm, "");
    const data = JSON.parse(cleanJsonText);

    CATEGORIAS_MAP = (data.categorias || []).reduce((acc, cat) => {
      acc[cat.id] = cat.nombre;
      return acc;
    }, {});

    // Filtra solo los productos activos ("activo": true en productos.json)
    PRODUCTOS = (data.productos || []).filter((item) => item.activo !== false);

    renderProducts();
    syncCartWithCatalog();
  } catch (error) {
    console.error("Error cargando el catálogo:", error);
    productsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>No se pudo cargar el catálogo en este momento. Verifica que <strong>productos.json</strong> esté en la carpeta raíz y ejecutes el sitio desde un servidor local (Live Server) o hosting.</p>
      </div>
    `;
  }
}

// Actualiza precios o nombres en el carrito si cambiaron en productos.json
function syncCartWithCatalog() {
  if (PRODUCTOS.length === 0) return;
  cart = cart
    .map((cartItem) => {
      const latest = PRODUCTOS.find((p) => p.id === cartItem.id);
      return latest ? { ...latest, qty: cartItem.qty } : null;
    })
    .filter(Boolean);
  saveCart();
}

// =========================================================================
// 3. RENDERIZADO DE TARJETAS (FOTO REAL, NOMBRE, DESCRIPCIÓN Y PRECIO)
// Cada tarjeta toma sus datos directamente desde los campos de productos.json:
// - prod.imagen      -> Ruta de la foto (ej: "img/productos/tv-box-4k-roscoh.jpg")
// - prod.nombre      -> Título del producto
// - prod.descripcion -> Características técnicas
// - prod.precio      -> Precio en soles (ej: 250.00)
// =========================================================================
function renderProducts() {
  const filtered = PRODUCTOS.filter((item) => {
    const matchesCategory =
      currentCategory === "todos" || item.categoria === currentCategory;
    const term = searchQuery.trim().toLowerCase();
    const categoryName = (CATEGORIAS_MAP[item.categoria] || item.categoria).toLowerCase();

    const matchesSearch =
      !term ||
      item.nombre.toLowerCase().includes(term) ||
      item.descripcion.toLowerCase().includes(term) ||
      categoryName.includes(term);

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  productsGrid.innerHTML = filtered
    .map((prod) => {
      const categoryLabel = CATEGORIAS_MAP[prod.categoria] || prod.categoria;
      const hasImage = Boolean(prod.imagen && prod.imagen.trim() !== "");
      const fallbackIcon = prod.iconoFallback || "📦";

      return `
        <article class="product-card">
          <div>
            <!-- Foto del producto (definida en "imagen" dentro de productos.json) -->
            <div class="product-visual">
              ${prod.badge ? `<span class="product-badge">${prod.badge}</span>` : ""}
              ${
                hasImage
                  ? `<img src="${prod.imagen}" alt="${prod.nombre}" class="product-img" loading="lazy"
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
                     <span class="product-fallback-icon" style="display:none;" aria-hidden="true">${fallbackIcon}</span>`
                  : `<span class="product-fallback-icon" aria-hidden="true">${fallbackIcon}</span>`
              }
            </div>

            <!-- Categoría, nombre y descripción (definidos en productos.json) -->
            <span class="product-category">${categoryLabel}</span>
            <h3 class="product-title">${prod.nombre}</h3>
            <p class="product-specs">${prod.descripcion}</p>
          </div>

          <!-- Precio en soles (definido en "precio" dentro de productos.json) -->
          <div class="product-footer">
            <span class="product-price">${formatPEN(prod.precio)}</span>
            <button class="btn btn-primary add-btn" onclick="addToCart(${prod.id})">
              + Cotizar
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function saveCart() {
  localStorage.setItem("electrocentro_cart", JSON.stringify(cart));
  renderCart();
}

function addToCart(productId) {
  const product = PRODUCTOS.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  openCart();
}

function changeQuantity(productId, delta) {
  const index = cart.findIndex((item) => item.id === productId);
  if (index === -1) return;

  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
}

function renderCart() {
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalAmount = cart.reduce(
    (acc, item) => acc + (Number(item.precio) > 0 ? Number(item.precio) * item.qty : 0),
    0
  );

  cartCountBadge.textContent = totalItems;
  cartTotalEl.textContent = totalAmount > 0 ? formatPEN(totalAmount) : "A confirmar";

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <p class="cart-empty">
        Aún no has agregado equipos a tu cotización.<br />
        Selecciona productos del catálogo para consultar stock y promociones.
      </p>
    `;
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.nombre}</h4>
          <span>${Number(item.precio) > 0 ? `${formatPEN(item.precio)} c/u` : "Precio por confirmar"}</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)" aria-label="Disminuir">-</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)" aria-label="Aumentar">+</button>
        </div>
      </div>
    `
    )
    .join("");
}

function openCart() {
  cartDrawer.classList.add("open");
  cartBackdrop.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartBackdrop.classList.remove("open");
}

function sendWhatsAppQuote() {
  if (cart.length === 0) {
    alert("Agrega al menos un producto del catálogo antes de enviar tu cotización.");
    return;
  }

  const customerName = document.getElementById("customer-name").value.trim();
  const deliveryMethod = document.getElementById("delivery-method").value;
  const totalAmount = cart.reduce(
    (acc, item) => acc + (Number(item.precio) > 0 ? Number(item.precio) * item.qty : 0),
    0
  );

  const lines = [
    `Hola *${STORE_NAME}*, deseo cotizar los siguientes productos:`,
    ""
  ];

  cart.forEach((item, idx) => {
    const subtotalText =
      Number(item.precio) > 0
        ? formatPEN(Number(item.precio) * item.qty)
        : "Precio a consultar";
    lines.push(`${idx + 1}. *${item.nombre}* (x${item.qty}) — ${subtotalText}`);
  });

  lines.push("");
  if (totalAmount > 0) {
    lines.push(`*Total estimado:* ${formatPEN(totalAmount)}`);
  }
  lines.push(`*Entrega:* ${deliveryMethod}`);
  if (customerName) {
    lines.push(`*Cliente:* ${customerName}`);
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Eventos
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    renderProducts();
  });
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderProducts();
});

resetFiltersBtn.addEventListener("click", () => {
  currentCategory = "todos";
  searchQuery = "";
  searchInput.value = "";
  filterButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.category === "todos")
  );
  renderProducts();
});

cartOpenBtn.addEventListener("click", openCart);
cartCloseBtn.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);
whatsappCheckoutBtn.addEventListener("click", sendWhatsAppQuote);

clearCartBtn.addEventListener("click", () => {
  cart = [];
  saveCart();
});

directWaBtn.addEventListener("click", () => {
  const msg = `Hola *${STORE_NAME}*, quisiera consultar disponibilidad de un equipo.`;
  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer"
  );
});

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => navMenu.classList.remove("open"));
});

// Inicialización
document.getElementById("current-year").textContent = new Date().getFullYear();
renderCart();
loadCatalog();
