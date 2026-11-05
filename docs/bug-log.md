# Bug Log

## BUG-00 — LOW — Inventory domain service coupled to HTTP status codes

- **Mã và mức độ:** BUG-00 · LOW
- **Phát hiện bởi:** Review thiết kế service khi bổ sung xử lý lỗi giao dịch kho.
- **Triệu chứng:** Quy tắc kho ném lỗi mang HTTP status, khiến domain phụ thuộc transport.
- **Cách tái lập:** Gọi `createTransactionPlan` với lượng xuất vượt tồn hoặc thiếu phiếu; lỗi domain trực tiếp chứa status HTTP.
- **Nguyên nhân:** `InventoryError` lưu `statusCode` thay vì mã lỗi nghiệp vụ.
- **Cách sửa:** Chuyển service sang error code nghiệp vụ và ánh xạ sang HTTP ở route.
- **Commit và xác nhận:** Đã sửa trong commit `26322d0`; unit/API tests xác nhận mapping 400/404/409.

## BUG-01 — MEDIUM — Lịch sử giao dịch của inventory không tồn tại trả danh sách rỗng

- **Mã và mức độ:** BUG-01 · MEDIUM
- **Phát hiện bởi:** Test HTTP hồi quy mới, chạy trên Express test server.
- **Triệu chứng:** `GET /api/inventory/{id}/transactions` trả `200 []` dù inventory ID không tồn tại.
- **Cách tái lập:** GET `/api/inventory/999999999/transactions` với phiên đăng nhập hợp lệ.
- **Nguyên nhân:** Service chỉ truy vấn giao dịch theo ID, không xác minh inventory tồn tại.
- **Cách sửa:** Xác minh inventory trước khi truy xuất lịch sử; phát lỗi `INVENTORY_NOT_FOUND` để route trả 404.
- **Commit và xác nhận:** `fix(inventory): return 404 for missing history item (BUG-01)`; `npx jest --runInBand tests/inventory-history-not-found.test.js` PASS.

## BUG-02 — MAJOR — Xuất kho có thể gắn phiếu vừa bị đóng đồng thời

- **Mã và mức độ:** BUG-02 · MAJOR — người dùng vẫn thao tác được nhưng sổ giao dịch có thể vi phạm trạng thái phiếu; không có cách sửa an toàn sau khi giao dịch đã ghi.
- **Phát hiện bởi:** Test đồng thời MySQL với phiếu được đóng trong lúc xác minh trạng thái xuất.
- **Triệu chứng:** Request xuất kiểm tra phiếu đang mở, nhưng request khác có thể đóng phiếu trước khi giao dịch xuất commit.
- **Cách tái lập:** Trong khi transaction xuất đang chạy, cập nhật cùng warranty ticket từ `OPEN` sang `CLOSED` sau lần đọc trạng thái và trước commit.
- **Nguyên nhân:** `hasOpenTicket` dùng SELECT thường nên không giữ row lock đến khi transaction kết thúc.
- **Cách sửa:** Dùng `SELECT ... FOR UPDATE` để tuần tự hóa việc xác minh phiếu với cập nhật trạng thái đồng thời.
- **Commit và xác nhận:** `fix(inventory): lock warranty ticket during withdrawal (BUG-02)`; `tests/inventory-ticket-lock.test.js` xác nhận request đóng bị chặn tới khi xuất commit; MySQL integration 12/12 PASS.

## BUG-03 — MEDIUM — Giá linh kiện nhiều hơn hai chữ số thập phân bị làm tròn âm thầm

- **Mã và mức độ:** BUG-03 · MEDIUM — người dùng vẫn tạo được linh kiện nhưng giá được lưu khác input; có thể khắc phục bằng cách nhập giá trong độ chính xác DB hỗ trợ.
- **Phát hiện bởi:** Thử POST và đọc lại giá trên MySQL test local.
- **Triệu chứng:** POST `unit_price: 1.239` trả 201 nhưng response/DB chứa `1.24`.
- **Cách tái lập:** POST `/api/parts` với giá `1.239`, sau đó SELECT `unit_price` theo `part_code`.
- **Nguyên nhân:** Service chỉ kiểm tra giá không âm; MySQL `DECIMAL(12,2)` tự làm tròn thêm chữ số.
- **Cách sửa:** Từ chối giá vượt giới hạn `DECIMAL(12,2)` hoặc có hơn hai chữ số thập phân bằng lỗi validation 400.
- **Commit và xác nhận:** `fix(parts): reject prices MySQL would round (BUG-03)`; `tests/parts-price-precision.test.js` và `tests/parts.test.js` PASS.
