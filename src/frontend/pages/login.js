import { request } from '../api/client.js';

export function renderLoginPage(container) {
  container.innerHTML = `
    <section class="login-layout">
      <div class="login-card">
        <span class="login-mark">M</span>
        <p class="eyebrow">MEKONG PARTS MANAGEMENT</p>
        <h2>Chào mừng trở lại</h2>
        <p class="login-description">Đăng nhập để quản lý kho linh kiện của bạn.</p>
        <form id="login-form">
          <label for="login-username">Tên đăng nhập</label>
          <input id="login-username" name="username" type="text" autocomplete="username" required maxlength="200">
          <label for="login-password">Mật khẩu</label>
          <input id="login-password" name="password" type="password" autocomplete="current-password" required maxlength="1024">
          <p id="login-error" class="login-error" role="alert" hidden></p>
          <button class="button button-primary login-submit" type="submit">Đăng nhập</button>
        </form>
        <p class="login-help">Tài khoản được cấu hình bởi quản trị viên hệ thống.</p>
      </div>
    </section>
  `;

  const form = container.querySelector('#login-form');
  const submitButton = form.querySelector('button[type="submit"]');
  const errorMessage = container.querySelector('#login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Đang đăng nhập...';

    try {
      const formData = new FormData(form);
      await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password')
        })
      });
      window.location.hash = 'inventory';
    } catch (error) {
      errorMessage.textContent = error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      errorMessage.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Đăng nhập';
    }
  });
}
