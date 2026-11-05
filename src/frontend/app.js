import { renderInventoryList } from './pages/inventory-list.js';
import { renderLoginPage } from './pages/login.js';
import { renderPartDetail } from './pages/part-detail.js';
import { renderTransactionForm } from './pages/transaction-form.js';
import { request } from './api/client.js';

const app = document.querySelector('#app');
let currentRoute = '';

function updateUser(user) {
  const name = document.querySelector('#user-name');
  const avatar = document.querySelector('#user-avatar');
  const logout = document.querySelector('#logout');
  name.textContent = user ? user.username : 'Chưa đăng nhập';
  avatar.textContent = user
    ? user.username.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : '—';
  logout.hidden = !user;
}

async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (error) {
    app.innerHTML = '<section class="state-card"><h3>Không thể đăng xuất</h3><p id="logout-error"></p></section>';
    app.querySelector('#logout-error').textContent = error.message;
    return;
  }
  updateUser(null);
  window.location.hash = 'login';
}

document.querySelector('#logout').addEventListener('click', logout);

async function renderRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === currentRoute && app.dataset.ready === 'true') {
    return;
  }
  currentRoute = route;
  app.dataset.ready = 'false';

  if (route === 'login') {
    updateUser(null);
    renderLoginPage(app);
  } else {
    let session;
    try {
      ({ user: session } = await request('/auth/session'));
      updateUser(session);
    } catch (error) {
      if (error.status === 401 || error.status === 503) {
        window.location.hash = 'login';
        return;
      }
      app.innerHTML = '<section class="state-card"><h3>Không thể xác minh đăng nhập</h3><p>Vui lòng kiểm tra kết nối máy chủ rồi thử lại.</p><button class="button button-primary" type="button" onclick="window.location.reload()">Thử lại</button></section>';
      app.dataset.ready = 'true';
      return;
    }

    if (route.startsWith('part/')) {
      await renderPartDetail(app, route.slice('part/'.length));
    } else if (route.startsWith('transaction/')) {
      const id = route.slice('transaction/'.length);
      if (id) {
        await renderTransactionForm(app, id);
      } else {
        app.innerHTML = '<section class="state-card"><h3>Chọn linh kiện trước</h3><p>Vui lòng mở giao dịch từ danh sách kho.</p><a class="button button-primary" href="#inventory">Về danh sách kho</a></section>';
      }
    } else {
      await renderInventoryList(app);
    }
  }

  app.dataset.ready = 'true';
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
