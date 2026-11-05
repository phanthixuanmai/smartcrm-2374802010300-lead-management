# Test Plan và Test Report

## 1. Mục tiêu, phạm vi và cách dựng dữ liệu

Xác nhận các quy tắc nhập/xuất kho, liên kết phiếu bảo hành, phân biệt lỗi dữ
liệu `400` với xung đột nghiệp vụ `409`, kiểm tra API Part, truy vấn tồn kho và
các điểm OWASP được nêu ở mục 3. Bộ chọn gồm 12 ca thuộc năm nhóm: unit service,
API contract, tích hợp MySQL, kiểm thử OWASP tự động và kiểm thử OWASP thủ công.

Jest fixture mock được dựng bằng mã trong `beforeAll`/test (ví dụ tồn kho 5,
ticket id 1 và danh sách Part), không đọc dữ liệu sót lại trên máy. Hai ca
MySQL trong `tests/mysql-inventory.test.js` có `resetDb()+seed` chạy trước mỗi
ca và cleanup sau suite. Chúng chỉ chạy khi `TEST_DB_NAME` trỏ tới database
riêng có hậu tố `_test`, khác database cấu hình thường, cùng thông tin
`TEST_DB_*` riêng và host cục bộ (`localhost`, `127.0.0.1` hoặc `::1`). Nếu
`TEST_DB_NAME` chưa được cấu hình, Jest đánh dấu ca tích hợp là skipped/BLOCKED;
không kết nối Railway hay host từ xa.

Chạy toàn bộ Jest: `npm test`. Chạy riêng ca xuất vượt tồn:
`npm test -- --runTestsByPath tests/inventory.test.js --testNamePattern="maps insufficient stock to HTTP 409"`.
Chạy tích hợp MySQL bằng database test đã tạo riêng, đặt `TEST_DB_HOST`,
`TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` cùng `TEST_DB_NAME`, rồi chạy
`npm test -- --runTestsByPath tests/mysql-inventory.test.js`.
Các request API có thể chạy từ `tests/smartcrm-api.http` sau khi server, đăng
nhập và dữ liệu seed đã sẵn sàng.

## 2. Danh sách ca và báo cáo

Ưu tiên: **Cao** = quy tắc nghiệp vụ, bảo mật hoặc lỗi dữ liệu; **Vừa** = hành
vi thành phần hỗ trợ. Cột thực tế chỉ được điền cho lần chạy đã thực hiện.

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| TC-01 | Service fixture dựng trong code; tồn = 5 | Gọi `createTransactionPlan` với `IN` | Nhập 2 | Kế hoạch có `newStock = 7` | Cao | `npm test`: tính được tồn mới 7 | PASS |
| TC-02 | Service fixture dựng trong code; tồn = 5; ticket đang mở | Gọi `createTransactionPlan` với `OUT` | Xuất 5, `ticketId=1` | Thành công, `newStock = 0`, giữ `ticketId` | Cao | `npm test`: xuất đúng bằng tồn, tồn mới 0 | PASS |
| TC-03 | Service fixture dựng trong code; tồn = 5 | Gọi `createTransactionPlan` với `OUT` | Xuất 6, `ticketId=1` | Từ chối với `INSUFFICIENT_STOCK`; không tạo kế hoạch giảm tồn | Cao | `npm test`: domain từ chối vượt tồn | PASS |
| TC-04 | Service fixture dựng trong code; tồn = 5 | Gọi `createTransactionPlan` với `OUT` | Xuất 1, thiếu `ticketId` | Từ chối với `MISSING_TICKET` | Cao | `npm test`: từ chối thiếu ticket | PASS |
| TC-05 | Service fixture dựng trong code | Gọi `createTransactionPlan` với quantity không hợp lệ | `quantity=0` | Từ chối `INVALID_QUANTITY` | Cao | `npm test`: quantity 0 bị từ chối | PASS |
| TC-06 | Service fixture dựng trong code | Gọi `createTransactionPlan` với actor rỗng và loại giao dịch không hỗ trợ | `createdBy=""`; `type=INVALID` | Từ chối với lỗi input domain; không tạo giao dịch | Cao | `npm test`: actor rỗng và type không hỗ trợ đều bị từ chối | PASS |
| TC-07 | API server test và mock Part repo | Gửi `POST /api/parts` thiếu tên | `part_code=PART-005`, thiếu `name` | `400`; body nêu rõ `name is required` | Cao | `npm test`: `400`, lỗi chỉ rõ `name` | PASS |
| TC-08 | API server test; tồn fixture = 5 | Gửi `POST /api/inventory/1/transactions` | `IN`, `quantity=0` | `400`; lỗi nêu `quantity must be a positive integer` | Cao | `npm test`: `400`, thông báo quantity chính xác | PASS |
| TC-09 | API server test; tồn fixture = 5; ticket id 1; DB mock ghi nhận câu lệnh | Gửi `POST /api/inventory/1/transactions` | `OUT`, `quantity=6`, `ticketId=1` | `409` và thông báo thiếu tồn; rollback được gọi, không chạy `UPDATE`/`INSERT` | Cao | Lệnh Jest mục tiêu: HTTP `409`, đúng thông báo, rollback 1 lần, chỉ có `SELECT ... FOR UPDATE` | PASS |
| TC-10 | `TEST_DB_*` riêng; local MySQL; DB tên hậu tố `_test`; test tự reset/seed hai kho và ticket mở | Lọc theo trung tâm, xuất từ dòng kho đã chọn, rồi đọc lại hai dòng và lịch sử | `centerCode=IT-CENTER-A`; OUT 2 gắn ticket mở | Chỉ trả dòng đúng trung tâm; `201`; cập nhật đúng dòng tồn, dòng kho kia không đổi; transaction trỏ đúng inventory/ticket; `low_stock` đúng tại biên `quantity <= min_quantity` | Cao | Skipped/BLOCKED: chưa cấu hình MySQL test riêng trong phiên này | BLOCKED |
| TC-11 | Cùng schema test riêng; test tự reset/seed tồn = 5 và ticket mở | Ghi nhận số bản ghi, gửi `OUT`, đọc lại tồn và số bản ghi | Xuất 6 | `409`; tồn vẫn 5; không tăng số giao dịch | Cao | Skipped/BLOCKED: chưa cấu hình MySQL test riêng trong phiên này | BLOCKED |
| TC-12 | Server test hoặc môi trường dev được phép kiểm tra | Thử CORS/error response, tìm kiếm bằng payload SQL/HTML và cookie xác thực thiếu/sửa | Origin không cho phép; `' OR 1=1 --`; `<script>alert(1)</script>`; cookie thiếu/sửa | CORS không phản chiếu origin tùy ý; lỗi không lộ stack/table; payload không làm thay đổi truy vấn hay chạy script; thiếu/sửa cookie trả `401` | Cao | Jest xác nhận payload được bind và cookie sửa trả `401`; kiểm tra CORS/error/UI thủ công chưa chạy | Một phần |

