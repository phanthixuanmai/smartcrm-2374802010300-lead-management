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
5 bảng và 3 linh kiện seed.

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

`db:init` tự tạo database MySQL `smartcrm` nếu chưa có, tạo 5 bảng và seed
3 linh kiện mẫu; chạy lại không thêm trùng dữ liệu. Khi khởi động thành công,
terminal hiển thị `MySQL database connected` và
`Server running... port 3000`.

Chạy unit/API tests không cần MySQL Server:

```sh
npm test
```

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

## 6. Checklist xác nhận

Chỉ đánh dấu sau khi hoàn tất và kiểm tra trực tiếp trên máy:

- [x] Database connection (`npm run db:init`, đủ 5 bảng; server báo kết nối thành công)
- [x] Part CRUD (GET, POST, GET by id, PUT, DELETE; đã kiểm thử với MySQL thật)
- [x] API testing (POST trùng `part_code` trả `409`; đã kiểm thử với MySQL thật)
- [ ] Screenshots trong `docs/`:
  - [ ] `server-running.png`
  - [ ] `db-connected.png`
  - [x] `api-get-parts.png`
  - [x] `api-create-part.png`

## 7. Điều chỉnh thiết kế BT1

Ghi từng feedback nguyên văn của giảng viên, quyết định SỬA/GIỮ, lý do và phần
thiết kế bị ảnh hưởng tại [`docs/thay-doi-thiet-ke.md`](docs/thay-doi-thiet-ke.md).