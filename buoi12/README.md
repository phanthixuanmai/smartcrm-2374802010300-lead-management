# BÁO CÁO BUỔI 12 – L5 KHO LINH KIỆN

## Trang bìa

- [x] Repo: [smartcrm-2374802010300-lead-management](https://github.com/phanthixuanmai/smartcrm-2374802010300-lead-management) (public).
- [x] Tag nộp: [v0.2](https://github.com/phanthixuanmai/smartcrm-2374802010300-lead-management/tree/v0.2).
- [x] Track: SE.
- [x] Mã luồng: L5 – Kho linh kiện.
- [x] Họ tên: Phan Thị Xuân Mai.
- [x] MSSV: 2374802010300.

## Mục 1. Tóm tắt hệ thống

SmartCRM L5 hỗ trợ cửa hàng/sửa chữa thiết bị quản lý danh mục linh kiện và số
lượng tồn theo kho. Người dùng có thể tra cứu linh kiện, xem lịch sử nhập/xuất,
ghi giao dịch nhập kho hoặc xuất kho gắn với phiếu bảo hành, và quản lý phiếu
bảo hành. Hệ thống từ chối dữ liệu sai, phiếu không hợp lệ và giao dịch xuất
vượt tồn để tránh ghi nhận sai số lượng.

Backend dùng Node.js 18+, Express và MySQL; giao diện web JavaScript chạy riêng
với backend. Các phiên bản ghi nhận khi chụp bằng chứng: Node.js 18.20.7,
npm 10.8.2, MySQL Community Server 8.4.9.

## Mục 2. Kiến trúc đã hiện thực

Frontend gọi API REST qua module client dùng chung. Express routes nhận request,
kiểm tra/đọc dữ liệu HTTP và gọi service; service thực hiện quy tắc nghiệp vụ
và truy vấn MySQL. Response được route ánh xạ thành JSON cùng mã HTTP để frontend
hiển thị kết quả hoặc trạng thái lỗi. Giao dịch tồn kho dùng MySQL transaction
để cập nhật tồn và ghi lịch sử cùng nhau.

- Sơ đồ kiến trúc: [architecture.png](../docs/diagram-images/architecture.png).
- Mô hình dữ liệu: [erd.png](../docs/diagram-images/erd.png).
- Chức năng theo vai trò: [usecase.png](../docs/diagram-images/usecase.png).
- Bố cục giao diện: [wireframe.png](../docs/diagram-images/wireframe.png).

Ranh giới lớp: routes chịu trách nhiệm HTTP (request/response, mã trạng thái,
ánh xạ lỗi); services nhận dữ liệu nghiệp vụ và thao tác nghiệp vụ, không nhận
`req`/`res` và không quyết định mã HTTP. Các bảng chính gồm `part`, `inventory`,
`warranty_ticket`, `stock_transaction` và `stock_alert`.

## Mục 3. Module cốt lõi + ảnh chụp chạy thật

### Chức năng

- **Linh kiện:** API CRUD tạo, đọc, cập nhật và xóa linh kiện; kiểm tra dữ liệu
  và mã linh kiện trùng.
- **Phiếu bảo hành:** API CRUD; kiểm tra mã/trạng thái và ngăn xóa phiếu đang
  được giao dịch kho tham chiếu.
- **Tồn kho:** ghi nhận nhập `IN` và xuất `OUT`, lưu lịch sử giao dịch. Xuất kho
  yêu cầu phiếu bảo hành đang mở; số lượng phải là số nguyên dương và không
  vượt tồn. Cập nhật tồn và lịch sử được thực hiện nguyên tử.

### Bằng chứng chạy thật

- [x] Backend/API: [server-running.png](images/server-running.png).
- [x] Giao diện đọc dữ liệu từ MySQL: [db-connected.png](images/db-connected.png).
- [x] Luồng xuất kho end-to-end trên MySQL thật: [e2e-xuat-kho.png](../docs/e2e-xuat-kho.png).

Thông tin môi trường và dữ liệu lúc chụp ảnh server/database (31/10/2026):

- Node.js 18.20.7, npm 10.8.2, MySQL Community Server 8.4.9.
- Backend `http://127.0.0.1:3000`, frontend `http://127.0.0.1:5173`;
  MySQL thử nghiệm cô lập tại `127.0.0.1:13307`.
- Backend log ghi `MySQL database connected` và `Server running... port 3000`.
  `GET /api/parts` trả HTTP 200 cùng ba bản ghi seed: `PART-001` Màn hình
  iPhone 11, `PART-002` Pin Samsung A52, `PART-003` Cáp sạc USB-C. Giao diện
  hiển thị 3 linh kiện, tổng tồn 29 đơn vị.
- Ảnh được chụp bằng Chrome headless từ URL đang chạy, không dựng dữ liệu hoặc
  mock giao diện.

## Mục 4. Bộ kiểm thử + ảnh chụp test PASS

`npm test` chạy Jest tuần tự (`jest --runInBand`). Kết quả xác minh ngày
31/10/2026 trên Node.js 18.20.7/npm 10.8.2:

- **3 test suites PASS; 20 tests PASS; 0 snapshots.**
- Luồng đúng: CRUD linh kiện/phiếu bảo hành, nhập kho và xuất kho hợp lệ.
- Biên: xuất đúng bằng lượng tồn được chấp nhận; xuất nhiều hơn tồn bị từ chối
  và không làm thay đổi tồn; kiểm tra giới hạn lượng và mã phiếu.
- Dữ liệu sai: thiếu/sai quantity, loại giao dịch không hỗ trợ, thiếu người
  thực hiện/phiếu bảo hành, trạng thái hoặc trường dữ liệu phiếu không hợp lệ,
  mã linh kiện/phiếu trùng.

Lệnh chạy: `npm test`. Bộ test dùng mock database cho unit/API tests nên không
cần MySQL đang chạy.

- [ ] Ảnh terminal `npm test` chưa được lưu vào `buoi12/images/npm-test-pass.png`.
  Kết quả 20/20 ở trên là lần chạy đã xác minh; cần chụp và thêm ảnh terminal
  nếu hồ sơ yêu cầu bằng chứng hình ảnh.

## Mục 5. Trình bày kết quả + ba trạng thái giao diện

Frontend dùng chung `renderDataState` để hiện trạng thái đang tải, chưa có dữ
liệu, hoặc lỗi. Khi lỗi tải API, giao diện hiển thị thông báo và nút **Thử lại**;
khi backend tắt, lỗi kết nối được hiển thị thay vì để màn hình treo.

- [x] Ảnh danh sách kho: [inventory-list.png](../docs/inventory-list.png).
- [x] Ảnh form giao dịch: [transaction-form.png](../docs/transaction-form.png).
- [x] Bằng chứng trạng thái lỗi khi backend tắt:
  [backend-offline-error.png](../docs/backend-offline-error.png).
- [ ] Ảnh trạng thái loading riêng: chưa có trong repo.
- [ ] Ảnh trạng thái empty riêng: chưa có trong repo.
- [ ] Ảnh lỗi được sao chép vào `buoi12/images/ui-error.png`: hiện có ảnh tham
  khảo ở đường dẫn trên, chưa có bản trong thư mục ảnh Buổi 12.

Các trạng thái loading/empty/error đã được triển khai trong giao diện; các ô
chưa đánh dấu ở trên là ảnh chụp minh chứng còn thiếu, không phải khẳng định
rằng trạng thái chưa có trong source.

## Mục 6. Cách dựng lại hệ thống

Yêu cầu: Node.js 18 trở lên, npm và MySQL Server 8.0.16 trở lên đang chạy.
`npm ci` cài đúng dependency theo lockfile. Cấu hình database trong `.env`
(tạo từ `.env.example`) phải trỏ tới MySQL cục bộ và tài khoản có quyền tạo
database/bảng. Backend dùng cổng 3000, frontend dùng cổng 5173.

Chạy lần lượt; mỗi lệnh dưới đây ở một bước riêng:

1. Clone đúng tag:

   ```powershell
   git clone --branch v0.2 https://github.com/phanthixuanmai/smartcrm-2374802010300-lead-management.git
   ```

2. Vào thư mục dự án:

   ```powershell
   cd smartcrm-2374802010300-lead-management
   ```

3. Cài dependency:

   ```powershell
   npm ci
   ```

4. Tạo file cấu hình cục bộ:

   ```powershell
   Copy-Item .env.example .env
   ```

   Sửa `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` trong `.env`
   theo MySQL trên máy. Không commit `.env`.

5. Tạo schema và seed:

   ```powershell
   npm run db:init
   ```

6. Chạy kiểm thử:

   ```powershell
   npm test
   ```

7. Mở terminal thứ nhất và chạy backend:

   ```powershell
   npm run dev
   ```

8. Mở terminal thứ hai, tại thư mục dự án, chạy frontend:

   ```powershell
   npm run dev:frontend
   ```

9. Mở `http://127.0.0.1:5173` để sử dụng giao diện.

**Tính lặp lại của khởi tạo DB:** đã chạy `npm run db:init` hai lần liên tiếp
trên MySQL 8.4.9 cô lập. Cả hai lần đều thành công; số lượng sau lần chạy lại
giữ nguyên 3 linh kiện, 3 dòng tồn kho và 2 phiếu bảo hành, không nhân đôi seed.

## Mục 7. Thay đổi so với BT1

BT2 giữ luồng nghiệp vụ cốt lõi và bảng truy vết đã có; đồng thời xử lý các
feedback bằng cách cập nhật hồ sơ thiết kế, bổ sung sơ đồ PNG (architecture,
ERD, use case, wireframe), làm rõ ranh giới route/service, hoàn thiện README và
triển khai API tồn kho/phiếu bảo hành cùng giao diện gọi API thật. Các thay đổi
Sprint 2 gồm ghi lịch sử nhập/xuất trong MySQL transaction, yêu cầu phiếu đang
mở cho giao dịch xuất, kiểm tra tồn và hiển thị trạng thái tải/rỗng/lỗi.

Chi tiết quyết định, lý do và phần còn chờ được ghi tại
[thay-doi-thiet-ke.md](../docs/thay-doi-thiet-ke.md). Những nội dung tài liệu
BT1 còn cần cập nhật (như xuất DDL vào bản nộp) được ghi theo đúng trạng thái
trong tài liệu đó, không coi là đã hoàn tất chỉ vì source đã có schema.

## Phụ lục. Bảng khai báo AI

Khai báo dưới đây bổ sung công cụ hỗ trợ cho phần triển khai và báo cáo Buổi 12;
tham khảo thêm [docs/ai-disclosure.md](../docs/ai-disclosure.md) để xem khai
báo trước đó.

| Công cụ | Việc sử dụng | Tệp/hàm liên quan | Cách kiểm chứng |
|---|---|---|---|
| AI assistant using Copilot SDK in VS Code | Hỗ trợ rà soát checklist, diễn đạt báo cáo, đối chiếu hướng dẫn với source và test; hỗ trợ thay đổi/kiểm chứng kỹ thuật | `buoi12/README.md`; `src/backend/services/inventory.js` (`createTransactionPlan`); `src/backend/services/warranty-tickets.js` (CRUD); `src/frontend/components/data-state.js` (`renderDataState`) | Đối chiếu từng phát biểu với source/tài liệu/ảnh thật; chạy `npm test` (3 suites, 20 tests PASS); kiểm tra API và số liệu seed khi chụp ảnh |

Người nộp cần tự rà soát nội dung và chịu trách nhiệm về sản phẩm cuối.
