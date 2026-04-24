// ── Demo Data ──────────────────────────────────────────────
const demoUsers = [
  { email: 'demo@customer.com', password: 'password123', name: 'John Doe',   role: 'customer', phone: '9876543210', address: '123 Main St, Delhi', aadhaar: '123456789012' },
  { email: 'demo@delivery.com', password: 'password123', name: 'Raj Kumar',  role: 'delivery', phone: '9876543211', address: '456 Oak Ave, Delhi', aadhaar: '234567890123' },
  { email: 'admin@admin.com',   password: 'admin123',    name: 'Admin User', role: 'admin',    phone: '9876543212', address: '789 Pine St, Delhi', aadhaar: '345678901234' }
];

let currentUser = null, orders = [], users = [];

function initializeDemoData() {
  if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify(demoUsers));
  if (!localStorage.getItem('orders')) localStorage.setItem('orders', JSON.stringify([
    { id: 'ORD-20260320-001', customerId: 'demo@customer.com', product: '14.2kg', quantity: 1, status: 'in-progress', address: '123 Main St, New Delhi', date: '2026-03-20', driver: 'John Smith', vehicle: 'DL-01-AB-1234' },
    { id: 'ORD-20260321-001', customerId: 'demo@customer.com', product: '5kg',    quantity: 2, status: 'pending',     address: '123 Main St, New Delhi', date: '2026-03-21', driver: null,         vehicle: null },
    { id: 'ORD-20260318-001', customerId: 'demo@customer.com', product: '19kg',   quantity: 1, status: 'completed',   address: '123 Main St, New Delhi', date: '2026-03-18', driver: 'Mike Johnson', vehicle: 'DL-01-CD-5678' }
  ]));

  // Migrate existing users to include Aadhaar if missing
  let existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
  let needsUpdate = false;
  existingUsers = existingUsers.map(user => {
    if (!user.aadhaar) {
      // Assign demo Aadhaar for existing users
      const demoUser = demoUsers.find(du => du.email === user.email);
      if (demoUser) {
        user.aadhaar = demoUser.aadhaar;
        needsUpdate = true;
      }
    }
    return user;
  });
  if (needsUpdate) {
    localStorage.setItem('users', JSON.stringify(existingUsers));
  }

  loadUserAndOrders();
}

function loadUserAndOrders() {
  users  = JSON.parse(localStorage.getItem('users'))  || [];
  orders = JSON.parse(localStorage.getItem('orders')) || [];

  // Auto-cleanup completed orders older than 25 days
  cleanupOldCompletedOrders();
}

function cleanupOldCompletedOrders() {
  const now = new Date();
  const twentyFiveDaysAgo = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000)); // 25 days in milliseconds

  const originalLength = orders.length;
  orders = orders.filter(order => {
    // Keep orders that are NOT completed OR are completed but within 25 days
    if (order.status !== 'completed') {
      return true; // Keep all non-completed orders
    }

    // For completed orders, check if they're within 25 days
    const orderDate = new Date(order.date);
    return orderDate >= twentyFiveDaysAgo;
  });

  // Save cleaned orders back to localStorage if any were removed
  if (orders.length !== originalLength) {
    localStorage.setItem('orders', JSON.stringify(orders));
    console.log(`Auto-cleanup: Removed ${originalLength - orders.length} completed orders older than 25 days`);
  }
}

function goTo(page) { window.location.href = page; }

// ── Auth ────────────────────────────────────────────────────
function handleRegister(event) {
  event.preventDefault();
  const name     = document.getElementById('fullName').value;
  const email    = document.getElementById('email').value;
  const phone    = document.getElementById('phone').value;
  const address  = document.getElementById('address').value;
  const role     = document.getElementById('registerRole').value;
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('confirmPassword').value;
  const aadhaar  = document.getElementById('aadhaar').value;

  // Validate Aadhaar number
  if (!/^\d{12}$/.test(aadhaar)) {
    document.getElementById('regError').textContent = 'Aadhaar number must be exactly 12 digits!';
    return;
  }

  if (password !== confirm) {
    document.getElementById('regError').textContent = 'Passwords do not match!';
    return;
  }
  loadUserAndOrders();
  if (users.find(u => u.email === email)) {
    document.getElementById('regError').textContent = 'Email already registered!';
    return;
  }
  if (users.find(u => u.aadhaar === aadhaar)) {
    document.getElementById('regError').textContent = 'Aadhaar number already registered!';
    return;
  }
  users.push({ email, password, name, role, phone, address, aadhaar });
  localStorage.setItem('users', JSON.stringify(users));
  alert('Registration successful! Please login.');
  window.location.href = 'login.html';
}

function handleLogin(event) {
  event.preventDefault();
  const identifier = document.getElementById('loginEmail').value.trim();
  const password   = document.getElementById('loginPassword').value;
  loadUserAndOrders();

  // Check if identifier is email or Aadhaar
  const isEmail = identifier.includes('@');
  const isAadhaar = /^\d{12}$/.test(identifier);

  if (!isEmail && !isAadhaar) {
    document.getElementById('loginError').textContent = 'Please enter a valid email or 12-digit Aadhaar number!';
    return;
  }

  let user;
  if (isEmail) {
    user = users.find(u => u.email === identifier && u.password === password);
  } else if (isAadhaar) {
    user = users.find(u => u.aadhaar === identifier && u.password === password);
  }

  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    window.location.href = 'dashboard.html';
  } else {
    document.getElementById('loginError').textContent = 'Invalid credentials!';
  }
}

function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

function checkUser() {
  const stored = localStorage.getItem('currentUser');
  if (!stored) { window.location.href = 'login.html'; return false; }
  currentUser = JSON.parse(stored);
  loadUserAndOrders();
  return true;
}

// ── Dashboard Sections ─────────────────────────────────────
let currentSection = 'overview';

