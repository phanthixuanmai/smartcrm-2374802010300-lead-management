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
| MySQL | 8.4.9 (đã dùng trong lần kiểm thử trước; dịch vụ không khả dụng trong phiên xác nhận hiện tại) |
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
Đặt `AUTH_USERNAME` và `AUTH_PASSWORD` để tạo tài khoản đăng nhập SmartCRM;
hãy thay mật khẩu mẫu bằng mật khẩu riêng, đủ mạnh trước khi triển khai.
Sau khi chạy frontend tại `http://localhost:5173`, đăng nhập bằng tài khoản
này. Phiên đăng nhập lưu trong cookie `HttpOnly`, hết hạn sau 8 giờ và mất hiệu
lực khi máy chủ khởi động lại.
Không commit file `.env`. Mặc định cấu hình kết nối MySQL tại `localhost:3306`.
Tài khoản phải có quyền tạo database `smartcrm`; lệnh khởi tạo sẽ tự tạo database
và schema, rồi nhập dữ liệu CSV trong `data/imports/`.

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

`db:init` tự tạo database MySQL `smartcrm` nếu chưa có, sau đó nhập tối đa 100
dòng dữ liệu từ mỗi `data/imports/parts.csv` và
`data/imports/part_transactions.csv`, cùng toàn bộ
`data/imports/service_centers.csv`. Các giao dịch đầu vào tham chiếu linh kiện
không nằm trong 100 dòng đầu bị bỏ qua để bảo toàn khóa ngoại; với bộ dữ liệu
này, 51/100 giao dịch được nhập. Đơn vị tính dùng `cái` do CSV linh kiện không
có cột đơn vị; tồn kho ban đầu được tính từ các giao dịch đã nhập. Chạy lại
`db:init` không nhân đôi lịch sử giao dịch đã nhập. Backend khởi động thành công khi terminal hiển thị
`MySQL database connected` và `Server running... port 3000`.
Ngưỡng tối thiểu của mỗi dòng tồn kho là 2 cái; hệ thống bật cảnh báo khi tồn
thực tế nhỏ hơn hoặc bằng ngưỡng này. Lệnh khởi tạo cập nhật ngưỡng 2 cho dữ
liệu kho hiện có.

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
Ma trận 12 ca, trạng thái thực chạy và phạm vi OWASP được ghi trong
[`docs/test-plan.md`](docs/test-plan.md). Request API để chạy bằng VS Code REST
Client có tại [`tests/smartcrm-api.http`](tests/smartcrm-api.http). Các ca tích
hợp MySQL trong `tests/mysql-inventory.test.js` dùng `resetDb()+seed` và chỉ
chạy khi `TEST_DB_NAME` trỏ tới database local riêng có hậu tố `_test`, khác
`DB_NAME`, cùng `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` và
`TEST_DB_PASSWORD` riêng. Tạo database test trước, sau đó chạy
`npm test -- --runTestsByPath tests/mysql-inventory.test.js`. Nếu chưa cấu hình
schema test, hai ca này được skip; user test cần quyền tạo bảng/foreign key và
xóa dữ liệu trong schema test. Không chạy trên production hoặc host từ xa.

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
  "unit_price": 125000,
  "description": "Pin thay thế iPhone 12",
  "is_active": true
}
```

Danh mục linh kiện được nhập từ 100 dòng đầu của `data/imports/parts.csv`;
giá nhập từ CSV được lưu ở `unit_price` và trả về trong Parts API.

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
| GET | `/api/inventory` | Danh sách tồn kho có phân trang; hỗ trợ `centerCode`, `q`, `page`, `pageSize`; trả thêm tên và thành phố trung tâm |
| GET | `/api/inventory/:id` | Chi tiết một dòng tồn |
| GET | `/api/inventory/:id/transactions` | Tối đa 100 giao dịch gần nhất và phiếu liên quan |
| POST | `/api/inventory/:id/transactions` | Nhập `IN` hoặc xuất `OUT`; ghi lịch sử và cập nhật tồn trong một transaction |
| GET | `/api/warranty-tickets?status=OPEN` | Danh sách phiếu bảo hành; lọc theo `OPEN`, `CLOSED` hoặc `CANCELLED` |
| GET | `/api/warranty-tickets/:id` | Chi tiết phiếu bảo hành; `404` nếu không tồn tại |
| POST | `/api/warranty-tickets` | Tạo phiếu; `status` mặc định là `OPEN`, `409` nếu trùng mã |
| PUT | `/api/warranty-tickets/:id` | Cập nhật mã và trạng thái phiếu |
| DELETE | `/api/warranty-tickets/:id` | Xóa phiếu; `409` nếu đang được giao dịch kho tham chiếu |

Body cho POST/PUT:

```json
{
  "ticket_code": "BH-2026-003",
  "status": "OPEN"
}
```

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
Tại form giao dịch, kỹ thuật viên có thể tìm theo tên linh kiện; kết quả cho
biết mã, trung tâm và lượng tồn để chọn đúng dòng kho trước khi ghi nhận.
Các biến `FRONTEND_ORIGINS` trong `.env` có thể dùng để đổi danh sách origin
dev được phép gọi API.

## 7. Deploy trên Railway

Repository đã có `railway.json`: Railway chạy `npm ci`, sau đó `npm start`;
health check dùng `/health`. Ứng dụng phục vụ cả frontend và API trên cùng một
domain Railway.

1. Tạo hoặc mở project Railway, thêm MySQL service và kết nối service ứng dụng
   với MySQL bằng **reference variables**, không chép thông tin database vào mã
   nguồn.
2. Tạo Application service từ GitHub repository này và chọn nhánh muốn deploy.
   Railway sẽ đọc `railway.json` tại thư mục gốc.
3. Trong **Application → Variables**, thêm các biến:

   | Biến | Giá trị |
   |---|---|
   | `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
   | `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
   | `DB_USER` | `${{MySQL.MYSQLUSER}}` |
   | `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
   | `AUTH_USERNAME` | Tên tài khoản SmartCRM do bạn chọn |
   | `AUTH_PASSWORD` | Mật khẩu ngẫu nhiên, đủ mạnh do bạn tự đặt |
   | `NODE_ENV` | `production` |

   Thay `MySQL` trong cú pháp reference bằng đúng tên MySQL service trong
   project. Railway tự cấp `PORT`. Không đặt `DB_CREATE_DATABASE=false` trừ khi
   database trong `DB_NAME` đã tồn tại và user có quyền tạo các bảng.
