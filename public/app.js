const app = document.querySelector('#app');
const nav = document.querySelector('#nav');
const toast = document.querySelector('#toast');
const state = { token: localStorage.getItem('rfq_token'), user: JSON.parse(localStorage.getItem('rfq_user') || 'null') };

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({ success: false, message: 'Invalid server response.' }));
  if (!response.ok) throw new Error(body.message || 'Request failed.');
  return body.data;
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const money = value => Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const statusBadge = status => `<span class="badge ${status === 'CLOSED' || status === 'CANCELLED' || status === 'AWARDED' || status === 'REJECTED' ? 'closed' : ''}">${status}</span>`;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

function saveAuth(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('rfq_token', state.token);
  localStorage.setItem('rfq_user', JSON.stringify(state.user));
}

function logout() {
  localStorage.clear();
  state.token = null;
  state.user = null;
  location.hash = '#login';
  render();
}

function layout(content) {
  nav.classList.toggle('hidden', !state.user);
  nav.innerHTML = state.user
    ? `<button data-route="dashboard">Dashboard</button>${state.user.role === 'SUPPLIER' ? '<button data-route="quotations">My quotations</button>' : ''}<button data-route="change-password">Change password</button><span class="user">${esc(state.user.name)}</span><button id="logout" class="btn secondary">Log out</button>`
    : '';

  app.innerHTML = content;
  document.querySelectorAll('[data-route]').forEach(button => {
    button.onclick = () => (location.hash = `#${button.dataset.route}`);
  });
  document.querySelector('#logout')?.addEventListener('click', logout);
}

function errorBox(error) {
  return `<div class="message error">${esc(error.message || error)}</div>`;
}

function authPage(mode) {
  const login = mode === 'login';
  const forgot = mode === 'forgot-password';

  layout(`
    <div class="auth-shell">
      <section class="auth-card">
        <div class="eyebrow">TradeDesk RFQ</div>
        <h1>${forgot ? 'Reset your password' : login ? 'Welcome back.' : 'Start trading smarter.'}</h1>
        <p class="lede">${forgot ? 'Enter your email and choose a new password.' : login ? 'Sign in to manage your sourcing workspace.' : 'Create a buyer or supplier account in under a minute.'}</p>
        <div id="form-message"></div>
        <form id="auth-form">
          ${forgot ? `
            <div class="field"><label for="email">Email</label><input id="email" type="email" required></div>
            <div class="field"><label for="newPassword">New password</label><input id="newPassword" type="password" minlength="8" required></div>
            <div class="field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" minlength="8" required></div>
          ` : `
            ${login ? '' : '<div class="field"><label for="name">Name</label><input id="name" required maxlength="120"></div>'}
            <div class="field"><label for="email">Email</label><input id="email" type="email" required></div>
            <div class="field"><label for="password">Password</label><input id="password" type="password" minlength="8" required></div>
            ${login ? '' : '<div class="field"><label for="role">I am a</label><select id="role"><option value="BUYER">Buyer</option><option value="SUPPLIER">Supplier</option></select></div>'}
          `}
          <button class="btn" type="submit">${forgot ? 'Reset password' : login ? 'Sign in' : 'Create account'}</button>
        </form>
        <p class="muted" style="margin:20px 0 0;font-size:14px">
          ${forgot ? 'Back to ' : login ? 'New here? ' : 'Already have an account? '}
          <a href="#${forgot ? 'login' : login ? 'register' : 'login'}">${forgot ? 'login' : login ? 'Create an account' : 'Sign in'}</a>
        </p>
        ${login ? '<p class="muted" style="margin:10px 0 0;font-size:14px"><a href="#forgot-password">Forgot password?</a></p>' : ''}
      </section>
    </div>
  `);

  document.querySelector('#auth-form').onsubmit = async event => {
    event.preventDefault();
    const message = document.querySelector('#form-message');
    message.innerHTML = '';

    try {
      if (forgot) {
        const email = document.querySelector('#email').value;
        const newPassword = document.querySelector('#newPassword').value;
        const confirmPassword = document.querySelector('#confirmPassword').value;

        if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');

        const data = await api('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email, newPassword, confirmPassword })
        });

        showToast(data.message || 'Password updated successfully.');
        location.hash = '#login';
        render();
        return;
      }

      const payload = {
        name: document.querySelector('#name')?.value,
        email: document.querySelector('#email').value,
        password: document.querySelector('#password').value,
        role: document.querySelector('#role')?.value
      };
      const data = await api(`/auth/${login ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(payload) });
      saveAuth(data);
      showToast(login ? 'Welcome back.' : 'Account created.');
      location.hash = '#dashboard';
      render();
    } catch (error) {
      message.innerHTML = errorBox(error);
    }
  };
}

function changePasswordForm() {
  layout(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Account</div>
        <h1>Change password</h1>
        <p>Update your password securely.</p>
      </div>
    </div>
    <section class="panel" style="max-width:640px">
      <div id="form-message"></div>
      <form id="change-password-form">
        <div class="field"><label>Current password</label><input id="currentPassword" type="password" required></div>
        <div class="field"><label>New password</label><input id="newPassword" type="password" minlength="8" required></div>
        <div class="field"><label>Confirm new password</label><input id="confirmPassword" type="password" minlength="8" required></div>
        <div class="actions">
          <button class="btn" type="submit">Update password</button>
          <button type="button" class="btn secondary" data-route="dashboard">Cancel</button>
        </div>
      </form>
    </section>
  `);

  document.querySelector('#change-password-form').onsubmit = async event => {
    event.preventDefault();
    const message = document.querySelector('#form-message');
    const payload = {
      currentPassword: document.querySelector('#currentPassword').value,
      newPassword: document.querySelector('#newPassword').value,
      confirmPassword: document.querySelector('#confirmPassword').value
    };

    if (payload.newPassword !== payload.confirmPassword) {
      message.innerHTML = errorBox({ message: 'Passwords do not match.' });
      return;
    }

    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(data.message || 'Password changed successfully.');
      location.hash = '#dashboard';
      render();
    } catch (error) {
      message.innerHTML = errorBox(error);
    }
  };

  document.querySelector('[data-route="dashboard"]').onclick = () => (location.hash = '#dashboard');
}

