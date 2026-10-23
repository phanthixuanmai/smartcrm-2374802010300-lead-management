export function renderDataState(container, { loading = false, error = null, data = null, render, emptyMessage = 'Chưa có dữ liệu.', onRetry }) {
  if (loading) {
    container.innerHTML = `
      <section class="state-card" aria-label="Đang tải dữ liệu">
        <div class="state-icon">↻</div>
        <h3>Đang tải dữ liệu</h3>
        <div class="skeleton" style="width: min(420px, 80%)"></div>
        <div class="skeleton" style="width: min(340px, 65%)"></div>
      </section>`;
    return;
  }

  if (error) {
    container.innerHTML = `
      <section class="state-card" role="alert">
        <div class="state-icon">!</div>
        <h3>Không tải được dữ liệu</h3>
        <p>${escapeHtml(error.message || 'Đã có lỗi xảy ra khi tải dữ liệu.')}</p>
        <button class="button button-secondary" type="button" data-retry>Thử lại</button>
      </section>`;
    container.querySelector('[data-retry]').addEventListener('click', onRetry);
    return;
  }

  if (Array.isArray(data) && data.length === 0) {
    container.innerHTML = `<section class="state-card"><div class="state-icon">◫</div><h3>Chưa có dữ liệu</h3><p>${escapeHtml(emptyMessage)}</p></section>`;
    return;
  }

  render(container, data);
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