function showSection(sectionId) {
  currentSection = sectionId;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

  if (sectionId === 'overview')          loadDashboardOverview();
  else if (sectionId === 'orders')       loadCustomerOrders();
  else if (sectionId === 'track')        initDashboardMap();
  else if (sectionId === 'manage-orders') loadAllOrders();
  else if (sectionId === 'manage-users')  loadAllUsers();
  else if (sectionId === 'analytics')    loadAnalytics();
  else if (sectionId === 'profile')      loadProfile();
  else if (sectionId === 'delivery-home') loadDeliveryHome();
  else if (sectionId === 'new-orders')    loadDeliveryQueue();
  else if (sectionId === 'delivery-history') loadDeliveryHistory();
}

function loadDashboardOverview() {
  const userOrders = currentUser.role === 'admin'
    ? orders
    : orders.filter(o => o.customerId === currentUser.email);
  document.getElementById('totalOrders').textContent = userOrders.length;
  document.getElementById('inProgress').textContent  = userOrders.filter(o => o.status === 'in-progress').length;
  document.getElementById('completed').textContent   = userOrders.filter(o => o.status === 'completed').length;
  document.getElementById('pending').textContent     = userOrders.filter(o => o.status === 'pending').length;
}

function loadDashboard() {
  if (!checkUser()) return;
  document.getElementById('userGreeting').textContent = `👋 ${currentUser.name}`;
  if (currentUser.role === 'admin')    document.getElementById('adminMenu').style.display = 'block';
  if (currentUser.role === 'delivery') {
    document.getElementById('deliveryMenu').style.display = 'block';
    showSection('delivery-home');
    updateNewOrdersBadge();
    return;
  }

  // Check 25-day restriction for customers
  if (currentUser.role === 'customer') {
    const customerOrders = orders.filter(o => o.customerId === currentUser.email);
    const now = new Date();
    const twentyFiveDaysAgo = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000));

    const recentOrder = customerOrders.find(order => {
      const orderDate = new Date(order.date);
      return orderDate >= twentyFiveDaysAgo;
    });

    const orderButton = document.querySelector('[onclick="showOrderForm()"]');
    if (recentOrder && orderButton) {
      const daysSinceLastOrder = Math.ceil((now - new Date(recentOrder.date)) / (1000 * 60 * 60 * 24));
      const daysRemaining = 25 - daysSinceLastOrder;
      const nextOrderDate = new Date(new Date(recentOrder.date).getTime() + (25 * 24 * 60 * 60 * 1000));

      orderButton.innerHTML = `<i class="fas fa-clock"></i> Next Order Available: ${nextOrderDate.toLocaleDateString()} (${daysRemaining} days)`;
      orderButton.style.background = 'var(--muted)';
      orderButton.style.cursor = 'not-allowed';
      orderButton.onclick = () => {
        alert(`You cannot place a new order yet.\n\nLast Order: ${recentOrder.id} on ${recentOrder.date}\nDays Remaining: ${daysRemaining}\nNext Order Available: ${nextOrderDate.toLocaleDateString()}`);
      };
    } else if (orderButton) {
      orderButton.innerHTML = `<i class="fas fa-plus"></i> Place New Order`;
      orderButton.style.background = '';
      orderButton.style.cursor = '';
      orderButton.onclick = showOrderForm;
    }
  }

  showSection('overview');
}

// ── Profile ────────────────────────────────────────────────
function loadProfile() {
  ['profileName','profileEmail','profilePhone','profileAddress','profileRole','profileAadhaar'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.readOnly = true;
  });
  document.getElementById('profileName').value     = currentUser.name;
  document.getElementById('profileEmail').value    = currentUser.email;
  document.getElementById('profilePhone').value    = currentUser.phone;
  document.getElementById('profileAddress').value  = currentUser.address;
  document.getElementById('profileRole').value     = currentUser.role;
  document.getElementById('profileAadhaar').value  = currentUser.aadhaar;
  document.getElementById('editProfileBtn').style.display   = 'inline-flex';
  document.getElementById('saveProfileBtn').style.display   = 'none';
  document.getElementById('cancelProfileBtn').style.display = 'none';
  document.getElementById('profileStatus').style.display    = 'none';
}

function editProfile() {
  ['profileName','profilePhone','profileAddress','profileAadhaar'].forEach(id => document.getElementById(id).readOnly = false);
  document.getElementById('editProfileBtn').style.display   = 'none';
  document.getElementById('saveProfileBtn').style.display   = 'inline-flex';
  document.getElementById('cancelProfileBtn').style.display = 'inline-flex';
  showProfileMsg('Editing — update your details then click Save.', '#0dcaf0', 'rgba(13,202,240,0.1)', 'rgba(13,202,240,0.3)');
}

function saveProfile() {
  const name    = document.getElementById('profileName').value.trim();
  const phone   = document.getElementById('profilePhone').value.trim();
  const address = document.getElementById('profileAddress').value.trim();
  const aadhaar = document.getElementById('profileAadhaar').value.trim();

  if (!name || !phone || !address || !aadhaar) {
    showProfileMsg('Name, Phone, Address and Aadhaar are required.', '#ff6b6b', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.3)');
    return;
  }

  // Validate Aadhaar format
  if (!/^\d{12}$/.test(aadhaar)) {
    showProfileMsg('Aadhaar number must be exactly 12 digits!', '#ff6b6b', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.3)');
    return;
  }

  // Check if Aadhaar is already used by another user
  const existingUser = users.find(u => u.aadhaar === aadhaar && u.email !== currentUser.email);
  if (existingUser) {
    showProfileMsg('This Aadhaar number is already registered to another account!', '#ff6b6b', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.3)');
    return;
  }

  currentUser.name     = name;
  currentUser.phone    = phone;
  currentUser.address  = address;
  currentUser.aadhaar  = aadhaar;
  users = users.map(u => u.email === currentUser.email ? currentUser : u);
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  showProfileMsg('Profile updated successfully! ✓', 'var(--success)', 'rgba(0,214,143,0.1)', 'rgba(0,214,143,0.3)');
  cancelProfileEdit();
}

function cancelProfileEdit() {
  loadProfile();
}

function showProfileMsg(msg, color, bg, border) {
  const el = document.getElementById('profileStatus');
  el.textContent = msg;
  el.style.color = color; el.style.background = bg; el.style.border = `1px solid ${border}`;
  el.style.padding = '0.75rem 1rem'; el.style.borderRadius = '8px';
  el.style.display = 'block';
}

