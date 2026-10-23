import { getInventory, listTransactions } from '../api/inventory.api.js';
import { escapeHtml, renderDataState } from '../components/data-state.js';

export async function renderPartDetail(container, inventoryId) {
  const load = async () => {
    renderDataState(container, { loading: true });
    try {
      const [item, transactions] = await Promise.all([
        getInventory(inventoryId),
        listTransactions(inventoryId)
      ]);
      renderDataState(container, {
        data: item,
        render: () => {
          const history = transactions.length
            ? transactions.map((transaction) => `<tr><td>${escapeHtml(transaction.transaction_type === 'IN' ? 'Nhập kho' : 'Xuất kho')}</td><td>${escapeHtml(transaction.quantity)} ${escapeHtml(item.unit)}</td><td>${escapeHtml(transaction.ticket_code || '—')}</td><td>${escapeHtml(transaction.created_by)}</td><td>${new Date(transaction.created_at).toLocaleString('vi-VN')}</td></tr>`).join('')
            : '<tr><td colspan="5" class="history-empty">Chưa phát sinh giao dịch cho linh kiện này.</td></tr>';
          container.innerHTML = `
            <div class="breadcrumb"><a href="#inventory">Tổng quan kho</a><span>›</span><span>Chi tiết linh kiện</span></div>
            <section class="page-heading"><div><h2>Chi tiết linh kiện</h2><p>Thông tin tồn kho và lịch sử giao dịch.</p></div><a class="button button-primary" href="#transaction/${item.inventory_id}">＋ Nhập / xuất kho</a></section>
            <div class="detail-grid">
              <section class="panel detail-card">
                <div class="detail-top"><span class="detail-thumb">◈</span><span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.part_code)} · ${escapeHtml(item.center_code)}</p></span></div>
                <div class="stock-highlight"><small>TỒN HIỆN TẠI</small><strong>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</strong><span class="badge ${item.low_stock ? 'badge-low' : ''}">${item.low_stock ? 'Sắp hết hàng' : 'Đủ hàng'}</span></div>
                <div class="detail-stat"><span>Ngưỡng tối thiểu</span><strong>${escapeHtml(item.min_quantity)} ${escapeHtml(item.unit)}</strong></div>
                <div class="detail-stat"><span>Đơn vị tính</span><strong>${escapeHtml(item.unit)}</strong></div>
                <div class="detail-stat"><span>Mô tả</span><strong>${escapeHtml(item.description || '—')}</strong></div>
                <div class="detail-stat"><span>Cập nhật gần nhất</span><strong>${new Date(item.updated_at).toLocaleString('vi-VN')}</strong></div>
              </section>
              <section class="panel">
                <div class="panel-head"><h3>Lịch sử nhập / xuất</h3><span>${transactions.length} giao dịch gần đây</span></div>
                <div class="table-wrap"><table><thead><tr><th>LOẠI</th><th>SỐ LƯỢNG</th><th>PHIẾU BẢO HÀNH</th><th>NGƯỜI THỰC HIỆN</th><th>THỜI GIAN</th></tr></thead><tbody>${history}</tbody></table></div>
              </section>
            </div>`;
        },
        onRetry: load
      });
    } catch (error) {
      renderDataState(container, { error, onRetry: load });
    }
  };
  await load();
}
