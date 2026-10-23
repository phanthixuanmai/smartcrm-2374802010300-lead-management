# SmartCRM – Quản lý linh kiện

API quản lý danh mục linh kiện thay thế, sử dụng Node.js, Express và MySQL.

## 1. Yêu cầu

- Node.js 18 trở lên và npm.
- MySQL Server 8.0.16 trở lên đang chạy. Schema dùng InnoDB, `CHECK` constraints
  và collation `utf8mb4_0900_ai_ci`.
- Postman (không bắt buộc, dùng để kiểm thử API).

## 2. Phiên bản công cụ

Phiên bản ghi nhận trên máy thực hiện cập nhật:

| Công cụ | Phiên bản |
|---|---|
| Node.js | 18.20.7 |
| npm | 10.8.2 |
| MySQL | 8.4.9 (server chạy trên máy này) |
| Postman | Chưa xác minh trên máy này |
| Git | 2.49.0.windows.1 |

Kiểm tra phiên bản thực tế bằng `node --version`, `npm --version`,
`mysql --version` và `git --version`. Nếu dùng Postman, xem phiên bản trong
**Help > About**.

## 3. Cài đặt và cấu hình

```sh
npm install
```

Tạo file cấu hình từ mẫu (Windows CMD):

```bat
copy .env.example .env
```

Sửa `DB_USER` và `DB_PASSWORD` trong `.env` thành tài khoản MySQL trên máy bạn
(máy thực hiện hiện đã cấu hình tài khoản ứng dụng cục bộ).
Không commit file `.env`. Mặc định cấu hình kết nối MySQL tại `localhost:3306`.
Tài khoản phải có quyền tạo database `smartcrm`; lệnh khởi tạo sẽ tự tạo database,
5 bảng, 3 linh kiện, 3 dòng tồn kho và 2 phiếu bảo hành đang mở.

Nếu chưa có MySQL Server, hãy cài MySQL Community Server 8.0.16+ và khởi động
dịch vụ MySQL trước khi chạy app. Có thể tạo database và cấp quyền trong MySQL
Workbench/MySQL Shell; thay `your_mysql_password` bằng mật khẩu do bạn tự đặt:

```sql
CREATE DATABASE IF NOT EXISTS smartcrm
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'smartcrm_app'@'127.0.0.1' IDENTIFIED BY 'your_mysql_password';
GRANT ALL PRIVILEGES ON smartcrm.* TO 'smartcrm_app'@'127.0.0.1';
GRANT CREATE ON *.* TO 'smartcrm_app'@'127.0.0.1';
```

Sau đó dùng `DB_HOST=127.0.0.1`, `DB_USER=smartcrm_app` và cùng mật khẩu trong
`.env`. Quyền `CREATE` trên server cần thiết để script có thể tự tạo database
khi chưa tồn tại.

## 4. Khởi tạo database và chạy server

```sh
npm run db:init
npm run dev
```

`db:init` tự tạo database MySQL `smartcrm` nếu chưa có và khởi tạo dữ liệu mẫu
có thể chạy lại an toàn. Backend khởi động thành công khi terminal hiển thị
`MySQL database connected` và `Server running... port 3000`.

Các bước dựng hệ thống từ đầu:

1. Cài dependency: `npm install`
2. Tạo cấu hình: `copy .env.example .env` (Windows CMD), sau đó điền
   `DB_USER` và `DB_PASSWORD`.
3. Tạo database (nếu chưa tồn tại):
   `mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS smartcrm;"`
   (hoặc chạy lệnh SQL trong MySQL Workbench). `db:init` cũng tự tạo database
   nếu tài khoản cấu hình có quyền `CREATE`.
4. Khởi tạo schema và seed: `npm run db:init`
5. Mở terminal thứ nhất, khởi động API: `npm run dev`
6. Mở terminal thứ hai, khởi động frontend: `npm run dev:frontend`
7. Mở `http://localhost:5173` trên trình duyệt.
8. Chạy kiểm thử: `npm test`

Unit/API tests dùng mock database nên không cần MySQL Server; kiểm thử nghiệp vụ
tồn kho bao gồm xuất kho hợp lệ, xuất đúng bằng tồn, xuất vượt tồn, quantity
không hợp lệ và OUT thiếu phiếu bảo hành.

## 5. Part API

Base URL: `http://localhost:3000/api/parts`

| Method | Endpoint | Kết quả |
|---|---|---|
| GET | `/api/parts` | `200` và danh sách linh kiện |
| GET | `/api/parts/:id` | `200` hoặc `404` |
| POST | `/api/parts` | `201`; `409` nếu `part_code` đã tồn tại |
| PUT | `/api/parts/:id` | `200`, `400`, `404` hoặc `409` |
| DELETE | `/api/parts/:id` | `204`, `404` hoặc `409` nếu linh kiện đang được tham chiếu |

