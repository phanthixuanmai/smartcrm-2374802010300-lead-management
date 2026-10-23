# Ghi nhận công việc Workshop buổi 10

**Track:** SE · **Môn:** L5 Kho linh kiện thay thế  
**Trạng thái:** Các phần triển khai và kiểm chứng kỹ thuật bên dưới đã hoàn tất;
peer review và một số ảnh chụp màn hình còn chờ thực hiện.

## Backend và cơ sở dữ liệu

- Đã thêm `GET /api/inventory` để tra cứu tồn kho, có tìm kiếm, lọc trung tâm
  và phân trang.
- Đã thêm API xem chi tiết tồn kho, lịch sử nhập/xuất và danh sách phiếu bảo
  hành.
- Đã thêm `POST /api/inventory/:id/transactions` cho giao dịch `IN`/`OUT`.
- Số lượng phải là số nguyên dương; xuất kho bắt buộc có phiếu bảo hành đang
  mở. Phiếu không hợp lệ trả `404`; tồn không đủ trả `409`.
- Cập nhật tồn kho và ghi lịch sử giao dịch nằm trong cùng MySQL transaction,
  khóa dòng tồn khi giao dịch để tránh xuất vượt tồn đồng thời.
- Đã bật CORS cho các origin frontend cấu hình trong `FRONTEND_ORIGINS`.
- Đã seed 3 linh kiện, 3 dòng tồn kho và 2 phiếu bảo hành đang mở. Lệnh
  `npm run db:init` chạy thành công và báo 5 bảng.

## Frontend

- Đã tạo frontend riêng, chạy bằng `npm run dev:frontend` tại
  `http://localhost:5173`; backend chạy tại `http://localhost:3000`.
- Đã hoàn thành ba màn hình: tổng quan tồn kho, chi tiết linh kiện, form nhập
  hoặc xuất kho.
- Các trang gọi API qua client và các module API dùng chung, không gọi `fetch`
  trực tiếp trong thư mục pages.
- Mỗi màn hình có trạng thái đang tải, rỗng và lỗi kèm nút thử lại.
- Đã kiểm tra giao diện báo lỗi kết nối và cho thử lại khi backend dừng.
- Client xóa token và điều hướng tới trang đăng nhập khi nhận `401`; đăng nhập
  thực tế chưa thuộc phạm vi Sprint 2.

## Kiểm thử luồng UC03 trên MySQL thật

1. Đọc tồn `PART-001` tại `MEKONG-01`: **5 cái**.
2. Đọc phiếu bảo hành đang mở và chọn `BH-2026-002`.
3. Gửi yêu cầu xuất `OUT` **2 cái**, gắn với phiếu bảo hành trên: API trả
   **201**, tồn mới **3 cái**.
4. Đọc lịch sử và xác nhận giao dịch xuất 2 được liên kết với
   `BH-2026-002`.
5. Thử xuất thêm **4 cái** khi tồn là 3: API trả **409**; tồn vẫn là **3 cái**.

**Phân loại lỗi:** body/quantity/ticketId sai định dạng là lỗi hợp đồng API
(`400`); phiếu không tồn tại hoặc không mở là lỗi tham chiếu (`404`); xuất
vượt tồn là lỗi logic nghiệp vụ (`409`). Giao dịch thất bại không làm thay đổi
tồn.

Ảnh kết quả: [`e2e-xuat-kho.png`](./e2e-xuat-kho.png).

## Kiểm thử và clone sạch

- Jest: **16/16 tests đạt**, gồm kiểm thử xuất hợp lệ, xuất đúng bằng tồn,
  xuất vượt tồn, quantity sai, OUT thiếu phiếu và Part API.
- `npm audit --audit-level=low`: **0 lỗ hổng**.
- Runtime validation: **6/6 assertions đạt**, gồm khởi tạo schema, Part API,
  inventory API, warranty ticket API, trang frontend và tests.
- Đã clone lại từ GitHub vào thư mục mới; `npm ci`, `npm run db:init`, `npm
  test` đều thành công. Đã khởi động API và frontend từ clone đó, xác nhận ba
  dòng tồn kho hiển thị qua API thật.

## Ảnh đã có

- Part API: [`api-get-parts.png`](./api-get-parts.png),
  [`api-create-part.png`](./api-create-part.png).
- Giao diện kho: [`inventory-list.png`](./inventory-list.png).
- Form nhập/xuất: [`transaction-form.png`](./transaction-form.png).
- Kết quả UC03: [`e2e-xuat-kho.png`](./e2e-xuat-kho.png).
- Backend dừng và giao diện báo lỗi: [`backend-offline-error.png`](./backend-offline-error.png).

## Còn cần làm

- Chụp và lưu `docs/server-running.png`.
- Chụp và lưu `docs/db-connected.png` (log kết nối thành công hoặc ảnh đủ 5 bảng).
- Lưu ảnh kết quả chạy `npm test` tại `docs/`.
- Nhờ bạn cùng lớp clone/chạy và ghi peer review: một điều tốt, một bước README
  cần sửa, một rủi ro cho BT2; sau đó cập nhật README nếu có góp ý.
- Workshop khuyến khích thử từng bước và ghép từng cặp trước khi chạy cả luồng;
  bằng chứng hiện có ghi nhận luồng UC03 end-to-end trên MySQL và lỗi từng loại,
  không ghi nhận riêng một phiên chạy từng cặp bước.

## Phạm vi hoãn

- Không triển khai màn hình thứ tư trở đi, thiết kế giao diện bổ sung,
  đăng nhập/phân quyền thực tế hoặc peer review thay cho bạn học.
- Các việc này được để ngoài phạm vi ưu tiên của workshop; luồng UC03, trạng
  thái giao diện, unit test và hướng dẫn chạy đã được ưu tiên.
