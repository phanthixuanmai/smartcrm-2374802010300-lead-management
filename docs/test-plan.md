# Kế hoạch kiểm thử BT2

## 1. Phạm vi và phần chủ ý không kiểm thử

Kiểm tra API `/api/parts` và inventory qua Express với MySQL thật: tạo và đọc
lại dữ liệu, nhập/xuất kho gắn phiếu bảo hành, tồn kho, lỗi dữ liệu, mã lỗi
HTTP, xác thực, truy vấn tìm kiếm, tác dụng phụ và tính lặp lại của khởi tạo
cơ sở dữ liệu. Kiểm tra riêng ba trạng thái giao diện S4 (đang tải, rỗng, lỗi).

Không ghi dữ liệu lên Railway/production; không kiểm tra tải/hiệu năng, nhiều
vai trò, hay phân quyền sửa dữ liệu giữa hai người dùng. Ứng dụng hiện dùng
một tài khoản cấu hình dùng chung, không có mô hình sở hữu bản ghi theo user;
do đó kiểm tra request không đăng nhập trả `401`, còn kiểm tra cross-user `403`
không áp dụng.

## 2. Loại test, số lượng và cách chọn dữ liệu

- **38 test unit/service/API HTTP** với DB mock (9 suite).
- **12 ca tích hợp API/MySQL thật** (1 suite), mỗi ca chạy độc lập.
  `beforeEach` thực hiện `resetDb + seed`; kiểm tra kết quả API đồng thời truy
  vấn lại dữ liệu và số bản ghi trong schema test local `smartcrm_bt2_test`.
- **1 test cạnh tranh tích hợp MySQL** kiểm tra transaction xuất đồng thời
  với đóng warranty ticket (1 suite).
- Cả hai tầng chạy cùng trong `npm test -- --runInBand` khi `TEST_DB_*` được
  cấu hình: 51 test, 11 suite.
- Phân nhóm: 3 luồng hợp lệ/ranh giới; 3 ca biên tồn; 4 ca dữ liệu sai/ID
  không tồn tại; 3 ca chất lượng dữ liệu/bảo mật (một số ca biên đồng thời là
  luồng hợp lệ); 1 ca tái lập migration/seed.
- Chọn phân vùng hợp lệ/không hợp lệ; lượng xuất `4`, `5`, `6` khi tồn là `5`
  (thấp hơn đúng 1, bằng ngưỡng, vượt đúng 1); quantity `0`; tên bắt buộc
  trống; part/ticket ID không tồn tại; mã part trùng; chuỗi injection-like
  trong tìm kiếm; request thiếu phiên.
- **3 ảnh giao diện S4** bổ trợ, mỗi ảnh cho một trạng thái loading/empty/error;
  không tính vào 12 ca API.

## 3. Tiêu chí thành công đo được

- Mỗi ca khớp hoàn toàn kết quả mong đợi, có exit code `0`; 12 ca API MySQL
  PASS, test cạnh tranh MySQL PASS, unit/service/API 38/38 PASS, cả suite
  51/51 PASS.
  Mã cần đúng gồm `201` tạo thành công, `400` dữ liệu sai, `401` chưa xác thực,
  `404` không tìm thấy, `409` trùng mã/vượt tồn.
- Dữ liệu hợp lệ phải đọc lại được từ MySQL; lỗi không được làm tăng số bản ghi
  hay thay đổi tồn. Xuất 4/5/6 từ tồn 5 lần lượt cho tồn 1/0/bị từ chối, không
  tồn âm; nhập/xuất gắn đúng phiếu.
- Chạy khởi tạo và seed hai lần liên tiếp không lỗi, số lượng hàng sau hai lần
  không đổi. Có ảnh minh chứng cho cả 12 ca và ba trạng thái S4.

## 4. Môi trường và dữ liệu thử

Windows, Node.js 18.20.7, npm 10.8.2, Jest 30.5.2, MySQL local tại
`127.0.0.1`; schema riêng `smartcrm_bt2_test` có hậu tố `_test`, không phải
schema ứng dụng `smartcrm`. Fixture mỗi ca gồm part, hai kho có tồn 5 và 9,
ngưỡng tối thiểu 3 và 2, cùng phiếu đang mở. Mỗi ca reset trước khi seed;
hook cuối dọn fixture. TC-12 chạy init/seed hai lần ngay trên schema test.

Lệnh chạy từng ca, ví dụ:
`node node_modules/jest/bin/jest.js --runInBand --verbose tests/mysql-inventory.test.js --testNamePattern=TC-01`.
Toàn bộ test tích hợp: `npm test -- --runInBand --verbose tests/mysql-inventory.test.js`.
Kết quả và ảnh theo mã ca nằm trong [`test-report.md`](./test-report.md) và
[`screenshots/`](./screenshots/).