function validateClientRfq(payload) {
  const errors = [];
  if (!String(payload.productName || '').trim()) errors.push('Product or service is required.');
  if (!String(payload.description || '').trim()) errors.push('Requirement description is required.');
  if (!String(payload.deliveryLocation || '').trim()) errors.push('Delivery location is required.');

  const quantity = Number(payload.quantity);
  if (payload.quantity === undefined || payload.quantity === null || String(payload.quantity).trim() === '' || !Number.isFinite(quantity) || quantity <= 0) {
    errors.push('Quantity must be greater than 0.');
  }

  const deadline = new Date(payload.deadline);
  if (!payload.deadline || Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    errors.push('Deadline must be a future date.');
  }

  return errors;
}

function validateClientQuotation(payload) {
  const errors = [];
  const unitPrice = Number(payload.unitPrice);
  const totalPrice = Number(payload.totalPrice ?? payload.quotedPrice);

  if (!String(payload.estimatedDeliveryTime || '').trim()) errors.push('Delivery time is required.');
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) errors.push('Unit price must be greater than 0.');
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) errors.push('Total price must be greater than 0.');

  return errors;
}

function rfqForm(rfq = {}) {
  const editing = Boolean(rfq.id);
  layout(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Buyer workspace</div>
        <h1>${editing ? 'Edit RFQ' : 'Create an RFQ'}</h1>
        <p>Make the requirement clear so suppliers can respond well.</p>
      </div>
    </div>
    <section class="panel" style="max-width:760px">
      <div id="form-message"></div>
      <form id="rfq-form">
        <div class="field"><label>Product or service</label><input id="productName" maxlength="160" required value="${esc(rfq.product_name)}"></div>
        <div class="field"><label>Requirement description</label><textarea id="description" maxlength="5000" required>${esc(rfq.description)}</textarea></div>
        <div class="grid grid-2">
          <div class="field"><label>Quantity</label><input id="quantity" type="number" min="0.01" step="0.01" required value="${esc(rfq.quantity)}"></div>
          <div class="field"><label>Delivery location</label><input id="deliveryLocation" maxlength="160" required value="${esc(rfq.delivery_location)}"></div>
        </div>
        <div class="field"><label>Deadline</label><input id="deadline" type="datetime-local" required value="${rfq.deadline ? new Date(rfq.deadline).toISOString().slice(0, 16) : ''}"></div>
        <div class="actions">
          <button class="btn" type="submit">${editing ? 'Save changes' : 'Publish RFQ'}</button>
          <button type="button" class="btn secondary" data-route="dashboard">Cancel</button>
        </div>
      </form>
    </section>
  `);

  document.querySelector('[data-route="dashboard"]').onclick = () => (location.hash = '#dashboard');
  document.querySelector('#rfq-form').onsubmit = async event => {
    event.preventDefault();
    const message = document.querySelector('#form-message');
    const payload = {
      productName: document.querySelector('#productName').value,
      description: document.querySelector('#description').value,
      quantity: document.querySelector('#quantity').value,
      deliveryLocation: document.querySelector('#deliveryLocation').value,
      deadline: document.querySelector('#deadline').value
    };

    const errors = validateClientRfq(payload);
    if (errors.length) {
      message.innerHTML = errorBox({ message: errors[0] });
      return;
    }

    try {
      await api(editing ? `/rfqs/${rfq.id}` : '/rfqs', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      showToast(editing ? 'RFQ updated successfully.' : 'RFQ published successfully.');
      location.hash = '#dashboard';
    } catch (error) {
      message.innerHTML = errorBox(error);
    }
  };
}

async function buyerDashboard() {
  layout(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Buyer workspace</div>
        <h1>Your sourcing desk.</h1>
        <p>Track requirements and compare supplier responses.</p>
      </div>
      <button class="btn" id="new-rfq">+ Create RFQ</button>
    </div>
    <div id="content"><p class="muted">Loading RFQs...</p></div>
  `);

  document.querySelector('#new-rfq').onclick = () => (location.hash = '#new-rfq');

  try {
    const { rfqs } = await api('/rfqs/my');
    const total = rfqs.length;
    const open = rfqs.filter(r => r.status === 'OPEN').length;
    const responses = rfqs.reduce((sum, r) => sum + Number(r.quotation_count || 0), 0);

    document.querySelector('#content').innerHTML = `
      <div class="grid grid-3">
        <div class="stat"><div class="stat-label">Total RFQs</div><div class="stat-value">${total}</div></div>
        <div class="stat"><div class="stat-label">Open RFQs</div><div class="stat-value">${open}</div></div>
        <div class="stat"><div class="stat-label">Responses received</div><div class="stat-value">${responses}</div></div>
      </div>
      <section class="panel" style="margin-top:22px">
        <h2>Recent requirements</h2>
        ${rfqs.length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Requirement</th><th>Location</th><th>Deadline</th><th>Status</th><th>Quotes</th><th></th></tr></thead><tbody>${rfqs.map(r => `
              <tr>
                <td><strong>${esc(r.product_name)}</strong><br><span class="muted">${esc(r.quantity)} units</span></td>
                <td>${esc(r.delivery_location)}</td>
                <td>${date(r.deadline)}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${r.quotation_count || 0}</td>
                <td><button class="btn secondary" data-view="${r.id}">View</button></td>
              </tr>
            `).join('')}</tbody></table></div>`
          : '<div class="empty">No RFQs created yet. Create your first RFQ.</div>'}
      </section>
    `;

    document.querySelectorAll('[data-view]').forEach(button => {
      button.onclick = () => (location.hash = `#rfq/${button.dataset.view}`);
    });
  } catch (error) {
    document.querySelector('#content').innerHTML = errorBox(error);
  }
}

