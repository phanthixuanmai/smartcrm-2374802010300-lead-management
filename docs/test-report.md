# Báo cáo kiểm thử BT2

**Ngày chạy:** 2026-11-05 (ICT)  
**Môi trường:** Node.js 18.20.7, npm 10.8.2, Jest 30.5.2, MySQL local
`127.0.0.1`, schema riêng `smartcrm_bt2_test`. Không kết nối Railway hoặc
production.  
**Cách chạy:** từng test được chạy riêng bằng Jest `--testNamePattern=TC-xx`;
hook `beforeEach` reset và seed lại DB cho mỗi ca. Mỗi lệnh exit code `0`;
test khớp tên chạy PASS (11 ca còn lại không khớp pattern và bị skip). Chạy
đủ integration suite một lần: 12/12 PASS, exit code `0`. Lệnh chuẩn
`npm test -- --runInBand` khi được cấu hình với `TEST_DB_*` trỏ tới schema
local cũng chạy đủ **51/51 test PASS, 11/11 suite PASS, exit code `0`**. Ngoài
12 ca trong bảng, suite còn có test cạnh tranh MySQL cho BUG-02 và regression
tests riêng cho BUG-01, BUG-03, BUG-04.

| Mã | Loại | Tiền điều kiện | Bước thực hiện | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Ưu tiên |
|---|---|---|---|---|---|---|---|
| TC-01 | Luồng đúng / persistence | Reset+seed; part count 1 | POST `/api/parts`, rồi SELECT lại theo mã | Part hợp lệ, giá 12345 | HTTP 201; dữ liệu đọc lại đúng; count +1 | PASS — HTTP 201; part count 1→2, dữ liệu MySQL khớp response. [Ảnh](./screenshots/TC-01.png) | Cao |
| TC-02 | Luồng đúng / biên dưới | Reset+seed; tồn 5, ticket mở | POST xuất kho, rồi đọc tồn và giao dịch | OUT quantity 4, ticket hợp lệ | HTTP 201; tồn 1; có giao dịch đúng phiếu | PASS — HTTP 201; tồn 1; transaction count 0→1; `low_stock=1`. [Ảnh](./screenshots/TC-02.png) | Cao |
| TC-03 | Giá trị biên / đúng ngưỡng | Reset+seed; tồn 5, ticket mở | POST xuất lượng bằng tồn; đọc DB | OUT quantity 5 | HTTP 201; tồn 0; transaction count +1 | PASS — HTTP 201; tồn 0; transaction count 0→1. [Ảnh](./screenshots/TC-03.png) | Cao |
| TC-04 | Giá trị biên / vượt ngưỡng | Reset+seed; tồn 5, ticket mở | POST xuất vượt tồn 1; đếm và đọc tồn | OUT quantity 6 | HTTP 409; báo thiếu tồn; tồn và số giao dịch không đổi | PASS — HTTP 409 `Insufficient stock for this withdrawal`; tồn 5; transaction count 0→0. [Ảnh](./screenshots/TC-04.png) | Cao |
| TC-05 | Dữ liệu sai | Reset+seed; part count 1 | POST tạo part với tên trống; đếm part | `name: "  "` | HTTP 400 nêu trường name; không thêm bản ghi | PASS — HTTP 400 `name is required and must be a non-empty string`; count 1→1. [Ảnh](./screenshots/TC-05.png) | Cao |
| TC-06 | Dữ liệu sai / ID không tồn tại | Reset+seed; part count 1 | GET part ID không tồn tại; đếm lại part | ID `999999999` | HTTP 404, không phải 500; không đổi dữ liệu | PASS — HTTP 404 `Part not found`; count 1→1. [Ảnh](./screenshots/TC-06.png) | Cao |
| TC-07 | Chất lượng dữ liệu | Reset+seed có mã `IT-PART-001` | POST tạo part trùng mã; đếm và tìm bản ghi | `part_code: IT-PART-001` | HTTP 409; không thêm bản ghi trùng | PASS — HTTP 409 `A part with this part_code already exists`; count 1→1, chỉ 1 mã trùng. [Ảnh](./screenshots/TC-07.png) | Cao |
| TC-08 | Dữ liệu sai / tác dụng phụ | Reset+seed; tồn 5; transaction count 0 | POST giao dịch quantity 0; đếm và đọc tồn | IN quantity 0 | HTTP 400; không thêm giao dịch, tồn giữ nguyên | PASS — HTTP 400 `quantity must be a positive integer`; transaction count 0→0; tồn 5. [Ảnh](./screenshots/TC-08.png) | Cao |
| TC-09 | Dữ liệu sai / liên kết | Reset+seed; tồn 5; ticket fixture đang mở | POST xuất với ticket ID không tồn tại; đếm và đọc tồn | OUT quantity 1; ticket `999999999` | HTTP 404; không thêm giao dịch, tồn giữ nguyên | PASS — HTTP 404 `Open warranty ticket not found`; transaction count 0→0; tồn 5. [Ảnh](./screenshots/TC-09.png) | Cao |
| TC-10 | Bảo mật / xác thực | Reset+seed; part count 1; không gửi cookie | DELETE part khi chưa đăng nhập; đếm lại part | Không có phiên | HTTP 401; không xóa dữ liệu | PASS — HTTP 401 `Vui lòng đăng nhập để tiếp tục.`; count 1→1. Cross-user 403 không áp dụng vì app chỉ có một tài khoản dùng chung, không có ownership theo user. [Ảnh](./screenshots/TC-10.png) | Cao |
| TC-11 | Bảo mật / chất lượng dữ liệu | Reset+seed; part count 1, transaction count 0 | GET inventory với chuỗi injection-like; đếm lại DB | `q=' OR 1=1 --` | HTTP 200; không trả dữ liệu ngoài ý muốn; DB không đổi | PASS — HTTP 200; items 0; part count 1→1; transaction count 0→0. [Ảnh](./screenshots/TC-11.png) | Cao |
| TC-12 | Tái lập | Reset+seed trong schema test; lưu số hàng | Chạy init-db/seed hai lần; so sánh số hàng | Cùng schema test | Cả hai lần exit 0; số hàng ổn định | PASS — init-db exit 0 hai lần; part 101/101, center 8/8, inventory 53/53, transaction 51/51. [Ảnh](./screenshots/TC-12.png) | Vừa |

