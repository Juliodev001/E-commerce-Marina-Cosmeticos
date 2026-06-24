'use strict';
/* global MarinStore */

const Admin = {
  currentTab: 'dashboard',
  editingProduct: null,
  editingCategory: null,
  editingOrder: null,
  pendingImage: '',
  searchQ: '',
  orderSearchQ: '',

  ICONS: [
    { cls: 'fa-solid fa-spray-can-sparkles', lbl: 'Perfume' },
    { cls: 'fa-solid fa-palette',            lbl: 'Paleta' },
    { cls: 'fa-solid fa-leaf',               lbl: 'Folha' },
    { cls: 'fa-solid fa-star',               lbl: 'Estrela' },
    { cls: 'fa-solid fa-heart',              lbl: 'Coração' },
    { cls: 'fa-solid fa-gem',                lbl: 'Gema' },
    { cls: 'fa-solid fa-droplet',            lbl: 'Gota' },
    { cls: 'fa-solid fa-sun',                lbl: 'Sol' },
    { cls: 'fa-solid fa-moon',               lbl: 'Lua' },
    { cls: 'fa-solid fa-wand-magic-sparkles',lbl: 'Varinha' },
    { cls: 'fa-solid fa-jar',                lbl: 'Pote' },
    { cls: 'fa-solid fa-scissors',           lbl: 'Tesoura' },
    { cls: 'fa-solid fa-spa',                lbl: 'Spa' },
    { cls: 'fa-solid fa-face-smile',         lbl: 'Rosto' },
    { cls: 'fa-solid fa-tag',                lbl: 'Tag' },
    { cls: 'fa-solid fa-gift',               lbl: 'Presente' },
    { cls: 'fa-solid fa-fire',               lbl: 'Fogo' },
    { cls: 'fa-solid fa-crown',              lbl: 'Coroa' },
  ],

  // ── Boot ─────────────────────────────────────────────────
  init() {
    if (!MarinStore.isLoggedIn()) { this.showLogin(); return; }
    this.showAdmin();
  },

  // ── Login ────────────────────────────────────────────────
  showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('adminPage').style.display = 'none';
    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const pwd = document.getElementById('loginPwd').value;
      if (MarinStore.login(pwd)) {
        this.showAdmin();
      } else {
        const err = document.getElementById('loginErr');
        err.textContent = 'Senha incorreta. Tente novamente.';
        err.classList.add('show');
        setTimeout(() => err.classList.remove('show'), 3000);
      }
    });
  },

  showAdmin() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPage').style.display = 'flex';
    this.bindAdminEvents();
    this.switchTab('dashboard');
  },

  // ── Events ───────────────────────────────────────────────
  bindAdminEvents() {
    // Sidebar navigation
    document.querySelectorAll('.s-nav-link[data-tab]').forEach(btn =>
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab))
    );
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      MarinStore.logout();
      location.reload();
    });
    // Mobile sidebar toggle
    const tog = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('adminSidebar');
    const closeSidebar = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    };
    if (tog) tog.addEventListener('click', () => {
      const opening = !sidebar.classList.contains('open');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show', opening);
    });
    if (overlay) overlay.addEventListener('click', closeSidebar);
    // Close sidebar on nav item click (mobile)
    document.querySelectorAll('.s-nav-link').forEach(link =>
      link.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); })
    );
    // Product search
    document.getElementById('prodSearch').addEventListener('input', e => {
      this.searchQ = e.target.value;
      this.renderProductsTable();
    });
    // New product button
    document.getElementById('newProdBtn').addEventListener('click', () => this.openProductModal());
    // New category button
    document.getElementById('newCatBtn').addEventListener('click', () => this.openCatModal());
    // Settings save
    document.getElementById('settingsForm').addEventListener('submit', e => {
      e.preventDefault(); this.saveSettings();
    });
    // Change password
    document.getElementById('changePwdForm').addEventListener('submit', e => {
      e.preventDefault(); this.changePassword();
    });
    // Product modal close
    document.getElementById('prodModalClose').addEventListener('click', () => this.closeProductModal());
    document.getElementById('prodModalCancel').addEventListener('click', () => this.closeProductModal());
    document.getElementById('prodModalSave').addEventListener('click', () => this.saveProduct());
    // Category modal close
    document.getElementById('catModalClose').addEventListener('click', () => this.closeCatModal());
    document.getElementById('catModalCancel').addEventListener('click', () => this.closeCatModal());
    document.getElementById('catModalSave').addEventListener('click', () => this.saveCategory());
    // Carousel upload
    const carouselInput = document.getElementById('carouselFileInput');
    if (carouselInput) {
      carouselInput.addEventListener('change', () => {
        const file = carouselInput.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { this.toast('Use JPG, PNG ou WebP', 'error'); return; }
        if (file.size > 3 * 1024 * 1024) { this.toast('Imagem muito grande. Máximo 3 MB.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = e => {
          MarinStore.addCarouselSlide(e.target.result, file.name.replace(/\.[^.]+$/, ''));
          this.renderCarouselSection();
          this.toast('Foto adicionada ao carrossel!', 'success');
          carouselInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    // Order search
    document.getElementById('orderSearch').addEventListener('input', e => {
      this.orderSearchQ = e.target.value;
      this.renderOrdersTable();
    });
    // Order modal
    document.getElementById('orderModalClose').addEventListener('click', () => this.closeOrderModal());
    document.getElementById('orderModalCancel').addEventListener('click', () => this.closeOrderModal());
    document.getElementById('orderModalSave').addEventListener('click', () => this.saveOrder());
    // Image upload
    this.initImageUpload();
  },

  // ── Tabs ─────────────────────────────────────────────────
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.s-nav-link[data-tab]').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    document.querySelectorAll('.admin-tab').forEach(t =>
      t.classList.toggle('active', t.id === 'tab-' + tab)
    );
    const titles = {
      dashboard: ['Dashboard', 'Visão geral da sua loja'],
      products:  ['Produtos', 'Gerencie o catálogo de produtos'],
      categories:['Categorias', 'Gerencie as categorias da loja'],
      orders:    ['Pedidos', 'Gerencie os pedidos dos clientes'],
      carousel:  ['Carrossel', 'Gerencie as fotos do banner principal'],
      settings:  ['Configurações', 'Configure os dados da loja'],
    };
    const [title, sub] = titles[tab] || ['', ''];
    document.getElementById('topbarTitle').textContent = title;
    document.getElementById('topbarSub').textContent = sub;

    if (tab === 'dashboard')  this.renderDashboard();
    if (tab === 'products')   this.renderProductsTable();
    if (tab === 'categories') this.renderCategories();
    if (tab === 'orders')     this.renderOrdersTable();
    if (tab === 'carousel')   this.renderCarouselSection();
    if (tab === 'settings')   this.loadSettings();
  },

  // ── Dashboard ────────────────────────────────────────────
  renderDashboard() {
    const prods = MarinStore.getProducts();
    const cats  = MarinStore.getCategories();
    const active = prods.filter(p => p.active);
    const featured = prods.filter(p => p.featured && p.active);
    const stockVal = prods.reduce((s, p) => s + (p.price * p.quantity), 0);

    document.getElementById('statProds').textContent  = active.length;
    document.getElementById('statCats').textContent   = cats.filter(c => c.active).length;
    document.getElementById('statFeat').textContent   = featured.length;
    document.getElementById('statVal').textContent    = MarinStore.fmtPrice(stockVal);
    const ordEl = document.getElementById('statOrders');
    if (ordEl) ordEl.textContent = MarinStore.getOrders().length;

    // Recent products list
    const recent = [...prods].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
    document.getElementById('recentList').innerHTML = recent.map(p => {
      const cat = MarinStore.getCategories().find(c => c.id === p.category);
      return `
        <div class="cart-item" style="background:var(--dark-3);border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="width:44px;height:44px;border-radius:8px;background:var(--card);flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="${cat ? cat.icon : 'fa-solid fa-box'}" style="color:var(--primary);font-size:18px;"></i>`}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--white);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
            <div style="font-size:11px;color:var(--muted);">${cat ? cat.name : p.category} · ${MarinStore.fmtPrice(p.price)}</div>
          </div>
          <span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span>
        </div>`;
    }).join('') || '<p style="color:var(--muted);font-size:13px;">Nenhum produto ainda.</p>';
  },

  // ── Products Table ───────────────────────────────────────
  renderProductsTable() {
    let prods = MarinStore.getProducts();
    if (this.searchQ) {
      const q = this.searchQ.toLowerCase();
      prods = prods.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }
    const tbody = document.getElementById('prodTableBody');
    if (!prods.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-box-open"></i>Nenhum produto encontrado</td></tr>`;
      return;
    }
    tbody.innerHTML = prods.map(p => {
      const cat = MarinStore.getCategories().find(c => c.id === p.category);
      return `
        <tr data-id="${p.id}">
          <td>
            <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;background:var(--dark-3);display:flex;align-items:center;justify-content:center;">
              ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="${cat ? cat.icon : 'fa-solid fa-box'}" style="color:var(--muted);font-size:18px;"></i>`}
            </div>
          </td>
          <td>
            <div class="td-name">${p.name}</div>
            ${p.brand ? `<div class="td-brand">${p.brand}</div>` : ''}
          </td>
          <td><span class="badge badge-cat">${cat ? cat.name : p.category}</span></td>
          <td class="td-price">${MarinStore.fmtPrice(p.price)}</td>
          <td>
            <span class="${p.quantity <= 0 ? 'badge badge-inactive' : p.quantity <= 3 ? 'badge badge-low' : ''}" style="${p.quantity > 3 ? 'color:var(--text)' : ''}">
              ${p.quantity <= 0 ? 'Esgotado' : p.quantity <= 3 ? `⚠ ${p.quantity}` : p.quantity}
            </span>
          </td>
          <td><span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
          <td>
            <div class="td-actions">
              <button class="btn btn-outline btn-icon btn-sm edit-prod" data-id="${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-icon btn-sm del-prod" data-id="${p.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
    tbody.querySelectorAll('.edit-prod').forEach(btn =>
      btn.addEventListener('click', () => this.openProductModal(btn.dataset.id))
    );
    tbody.querySelectorAll('.del-prod').forEach(btn =>
      btn.addEventListener('click', () => this.deleteProduct(btn.dataset.id))
    );
  },

  // ── Product Modal ────────────────────────────────────────
  openProductModal(id) {
    this.editingProduct = id ? MarinStore.getProduct(id) : null;
    this.pendingImage = this.editingProduct?.image || '';
    const p = this.editingProduct;
    const modal = document.getElementById('prodModal');
    document.getElementById('prodModalTitle').textContent = p ? 'Editar Produto' : 'Novo Produto';

    // Populate category select
    const catSel = document.getElementById('prodCat');
    catSel.innerHTML = MarinStore.getCategories().filter(c => c.active).map(c =>
      `<option value="${c.id}" ${p && p.category === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    // Fill fields
    document.getElementById('prodName').value        = p?.name || '';
    document.getElementById('prodBrand').value       = p?.brand || '';
    document.getElementById('prodDesc').value        = p?.description || '';
    document.getElementById('prodPrice').value       = p?.price || '';
    document.getElementById('prodOrigPrice').value   = p?.originalPrice || '';
    document.getElementById('prodQty').value         = p?.quantity ?? 0;
    document.getElementById('prodFeatured').checked  = p?.featured || false;
    document.getElementById('prodActive').checked    = p?.active !== false;

    // Image preview
    this.updateImagePreview(this.pendingImage);
    modal.classList.add('open');
  },
  closeProductModal() {
    document.getElementById('prodModal').classList.remove('open');
    this.editingProduct = null; this.pendingImage = '';
  },
  saveProduct() {
    const name  = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const qty   = parseInt(document.getElementById('prodQty').value);
    if (!name || isNaN(price) || isNaN(qty)) { this.toast('Preencha os campos obrigatórios (Nome, Preço, Quantidade)', 'error'); return; }
    if (!document.getElementById('prodCat').value) { this.toast('Selecione uma categoria', 'error'); return; }
    const origPriceVal = parseFloat(document.getElementById('prodOrigPrice').value);
    const data = {
      name, brand: document.getElementById('prodBrand').value.trim(),
      description: document.getElementById('prodDesc').value.trim(),
      price, originalPrice: isNaN(origPriceVal) || origPriceVal <= 0 ? null : origPriceVal,
      quantity: qty, category: document.getElementById('prodCat').value,
      image: this.pendingImage,
      featured: document.getElementById('prodFeatured').checked,
      active: document.getElementById('prodActive').checked,
    };
    if (this.editingProduct) {
      MarinStore.updateProduct(this.editingProduct.id, data);
      this.toast('Produto atualizado com sucesso!', 'success');
    } else {
      MarinStore.addProduct(data);
      this.toast('Produto adicionado com sucesso!', 'success');
    }
    this.closeProductModal();
    this.renderProductsTable();
    if (this.currentTab === 'dashboard') this.renderDashboard();
  },
  deleteProduct(id) {
    const p = MarinStore.getProduct(id);
    if (!p) return;
    if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    MarinStore.deleteProduct(id);
    this.toast('Produto excluído', 'success');
    this.renderProductsTable();
    if (this.currentTab === 'dashboard') this.renderDashboard();
  },

  // ── Image Upload ─────────────────────────────────────────
  initImageUpload() {
    const area   = document.getElementById('imgUploadArea');
    const input  = document.getElementById('imgFileInput');
    const preview= document.getElementById('imgPreview');
    const remove = document.getElementById('imgPreviewRemove');

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault(); area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.readImageFile(file);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) this.readImageFile(input.files[0]);
    });
    remove.addEventListener('click', e => {
      e.stopPropagation();
      this.pendingImage = '';
      this.updateImagePreview('');
      input.value = '';
    });
  },
  readImageFile(file) {
    if (!file.type.startsWith('image/')) { this.toast('Arquivo inválido. Use JPG, PNG ou WebP.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { this.toast('Imagem muito grande. Máximo 2 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => { this.pendingImage = e.target.result; this.updateImagePreview(this.pendingImage); };
    reader.readAsDataURL(file);
  },
  updateImagePreview(src) {
    const area    = document.getElementById('imgUploadArea');
    const preview = document.getElementById('imgPreview');
    const previewImg = document.getElementById('imgPreviewImg');
    if (src) {
      area.style.display = 'none'; preview.style.display = 'block'; previewImg.src = src;
    } else {
      area.style.display = 'block'; preview.style.display = 'none'; previewImg.src = '';
    }
  },

  // ── Categories ───────────────────────────────────────────
  renderCategories() {
    const cats = MarinStore.getCategories();
    const prods = MarinStore.getProducts();
    const grid = document.getElementById('catsGrid');
    if (!cats.length) {
      grid.innerHTML = '<p style="color:var(--muted);">Nenhuma categoria ainda.</p>';
      return;
    }
    grid.innerHTML = cats.map(c => {
      const count = prods.filter(p => p.category === c.id && p.active).length;
      return `
        <div class="cat-admin-card">
          <div class="cat-admin-header">
            <div class="cat-admin-icon"><i class="${c.icon}"></i></div>
            <div>
              <div class="cat-admin-name">${c.name}</div>
              <span class="badge ${c.active ? 'badge-active' : 'badge-inactive'}" style="font-size:9px;">${c.active ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
          <p class="cat-admin-desc">${c.description || 'Sem descrição'}</p>
          <div class="cat-admin-footer">
            <span class="cat-prod-count"><i class="fa-solid fa-box" style="margin-right:4px;"></i>${count} produto${count !== 1 ? 's' : ''}</span>
            <div class="cat-admin-actions">
              <button class="btn btn-outline btn-icon btn-sm edit-cat" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-icon btn-sm del-cat" data-id="${c.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('.edit-cat').forEach(btn =>
      btn.addEventListener('click', () => this.openCatModal(btn.dataset.id))
    );
    grid.querySelectorAll('.del-cat').forEach(btn =>
      btn.addEventListener('click', () => this.deleteCategory(btn.dataset.id))
    );
  },

  openCatModal(id) {
    this.editingCategory = id ? MarinStore.getCategories().find(c => c.id === id) : null;
    const c = this.editingCategory;
    document.getElementById('catModalTitle').textContent = c ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('catName').value        = c?.name || '';
    document.getElementById('catDesc').value        = c?.description || '';
    document.getElementById('catActive').checked    = c?.active !== false;
    document.getElementById('catIconInput').value   = c?.icon || 'fa-solid fa-tag';
    this.updateIconPreview(c?.icon || 'fa-solid fa-tag');
    this.renderIconPicker(c?.icon || 'fa-solid fa-tag');
    document.getElementById('catModal').classList.add('open');
  },
  closeCatModal() {
    document.getElementById('catModal').classList.remove('open');
    this.editingCategory = null;
  },
  saveCategory() {
    const name = document.getElementById('catName').value.trim();
    if (!name) { this.toast('Informe o nome da categoria', 'error'); return; }
    const data = {
      name, icon: document.getElementById('catIconInput').value || 'fa-solid fa-tag',
      description: document.getElementById('catDesc').value.trim(),
      active: document.getElementById('catActive').checked,
    };
    if (this.editingCategory) {
      MarinStore.updateCategory(this.editingCategory.id, data);
      this.toast('Categoria atualizada!', 'success');
    } else {
      MarinStore.addCategory(data);
      this.toast('Categoria criada!', 'success');
    }
    this.closeCatModal();
    this.renderCategories();
    if (this.currentTab === 'dashboard') this.renderDashboard();
  },
  deleteCategory(id) {
    const prods = MarinStore.getProducts().filter(p => p.category === id);
    if (prods.length > 0) {
      this.toast(`Categoria possui ${prods.length} produto(s). Remova ou mova os produtos antes.`, 'error');
      return;
    }
    const cat = MarinStore.getCategories().find(c => c.id === id);
    if (!cat) return;
    if (!confirm(`Excluir a categoria "${cat.name}"?`)) return;
    MarinStore.deleteCategory(id);
    this.toast('Categoria excluída', 'success');
    this.renderCategories();
  },

  renderIconPicker(selected) {
    const picker = document.getElementById('iconPicker');
    picker.innerHTML = this.ICONS.map(ic => `
      <div class="icon-opt${ic.cls === selected ? ' selected' : ''}" data-cls="${ic.cls}" title="${ic.lbl}">
        <i class="${ic.cls}"></i>
      </div>
    `).join('');
    picker.querySelectorAll('.icon-opt').forEach(opt =>
      opt.addEventListener('click', () => {
        picker.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('catIconInput').value = opt.dataset.cls;
        this.updateIconPreview(opt.dataset.cls);
      })
    );
  },
  updateIconPreview(cls) {
    const prev = document.getElementById('iconPreview');
    prev.innerHTML = `<i class="${cls}"></i>`;
  },

  // ── Settings ─────────────────────────────────────────────
  loadSettings() {
    const s = MarinStore.getSettings();
    document.getElementById('sStoreName').value  = s.storeName || '';
    document.getElementById('sWhatsApp').value   = s.whatsapp  || '';
    document.getElementById('sInstagram').value  = s.instagram || '';
    document.getElementById('sFacebook').value   = s.facebook  || '';
    document.getElementById('sEmail').value      = s.email     || '';
    document.getElementById('sAddress').value    = s.address   || '';
  },
  saveSettings() {
    const s = {
      storeName: document.getElementById('sStoreName').value.trim(),
      whatsapp:  document.getElementById('sWhatsApp').value.trim(),
      instagram: document.getElementById('sInstagram').value.trim(),
      facebook:  document.getElementById('sFacebook').value.trim(),
      email:     document.getElementById('sEmail').value.trim(),
      address:   document.getElementById('sAddress').value.trim(),
    };
    MarinStore.saveSettings(s);
    this.toast('Configurações salvas!', 'success');
  },
  changePassword() {
    const curr = document.getElementById('pwdCurrent').value;
    const nw   = document.getElementById('pwdNew').value;
    const conf = document.getElementById('pwdConfirm').value;
    if (curr !== MarinStore.getPassword()) { this.toast('Senha atual incorreta', 'error'); return; }
    if (nw.length < 6) { this.toast('Nova senha deve ter no mínimo 6 caracteres', 'error'); return; }
    if (nw !== conf) { this.toast('As senhas não coincidem', 'error'); return; }
    MarinStore.setPassword(nw);
    document.getElementById('pwdCurrent').value = '';
    document.getElementById('pwdNew').value = '';
    document.getElementById('pwdConfirm').value = '';
    this.toast('Senha alterada com sucesso!', 'success');
  },

  // ── Carousel ─────────────────────────────────────────────
  renderCarouselSection() {
    const grid = document.getElementById('carouselAdminGrid');
    if (!grid) return;
    const slides = MarinStore.getCarouselSlides();
    if (!slides.length) {
      grid.innerHTML = `
        <div class="carousel-admin-item">
          <div class="carousel-admin-empty"><i class="fa-solid fa-image"></i><span>Nenhuma foto ainda</span></div>
        </div>`;
      return;
    }
    grid.innerHTML = slides.map(s => `
      <div class="carousel-admin-item">
        <img src="${s.image}" alt="${s.label || ''}">
        ${s.label ? `<div class="carousel-admin-label">${s.label}</div>` : ''}
        <button class="carousel-admin-remove" data-id="${s.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join('');
    grid.querySelectorAll('.carousel-admin-remove').forEach(btn =>
      btn.addEventListener('click', () => {
        if (!confirm('Remover esta foto do carrossel?')) return;
        MarinStore.removeCarouselSlide(btn.dataset.id);
        this.renderCarouselSection();
        this.toast('Foto removida', 'success');
      })
    );
  },

  // ── Orders ───────────────────────────────────────────────
  renderOrdersTable() {
    let orders = MarinStore.getOrders();
    if (this.orderSearchQ) {
      const q = this.orderSearchQ.toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q)
      );
    }
    orders = [...orders].reverse();
    const tbody = document.getElementById('ordersTableBody');
    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-receipt"></i>Nenhum pedido ainda</td></tr>`;
      return;
    }
    const statusClass = s => ({ 'Processando': 'badge-low', 'Enviado': 'badge-cat', 'Entregue': 'badge-active', 'Cancelado': 'badge-inactive' }[s] || 'badge-low');
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><span style="font-size:.8rem;font-weight:700;">${o.id}</span></td>
        <td><div class="td-name">${o.customerName || '—'}</div></td>
        <td style="font-size:.8rem;color:var(--muted);">${new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
        <td class="td-price">${MarinStore.fmtPrice(o.total)}</td>
        <td><span class="badge ${statusClass(o.status)}">${o.status}</span></td>
        <td style="font-size:.8rem;color:var(--muted);">${o.trackingCode || '—'}</td>
        <td>
          <button class="btn btn-outline btn-icon btn-sm edit-order" data-id="${o.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('.edit-order').forEach(btn =>
      btn.addEventListener('click', () => this.openOrderModal(btn.dataset.id))
    );
  },

  openOrderModal(id) {
    const orders = MarinStore.getOrders();
    this.editingOrder = orders.find(o => o.id === id) || null;
    if (!this.editingOrder) return;
    const o = this.editingOrder;
    document.getElementById('orderModalId').textContent = o.id;
    document.getElementById('orderStatus').value   = o.status || 'Processando';
    document.getElementById('orderTracking').value = o.trackingCode || '';
    document.getElementById('orderItemsList').innerHTML =
      `<strong>Itens:</strong><br>` +
      o.items.map(i => `${i.qty}x ${i.name}${i.brand ? ` (${i.brand})` : ''} — ${MarinStore.fmtPrice(i.price * i.qty)}`).join('<br>') +
      `<br><strong>Total: ${MarinStore.fmtPrice(o.total)}</strong>`;
    document.getElementById('orderModal').classList.add('open');
  },

  closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
    this.editingOrder = null;
  },

  saveOrder() {
    if (!this.editingOrder) return;
    MarinStore.updateOrder(this.editingOrder.id, {
      status: document.getElementById('orderStatus').value,
      trackingCode: document.getElementById('orderTracking').value.trim(),
    });
    this.toast('Pedido atualizado!', 'success');
    this.closeOrderModal();
    this.renderOrdersTable();
  },

  // ── Toast ────────────────────────────────────────────────
  toast(msg, type = 'success') {
    const t = document.getElementById('adminToast');
    t.textContent = msg; t.className = `a-toast ${type}`;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  },
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