async function supplierDashboard() {
  layout(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Supplier workspace</div>
        <h1>Find your next contract.</h1>
        <p>Browse live requirements that match your capabilities.</p>
      </div>
    </div>
    <section class="panel">
      <div class="filters">
        <input id="search" placeholder="Search products or services">
        <input id="location" placeholder="Delivery location">
        <button class="btn" id="filter">Search</button>
      </div>
      <div id="content"><p class="muted">Loading RFQs...</p></div>
    </section>
  `);

  const load = async () => {
    const search = document.querySelector('#search')?.value || '';
    const locationInput = document.querySelector('#location')?.value || '';
    const content = document.querySelector('#content');
    content.innerHTML = '<p class="muted">Loading RFQs...</p>';

    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (locationInput) query.set('location', locationInput);
      const { rfqs } = await api(`/rfqs?${query.toString()}`);

      content.innerHTML = rfqs.length
        ? `<div class="grid grid-2">${rfqs.map(r => `
            <article class="panel">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                ${statusBadge(r.status)}
                <span class="muted">Due ${date(r.deadline)}</span>
              </div>
              <h2 style="margin-top:18px">${esc(r.product_name)}</h2>
              <p class="muted">${esc(r.description).slice(0, 160)}${r.description.length > 160 ? '...' : ''}</p>
              <p><strong>${esc(r.quantity)}</strong> units · ${esc(r.delivery_location)}</p>
              <button class="btn secondary" data-view="${r.id}">View RFQ</button>
            </article>
          `).join('')}</div>`
        : '<div class="empty">No open RFQs available.</div>';

      document.querySelectorAll('[data-view]').forEach(button => {
        button.onclick = () => (location.hash = `#rfq/${button.dataset.view}`);
      });
    } catch (error) {
      content.innerHTML = errorBox(error);
    }
  };

  document.querySelector('#filter')?.addEventListener('click', load);
  document.querySelector('#search')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') load();
  });
  load();
}