## 3. Kiểm tra OWASP và phạm vi đăng nhập

| Mục | Cách kiểm | Quyết định/kết quả |
|---|---|---|
| A01 Broken Access Control | Gọi API không có session; thử truy cập dữ liệu giữa hai tài khoản | Không có mô hình nhiều người dùng hoặc dữ liệu sở hữu theo tài khoản, nên kiểm soát A-với-B **không áp dụng**. Bảo vệ API khi thiếu session được kiểm bằng `401`; không coi đây là phân quyền theo đối tượng. |
| A02 Security Misconfiguration | Kiểm tra CORS với origin không cho phép và response lỗi máy chủ | **Có kiểm** trong TC-12; chỉ chấp nhận origin cấu hình và không trả stack trace/tên bảng. Phần kiểm thủ công còn chờ chạy. |
| A04 Cryptographic Failures | Tìm mật khẩu lưu trong DB và xem dạng lưu | **Không áp dụng** với thiết kế hiện tại: không có bảng người dùng/mật khẩu; một credential cấu hình qua biến môi trường. Không đưa credential thật vào báo cáo. |
| A05 Injection | Gửi `' OR 1=1 --` vào tìm kiếm; thử chuỗi HTML/script | **Có kiểm**: Jest xác nhận input chỉ xuất hiện trong bind parameters; kiểm tra render không thực thi script còn cần chạy trên UI. |
| A07 Authentication Failures | Thử không có cookie, cookie đã sửa và logout | **Có kiểm**: thiếu/sửa cookie trả `401`; logout làm session cũ mất hiệu lực. Token hết hạn tự nhiên chưa được chờ đủ 8 giờ trong phiên test này. |

Đăng nhập một tài khoản cấu hình đã có trong code. Đây chưa phải phân quyền
theo vai trò hay theo chủ sở hữu dữ liệu; không mở rộng sang đa tài khoản trong
phạm vi test này.

## 4. Kết luận và bằng chứng

TC-09 đã chạy riêng bằng Jest: **1 passed** (14 test khác trong file được
skip do lọc tên). Sau đó chạy `npm test`: **6 suites passed, 1 suite skipped;
29 tests passed, 2 MySQL tests skipped**. Runtime validation độc lập đạt
**2/2 assertions** (frontend HTTP probe và Jest). TC-09 là API test dùng DB
mock, không phải bằng chứng tích hợp MySQL. TC-10 và TC-11 được triển khai với
`resetDb()+seed` nhưng đang `BLOCKED` do chưa cấu hình MySQL schema test biệt
lập. Không
dùng DB production để thay thế fixture test. Sau mỗi lần chạy, cập nhật cột
**Kết quả thực tế** và **PASS/FAIL** bằng mã HTTP, nội dung phản hồi, trạng
thái tồn/bản ghi và tên ảnh `docs/TC-xx.png`; không ghi kết quả dự kiến thành
thực tế.

Ảnh hiện có luồng UC03 trên MySQL thật tại
[`e2e-xuat-kho.png`](./e2e-xuat-kho.png); đó là bằng chứng thực hiện trước đây,
không phải ảnh của lần chạy TC-09 trong phiên này. Ảnh chụp tóm tắt kết quả
TC-09 và toàn bộ Jest được đính kèm trong phiên; chưa có file `docs/TC-09.png`
được lưu vào repository.
