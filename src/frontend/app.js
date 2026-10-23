import { renderInventoryList } from './pages/inventory-list.js';
import { renderPartDetail } from './pages/part-detail.js';
import { renderTransactionForm } from './pages/transaction-form.js';

const app = document.querySelector('#app');
let currentRoute = '';

async function renderRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === currentRoute && app.dataset.ready === 'true') {
    return;
  }
  currentRoute = route;
  app.dataset.ready = 'false';

  if (route.startsWith('part/')) {
    await renderPartDetail(app, route.slice('part/'.length));
  } else if (route.startsWith('transaction/')) {
    const id = route.slice('transaction/'.length);
    if (id) {
      await renderTransactionForm(app, id);
    } else {
      app.innerHTML = '<section class="state-card"><h3>Chọn linh kiện trước</h3><p>Vui lòng mở giao dịch từ danh sách kho.</p><a class="button button-primary" href="#inventory">Về danh sách kho</a></section>';
    }
  } else if (route === 'login') {
    app.innerHTML = '<section class="state-card"><h3>Chưa cấu hình đăng nhập</h3><p>Phiên đăng nhập chưa được triển khai trong phạm vi workshop.</p><a class="button button-primary" href="#inventory">Quay lại kho</a></section>';
  } else {
    await renderInventoryList(app);
  }

  app.dataset.ready = 'true';
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('auth:unauthorized', () => localStorage.removeItem('token'));
renderRoute();
