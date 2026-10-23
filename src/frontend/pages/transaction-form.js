import { createTransaction, getInventory } from '../api/inventory.api.js';
import { listOpenTickets } from '../api/warranty-tickets.api.js';
import { escapeHtml, renderDataState } from '../components/data-state.js';

export async function renderTransactionForm(container, inventoryId) {
  const load = async () => {
    renderDataState(container, { loading: true });
    try {
      const [item, tickets] = await Promise.all([
        getInventory(inventoryId),
        listOpenTickets()
      ]);
      renderDataState(container, {
        data: item,
        render: () => {
          const ticketOptions = tickets.map((ticket) => `<option value="${ticket.ticket_id}">${escapeHtml(ticket.ticket_code)} · ${escapeHtml(ticket.status)}</option>`).join('');
          container.innerHTML = `
            <div class="breadcrumb"><a href="#inventory">Tổng quan kho</a><span>›</span><a href="#part/${item.inventory_id}">${escapeHtml(item.part_code)}</a><span>›</span><span>Giao dịch</span></div>
            <section class="page-heading"><div><h2>Ghi nhận nhập / xuất kho</h2><p>Giao dịch sẽ cập nhật số tồn và lịch sử trong cùng một database transaction.</p></div></section>
            <div id="transaction-message"></div>
            <section class="panel form-panel">
              <div class="detail-top"><span class="detail-thumb">◈</span><span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.part_code)} · ${escapeHtml(item.center_code)} · Tồn hiện tại: ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</p></span></div>
              <form id="transaction-form">
                <div class="form-grid">
                  <div class="form-field"><label for="transaction-type">Loại giao dịch *</label><select id="transaction-type" name="type" required><option value="OUT">Xuất kho · OUT</option><option value="IN">Nhập kho · IN</option></select></div>
                  <div class="form-field"><label for="transaction-quantity">Số lượng (${escapeHtml(item.unit)}) *</label><input id="transaction-quantity" name="quantity" type="number" min="1" step="1" required placeholder="Nhập số nguyên dương"></div>
                  <div class="form-field form-field-full" id="ticket-field"><label for="ticket-id">Phiếu bảo hành đang mở *</label><select id="ticket-id" name="ticketId" required>${ticketOptions || '<option value="">Không có phiếu bảo hành đang mở</option>'}</select><span class="form-help">Chỉ cho phép xuất kho khi phiếu bảo hành hợp lệ và còn mở.</span></div>
                  <div class="form-field form-field-full"><label for="created-by">Người thực hiện *</label><input id="created-by" name="createdBy" required maxlength="100" value="tech-01"></div>
                  <div class="form-field form-field-full"><label for="transaction-note">Ghi chú</label><textarea id="transaction-note" name="note" maxlength="500" placeholder="Mô tả ngắn về giao dịch..."></textarea></div>
                </div>
                <div class="stock-callout" id="stock-callout">Tồn sau khi giao dịch: —</div>
                <div class="form-actions"><a class="button button-secondary" href="#part/${item.inventory_id}">Hủy</a><button class="button button-primary" type="submit">Xác nhận xuất kho</button></div>
              </form>
            </section>`;

          const form = container.querySelector('#transaction-form');
          const type = form.elements.type;
          const quantity = form.elements.quantity;
          const ticketField = container.querySelector('#ticket-field');
          const ticketId = form.elements.ticketId;
          const submit = form.querySelector('[type="submit"]');
          const callout = container.querySelector('#stock-callout');

          const updateForm = () => {
            const isOut = type.value === 'OUT';
            ticketField.hidden = !isOut;
            ticketId.required = isOut;
            submit.textContent = isOut ? 'Xác nhận xuất kho' : 'Xác nhận nhập kho';
            const amount = Number(quantity.value);
            callout.textContent = Number.isInteger(amount) && amount > 0
              ? `Tồn sau khi giao dịch: ${item.quantity + (isOut ? -amount : amount)} ${item.unit}`
              : `Tồn hiện tại: ${item.quantity} ${item.unit}`;
          };
          type.addEventListener('change', updateForm);
          quantity.addEventListener('input', updateForm);
          updateForm();

          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = {
              type: type.value,
              quantity: Number(quantity.value),
              createdBy: form.elements.createdBy.value.trim(),
              note: form.elements.note.value.trim() || null
            };
            if (payload.type === 'OUT') {
              payload.ticketId = form.elements.ticketId.value;
            }

            submit.disabled = true;
            submit.textContent = 'Đang lưu...';
            const message = container.querySelector('#transaction-message');
            message.innerHTML = '';
            try {
              const result = await createTransaction(item.inventory_id, payload);
              message.innerHTML = `<div class="toast toast-success" role="status">${result.type === 'OUT' ? 'Xuất kho' : 'Nhập kho'} thành công. Tồn mới: <strong>${result.newStock} ${escapeHtml(item.unit)}</strong>. <a href="#part/${item.inventory_id}">Xem chi tiết</a></div>`;
            } catch (error) {
              message.innerHTML = `<div class="toast toast-error" role="alert">${escapeHtml(error.message)}</div>`;
              submit.disabled = false;
              updateForm();
            }
          });
        },
        onRetry: load
      });
    } catch (error) {
      renderDataState(container, { error, onRetry: load });
    }
  };
  await load();
}
