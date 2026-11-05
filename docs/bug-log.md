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
