'use strict';
/* global gsap, ScrollTrigger, MarinStore */

gsap.registerPlugin(ScrollTrigger);

const App = {
  activeCat: 'all',
  activeModal: null,
  modalQty: 1,

  // ── Boot ──────────────────────────────────────────────────
  init() {
    this.buildNav();
    this.buildCategoryGrid();
    this.buildFilters();
    this.loadProducts('all');
    this.refreshCart();
    this.refreshUserUI();
    this.updateFooter();
    this.bindEvents();
    this.initGsap();
    this.initCarousel();
    this.applySettings();
  },

  applySettings() {
    const s = MarinStore.getSettings();
    document.title = s.storeName || 'Marina Cosméticos';
    const waBtns = document.querySelectorAll('[data-wa]');
    waBtns.forEach(b => b.href = `https://wa.me/${s.whatsapp}`);
  },

  // ── Navigation ───────────────────────────────────────────
  buildNav() {
    const nav = document.getElementById('mainNav');
    nav.querySelectorAll('.nav-link[data-dyn]').forEach(l => l.remove());
    MarinStore.getCategories().filter(c => c.active).forEach(cat => {
      const a = document.createElement('a');
      a.href = '#productsSection';
      a.className = 'nav-link'; a.dataset.dyn = '1';
      a.textContent = cat.name;
      a.addEventListener('click', e => {
        e.preventDefault();
        this.filterTo(cat.id);
        document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
      });
      nav.appendChild(a);
    });
  },

  // ── Category Grid ────────────────────────────────────────
  buildCategoryGrid() {
    const all = MarinStore.getProducts().filter(p => p.active);
    const cats = MarinStore.getCategories().filter(c => c.active);
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = cats.map(c => `
      <div class="category-card" data-cat="${c.id}">
        <div class="cat-icon"><i class="${c.icon}"></i></div>
        <h3>${c.name}</h3>
        <p>${c.description || ''}</p>
        <span class="cat-count">${all.filter(p => p.category === c.id).length} produtos</span>
        <div class="cat-arrow"><i class="fa-solid fa-arrow-right"></i></div>
      </div>
    `).join('');
    grid.querySelectorAll('.category-card').forEach(el =>
      el.addEventListener('click', () => {
        this.filterTo(el.dataset.cat);
        document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
      })
    );
  },

  // ── Filter Buttons ───────────────────────────────────────
  buildFilters() {
    const cats = MarinStore.getCategories().filter(c => c.active);
    const wrap = document.getElementById('productsFilter');
    wrap.innerHTML = `
      <button class="filter-btn${this.activeCat === 'all' ? ' active' : ''}" data-f="all">
        <i class="fa-solid fa-star"></i> Todos
      </button>` +
      cats.map(c => `
        <button class="filter-btn${this.activeCat === c.id ? ' active' : ''}" data-f="${c.id}">
          <i class="${c.icon}"></i> ${c.name}
        </button>`).join('');
    wrap.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
      wrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.filterTo(btn.dataset.f);
    }));
  },

  filterTo(cat) {
    this.activeCat = cat;
    const title = document.getElementById('prodTitle');
    if (cat === 'all') {
      title.innerHTML = 'Coleção <span class="gold-text">Completa</span>';
    } else {
      const obj = MarinStore.getCategories().find(c => c.id === cat);
      if (obj) title.innerHTML = `${obj.name} <span class="gold-text">Marina</span>`;
    }
    this.buildFilters();
    this.loadProducts(cat, document.getElementById('searchInput').value);
  },

  // ── Product Grid ─────────────────────────────────────────
  loadProducts(cat = 'all', search = '') {
    let prods = MarinStore.getProducts().filter(p => p.active);
    if (cat !== 'all') prods = prods.filter(p => p.category === cat);
    if (search) {
      const q = search.toLowerCase();
      prods = prods.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    if (!prods.length) { grid.innerHTML = ''; empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    grid.innerHTML = prods.map(p => this.cardHtml(p)).join('');
    gsap.fromTo(grid.querySelectorAll('.product-card'),
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: .45, stagger: .07, ease: 'power2.out' }
    );
    grid.querySelectorAll('.product-card').forEach(el => {
      el.addEventListener('click', () => this.openModal(el.dataset.id));
      el.querySelector('.add-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        this.quickAdd(el.dataset.id);
      });
    });
  },

  cardHtml(p) {
    const cats = MarinStore.getCategories();
    const cat = cats.find(c => c.id === p.category);
    const disc = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : null;
    const oos = p.quantity <= 0;
    return `
      <div class="product-card${oos ? ' out-of-stock' : ''}" data-id="${p.id}">
        ${disc ? `<span class="badge-discount">-${disc}%</span>` : ''}
        ${p.featured ? `<span class="badge-featured"><i class="fa-solid fa-star"></i></span>` : ''}
        <div class="card-img">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : ''}
          ${oos ? `<div class="oos-overlay">Esgotado</div>` : ''}
        </div>
        <div class="card-body">
          <span class="card-cat">${cat ? cat.name : p.category}</span>
          <h3 class="card-name">${p.name}</h3>
          ${p.brand ? `<p class="card-brand">${p.brand}</p>` : ''}
          <div class="card-price-row">
            <div class="price-wrap">
              ${p.originalPrice ? `<span class="price-original">${MarinStore.fmtPrice(p.originalPrice)}</span>` : ''}
              <span class="price-current">${MarinStore.fmtPrice(p.price)}</span>
            </div>
            <button class="add-btn" ${oos ? 'disabled' : ''} title="Adicionar ao carrinho">
              <i class="fa-solid fa-bag-shopping"></i>
            </button>
          </div>
          <div class="card-stock">
            ${oos
              ? `<span class="s-out"><i class="fa-solid fa-circle-xmark"></i> Esgotado</span>`
              : p.quantity <= 3
                ? `<span class="s-low"><i class="fa-solid fa-triangle-exclamation"></i> Últimas ${p.quantity} unidades</span>`
                : `<span class="s-ok"><i class="fa-solid fa-circle-check"></i> Em estoque (${p.quantity})</span>`
            }
          </div>
        </div>
      </div>`;
  },

  // ── Cart ─────────────────────────────────────────────────
  requireLogin() {
    if (!MarinStore.getCurrentUser()) {
      this.openAuthModal();
      return false;
    }
    return true;
  },

  refreshCart() { this.updateBadge(); this.renderCart(); },

  updateBadge() {
    const n = MarinStore.getCartCount();
    const b = document.getElementById('cartBadge');
    b.textContent = n; b.style.display = n > 0 ? 'flex' : 'none';
  },

  renderCart() {
    const cart = MarinStore.getCart();
    const items = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotalVal');
    if (!cart.length) {
      items.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-bag-shopping"></i><p>Seu carrinho está vazio</p></div>`;
      totalEl.textContent = 'R$ 0,00'; return;
    }
    items.innerHTML = cart.map(item => {
      const p = MarinStore.getProduct(item.productId);
      if (!p) return '';
      return `
        <div class="cart-item" data-id="${p.id}">
          <div class="card-img" style="width:58px;height:58px;flex-shrink:0;border-radius:8px;overflow:hidden;background:var(--dark-3);">
            ${p.image ? `<img src="${p.image}" alt="${p.name}" class="cart-img" style="width:100%;height:100%;object-fit:cover;">` : ''}
          </div>
          <div class="ci-info">
            <h4>${p.name}</h4>
            ${p.brand ? `<p class="ci-brand">${p.brand}</p>` : '<p class="ci-brand" style="margin-bottom:7px"></p>'}
            <div class="ci-controls">
              <button class="qty-btn ci-minus" data-id="${p.id}"><i class="fa-solid fa-minus"></i></button>
              <span class="ci-qty">${item.qty}</span>
              <button class="qty-btn ci-plus" data-id="${p.id}"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <div class="ci-right">
            <span class="ci-price">${MarinStore.fmtPrice(p.price * item.qty)}</span>
            <button class="ci-remove" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    }).join('');
    totalEl.textContent = MarinStore.fmtPrice(MarinStore.getCartTotal());

    items.querySelectorAll('.ci-minus').forEach(btn => btn.addEventListener('click', () => {
      const it = MarinStore.getCart().find(i => i.productId === btn.dataset.id);
      if (it) { MarinStore.updateCartItem(btn.dataset.id, it.qty - 1); this.refreshCart(); }
    }));
    items.querySelectorAll('.ci-plus').forEach(btn => btn.addEventListener('click', () => {
      const it = MarinStore.getCart().find(i => i.productId === btn.dataset.id);
      const pr = MarinStore.getProduct(btn.dataset.id);
      if (it && pr && it.qty < pr.quantity) { MarinStore.updateCartItem(btn.dataset.id, it.qty + 1); this.refreshCart(); }
      else this.toast('Quantidade máxima disponível');
    }));
    items.querySelectorAll('.ci-remove').forEach(btn => btn.addEventListener('click', () => {
      MarinStore.removeFromCart(btn.dataset.id); this.refreshCart();
      this.toast('Item removido do carrinho');
    }));
  },

  openCart() {
    if (!this.requireLogin()) return;
    const s = document.getElementById('cartSidebar'), o = document.getElementById('cartOverlay');
    o.classList.add('active');
    gsap.fromTo(s, { x: '100%' }, { x: '0%', duration: .35, ease: 'power2.out' });
  },
  closeCart() {
    const s = document.getElementById('cartSidebar'), o = document.getElementById('cartOverlay');
    gsap.to(s, { x: '100%', duration: .28, ease: 'power2.in', onComplete: () => o.classList.remove('active') });
  },

  quickAdd(id) {
    if (!this.requireLogin()) return;
    const p = MarinStore.getProduct(id);
    if (!p || p.quantity <= 0) return;
    MarinStore.addToCart(id, 1);
    this.refreshCart();
    this.toast(`${p.name} adicionado!`);
    gsap.fromTo('#cartToggle', { scale: 1 }, { scale: 1.35, duration: .12, yoyo: true, repeat: 1 });
  },

  // ── Product Modal ────────────────────────────────────────
  openModal(id) {
    const p = MarinStore.getProduct(id);
    if (!p) return;
    this.activeModal = p; this.modalQty = 1;
    const cat = MarinStore.getCategories().find(c => c.id === p.category);
    const img = document.getElementById('modalImg');
    img.src = p.image || ''; img.alt = p.name;
    document.getElementById('modalCat').textContent = cat ? cat.name : p.category;
    document.getElementById('modalName').textContent = p.name;
    const brand = document.getElementById('modalBrand');
    brand.textContent = p.brand || ''; brand.style.display = p.brand ? 'block' : 'none';
    document.getElementById('modalDesc').textContent = p.description || '';
    document.getElementById('modalPrice').textContent = MarinStore.fmtPrice(p.price);
    const origEl = document.getElementById('modalOrig');
    origEl.textContent = p.originalPrice ? MarinStore.fmtPrice(p.originalPrice) : '';
    origEl.style.display = p.originalPrice ? 'inline' : 'none';
    const st = document.getElementById('modalStock');
    st.innerHTML = p.quantity <= 0
      ? `<span class="s-out"><i class="fa-solid fa-circle-xmark"></i> Esgotado</span>`
      : p.quantity <= 3
        ? `<span class="s-low"><i class="fa-solid fa-triangle-exclamation"></i> Últimas ${p.quantity} unidades</span>`
        : `<span class="s-ok"><i class="fa-solid fa-circle-check"></i> Em estoque</span>`;
    document.getElementById('modalQtyVal').textContent = '1';
    const addBtn = document.getElementById('modalAdd');
    addBtn.disabled = p.quantity <= 0;
    const modal = document.getElementById('productModal');
    modal.classList.add('open');
    gsap.fromTo('.modal-box',
      { opacity: 0, scale: .92, y: 16 },
      { opacity: 1, scale: 1, y: 0, duration: .32, ease: 'back.out(1.4)' }
    );
  },
  closeModal() {
    const modal = document.getElementById('productModal');
    gsap.to('.modal-box', { opacity: 0, scale: .95, duration: .2, onComplete: () => modal.classList.remove('open') });
  },

  // ── Footer ───────────────────────────────────────────────
  updateFooter() {
    const ul = document.getElementById('footerCatList');
    if (!ul) return;
    ul.innerHTML = MarinStore.getCategories().filter(c => c.active).map(c =>
      `<li><a href="#productsSection" onclick="App.filterTo('${c.id}');return false;">${c.name}</a></li>`
    ).join('');
    const s = MarinStore.getSettings();
    const wap = document.getElementById('footerWa');
    const email = document.getElementById('footerEmail');
    const addr = document.getElementById('footerAddr');
    if (wap) wap.textContent = s.whatsapp;
    if (email) email.textContent = s.email;
    if (addr) addr.textContent = s.address;
  },

  // ── Checkout ─────────────────────────────────────────────
  checkout() {
    if (!this.requireLogin()) return;
    const cart = MarinStore.getCart();
    if (!cart.length) { this.toast('Carrinho vazio!'); return; }
    const user = MarinStore.getCurrentUser();
    const s = MarinStore.getSettings();
    const items = cart.map(item => {
      const p = MarinStore.getProduct(item.productId);
      return p ? { id: p.id, name: p.name, brand: p.brand, price: p.price, qty: item.qty } : null;
    }).filter(Boolean);
    const total = MarinStore.getCartTotal();
    const order = MarinStore.createOrder(user.id, user.name, items, total);

    let msg = `🌸 *Olá! Gostaria de fazer um pedido na Marina Cosméticos:*\n\n`;
    msg += `👤 *Cliente:* ${user.name}\n`;
    msg += `🆔 *Pedido:* ${order.id}\n\n`;
    items.forEach(it => {
      msg += `▪ *${it.name}*${it.brand ? ` (${it.brand})` : ''}\n  ${it.qty}x ${MarinStore.fmtPrice(it.price)} = ${MarinStore.fmtPrice(it.price * it.qty)}\n\n`;
    });
    msg += `💰 *Total: ${MarinStore.fmtPrice(total)}*`;

    MarinStore.clearCart();
    this.refreshCart();
    this.closeCart();
    this.toast(`Pedido ${order.id} criado! Abrindo WhatsApp…`);
    window.open(`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  // ── User Auth UI ─────────────────────────────────────────
  refreshUserUI() {
    const user = MarinStore.getCurrentUser();
    const chip = document.getElementById('userNameChip');
    const label = document.getElementById('userLabel');
    const dropdown = document.getElementById('userDropdown');
    if (user) {
      chip.textContent = user.name.split(' ')[0];
      chip.style.display = 'inline-block';
      if (label) label.style.display = 'none';
      document.getElementById('dropdownName').textContent = user.name;
    } else {
      chip.style.display = 'none';
      if (label) label.style.display = 'inline';
      if (dropdown) dropdown.classList.remove('show');
    }
    this.refreshCart();
  },

  openAuthModal(tab = 'login') {
    document.getElementById('authOverlay').classList.add('show');
    const modal = document.getElementById('authModal');
    modal.classList.add('show');
    this.switchAuthTab(tab);
    document.getElementById('userDropdown').classList.remove('show');
  },

  closeAuthModal() {
    document.getElementById('authOverlay').classList.remove('show');
    document.getElementById('authModal').classList.remove('show');
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
  },

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('loginForm').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'flex' : 'none';
  },

  // ── Orders UI ────────────────────────────────────────────
  openOrders() {
    document.getElementById('ordersOverlay').classList.add('show');
    document.getElementById('ordersModal').classList.add('show');
    document.getElementById('userDropdown').classList.remove('show');
    this.renderOrders();
  },

  closeOrders() {
    document.getElementById('ordersOverlay').classList.remove('show');
    document.getElementById('ordersModal').classList.remove('show');
  },

  renderOrders() {
    const user = MarinStore.getCurrentUser();
    const body = document.getElementById('ordersBody');
    if (!user) { body.innerHTML = ''; return; }
    const orders = MarinStore.getUserOrders(user.id);
    if (!orders.length) {
      body.innerHTML = `<div class="orders-empty"><i class="fa-solid fa-box-open"></i><p>Você ainda não fez nenhum pedido.</p></div>`;
      return;
    }
    const statusClass = s => ({ 'Processando': 'processando', 'Enviado': 'enviado', 'Entregue': 'entregue', 'Cancelado': 'cancelado' }[s] || 'processando');
    body.innerHTML = [...orders].reverse().map(o => `
      <div class="order-card">
        <div class="order-card-head">
          <span class="order-id">${o.id}</span>
          <span class="order-date">${new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
          <span class="order-status ${statusClass(o.status)}">${o.status}</span>
        </div>
        <div class="order-items">${o.items.map(i => `${i.qty}x ${i.name}`).join(' · ')}</div>
        <div class="order-total">Total: ${MarinStore.fmtPrice(o.total)}</div>
        ${o.trackingCode ? `<div class="order-tracking">Rastreio: <strong>${o.trackingCode}</strong></div>` : ''}
      </div>
    `).join('');
  },

  // ── Events ───────────────────────────────────────────────
  bindEvents() {
    // Header scroll
    window.addEventListener('scroll', () =>
      document.getElementById('siteHeader').classList.toggle('scrolled', window.scrollY > 50)
    );

    // Mobile menu
    const mainNav = document.getElementById('mainNav');
    document.getElementById('menuToggle').addEventListener('click', () =>
      mainNav.classList.toggle('open')
    );
    mainNav.querySelectorAll('.nav-link').forEach(link =>
      link.addEventListener('click', () => mainNav.classList.remove('open'))
    );
    document.addEventListener('click', e => {
      if (!e.target.closest('#mainNav') && !e.target.closest('#menuToggle'))
        mainNav.classList.remove('open');
    });

    // Cart
    document.getElementById('cartToggle').addEventListener('click', () => this.openCart());
    document.getElementById('cartClose').addEventListener('click', () => this.closeCart());
    document.getElementById('cartOverlay').addEventListener('click', () => this.closeCart());
    document.getElementById('clearCartBtn').addEventListener('click', () => {
      MarinStore.clearCart(); this.refreshCart(); this.toast('Carrinho esvaziado');
    });
    document.getElementById('checkoutBtn').addEventListener('click', () => this.checkout());

    // Hero CTA
    document.getElementById('heroShopBtn').addEventListener('click', () =>
      document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' })
    );

    // Search inline
    document.getElementById('searchInput').addEventListener('input', e =>
      this.loadProducts(this.activeCat, e.target.value)
    );

    // Product modal
    document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('modalOverlay').addEventListener('click', () => this.closeModal());
    document.getElementById('modalQtyMinus').addEventListener('click', () => {
      if (this.modalQty > 1) { this.modalQty--; document.getElementById('modalQtyVal').textContent = this.modalQty; }
    });
    document.getElementById('modalQtyPlus').addEventListener('click', () => {
      if (this.activeModal && this.modalQty < this.activeModal.quantity) {
        this.modalQty++; document.getElementById('modalQtyVal').textContent = this.modalQty;
      }
    });
    document.getElementById('modalAdd').addEventListener('click', () => {
      if (!this.requireLogin()) { this.closeModal(); return; }
      if (this.activeModal) {
        MarinStore.addToCart(this.activeModal.id, this.modalQty);
        this.refreshCart(); this.closeModal();
        this.toast(`${this.activeModal.name} adicionado ao carrinho!`);
      }
    });

    // User toggle button
    document.getElementById('userToggle').addEventListener('click', e => {
      e.stopPropagation();
      const user = MarinStore.getCurrentUser();
      if (!user) { this.openAuthModal('login'); return; }
      const dd = document.getElementById('userDropdown');
      dd.classList.toggle('show');
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#userToggle') && !e.target.closest('#userDropdown'))
        document.getElementById('userDropdown').classList.remove('show');
    });

    // User dropdown actions
    document.getElementById('myOrdersBtn').addEventListener('click', () => this.openOrders());
    document.getElementById('logoutBtn').addEventListener('click', () => {
      MarinStore.logoutUser();
      this.refreshUserUI();
      this.toast('Sessão encerrada.');
    });

    // Auth modal overlay + close
    document.getElementById('authOverlay').addEventListener('click', () => this.closeAuthModal());
    document.getElementById('authClose').addEventListener('click', () => this.closeAuthModal());

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab =>
      tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab))
    );
    document.getElementById('goRegister').addEventListener('click', () => this.switchAuthTab('register'));
    document.getElementById('goLogin').addEventListener('click', () => this.switchAuthTab('login'));

    // Login form
    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      const user = MarinStore.loginUser(email, pass);
      if (!user) {
        document.getElementById('loginError').textContent = 'E-mail ou senha incorretos.';
        return;
      }
      this.closeAuthModal();
      this.refreshUserUI();
      this.toast(`Bem-vinda, ${user.name.split(' ')[0]}!`);
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const pass = document.getElementById('regPassword').value;
      const confirm = document.getElementById('regConfirm').value;
      if (pass !== confirm) {
        document.getElementById('registerError').textContent = 'As senhas não coincidem.';
        return;
      }
      const result = MarinStore.registerUser(name, email, pass);
      if (result.error) {
        document.getElementById('registerError').textContent = result.error;
        return;
      }
      this.closeAuthModal();
      this.refreshUserUI();
      this.toast(`Conta criada! Bem-vinda, ${result.user.name.split(' ')[0]}!`);
    });

    // Orders modal
    document.getElementById('ordersClose').addEventListener('click', () => this.closeOrders());
    document.getElementById('ordersOverlay').addEventListener('click', () => this.closeOrders());
  },

  // ── Toast ────────────────────────────────────────────────
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.display = 'block';
    gsap.fromTo(t, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .28 });
    setTimeout(() => gsap.to(t, { y: 8, opacity: 0, duration: .25, onComplete: () => t.style.display = 'none' }), 2400);
  },

  // ── Hero Carousel ────────────────────────────────────────
  initCarousel() {
    const slidesEl = document.getElementById('heroSlides');
    if (!slidesEl) return;

    // Inject dynamic slides from localStorage after the fixed first slide
    const saved = MarinStore.getCarouselSlides();
    saved.forEach(s => {
      const div = document.createElement('div');
      div.className = 'hero-slide hero-slide-product';
      div.innerHTML = `<img src="${s.image}" alt="${s.label || 'Produto'}">`;
      slidesEl.appendChild(div);
    });

    // If no slides saved, keep placeholder
    if (!saved.length) {
      const ph = document.createElement('div');
      ph.className = 'hero-slide hero-slide-product';
      ph.innerHTML = `<div class="hero-slide-placeholder"><i class="fa-solid fa-image"></i><span>Adicione fotos pelo painel admin</span></div>`;
      slidesEl.appendChild(ph);
    }

    const total = slidesEl.children.length;
    let current = 0;
    let timer;

    const dotsWrap = document.getElementById('carouselDots');
    const buildDots = () => {
      dotsWrap.innerHTML = Array.from({ length: slidesEl.children.length }, (_, i) =>
        `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-i="${i}"></button>`
      ).join('');
      dotsWrap.querySelectorAll('.carousel-dot').forEach(d =>
        d.addEventListener('click', () => { goTo(+d.dataset.i); resetTimer(); })
      );
    };
    buildDots();

    const goTo = (idx) => {
      const n = slidesEl.children.length;
      current = (idx + n) % n;
      slidesEl.style.transform = `translateX(-${current * 100}%)`;
      dotsWrap.querySelectorAll('.carousel-dot').forEach((d, i) =>
        d.classList.toggle('active', i === current)
      );
    };

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    document.getElementById('carouselNext').addEventListener('click', () => { next(); resetTimer(); });
    document.getElementById('carouselPrev').addEventListener('click', () => { prev(); resetTimer(); });

    let startX = 0;
    slidesEl.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    slidesEl.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); resetTimer(); }
    });

    const resetTimer = () => { clearInterval(timer); timer = setInterval(next, 4000); };
    resetTimer();
  },

  // ── GSAP Animations ──────────────────────────────────────
  initGsap() {
    gsap.timeline({ delay: .15 })
      .fromTo('.hero-slide-img-side', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: .9, ease: 'power3.out' })
      .fromTo('#heroText', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .8, ease: 'power2.out' }, '-=.6')
      .fromTo('#heroScroll', { opacity: 0 }, { opacity: 1, duration: .5 }, '-=.2');

    gsap.to('.sparkle', {
      opacity: 0, scale: 0, duration: 1.6, ease: 'power1.inOut',
      yoyo: true, repeat: -1, stagger: { each: .4, from: 'random' }
    });

    gsap.to('.scroll-line', { y: 12, opacity: .25, duration: .9, ease: 'power1.inOut', yoyo: true, repeat: -1 });

    document.querySelectorAll('.section-header').forEach(el =>
      gsap.fromTo(el, { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: .7,
        scrollTrigger: { trigger: el, start: 'top 82%', once: true }
      })
    );

    ScrollTrigger.create({
      trigger: '#categoriesGrid', start: 'top 82%', once: true,
      onEnter: () => gsap.fromTo('.category-card',
        { opacity: 0, y: 36, scale: .96 },
        { opacity: 1, y: 0, scale: 1, duration: .55, stagger: .1, ease: 'power2.out' }
      )
    });

    gsap.fromTo('#aboutVisual', { opacity: 0, x: -50 }, {
      opacity: 1, x: 0, duration: .8, ease: 'power2.out',
      scrollTrigger: { trigger: '#aboutSection', start: 'top 80%', once: true }
    });
    gsap.fromTo('#aboutContent', { opacity: 0, x: 50 }, {
      opacity: 1, x: 0, duration: .8, ease: 'power2.out',
      scrollTrigger: { trigger: '#aboutSection', start: 'top 80%', once: true }
    });

    ScrollTrigger.create({
      trigger: '.about-stats', start: 'top 82%', once: true,
      onEnter: () => {
        document.querySelectorAll('.stat-num').forEach(el => {
          const raw = parseInt(el.dataset.val || el.textContent);
          if (!isNaN(raw)) {
            const obj = { val: 0 };
            gsap.to(obj, { val: raw, duration: 2, ease: 'power1.out',
              onUpdate() { el.textContent = Math.round(obj.val) + '+'; } });
          }
        });
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
