import { listInventory } from '../api/inventory.api.js';
import { escapeHtml, renderDataState } from '../components/data-state.js';

const icons = ['▧', '◈', '⌁', '▤', '◉', '◇'];

function renderList(container, result) {
  const rows = result.items.map((item, index) => `
    <tr>
      <td><div class="part-cell"><span class="part-thumb">${icons[index % icons.length]}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.part_code)} · ${escapeHtml(item.center_name || item.center_code)}</small></span></div></td>
      <td><span class="stock-value">${escapeHtml(item.quantity)}</span><span class="stock-unit">${escapeHtml(item.unit)}</span></td>
      <td>${escapeHtml(item.min_quantity)} ${escapeHtml(item.unit)}</td>
      <td><span class="badge ${item.low_stock ? 'badge-low' : ''}">${item.low_stock ? 'Sắp hết hàng' : 'Đủ hàng'}</span></td>
      <td><div class="row-actions">
        <a class="icon-button" href="#part/${item.inventory_id}" aria-label="Xem ${escapeHtml(item.name)}">↗</a>
        <a class="icon-button" href="#transaction/${item.inventory_id}" aria-label="Tạo giao dịch cho ${escapeHtml(item.name)}">↕</a>
      </div></td>
    </tr>`).join('');

  const totalUnits = result.items.reduce((total, item) => total + Number(item.quantity), 0);
  const lowStock = result.items.filter((item) => item.low_stock).length;
  const lowStockItems = result.items.filter((item) => item.low_stock);
  const distinctParts = new Set(result.items.map((item) => item.part_code)).size;
  const stockAlert = lowStockItems.length
    ? `<section class="stock-alert" role="status" aria-label="Cảnh báo sắp hết hàng">
        <span class="stock-alert-icon" aria-hidden="true">!</span>
        <div><strong>Cảnh báo sắp hết hàng</strong>
          <p>${lowStockItems.length} dòng tồn kho còn 2 cái hoặc ít hơn.</p>
          <ul>${lowStockItems.map((item) => `<li>${escapeHtml(item.name)} · ${escapeHtml(item.center_name || item.center_code)}: còn ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</li>`).join('')}</ul>
        </div>
      </section>`
    : '';
  container.innerHTML = `
    <section class="page-heading">
      <div><h2>Tổng quan kho</h2><p>Theo dõi linh kiện và tồn kho tại trung tâm của bạn.</p></div>
      <a class="button button-primary" href="#transaction/${result.items[0]?.inventory_id || ''}">＋ Ghi nhận giao dịch</a>
    </section>
    ${stockAlert}
    <section class="metrics" aria-label="Tổng quan">
      <article class="metric-card"><div><div class="metric-top">Mã linh kiện <span class="metric-icon">◫</span></div><div class="metric-value">${distinctParts}</div><div class="metric-note">đang theo dõi tại các trung tâm</div></div></article>
      <article class="metric-card"><div><div class="metric-top">Tổng số lượng tồn <span class="metric-icon">▤</span></div><div class="metric-value">${totalUnits.toLocaleString('vi-VN')}</div><div class="metric-note">đơn vị linh kiện trong kho</div></div></article>
      <article class="metric-card"><div><div class="metric-top">Cần bổ sung <span class="metric-icon">⌁</span></div><div class="metric-value">${lowStock}</div><div class="metric-note">dòng tồn dưới ngưỡng tối thiểu</div></div></article>
    </section>
    <div class="toolbar"><label class="search-box"><span>⌕</span><input id="inventory-search" type="search" placeholder="Tìm tên hoặc mã linh kiện..." aria-label="Tìm linh kiện"></label><span class="filter-label">Tất cả trung tâm dịch vụ</span></div>
    <section class="panel">
      <div class="panel-head"><h3>Danh sách tồn kho</h3><span>${result.items.length} linh kiện</span></div>
      <div class="table-wrap"><table><thead><tr><th>LINH KIỆN</th><th>TỒN HIỆN TẠI</th><th>NGƯỠNG TỐI THIỂU</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="table-footer"><span>Hiển thị ${result.items.length} linh kiện</span><span>Trang ${result.page}</span></div>
    </section>`;

  container.querySelector('#inventory-search').addEventListener('input', async (event) => {
    const search = event.currentTarget.value.trim().toLocaleLowerCase('vi');
    for (const row of container.querySelectorAll('tbody tr')) {
      row.hidden = !row.textContent.toLocaleLowerCase('vi').includes(search);
    }
  });
}

export async function renderInventoryList(container) {
  const load = async () => {
    renderDataState(container, { loading: true });
    try {
      const result = await listInventory({ page: 1, pageSize: 100 });
      renderDataState(container, {
        data: result.items,
        emptyMessage: 'Chưa có linh kiện trong kho. Hãy khởi tạo dữ liệu kho để bắt đầu.',
        render: () => renderList(container, result),
        onRetry: load
      });
    } catch (error) {
      renderDataState(container, { error, onRetry: load });
    }
  };
  await load();
}