// ── Orders ─────────────────────────────────────────────────
function showOrderForm() {
  // Check 25-day restriction for registered customers
  if (currentUser.role === 'customer') {
    const customerOrders = orders.filter(o => o.customerId === currentUser.email);
    const now = new Date();
    const twentyFiveDaysAgo = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000));

    const recentOrder = customerOrders.find(order => {
      const orderDate = new Date(order.date);
      return orderDate >= twentyFiveDaysAgo;
    });

    if (recentOrder) {
      const daysSinceLastOrder = Math.ceil((now - new Date(recentOrder.date)) / (1000 * 60 * 60 * 24));
      const daysRemaining = 25 - daysSinceLastOrder;
      const nextOrderDate = new Date(new Date(recentOrder.date).getTime() + (25 * 24 * 60 * 60 * 1000));
      const formattedNextDate = nextOrderDate.toLocaleDateString();

      alert(`You cannot place a new order yet.\n\nLast Order: ${recentOrder.id} on ${recentOrder.date}\nDays Remaining: ${daysRemaining}\nNext Order Available: ${formattedNextDate}\n\nPlease wait until 25 days have passed since your last order.`);
      return;
    }
  }

  document.getElementById('orderForm').style.display = 'block';
}
function hideOrderForm()  { document.getElementById('orderForm').style.display = 'none'; }

function handlePlaceOrder(event) {
  event.preventDefault();
  const type     = document.getElementById('cylinderType').value;
  const quantity = document.getElementById('quantity').value;
  const address  = document.getElementById('deliveryAddress').value;
  const date     = document.getElementById('deliveryDate').value;

  // Check 25-day restriction for registered customers
  if (currentUser.role === 'customer') {
    const customerOrders = orders.filter(o => o.customerId === currentUser.email);
    const now = new Date();
    const twentyFiveDaysAgo = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000)); // 25 days in milliseconds

    // Check if customer has any orders within the last 25 days
    const recentOrder = customerOrders.find(order => {
      const orderDate = new Date(order.date);
      return orderDate >= twentyFiveDaysAgo;
    });

    if (recentOrder) {
      const daysSinceLastOrder = Math.ceil((now - new Date(recentOrder.date)) / (1000 * 60 * 60 * 24));
      const daysRemaining = 25 - daysSinceLastOrder;
      alert(`You cannot place a new order yet. You must wait ${daysRemaining} more days after your last order (${recentOrder.date}).\n\nLast Order: ${recentOrder.id} on ${recentOrder.date}`);
      return;
    }
  }

  const orderId = generateOrderId();
  const createdAt = new Date().toISOString().slice(0, 10);
  orders.push({ id: orderId, customerId: currentUser.email, product: type, quantity, status: 'pending', address, date, driver: null, vehicle: null, createdAt });
  localStorage.setItem('orders', JSON.stringify(orders));
  alert('Order placed! Your Order ID: ' + orderId);
  hideOrderForm();
  loadCustomerOrders();
}

function loadCustomerOrders() {
  const container = document.getElementById('customerOrders');
  let userOrders = (currentUser.role === 'delivery' || currentUser.role === 'admin')
    ? orders : orders.filter(o => o.customerId === currentUser.email);
  container.innerHTML = userOrders.length ? '' : '<p style="color:var(--text-light);padding:1rem 0;">No orders found.</p>';

  userOrders.forEach(order => {
    const customer  = users.find(u => u.email === order.customerId)?.name || 'Unknown';
    const canAssign = currentUser.role === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled';
    const assignBtn = canAssign ? `<button class="btn btn-secondary" style="padding:5px 14px;margin-top:0.5rem;font-size:0.82rem;" onclick="assignOrder('${order.id}')">Assign to Me</button>` : '';
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML =
      `<div class="order-details">
        <h4>${order.id} <span style="font-weight:400;color:var(--text-light);">— ${order.product}</span></h4>
        <p>Customer: ${customer} &nbsp;|&nbsp; Qty: ${order.quantity} &nbsp;|&nbsp; Date: ${order.date}</p>
        <p>Address: ${order.address}</p>
        ${order.driver ? `<p>Driver: <strong>${order.driver}</strong> &nbsp;|&nbsp; Vehicle: ${order.vehicle}</p>` : ''}
        ${assignBtn}
      </div>
      <span class="status-badge status-${order.status}">${order.status.replace('-', ' ').toUpperCase()}</span>`;
    container.appendChild(div);
  });
}

function loadAllOrders() {
  const container = document.getElementById('allOrdersList');
  container.innerHTML = '';
  orders.forEach(order => {
    const customerName = users.find(u => u.email === order.customerId)?.name || 'Unknown';
    const assignBtn = (currentUser.role === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled')
      ? `<button class="btn btn-secondary" style="padding:5px 14px;font-size:0.82rem;" onclick="assignOrder('${order.id}')">Assign to Me</button>` : '';
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div class="order-details">
        <h4>${order.id} — ${order.product}</h4>
        <p><strong>Customer:</strong> ${customerName} &nbsp;|&nbsp; <strong>Qty:</strong> ${order.quantity} &nbsp;|&nbsp; <strong>Date:</strong> ${order.date}</p>
        <p><strong>Address:</strong> ${order.address}</p>
        ${order.driver ? `<p><strong>Driver:</strong> ${order.driver} &nbsp;|&nbsp; <strong>Vehicle:</strong> ${order.vehicle}</p>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <span class="status-badge status-${order.status}">${order.status.replace('-', ' ').toUpperCase()}</span>
        <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding:6px 10px;border-radius:7px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:0.82rem;font-family:'Inter',sans-serif;">
          <option value="">Change Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        ${assignBtn}
      </div>`;
    container.appendChild(div);
  });
}

function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    if (newStatus === 'assigned' && !order.driver && currentUser.role === 'delivery') {
      order.driver  = currentUser.name;
      order.vehicle = currentUser.vehicle || 'Assigned Vehicle';
    }
    localStorage.setItem('orders', JSON.stringify(orders));
    loadAllOrders();
    if (currentSection === 'analytics') loadAnalytics();
    if (currentSection === 'overview') loadDashboardOverview();
  }
}

function assignOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  if (order.status === 'completed' || order.status === 'cancelled') {
    alert('Cannot assign a completed or cancelled order.'); return;
  }
  order.status  = 'assigned';
  order.driver  = currentUser.name;
  order.vehicle = currentUser.vehicle || 'Assigned Vehicle';
  localStorage.setItem('orders', JSON.stringify(orders));
  loadAllOrders();
  if (currentSection === 'analytics') loadAnalytics();
  if (currentSection === 'overview') loadDashboardOverview();
  alert('Order ' + orderId + ' assigned to you.');
}

function filterOrders() {
  const filter    = document.getElementById('statusFilter').value;
  const filtered  = filter ? orders.filter(o => o.status === filter) : orders;
  const container = document.getElementById('allOrdersList');
  container.innerHTML = '';
  filtered.forEach(order => {
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div class="order-details">
        <h4>${order.id} — ${order.product}</h4>
        <p>${users.find(u => u.email === order.customerId)?.name || 'Unknown'} | ${order.date}</p>
      </div>
      <span class="status-badge status-${order.status}">${order.status.replace('-', ' ').toUpperCase()}</span>`;
    container.appendChild(div);
  });
}

// ── Tracking ───────────────────────────────────────────────
let dashMap = null, dashMarker = null, dashSimInterval = null;
let trackPageMap = null, trackPageMarker = null, trackPageSimInterval = null;
let geocodeCache = {};

// City of Delhi center + demo waypoints for route simulation
const DELHI_CENTER  = [28.6139, 77.2090];
const WAREHOUSE_POS = [28.6200, 77.2000]; // warehouse (start)
const FALLBACK_DESTINATION = [28.6060, 77.2200]; // default destination if geocoding fails

/** Create/return a Leaflet map in the given element id */
function buildMap(elementId) {
  if (!window.L) return null;
  const map = L.map(elementId, { zoomControl: true }).setView(DELHI_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);
  map.whenReady(() => { setTimeout(() => map.invalidateSize(), 100); });
  return map;
}

/** Flame-coloured custom icon */
function truckIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: linear-gradient(135deg,#ff4500,#ff8c00);
      border-radius:50%;width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:16px;
      box-shadow:0 4px 18px rgba(255,69,0,0.65);
      border:3px solid rgba(255,255,255,0.25);
      animation:pulse 1.8s infinite;
    ">🚚</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

function destinationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:linear-gradient(135deg,#00d68f,#00a86b);
      border-radius:50%;width:34px;height:34px;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:16px;
      box-shadow:0 4px 15px rgba(0,214,143,0.6);
      border:3px solid rgba(255,255,255,0.3);
    ">📍</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
}

async function geocodeAddress(address) {
  if (!address) return null;
  if (geocodeCache[address]) return geocodeCache[address];

  try {
    const query = encodeURIComponent(address + ' Delhi, India');
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
    if (!response.ok) throw new Error('Geocode request failed');
    const results = await response.json();
    if (results && results.length > 0) {
      const coords = [parseFloat(results[0].lat), parseFloat(results[0].lon)];
      geocodeCache[address] = coords;
      return coords;
    }
  } catch (error) {
    console.warn('Geocoding failed for address:', address, error);
  }
  return null;
}

function buildRoute(destination) {
  const end = destination || FALLBACK_DESTINATION;
  const start = WAREHOUSE_POS;
  const route = [start];
  const steps = 4;
  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    route.push([
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio
    ]);
  }
  route.push(end);
  return route;
}

function animateTruck(map, setMarker, getInterval, setIntervalRef, status, destination) {
  const old = getInterval();
  if (old) clearInterval(old);

  const route = buildRoute(destination);
  let step = 0;
  const isMoving = status === 'in-progress' || status === 'assigned';

  L.marker(destination || FALLBACK_DESTINATION, { icon: destinationIcon() })
    .addTo(map)
    .bindPopup('<b>Delivery Destination</b><br>Customer address');

  L.polyline(route, { color: '#ff4500', weight: 3, opacity: 0.7, dashArray: isMoving ? '8,6' : null })
    .addTo(map);

  L.circleMarker(WAREHOUSE_POS, { radius: 8, color: '#ff8c00', fillColor: '#ff8c00', fillOpacity: 1 })
    .addTo(map)
    .bindPopup('<b>Warehouse</b><br>Dispatch point');

  if (status === 'completed') {
    const m = L.marker(destination || FALLBACK_DESTINATION, { icon: truckIcon() })
      .addTo(map)
      .bindPopup('<b>Delivered! ✓</b>');
    setMarker(m);
    step = route.length - 1;
  } else if (isMoving) {
    step = status === 'assigned' ? 1 : 2;
    const m = L.marker(route[step], { icon: truckIcon() })
      .addTo(map)
      .bindPopup('<b>🚚 Your delivery</b><br>In transit…');
    setMarker(m);

    const iv = setInterval(() => {
      step++;
      if (step >= route.length) { clearInterval(iv); return; }
      m.setLatLng(route[step]);
    }, 2200);
    setIntervalRef(iv);
  } else {
    const m = L.marker(WAREHOUSE_POS, { icon: truckIcon() })
      .addTo(map)
      .bindPopup('<b>Awaiting dispatch</b><br>Order is pending');
    setMarker(m);
  }

  map.fitBounds(L.latLngBounds(route), { padding: [40, 40] });
}

// ── Dashboard map ───────────────────────────────────────────
function initDashboardMap() {
  if (!document.getElementById('deliveryMap')) return;
  if (!dashMap) {
    document.getElementById('mapPlaceholder').style.display = 'flex';
    document.getElementById('deliveryMap').style.display    = 'none';
    dashMap = buildMap('deliveryMap');
    if (dashMap) {
      document.getElementById('deliveryMap').style.display = 'block';
      document.getElementById('mapPlaceholder').style.display = 'none';
    }
  }
}

function trackOrder() {
  const orderId = document.getElementById('trackOrderId').value.trim();
  const order   = orders.find(o => o.id === orderId);
  if (!order) { alert('Order not found!'); return; }

  // Ensure map is ready
  initDashboardMap();
  if (!dashMap) { alert('Map not available, please try again.'); return; }

  // Clear previous layers except tile layer
  dashMap.eachLayer(layer => { if (!(layer instanceof L.TileLayer)) dashMap.removeLayer(layer); });

  animateTruck(
    dashMap,
    m  => { dashMarker = m; },
    () => dashSimInterval,
    iv => { dashSimInterval = iv; },
    order.status
  );

  // Show info panel
  const timeline = getTimelineSteps(order.status);
  let html = `
    <div class="track-result-box">
      <div class="track-result-header">
        <span class="track-result-id">${order.id}</span>
        <span class="status-badge status-${order.status}">${order.status.replace('-', ' ').toUpperCase()}</span>
      </div>
      <div class="order-details-grid">
        <div class="detail-item"><label>Product</label><p>${order.product}</p></div>
        <div class="detail-item"><label>Quantity</label><p>${order.quantity}</p></div>
        <div class="detail-item"><label>Date</label><p>${order.date}</p></div>
        <div class="detail-item"><label>Address</label><p>${order.address}</p></div>
      </div>
      ${order.driver ? `<div class="driver-card"><div class="driver-avatar"><i class="fas fa-user"></i></div><div class="driver-details"><h4>${order.driver}</h4><p>Vehicle: ${order.vehicle}</p><p style="color:var(--success);">● On the way</p></div></div>` : ''}
      <div class="timeline" style="margin-top:1.25rem;">`;
  timeline.forEach(step => {
    html += `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>${step.title}</h4><p>${step.description}</p></div></div>`;
  });
  html += `</div></div>`;
  document.getElementById('trackResult').innerHTML = html;
  document.getElementById('trackResult').style.display = 'block';
}

// ── Track Page (track.html) Map ────────────────────────────
function initTrackPageMap() {
  const el = document.getElementById('trackPageMap');
  if (!el || trackPageMap) return;
  trackPageMap = buildMap('trackPageMap');
}

async function pageTrack() {
  const orderId = document.getElementById('pageTrackOrderId').value.trim();
  document.getElementById('noOrderMessage').style.display        = 'none';
  document.getElementById('orderNotFoundMessage').style.display  = 'none';
  document.getElementById('pageTrackResult').style.display       = 'none';

  if (!orderId) {
    document.getElementById('noOrderMessage').style.display = 'block';
    return;
  }
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    document.getElementById('orderNotFoundMessage').style.display = 'block';
    document.getElementById('notFoundText').textContent = `Order "${orderId}" not found. Try ORD-20260320-001, ORD-20260321-001, or ORD-20260318-001.`;
    return;
  }

  let destination = await geocodeAddress(order.address);
  if (!destination) {
    destination = FALLBACK_DESTINATION;
    console.warn('Using fallback destination for order', order.id);
  }

  if (!trackPageMap) initTrackPageMap();
  if (trackPageMap) {
    trackPageMap.eachLayer(layer => { if (!(layer instanceof L.TileLayer)) trackPageMap.removeLayer(layer); });
    animateTruck(
      trackPageMap,
      m  => { trackPageMarker = m; },
      () => trackPageSimInterval,
      iv => { trackPageSimInterval = iv; },
      order.status,
      destination
    );
    setTimeout(() => trackPageMap.invalidateSize(), 200);
  }

  const timeline = getTimelineSteps(order.status);
  let html = `
    <div class="track-result-box">
      <div class="track-result-header">
        <span class="track-result-id">${order.id}</span>
        <span class="status-badge status-${order.status}">${order.status.replace('-', ' ').toUpperCase()}</span>
        ${order.status === 'in-progress' ? '<span class="live-badge"><span class="pulse-dot"></span> Live Tracking</span>' : ''}
      </div>
      <div class="order-details-grid">
        <div class="detail-item"><label>Product</label><p>${order.product}</p></div>
        <div class="detail-item"><label>Quantity</label><p>${order.quantity}</p></div>
        <div class="detail-item"><label>Date</label><p>${order.date}</p></div>
        <div class="detail-item"><label>Address</label><p>${order.address}</p></div>
      </div>
      ${order.driver ? `<div class="driver-card"><div class="driver-avatar"><i class="fas fa-user-tie"></i></div><div class="driver-details"><h4>${order.driver}</h4><p>Vehicle: <strong>${order.vehicle}</strong></p><p style="color:var(--success);">● Currently delivering</p></div></div>` : ''}
      <h4 style="color:var(--text-light);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin:1.5rem 0 1rem;">Delivery Progress</h4>
      <div class="timeline">`;
  timeline.forEach(step => {
    html += `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>${step.title}</h4><p>${step.description}</p></div></div>`;
  });
  html += `</div></div>`;
  document.getElementById('pageTrackResult').innerHTML  = html;
  document.getElementById('pageTrackResult').style.display = 'block';
}

function getTimelineSteps(status) {
  const all = [
    { title: 'Order Confirmed',  description: 'Your order has been received and confirmed' },
    { title: 'Driver Assigned',  description: 'A certified delivery agent has been assigned' },
    { title: 'Out for Delivery', description: 'Your LPG cylinder is on the way' },
    { title: 'Delivered',        description: 'Successfully delivered to your address' }
  ];
  const map = { pending: 0, assigned: 1, 'in-progress': 2, completed: 3 };
  return all.slice(0, (map[status] ?? 0) + 1);
}

// ── Users ──────────────────────────────────────────────────
function showAddUserForm()  { document.getElementById('addUserForm').style.display = 'block'; }
function hideAddUserForm()  { document.getElementById('addUserForm').style.display = 'none'; }

function handleAddUser(event) {
  event.preventDefault();
  const newUser = {
    email:    document.getElementById('newUserEmail').value,
    password: document.getElementById('newUserPassword').value,
    name:     document.getElementById('newUserName').value,
    role:     document.getElementById('newUserRole').value,
    phone:    document.getElementById('newUserPhone').value,
    address:  ''
  };
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  alert('User added!');
  hideAddUserForm();
  loadAllUsers();
  if (currentSection === 'analytics') loadAnalytics();
}

function loadAllUsers() {
  const container = document.getElementById('usersList');
  container.innerHTML = '';
  users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
      <div class="user-details">
        <h4>${user.name}</h4>
        <p>${user.email}</p>
        <p><span class="status-badge" style="background:rgba(255,140,0,0.15);color:var(--accent);border:1px solid rgba(255,140,0,0.3);">${user.role.toUpperCase()}</span></p>
      </div>
      <button class="btn btn-secondary" style="font-size:0.82rem;padding:6px 14px;" onclick="deleteUser('${user.email}')">
        <i class="fas fa-trash"></i> Delete
      </button>`;
    container.appendChild(div);
  });
}

