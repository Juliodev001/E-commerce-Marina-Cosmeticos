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
    this.updateFooter();
    this.bindEvents();
    this.initGsap();
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
    const s = document.getElementById('cartSidebar'), o = document.getElementById('cartOverlay');
    o.classList.add('active');
    gsap.fromTo(s, { x: '100%' }, { x: '0%', duration: .35, ease: 'power2.out' });
  },
  closeCart() {
    const s = document.getElementById('cartSidebar'), o = document.getElementById('cartOverlay');
    gsap.to(s, { x: '100%', duration: .28, ease: 'power2.in', onComplete: () => o.classList.remove('active') });
  },

  quickAdd(id) {
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
    const cart = MarinStore.getCart();
    if (!cart.length) { this.toast('Carrinho vazio!'); return; }
    const s = MarinStore.getSettings();
    let msg = '🌸 *Olá! Gostaria de fazer um pedido na Marina Cosméticos:*\n\n';
    cart.forEach(item => {
      const p = MarinStore.getProduct(item.productId);
      if (p) msg += `▪ *${p.name}*${p.brand ? ` (${p.brand})` : ''}\n  ${item.qty}x ${MarinStore.fmtPrice(p.price)} = ${MarinStore.fmtPrice(p.price * item.qty)}\n\n`;
    });
    msg += `💰 *Total: ${MarinStore.fmtPrice(MarinStore.getCartTotal())}*`;
    window.open(`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
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
    // Close mobile menu when a nav link is clicked
    mainNav.querySelectorAll('.nav-link').forEach(link =>
      link.addEventListener('click', () => mainNav.classList.remove('open'))
    );
    // Close mobile menu on outside click
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
    // Modal
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
      if (this.activeModal) {
        MarinStore.addToCart(this.activeModal.id, this.modalQty);
        this.refreshCart(); this.closeModal();
        this.toast(`${this.activeModal.name} adicionado ao carrinho!`);
      }
    });
  },

  // ── Toast ────────────────────────────────────────────────
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.display = 'block';
    gsap.fromTo(t, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .28 });
    setTimeout(() => gsap.to(t, { y: 8, opacity: 0, duration: .25, onComplete: () => t.style.display = 'none' }), 2400);
  },

  // ── GSAP Animations ──────────────────────────────────────
  initGsap() {
    // Hero timeline
    gsap.timeline({ delay: .15 })
      .fromTo('#heroLogo', { opacity: 0, scale: .82 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' })
      .fromTo('#heroText', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: .8, ease: 'power2.out' }, '-=.45')
      .fromTo('#heroScroll', { opacity: 0 }, { opacity: 1, duration: .5 }, '-=.2');

    // Sparkles twinkle
    gsap.to('.sparkle', {
      opacity: 0, scale: 0, duration: 1.6, ease: 'power1.inOut',
      yoyo: true, repeat: -1, stagger: { each: .4, from: 'random' }
    });

    // Scroll-indicator pulse
    gsap.to('.scroll-line', { y: 12, opacity: .25, duration: .9, ease: 'power1.inOut', yoyo: true, repeat: -1 });

    // Section headers on scroll
    document.querySelectorAll('.section-header').forEach(el =>
      gsap.fromTo(el, { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: .7,
        scrollTrigger: { trigger: el, start: 'top 82%', once: true }
      })
    );

    // Category cards stagger
    ScrollTrigger.create({
      trigger: '#categoriesGrid', start: 'top 82%', once: true,
      onEnter: () => gsap.fromTo('.category-card',
        { opacity: 0, y: 36, scale: .96 },
        { opacity: 1, y: 0, scale: 1, duration: .55, stagger: .1, ease: 'power2.out' }
      )
    });

    // About section
    gsap.fromTo('#aboutVisual', { opacity: 0, x: -50 }, {
      opacity: 1, x: 0, duration: .8, ease: 'power2.out',
      scrollTrigger: { trigger: '#aboutSection', start: 'top 80%', once: true }
    });
    gsap.fromTo('#aboutContent', { opacity: 0, x: 50 }, {
      opacity: 1, x: 0, duration: .8, ease: 'power2.out',
      scrollTrigger: { trigger: '#aboutSection', start: 'top 80%', once: true }
    });

    // Animated counters
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
