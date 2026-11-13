# API Documentation

Bảng mô tả chi tiết các route thực tế được định nghĩa trong `src/backend/routes/`:

| Method | Endpoint | Mô tả chi tiết | Yêu cầu xác thực |
| :--- | :--- | :--- | :--- |
| **GET** | `/health` | Kiểm tra trạng thái hoạt động của ứng dụng. | Không yêu cầu |
| **GET** | `/api/parts` | Lấy danh sách toàn bộ linh kiện trong hệ thống. | Yêu cầu đăng nhập |
| **POST** | `/api/parts` | Tạo mới một linh kiện (`part_code`, `name`, `unit`, `unit_price`,...). | Yêu cầu đăng nhập |
| **GET** | `/api/inventory` | Truy vấn danh sách tồn kho các linh kiện. | Yêu cầu đăng nhập |
| **POST** | `/api/inventory/transactions` | Thực hiện giao dịch xuất/nhập kho (gắn với warranty ticket). | Yêu cầu đăng nhập |
| **GET** | `/api/inventory/{id}/transactions` | Xem lịch sử giao dịch chi tiết của một mã tồn kho cụ thể. | Yêu cầu đăng nhập |
| **POST** | `/api/auth/login` | Xác thực người dùng, tạo phiên đăng nhập (session/cookie). | Không yêu cầu |
| **POST** | `/api/auth/logout` | Hủy phiên đăng nhập hiện tại của người dùng. | Yêu cầu đăng nhập |