function deleteUser(email) {
  if (confirm('Delete this user?')) {
    users = users.filter(u => u.email !== email);
    localStorage.setItem('users', JSON.stringify(users));
    loadAllUsers();
    if (currentSection === 'analytics') loadAnalytics();
  }
}

// ── Analytics ──────────────────────────────────────────────
function loadAnalytics() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter orders for current month
  const currentMonthOrders = orders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  // Calculate pricing based on cylinder type
  const getCylinderPrice = (product) => {
    const prices = {
      '5kg': 450,
      '14.2kg': 950,
      '19kg': 1050
    };
    return prices[product] || 950; // Default to 14.2kg price
  };

  // Calculate current month revenue
  const currentMonthRevenue = currentMonthOrders.reduce((total, order) => {
    return total + (getCylinderPrice(order.product) * order.quantity);
  }, 0);

  // Calculate expected monthly revenue (projected based on current performance)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysPassed = now.getDate();
  const progressRatio = daysPassed / daysInMonth;

  // If we have orders this month, project based on current pace
  let expectedMonthlyRevenue = currentMonthRevenue;
  if (currentMonthOrders.length > 0 && progressRatio > 0) {
    expectedMonthlyRevenue = Math.round(currentMonthRevenue / progressRatio);
  } else {
    // If no orders this month, use historical average or default
    const totalHistoricalRevenue = orders.reduce((total, order) => {
      return total + (getCylinderPrice(order.product) * order.quantity);
    }, 0);
    const avgMonthlyRevenue = orders.length > 0 ? totalHistoricalRevenue / Math.max(1, Math.ceil((now - new Date('2026-01-01')) / (30 * 24 * 60 * 60 * 1000))) : 50000;
    expectedMonthlyRevenue = Math.round(avgMonthlyRevenue);
  }

  // Calculate total all-time revenue
  const totalRevenue = orders.reduce((total, order) => {
    return total + (getCylinderPrice(order.product) * order.quantity);
  }, 0);

  // Update analytics display
  document.getElementById('totalCustomers').textContent = users.filter(u => u.role === 'customer').length;
  document.getElementById('totalDelivery').textContent  = users.filter(u => u.role === 'delivery').length;
  document.getElementById('analyticsTotal').textContent = orders.length;
  const completed = orders.filter(o => o.status === 'completed').length;
  document.getElementById('completionRate').textContent = orders.length > 0 ? Math.round((completed / orders.length) * 100) + '%' : '0%';
  document.getElementById('monthlyRevenue').textContent = '₹' + expectedMonthlyRevenue.toLocaleString('en-IN');
  document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toLocaleString('en-IN');

  // Add additional revenue breakdown
  updateRevenueBreakdown(currentMonthOrders, expectedMonthlyRevenue);
}