## Ảnh trạng thái giao diện S4

| Trạng thái | Bằng chứng |
|---|---|
| Đang tải | [`bt2-trang-thai-dang-tai.png`](./bt2-trang-thai-dang-tai.png) |
| Rỗng | [`bt2-trang-thai-rong.png`](./bt2-trang-thai-rong.png) |
| Lỗi | [`backend-offline-error.png`](./backend-offline-error.png) |

## Kết luận và giới hạn

- **MySQL integration:** 12/12 PASS trong lần chạy toàn suite (exit code 0);
  12/12 PASS khi chạy riêng từng ca (mỗi ca exit code 0).
- **Toàn bộ suite:** `npm test -- --runInBand` với `TEST_DB_*` trỏ tới
  `smartcrm_bt2_test`: 11/11 suite PASS, 51/51 test PASS, exit code `0`.
- `low_stock` từ MySQL là số `1`/`0`, không phải boolean JavaScript. Lần chạy
  đầu phát hiện test assertion kỳ vọng `true`; sửa assertion để khớp kiểu dữ
  liệu SQL thực tế và chạy lại thành công. Không có lỗi ứng dụng được tái hiện
  từ sai khác này.
- Quyền MySQL được cấp giới hạn trên `smartcrm_bt2_test.*` cho tài khoản app
  local; schema ứng dụng `smartcrm` và Railway/production không bị tác động.
- Test cross-user `403` không thể áp dụng với mô hình xác thực/tài khoản hiện
  tại; TC-10 xác minh request chưa xác thực bị từ chối bằng `401`.
- 12 ảnh trong `screenshots/` là ảnh chụp headless của trang bằng chứng local,
  dựng từ stdout Jest đã ghi riêng theo từng lệnh; mỗi ảnh hiển thị lệnh,
  fixture `resetDb + seed`, kết quả HTTP/DB, số liệu PASS và exit code thực tế.
- Ảnh S4 là minh chứng giao diện riêng, không tính thay cho 12 ca API.