async function rfqDetail(id) {
  layout('<p class="muted">Loading requirement...</p>');

  try {
    const { rfq } = await api(`/rfqs/${id}`);
    const buyer = state.user.role === 'BUYER';
    const supplierCanQuote = state.user.role === 'SUPPLIER' && rfq.status === 'OPEN' && new Date(rfq.deadline) > new Date();

    const renderBuyerQuotations = async () => {
      const { quotations } = await api(`/my/rfqs/${id}/quotations`);
      const side = document.querySelector('#side-content');
      side.innerHTML = quotations.length
        ? quotations.map(q => `
            <div style="padding:14px 0;border-bottom:1px solid #dbe5e1;">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
                <strong>${esc(q.supplier_name || 'Supplier')}</strong>
                ${statusBadge(q.status || 'OPEN')}
              </div>
              <p class="muted" style="margin:8px 0;">Total price: ${money(q.total_price || q.quoted_price)}${q.unit_price ? ` · Unit price: ${money(q.unit_price)}` : ''}</p>
              <p class="muted" style="margin:6px 0;">Delivery: ${esc(q.estimated_delivery_time)}</p>
              <p class="muted" style="margin:6px 0;">Remarks: ${esc(q.message || 'No remarks')}</p>
              <p class="muted" style="margin:6px 0;">Submitted: ${date(q.created_at)}</p>
              ${q.status === 'PENDING' && rfq.status === 'OPEN' ? `<div class="actions" style="margin-top:12px"><button class="btn" data-accept="${q.id}">Accept quotation</button><button class="btn secondary" data-reject="${q.id}">Reject</button></div>` : ''}
            </div>
          `).join('')
        : '<div class="empty">No quotations received yet.</div>';

      side.querySelectorAll('[data-accept]').forEach(button => {
        button.onclick = async () => {
          if (!confirm('Accept this quotation? All other pending quotations will be rejected.')) return;
          try {
            await api(`/quotations/${button.dataset.accept}/accept`, { method: 'PATCH' });
            showToast('Quotation accepted. RFQ awarded successfully.');
            rfqDetail(id);
          } catch (error) {
            showToast(error.message);
          }
        };
      });

      side.querySelectorAll('[data-reject]').forEach(button => {
        button.onclick = async () => {
          if (!confirm('Reject this quotation?')) return;
          try {
            await api(`/quotations/${button.dataset.reject}/reject`, { method: 'PATCH' });
            showToast('Quotation rejected.');
            renderBuyerQuotations();
          } catch (error) {
            showToast(error.message);
          }
        };
      });
    };

    layout(`
      <div class="page-head">
        <div>
          <div class="eyebrow">${buyer ? 'Your RFQ' : 'Open requirement'}</div>
          <h1>${esc(rfq.product_name)}</h1>
          <p>Created ${date(rfq.created_at)} · ${esc(rfq.delivery_location)}</p>
        </div>
        ${statusBadge(rfq.status)}
      </div>
      <div class="grid grid-2">
        <section class="panel">
          <h2>Requirement</h2>
          <p style="line-height:1.7">${esc(rfq.description)}</p>
          <div class="grid grid-2" style="margin-top:25px">
            <div><span class="muted">RFQ ID</span><br><strong>${esc(rfq.id)}</strong></div>
            <div><span class="muted">Status</span><br><strong>${esc(rfq.status)}</strong></div>
          </div>
          <div class="grid grid-2" style="margin-top:18px">
            <div><span class="muted">Quantity</span><br><strong>${esc(rfq.quantity)}</strong></div>
            <div><span class="muted">Deadline</span><br><strong>${date(rfq.deadline)}</strong></div>
          </div>
          <div class="grid grid-2" style="margin-top:18px">
            <div><span class="muted">Delivery location</span><br><strong>${esc(rfq.delivery_location)}</strong></div>
            <div><span class="muted">Quotations</span><br><strong>${rfq.quotation_count || 0}</strong></div>
          </div>
          ${buyer ? `
            <div class="actions" style="margin-top:25px">
              <button class="btn secondary" id="edit-rfq">Edit RFQ</button>
              ${rfq.status === 'OPEN' ? '<button class="btn" id="close-rfq">Close RFQ</button><button class="btn danger" id="cancel-rfq">Cancel RFQ</button>' : ''}
            </div>
          ` : supplierCanQuote ? '<button class="btn" id="quote-rfq" style="margin-top:25px">Submit quotation</button>' : '<p class="muted" style="margin-top:25px">This RFQ is no longer accepting quotations.</p>'}
        </section>
        <section class="panel" id="side">
          <h2>${buyer ? 'Received quotations' : 'About this request'}</h2>
          <div id="side-content">
            <p class="muted">${buyer ? 'Loading quotations...' : 'Respond with your best commercial offer.'}</p>
          </div>
        </section>
      </div>
    `);

    if (buyer) {
      document.querySelector('#edit-rfq').onclick = () => (location.hash = `#edit/${id}`);

      document.querySelector('#close-rfq')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to close this RFQ?')) return;
        try {
          await api(`/rfqs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CLOSED' }) });
          showToast('RFQ closed successfully.');
          rfqDetail(id);
        } catch (error) {
          showToast(error.message);
        }
      });

      document.querySelector('#cancel-rfq')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this RFQ?')) return;
        try {
          await api(`/rfqs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
          showToast('RFQ cancelled successfully.');
          rfqDetail(id);
        } catch (error) {
          showToast(error.message);
        }
      });

      await renderBuyerQuotations();
    } else {
      document.querySelector('#quote-rfq')?.addEventListener('click', () => {
        location.hash = `#quote/${id}`;
      });
    }
  } catch (error) {
    layout(errorBox(error));
  }
}