function updateRevenueBreakdown(currentMonthOrders, expectedRevenue) {
  console.log('updateRevenueBreakdown called with', currentMonthOrders.length, 'orders');
  // Calculate breakdown by cylinder type for current month
  const currentMonthBreakdown = currentMonthOrders.reduce((acc, order) => {
    const price = getCylinderPrice(order.product);
    const revenue = price * order.quantity;
    acc[order.product] = (acc[order.product] || 0) + revenue;
    acc[order.product + '_count'] = (acc[order.product + '_count'] || 0) + order.quantity;
    return acc;
  }, {});

  console.log('currentMonthBreakdown:', currentMonthBreakdown);

  // Calculate all-time breakdown by cylinder type
  const allTimeBreakdown = orders.reduce((acc, order) => {
    const price = getCylinderPrice(order.product);
    const revenue = price * order.quantity;
    acc[order.product] = (acc[order.product] || 0) + revenue;
    acc[order.product + '_count'] = (acc[order.product + '_count'] || 0) + order.quantity;
    return acc;
  }, {});

  console.log('allTimeBreakdown:', allTimeBreakdown);

  // Calculate order statistics
  const totalOrders = currentMonthOrders.length;
  const avgOrderValue = totalOrders > 0 ? expectedRevenue / totalOrders : 0;

  // Update breakdown display if elements exist
  const breakdownContainer = document.getElementById('revenueBreakdown');
  console.log('breakdownContainer:', breakdownContainer);
  if (breakdownContainer) {
    let breakdownHTML = '<h4 style="color: var(--text); margin-bottom: 1rem;">Cylinder Revenue Analysis</h4>';

    // Current Month Section
    breakdownHTML += '<div style="margin-bottom: 2rem;">';
    breakdownHTML += '<h5 style="color: var(--text-light); margin-bottom: 1rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">This Month</h5>';

    if (Object.keys(currentMonthBreakdown).length === 0) {
      breakdownHTML += '<p style="color: var(--text-light); font-size: 0.9rem;">No orders this month yet</p>';
    } else {
      const cylinderTypes = ['5kg', '14.2kg', '19kg'];
      cylinderTypes.forEach(type => {
        const revenue = currentMonthBreakdown[type] || 0;
        const count = currentMonthBreakdown[type + '_count'] || 0;
        const percentage = expectedRevenue > 0 ? Math.round((revenue / expectedRevenue) * 100) : 0;

        breakdownHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 3px solid ${type === '5kg' ? 'var(--success)' : type === '14.2kg' ? 'var(--flame-1)' : 'var(--accent)'};">
            <div>
              <div style="font-weight: 600; color: var(--text);">${type} Cylinder</div>
              <div style="font-size: 0.8rem; color: var(--text-light);">${count} cylinders sold</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: var(--success); font-size: 1.1rem;">₹${revenue.toLocaleString('en-IN')}</div>
              <div style="font-size: 0.8rem; color: var(--text-light);">${percentage}% of revenue</div>
            </div>
          </div>
        `;
      });
    }
    breakdownHTML += '</div>';

    // All-Time Section
    breakdownHTML += '<div style="border-top: 1px solid var(--border); padding-top: 1.5rem;">';
    breakdownHTML += '<h5 style="color: var(--text-light); margin-bottom: 1rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">All Time</h5>';

    const cylinderTypes = ['5kg', '14.2kg', '19kg'];
    const totalAllTimeRevenue = cylinderTypes.reduce((sum, type) => sum + (allTimeBreakdown[type] || 0), 0);
    console.log('totalAllTimeRevenue:', totalAllTimeRevenue);

    cylinderTypes.forEach(type => {
      const revenue = allTimeBreakdown[type] || 0;
      const count = allTimeBreakdown[type + '_count'] || 0;
      const percentage = totalAllTimeRevenue > 0 ? Math.round((revenue / totalAllTimeRevenue) * 100) : 0;

      breakdownHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.01); border-radius: 8px;">
          <div>
            <div style="font-weight: 600; color: var(--text);">${type} Cylinder</div>
            <div style="font-size: 0.8rem; color: var(--text-light);">${count} cylinders sold</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--info); font-size: 1.1rem;">₹${revenue.toLocaleString('en-IN')}</div>
            <div style="font-size: 0.8rem; color: var(--text-light);">${percentage}% of total</div>
          </div>
        </div>
      `;
    });

    breakdownHTML += `
      <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,69,0,0.05); border-radius: 8px; border: 1px solid rgba(255,69,0,0.2);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--info);">${totalOrders}</div>
            <div style="font-size: 0.8rem; color: var(--text-light);">Orders This Month</div>
          </div>
          <div>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--success);">₹${Math.round(avgOrderValue).toLocaleString('en-IN')}</div>
            <div style="font-size: 0.8rem; color: var(--text-light);">Avg Order Value</div>
          </div>
        </div>
      </div>
    `;

    breakdownHTML += '</div>';

    breakdownContainer.innerHTML = breakdownHTML;
    console.log('breakdownHTML set');
  } else {
    console.log('breakdownContainer not found');
  }
}

function generateOrderId() {
  // Generate date-based order ID: ORD-YYYYMMDD-XXX
  // Format: ORD-20260410-001 (YearMonthDay-SequentialNumber)
  // This ensures unique IDs even with millions of orders
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
                  (now.getMonth() + 1).toString().padStart(2, '0') +
                  now.getDate().toString().padStart(2, '0');

  // Count existing orders created today by today's order ID prefix
  const todayOrders = orders.filter(order => order.id.startsWith(`ORD-${dateStr}-`));

  // Sequential number for today (starting from 001)
  const sequentialNum = (todayOrders.length + 1).toString().padStart(3, '0');

  return `ORD-${dateStr}-${sequentialNum}`;
}

// ── Delivery Agent Functions ────────────────────────────
function toggleShift() {
  const isOn = document.getElementById('shiftToggle').checked;
  const label = document.getElementById('shiftLabel');
  const subLabel = document.getElementById('shiftSubLabel');
  const dot = document.getElementById('shiftDot');
  if (isOn) {
    label.textContent = 'You are ON DUTY';
    subLabel.textContent = 'You\'re ready to accept orders';
    dot.style.background = 'var(--success)';
  } else {
    label.textContent = 'You are OFF DUTY';
    subLabel.textContent = 'Toggle to start your delivery shift';
    dot.style.background = '#999';
  }
}

function loadDeliveryHome() {
  loadUserAndOrders();
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeOrders = orders.filter(o => o.driver === currentUser.name && (o.status === 'assigned' || o.status === 'in-progress')).length;
  const completedToday = orders.filter(o => o.driver === currentUser.name && o.status === 'completed').length;
  
  document.getElementById('dvNewCount').textContent = pendingOrders;
  document.getElementById('dvActiveCount').textContent = activeOrders;
  document.getElementById('dvDoneCount').textContent = completedToday;
  document.getElementById('dvEarnings').textContent = '₹' + (completedToday * 500);
  
  // Show active delivery card if there's an active order
  const activeOrder = orders.find(o => o.driver === currentUser.name && (o.status === 'assigned' || o.status === 'in-progress'));
  const activeCard = document.getElementById('activeDeliveryCard');
  if (activeOrder) {
    const customer = users.find(u => u.email === activeOrder.customerId);
    document.getElementById('activeOrderId').textContent = activeOrder.id;
    document.getElementById('activeCustomer').textContent = customer?.name || 'Unknown';
    document.getElementById('activeAddress').textContent = activeOrder.address;
    document.getElementById('activeProduct').textContent = activeOrder.product + ' × ' + activeOrder.quantity;
    document.getElementById('activePhone').textContent = customer?.phone || 'N/A';
    activeCard.style.display = 'block';
  } else {
    activeCard.style.display = 'none';
  }
  
  updateNewOrdersBadge();
}

function loadDeliveryQueue(status = 'all') {
  loadUserAndOrders();
  const container = document.getElementById('deliveryQueue');
  let queueOrders = orders.filter(o => o.status === 'pending' || o.status === 'assigned' || o.status === 'in-progress');
  
  if (status !== 'all') {
    queueOrders = queueOrders.filter(o => o.status === status);
  }
  
  container.innerHTML = queueOrders.length ? '' : '<p style="color:var(--text-light);padding:2rem 1rem;text-align:center;">No orders in queue.</p>';
  
  queueOrders.forEach(order => {
    const customer = users.find(u => u.email === order.customerId);
    const isAssignedToMe = order.driver === currentUser.name;
    const div = document.createElement('div');
    div.className = 'order-queue-item';
    div.innerHTML = `
      <div class="queue-order-header">
        <h3 class="queue-order-id">${order.id}</h3>
        <span class="status-badge status-${order.status}">${order.status.replace('-', ' ').toUpperCase()}</span>
        ${isAssignedToMe ? '<span style="background:rgba(0,214,143,0.2);color:var(--success);border:1px solid rgba(0,214,143,0.3);padding:0.3rem 0.8rem;border-radius:20px;font-size:0.7rem;font-weight:600;">ASSIGNED TO YOU</span>' : ''}
      </div>
      <div class="queue-order-details">
        <div class="detail-row">
          <i class="fas fa-user"></i>
          <div><span>Customer</span><strong>${customer?.name || 'Unknown'}</strong></div>
        </div>
        <div class="detail-row">
          <i class="fas fa-phone"></i>
          <div><span>Phone</span><strong>${customer?.phone || 'N/A'}</strong></div>
        </div>
        <div class="detail-row">
          <i class="fas fa-map-marker-alt"></i>
          <div><span>Address</span><strong>${order.address}</strong></div>
        </div>
        <div class="detail-row">
          <i class="fas fa-fire-flame-curved"></i>
          <div><span>Product</span><strong>${order.product} × ${order.quantity}</strong></div>
        </div>
        <div class="detail-row">
          <i class="fas fa-calendar"></i>
          <div><span>Date</span><strong>${order.date}</strong></div>
        </div>
      </div>
      <div class="queue-order-actions">
        ${!isAssignedToMe && order.status === 'pending' ? `<button class="btn btn-primary" onclick="assignOrderToMe('${order.id}')" style="width:100%;"><i class="fas fa-hand-paper"></i> Accept Order</button>` : ''}
        ${isAssignedToMe && order.status === 'assigned' ? `<button class="btn btn-primary" onclick="markOrderInProgress('${order.id}')" style="width:100%;"><i class="fas fa-route"></i> Start Delivery</button>` : ''}
        ${isAssignedToMe && order.status === 'in-progress' ? `<button class="btn" style="background:linear-gradient(135deg,#00d68f,#00a86b);color:#fff;width:100%;" onclick="markOrderDelivered('${order.id}')"><i class="fas fa-circle-check"></i> Mark Delivered</button>` : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

function filterDeliveryQueue(status, elemento) {
  document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
  elemento.classList.add('active');
  loadDeliveryQueue(status);
}

function refreshDeliveryQueue() {
  loadDeliveryQueue('all');
}

function assignOrderToMe(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = 'assigned';
  order.driver = currentUser.name;
  order.vehicle = currentUser.vehicle || 'Vehicle #' + Math.floor(Math.random() * 1000);
  localStorage.setItem('orders', JSON.stringify(orders));
  alert('Order ' + orderId + ' assigned to you! Start your delivery in New Orders section.');
  loadDeliveryQueue('all');
  loadDeliveryHome();
  updateNewOrdersBadge();
}

function markOrderInProgress(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = 'in-progress';
  localStorage.setItem('orders', JSON.stringify(orders));
  alert('Delivery started for ' + orderId + '. Heading out now!');
  loadDeliveryQueue('all');
  loadDeliveryHome();
}

function markOrderDelivered(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = 'completed';
  localStorage.setItem('orders', JSON.stringify(orders));
  alert('Great! Order ' + orderId + ' marked as delivered. Thank you!');
  loadDeliveryQueue('all');
  loadDeliveryHome();
  loadDeliveryHistory();
}

function loadDeliveryHistory() {
  loadUserAndOrders(); // This will trigger cleanup
  const container = document.getElementById('deliveryHistoryList');
  const completedOrders = orders.filter(o => o.driver === currentUser.name && o.status === 'completed');

  // Add cleanup notice if there were recent cleanups
  const cleanupNotice = document.getElementById('cleanupNotice');
  if (cleanupNotice) {
    const now = new Date();
    const twentyFiveDaysAgo = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000));
    const recentCleanups = completedOrders.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate < twentyFiveDaysAgo;
    });

    if (recentCleanups.length > 0) {
      cleanupNotice.innerHTML = `
        <div style="background: rgba(255,140,0,0.1); border: 1px solid rgba(255,140,0,0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <div style="color: var(--accent); font-weight: 600; margin-bottom: 0.5rem;">
            <i class="fas fa-info-circle"></i> Auto-Cleanup Notice
          </div>
          <div style="color: var(--text-light); font-size: 0.9rem;">
            Completed deliveries older than 25 days are automatically removed to keep your history clean.
            This helps maintain optimal performance and storage efficiency.
          </div>
        </div>
      `;
      cleanupNotice.style.display = 'block';
    } else {
      cleanupNotice.style.display = 'none';
    }
  }

  container.innerHTML = completedOrders.length ? '' : '<p style="color:var(--text-light);padding:2rem 1rem;text-align:center;">No completed deliveries yet.</p>';

  completedOrders.forEach(order => {
    const customer = users.find(u => u.email === order.customerId);
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-left">
        <h4>${order.id}</h4>
        <p><strong>${customer?.name || 'Unknown'}</strong> — ${order.product}</p>
        <p style="color:var(--text-light);font-size:0.85rem;">${order.date} at ${order.address}</p>
      </div>
      <div class="history-right">
        <span class="status-badge status-completed">✓ COMPLETED</span>
        <p style="color:var(--success);font-weight:600;margin-top:0.5rem;">₹500</p>
      </div>
    `;
    container.appendChild(div);
  });
}

function updateNewOrdersBadge() {
  const newOrdersCount = orders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('newOrdersBadge');
  if (newOrdersCount > 0) {
    badge.textContent = newOrdersCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function markInProgress() {
  const activeOrder = orders.find(o => o.driver === currentUser.name && o.status === 'assigned');
  if (activeOrder) {
    markOrderInProgress(activeOrder.id);
  }
}

function markDelivered() {
  const activeOrder = orders.find(o => o.driver === currentUser.name && (o.status === 'assigned' || o.status === 'in-progress'));
  if (activeOrder) {
    markOrderDelivered(activeOrder.id);
  }
}

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
  initializeDemoData();
  if (window.location.pathname.includes('dashboard')) {
    loadDashboard();
  } else if (window.location.pathname.includes('track')) {
    loadUserAndOrders();
    initTrackPageMap();
  }
});