4. Deploy và chờ health check `/health` thành công; mở domain public của
   Application service và đăng nhập bằng `AUTH_USERNAME`/`AUTH_PASSWORD`.

Lệnh `npm start` chạy khởi tạo schema và nhập CSV trước khi mở HTTP server.
Vì vậy user MySQL phải có quyền tạo database khi database chưa tồn tại và tạo
bảng trong database. Import chỉ lấy tối đa 100 dòng đầu từ mỗi CSV; chạy deploy
lặp lại không nhân đôi các giao dịch CSV đã được đánh dấu import.

## 8. Checklist xác nhận

Chỉ đánh dấu sau khi hoàn tất và kiểm tra trực tiếp trên máy:

- [ ] Database connection and CSV import (`npm run db:init`, 7 bảng; CSV nhập tối đa 100 dòng mỗi tệp)
- [x] Part CRUD (GET, POST, GET by id, PUT, DELETE; đã kiểm thử với MySQL thật)
- [x] API testing (POST trùng `part_code` trả `409`; đã kiểm thử với MySQL thật)
- [ ] Chạy `npm run db:init` hai lần; xác nhận dữ liệu CSV không bị nhân đôi
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
- [x] Có unit test và test ngoại lệ/biên; Jest đạt 29 PASS; 2 ca MySQL được skip khi chưa cấu hình DB test riêng
- [x] Giao diện có trạng thái tải, rỗng, lỗi và nút thử lại
- [x] Đã hoàn thành hướng dẫn dựng hệ thống ở mục 3
- [x] Clone sạch commit nộp từ GitHub vào thư mục mới; `npm ci` và `npm test` đạt 20/20
- [ ] Peer review từ bạn cùng lớp và 3 dòng ghi nhận trong issue

## 8. Điều chỉnh thiết kế BT1 và phạm vi Sprint 2

Ghi từng feedback nguyên văn của giảng viên, quyết định SỬA/GIỮ, lý do và phần
thiết kế bị ảnh hưởng tại [`docs/thay-doi-thiet-ke.md`](docs/thay-doi-thiet-ke.md).
Tổng kết công việc, kiểm chứng UC03, ảnh đã có và các việc còn chờ trong workshop
được ghi tại [`docs/workshop-buoi-10.md`](docs/workshop-buoi-10.md).

## 9. Triển khai Railway

Ứng dụng có thể chạy với một Railway service cho Node.js (Express phục vụ cả
API và giao diện) và một Railway MySQL service. Cấu hình service Node.js nằm
trong `railway.json`; Railway dùng `PORT` được cấp tự động và endpoint
`/health` để kiểm tra trạng thái.

1. Tạo Railway project, thêm service ứng dụng từ repository này và thêm một
   service MySQL trong cùng project/environment.
2. Trong Variables của service ứng dụng, tham chiếu các biến MySQL của service
   database (thay `MySQL` bằng đúng tên service nếu bạn đặt tên khác):

   ```text
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   DB_CREATE_DATABASE=false
   ```

   Không đưa mật khẩu vào Git hoặc chat. `DB_CREATE_DATABASE=false` yêu cầu
   script dùng database Railway đã tạo thay vì cố tạo database mới.
3. Triển khai service ứng dụng. Lệnh `npm start` khởi tạo schema và dữ liệu mẫu
   trước khi bật server; thao tác này chạy trong private network và có thể chạy
   lại an toàn.
4. Tạo public domain cho service ứng dụng trong Railway. Mở URL đó để kiểm tra
   giao diện; `/health` trả trạng thái service và `/api/inventory` trả dữ liệu.
   Frontend gọi API cùng origin khi được phục vụ từ service ứng dụng.

Các dịch vụ cloud và database có thể phát sinh phí theo tài khoản/gói Railway.
Phần cấu hình này chưa tạo Railway project, tài nguyên hoặc public domain.