function quoteForm(rfq) {
  layout(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Supplier response</div>
        <h1>Quote ${esc(rfq.product_name)}</h1>
        <p>Send a clear offer before ${date(rfq.deadline)}.</p>
      </div>
    </div>
    <section class="panel" style="max-width:700px">
      <div id="form-message"></div>
      <form id="quote-form">
        <div class="grid grid-2">
          <div class="field"><label>Unit price</label><input id="unitPrice" type="number" min="0" step="0.01" required></div>
          <div class="field"><label>Total price</label><input id="totalPrice" type="number" min="0" step="0.01" required></div>
        </div>
        <div class="field"><label>Delivery/lead time</label><input id="estimatedDeliveryTime" maxlength="120" placeholder="e.g. 10 days" required></div>
        <div class="field"><label>Supplier remarks</label><textarea id="message" maxlength="1000" placeholder="Can deliver to Hyderabad."></textarea></div>
        <div class="actions">
          <button class="btn" type="submit">Submit quotation</button>
          <button type="button" class="btn secondary" id="cancel">Cancel</button>
        </div>
      </form>
    </section>
  `);

  document.querySelector('#cancel').onclick = () => (location.hash = `#rfq/${rfq.id}`);
  document.querySelector('#quote-form').onsubmit = async event => {
    event.preventDefault();
    const message = document.querySelector('#form-message');
    const payload = {
      unitPrice: document.querySelector('#unitPrice').value,
      totalPrice: document.querySelector('#totalPrice').value,
      estimatedDeliveryTime: document.querySelector('#estimatedDeliveryTime').value,
      message: document.querySelector('#message').value
    };

    const errors = validateClientQuotation(payload);
    if (errors.length) {
      message.innerHTML = errorBox({ message: errors[0] });
      return;
    }

    try {
      await api(`/rfqs/${rfq.id}/quotations`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Quotation submitted successfully.');
      location.hash = '#quotations';
    } catch (error) {
      message.innerHTML = errorBox(error);
    }
  };
}

async function quotationsPage() {
  layout(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Supplier workspace</div>
        <h1>Your quotations.</h1>
        <p>Keep track of every offer you have submitted.</p>
      </div>
    </div>
    <section class="panel"><div id="content"><p class="muted">Loading quotations...</p></div></section>
  `);

  try {
    const { quotations } = await api('/my/quotations');
    document.querySelector('#content').innerHTML = quotations.length
      ? `<div class="table-wrap"><table class="table"><thead><tr><th>RFQ</th><th>Price</th><th>Delivery</th><th>Status</th><th>Submitted</th></tr></thead><tbody>${quotations.map(q => `
          <tr>
            <td><strong>${esc(q.product_name)}</strong><br><span class="muted">${esc(q.delivery_location)}</span></td>
            <td>${money(q.quoted_price)}</td>
            <td>${esc(q.estimated_delivery_time)}</td>
            <td>${statusBadge(q.status || 'OPEN')}</td>
            <td>${date(q.created_at)}</td>
          </tr>
        `).join('')}</tbody></table></div>`
      : '<div class="empty">You haven\'t submitted any quotations yet.</div>';
  } catch (error) {
    document.querySelector('#content').innerHTML = errorBox(error);
  }
}

async function render() {
  const route = location.hash.slice(1) || (state.user ? 'dashboard' : 'login');

  if (!state.user && !['login', 'register', 'forgot-password'].includes(route)) {
    location.hash = '#login';
    return;
  }

  if (route === 'login' || route === 'register' || route === 'forgot-password') return authPage(route);
  if (route === 'change-password') return changePasswordForm();
  if (route === 'dashboard') return state.user.role === 'BUYER' ? buyerDashboard() : supplierDashboard();
  if (route === 'new-rfq') return rfqForm();
  if (route === 'quotations') return quotationsPage();
  if (route.startsWith('edit/')) {
    try {
      const { rfq } = await api(`/rfqs/${route.split('/')[1]}`);
      return rfqForm(rfq);
    } catch (error) {
      return layout(errorBox(error));
    }
  }
  if (route.startsWith('quote/')) {
    try {
      const { rfq } = await api(`/rfqs/${route.split('/')[1]}`);
      return quoteForm(rfq);
    } catch (error) {
      return layout(errorBox(error));
    }
  }
  if (route.startsWith('rfq/')) return rfqDetail(route.split('/')[1]);

  layout('<div class="empty">Page not found.</div>');
}

window.addEventListener('hashchange', render);
render();
