'use strict';

const MarinStore = {
  KEYS: {
    products:    'marina_products',
    categories:  'marina_categories',
    settings:    'marina_settings',
    users:       'marina_users',
    userSession: 'marina_user_session',
    orders:      'marina_orders',
  },

  getCartKey() {
    const u = this.getCurrentUser();
    return u ? `marina_cart_${u.id}` : 'marina_cart_guest';
  },

  DEFAULT_CATEGORIES: [
    { id: 'perfumes', name: 'Perfumes', icon: 'fa-solid fa-spray-can-sparkles', description: 'Fragrâncias exclusivas nacionais e importadas', active: true, order: 0 },
    { id: 'maquiagens', name: 'Maquiagens', icon: 'fa-solid fa-palette', description: 'Produtos de maquiagem profissional', active: true, order: 1 },
    { id: 'skincare', name: 'Skincare', icon: 'fa-solid fa-leaf', description: 'Cuidados completos para a pele', active: true, order: 2 },
  ],

  DEFAULT_PRODUCTS: [
    { id: 'p1', name: 'Chanel N°5', brand: 'Chanel', description: 'O perfume mais icônico do mundo. Floral aldeídico com notas de ylang-ylang, rosa e jasmim. Uma obra-prima da perfumaria francesa.', price: 450.00, originalPrice: 520.00, quantity: 5, category: 'perfumes', image: '', featured: true, active: true, createdAt: '2024-01-01T00:00:00Z' },
    { id: 'p2', name: 'La Vie Est Belle', brand: 'Lancôme', description: 'Uma declaração de liberdade e felicidade. Iris, pralinê e patchouli criam uma sinfonia inesquecível de elegância feminina.', price: 380.00, originalPrice: null, quantity: 8, category: 'perfumes', image: '', featured: true, active: true, createdAt: '2024-01-02T00:00:00Z' },
    { id: 'p3', name: 'Good Girl', brand: 'Carolina Herrera', description: 'Audacioso e sedutor. Jasmim sambac, cacau e tonka bean em um frasco icônico em formato de stiletto.', price: 320.00, originalPrice: 360.00, quantity: 3, category: 'perfumes', image: '', featured: false, active: true, createdAt: '2024-01-03T00:00:00Z' },
    { id: 'p4', name: 'Olympéa', brand: 'Paco Rabanne', description: 'Para a deusa moderna. Floral aquático com baunilha salgada, gengibre branco e sândalo cremoso.', price: 290.00, originalPrice: null, quantity: 6, category: 'perfumes', image: '', featured: false, active: true, createdAt: '2024-01-04T00:00:00Z' },
    { id: 'p5', name: 'Base Líquida Fit Me', brand: 'Maybelline', description: 'Cobertura natural com controle de oleosidade. Fórmula leve e respirável disponível em mais de 40 tonalidades para todos os tons de pele.', price: 49.90, originalPrice: 59.90, quantity: 15, category: 'maquiagens', image: '', featured: true, active: true, createdAt: '2024-01-05T00:00:00Z' },
    { id: 'p6', name: 'Batom Ruby Woo', brand: 'MAC', description: 'Ruby Woo — o batom vermelho clássico que nunca sai de moda. Acabamento matte intenso e duradouro, fórmula ultra-confortável.', price: 89.00, originalPrice: null, quantity: 12, category: 'maquiagens', image: '', featured: true, active: true, createdAt: '2024-01-06T00:00:00Z' },
    { id: 'p7', name: 'Paleta Naked 3', brand: 'Urban Decay', description: '12 tons de rosas, mauves e champagnes com acabamentos matte e shimmer para olhos irresistíveis de dia e de noite.', price: 259.00, originalPrice: 299.00, quantity: 4, category: 'maquiagens', image: '', featured: false, active: true, createdAt: '2024-01-07T00:00:00Z' },
    { id: 'p8', name: 'Sérum Vitamina C 10%', brand: 'La Roche-Posay', description: 'Ilumina, uniformiza e protege com 10% de vitamina C pura. Fórmula antioxidante que combate manchas e sinais de envelhecimento.', price: 149.00, originalPrice: null, quantity: 9, category: 'skincare', image: '', featured: true, active: true, createdAt: '2024-01-08T00:00:00Z' },
    { id: 'p9', name: 'Hidratante FPS 50+', brand: 'Neutrogena', description: 'Hidratação profunda com proteção solar de alta performance. Fórmula não oleosa, de rápida absorção, ideal para uso diário.', price: 79.90, originalPrice: 89.90, quantity: 11, category: 'skincare', image: '', featured: false, active: true, createdAt: '2024-01-09T00:00:00Z' },
    { id: 'p10', name: 'Água Micelar Rosas', brand: 'Biossance', description: 'Remove maquiagem, sujidades e impurezas delicadamente, sem agredir a barreira natural da pele. Com água de rosas orgânica.', price: 129.00, originalPrice: null, quantity: 7, category: 'skincare', image: '', featured: false, active: true, createdAt: '2024-01-10T00:00:00Z' },
  ],

  // ── Categories ──────────────────────────────────────────
  getCategories() {
    const s = localStorage.getItem(this.KEYS.categories);
    return s ? JSON.parse(s) : [...this.DEFAULT_CATEGORIES];
  },
  saveCategories(cats) {
    localStorage.setItem(this.KEYS.categories, JSON.stringify(cats));
  },
  addCategory(data) {
    const cats = this.getCategories();
    const cat = {
      id: data.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now(),
      name: data.name, icon: data.icon || 'fa-solid fa-tag',
      description: data.description || '', active: data.active !== false,
      order: cats.length,
    };
    cats.push(cat);
    this.saveCategories(cats);
    return cat;
  },
  updateCategory(id, data) {
    const cats = this.getCategories();
    const i = cats.findIndex(c => c.id === id);
    if (i !== -1) { cats[i] = { ...cats[i], ...data }; this.saveCategories(cats); return cats[i]; }
  },
  deleteCategory(id) {
    this.saveCategories(this.getCategories().filter(c => c.id !== id));
  },

  // ── Products ─────────────────────────────────────────────
  getProducts() {
    const s = localStorage.getItem(this.KEYS.products);
    return s ? JSON.parse(s) : [...this.DEFAULT_PRODUCTS];
  },
  saveProducts(prods) {
    localStorage.setItem(this.KEYS.products, JSON.stringify(prods));
  },
  getProduct(id) {
    return this.getProducts().find(p => p.id === id) || null;
  },
  addProduct(data) {
    const prods = this.getProducts();
    const prod = { ...data, id: 'p' + Date.now(), createdAt: new Date().toISOString(), active: data.active !== false };
    prods.push(prod);
    this.saveProducts(prods);
    return prod;
  },
  updateProduct(id, data) {
    const prods = this.getProducts();
    const i = prods.findIndex(p => p.id === id);
    if (i !== -1) { prods[i] = { ...prods[i], ...data }; this.saveProducts(prods); return prods[i]; }
  },
  deleteProduct(id) {
    this.saveProducts(this.getProducts().filter(p => p.id !== id));
  },

  // ── Cart ─────────────────────────────────────────────────
  getCart() {
    return JSON.parse(localStorage.getItem(this.getCartKey()) || '[]');
  },
  saveCart(cart) {
    localStorage.setItem(this.getCartKey(), JSON.stringify(cart));
  },
  addToCart(productId, qty = 1) {
    const cart = this.getCart();
    const item = cart.find(i => i.productId === productId);
    if (item) { item.qty += qty; } else { cart.push({ productId, qty }); }
    this.saveCart(cart);
    return cart;
  },
  updateCartItem(productId, qty) {
    if (qty <= 0) { return this.removeFromCart(productId); }
    const cart = this.getCart();
    const item = cart.find(i => i.productId === productId);
    if (item) { item.qty = qty; this.saveCart(cart); }
    return this.getCart();
  },
  removeFromCart(productId) {
    this.saveCart(this.getCart().filter(i => i.productId !== productId));
    return this.getCart();
  },
  clearCart() { this.saveCart([]); },
  getCartCount() { return this.getCart().reduce((s, i) => s + i.qty, 0); },
  getCartTotal() {
    return this.getCart().reduce((s, item) => {
      const p = this.getProduct(item.productId);
      return s + (p ? p.price * item.qty : 0);
    }, 0);
  },

  // ── Admin Auth ────────────────────────────────────────────
  getPassword() { return localStorage.getItem('marina_admin_pass') || 'marina2001'; },
  setPassword(pwd) { localStorage.setItem('marina_admin_pass', pwd); },
  isLoggedIn() { return sessionStorage.getItem('marina_admin_ok') === '1'; },
  login(pwd) {
    if (pwd === this.getPassword()) { sessionStorage.setItem('marina_admin_ok', '1'); return true; }
    return false;
  },
  logout() { sessionStorage.removeItem('marina_admin_ok'); },

  // ── Customer Auth ─────────────────────────────────────────
  getUsers() { return JSON.parse(localStorage.getItem(this.KEYS.users) || '[]'); },
  saveUsers(u) { localStorage.setItem(this.KEYS.users, JSON.stringify(u)); },
  getCurrentUser() {
    const s = localStorage.getItem(this.KEYS.userSession);
    return s ? JSON.parse(s) : null;
  },
  setCurrentUser(user) { localStorage.setItem(this.KEYS.userSession, JSON.stringify(user)); },
  registerUser(name, email, password) {
    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { error: 'E-mail já cadastrado.' };
    const user = { id: 'u' + Date.now(), name: name.trim(), email: email.toLowerCase().trim(), password, createdAt: new Date().toISOString() };
    users.push(user);
    this.saveUsers(users);
    this.setCurrentUser(user);
    return { user };
  },
  loginUser(email, password) {
    const user = this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
    if (!user) return null;
    this.setCurrentUser(user);
    return user;
  },
  logoutUser() { localStorage.removeItem(this.KEYS.userSession); },

  // ── Orders ────────────────────────────────────────────────
  getOrders() { return JSON.parse(localStorage.getItem(this.KEYS.orders) || '[]'); },
  saveOrders(orders) { localStorage.setItem(this.KEYS.orders, JSON.stringify(orders)); },
  getUserOrders(userId) { return this.getOrders().filter(o => o.userId === userId); },
  createOrder(userId, customerName, items, total) {
    const orders = this.getOrders();
    const order = {
      id: 'ORD-' + Date.now(),
      userId,
      customerName,
      items,
      total,
      status: 'Processando',
      trackingCode: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.push(order);
    this.saveOrders(orders);
    return order;
  },
  updateOrder(id, data) {
    const orders = this.getOrders();
    const i = orders.findIndex(o => o.id === id);
    if (i !== -1) {
      orders[i] = { ...orders[i], ...data, updatedAt: new Date().toISOString() };
      this.saveOrders(orders);
      return orders[i];
    }
    return null;
  },

  // ── Settings ─────────────────────────────────────────────
  getSettings() {
    const s = localStorage.getItem(this.KEYS.settings);
    return s ? JSON.parse(s) : { storeName: 'Marina Cosméticos', whatsapp: '5511999999999', instagram: '', facebook: '', email: 'contato@marina.com.br', address: 'Sua cidade, Estado' };
  },
  saveSettings(obj) { localStorage.setItem(this.KEYS.settings, JSON.stringify(obj)); },

  // ── Helpers ──────────────────────────────────────────────
  fmtPrice(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); },
};