Ví dụ body cho POST/PUT:

```json
{
  "part_code": "PART-004",
  "name": "Pin iPhone 12",
  "unit": "cái",
  "description": "Pin thay thế iPhone 12",
  "is_active": true
}
```

Ba bản ghi seed: `PART-001`, `PART-002` và `PART-003`.

## 6. Inventory API và giao diện Sprint 2

Frontend chạy độc lập backend tại `http://localhost:5173`, gồm ba màn hình:
tổng quan tồn kho (`#inventory`), chi tiết linh kiện
(`/#part/:inventoryId`) và form nhập/xuất (`/#transaction/:inventoryId`).
Mỗi màn hình dùng `DataState` cho trạng thái tải, rỗng và lỗi có nút thử lại.
Frontend gọi API trên cổng `3000`; CORS cho phép các origin dev được cấu hình
qua `FRONTEND_ORIGINS`. Do frontend chạy riêng, khi backend tắt giao diện vẫn
hiển thị lỗi kết nối có hướng dẫn và nút thử lại. Ảnh giao diện và luồng UC03
được lưu tại `docs/inventory-list.png`, `docs/transaction-form.png` và
`docs/e2e-xuat-kho.png`.

| Method | Endpoint | Kết quả |
|---|---|---|
| GET | `/api/inventory` | Danh sách tồn kho có phân trang; hỗ trợ `centerCode`, `q`, `page`, `pageSize` |
| GET | `/api/inventory/:id` | Chi tiết một dòng tồn |
| GET | `/api/inventory/:id/transactions` | Tối đa 100 giao dịch gần nhất và phiếu liên quan |
| POST | `/api/inventory/:id/transactions` | Nhập `IN` hoặc xuất `OUT`; ghi lịch sử và cập nhật tồn trong một transaction |
| GET | `/api/warranty-tickets?status=OPEN` | Danh sách phiếu bảo hành, lọc phiếu đang mở |

Ví dụ xuất 2 linh kiện tồn kho cho phiếu bảo hành đang mở:

```json
{
  "type": "OUT",
  "quantity": 2,
  "ticketId": "1",
  "createdBy": "tech-01",
  "note": "Thay linh kiện theo phiếu bảo hành"
}
```

`quantity` phải là số nguyên dương. Xuất kho bắt buộc có `ticketId` hợp lệ
đang mở; tồn không đủ trả `409`. `POST` thành công trả `201` cùng `newStock`.
Các biến `FRONTEND_ORIGINS` trong `.env` có thể dùng để đổi danh sách origin
dev được phép gọi API.

## 7. Checklist xác nhận

Chỉ đánh dấu sau khi hoàn tất và kiểm tra trực tiếp trên máy:

- [x] Database connection (`npm run db:init`, đủ 5 bảng; server báo kết nối thành công)
- [x] Part CRUD (GET, POST, GET by id, PUT, DELETE; đã kiểm thử với MySQL thật)
- [x] API testing (POST trùng `part_code` trả `409`; đã kiểm thử với MySQL thật)
- [ ] Screenshots trong `docs/`:
  - [ ] `server-running.png`
  - [ ] `db-connected.png`
  - [x] `api-get-parts.png`
  - [x] `api-create-part.png`
  - [x] Giao diện tồn kho: `inventory-list.png`
  - [x] Form giao dịch: `transaction-form.png`
  - [x] Luồng UC03: `e2e-xuat-kho.png`
  - [x] Backend tắt: `backend-offline-error.png`
- [x] Sprint 2 đã kiểm thử với MySQL thật, gồm xuất kho gắn phiếu bảo hành và kiểm tra tồn sau giao dịch
- [ ] Ảnh kết quả `npm test` đã lưu trong `docs/`
- [x] Có ít nhất 5 unit test và test ngoại lệ/biên; `npm test` đạt 16/16
- [x] Giao diện có trạng thái tải, rỗng, lỗi và nút thử lại
- [x] Đã hoàn thành hướng dẫn dựng hệ thống ở mục 3
- [x] Clone repo mới từ GitHub; cài dependency, init DB, test và chạy thử API/frontend đều thành công
- [ ] Peer review từ bạn cùng lớp và 3 dòng ghi nhận trong issue

## 8. Điều chỉnh thiết kế BT1 và phạm vi Sprint 2

Ghi từng feedback nguyên văn của giảng viên, quyết định SỬA/GIỮ, lý do và phần
thiết kế bị ảnh hưởng tại [`docs/thay-doi-thiet-ke.md`](docs/thay-doi-thiet-ke.md).
Các hạng mục chưa hoàn tất hoặc được hoãn trong Sprint 2 được ghi ở cùng tài
liệu để không nhầm lẫn với các bước đã kiểm thử.