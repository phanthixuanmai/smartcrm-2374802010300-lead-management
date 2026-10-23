# Thay đổi thiết kế theo feedback BT1

**Điểm BT1:** 5.5/10 (Đầy đủ: 5.5/10 · Kỹ thuật: 4.75/10 · Nhất quán: 7/10 ·
Trình bày: 6/10)

Các feedback dưới đây được chép nguyên văn. Quyết định áp dụng cho thiết kế và
hồ sơ nộp; các hạng mục đầu ra chưa thực hiện được ghi rõ là còn chờ.

## Feedback và quyết định

### 1. UC02 và UC03

> Đặc tả UC02 và UC03 có luồng chính đánh số và luồng ngoại lệ rõ (3a tồn kho
> không đủ, 3b phiếu bảo hành không tồn tại, 5a không có quyền).

- **Quyết định:** GIỮ.
- **Lý do:** Luồng chính và ngoại lệ đã được đánh giá là rõ; giữ cách mô tả để
  bảo toàn tính kiểm chứng của nghiệp vụ nhập/xuất.
- **Phần thiết kế bị ảnh hưởng:** UC02, UC03 và các luồng ngoại lệ liên quan.

### 2. Lập luận kiến trúc cho NFR

> Ba câu lập luận kiến trúc đúng khuôn: NFR1 (≤ 2 giây với 10.000 bản ghi →
> phân trang + index), NFR2 (transaction chung cho tồn và lịch sử), NFR3
> (phân quyền ở tầng service), đều nêu đánh đổi.

- **Quyết định:** GIỮ.
- **Lý do:** Các lập luận gắn ngưỡng NFR với giải pháp kỹ thuật và đánh đổi cụ
  thể; tiếp tục dùng làm căn cứ khi triển khai.
- **Phần thiết kế bị ảnh hưởng:** NFR1–NFR3, kiến trúc phân trang/index,
  transaction cập nhật tồn và lịch sử, phân quyền tầng service.

### 3. Bảng truy vết

> Bảng truy vết đủ FR1–FR8 ↔ US ↔ UC ↔ bảng dữ liệu ↔ màn hình, không ô trống.

- **Quyết định:** GIỮ.
- **Lý do:** Bảng hiện truy vết đầy đủ yêu cầu chức năng đến nghiệp vụ, dữ liệu
  và giao diện; cần duy trì sự đầy đủ này khi sửa các mã màn hình/User Story.
- **Phần thiết kế bị ảnh hưởng:** Bảng truy vết FR1–FR8 và mọi thay đổi US, UC,
  bảng dữ liệu, mã màn hình.

### 4. Thiếu hình trong bài nộp

> Bài nộp không có hình nào: thiếu sơ đồ Use Case, sơ đồ kiến trúc, ERD và
> wireframe; em chỉ mô tả bằng bảng chữ và dẫn tới file .drawio. Thầy chỉ chấm
> những gì có trong bài nộp. Các file drawio trong repo cũng chưa có chú thích
> ký hiệu.

- **Quyết định:** SỬA.
- **Lý do:** File nguồn `.drawio` không thay thế hình được nhúng trong tài liệu
  nộp; cần xuất hình và chú thích ký hiệu để người chấm đọc trực tiếp.
- **Phần thiết kế bị ảnh hưởng:** Sơ đồ Use Case, sơ đồ kiến trúc, ERD,
  wireframe và tài liệu nộp BT1.
- **Trạng thái:** Còn chờ xuất/nhúng hình và bổ sung chú thích.

### 5. Vị trí SQL DDL

> SQL DDL chỉ nằm trong db/schema.sql, cần đưa vào bài.

- **Quyết định:** SỬA.
- **Lý do:** Đưa DDL hoặc phụ lục DDL vào tài liệu nộp để nội dung thiết kế dữ
  liệu xuất hiện ngay trong bài; `db/schema.sql` tiếp tục là nguồn schema chạy
  chính thức (MySQL/InnoDB).
- **Phần thiết kế bị ảnh hưởng:** Thiết kế dữ liệu, phụ lục SQL và tài liệu nộp.
- **Trạng thái:** Schema đã được đặt tại `db/schema.sql`; chưa chèn DDL vào bản
  tài liệu nộp.

### 6. Mã màn hình không nhất quán

> Mã màn hình lệch: bảng truy vết dùng M2 Nhập kho, M3 Xuất kho, M4, M5 nhưng
> Mục 5 chỉ có M1–M3 với tên khác.

- **Quyết định:** SỬA.
- **Lý do:** Một bộ mã và tên màn hình thống nhất giúp liên kết bảng truy vết,
  use case và wireframe mà không gây hiểu nhầm.
- **Phần thiết kế bị ảnh hưởng:** Danh sách màn hình M1–M5, bảng truy vết, tên
  trên wireframe và các tham chiếu trong SRS.
- **Hướng xử lý:** Chọn một danh sách mã/tên chuẩn, rồi đồng bộ mọi bảng và sơ
  đồ trước khi viết API nhập/xuất kho.

### 7. Số lượng User Story

> Có 8 User Story (đề yêu cầu 5–7).

- **Quyết định:** SỬA.
- **Lý do:** Số lượng phải nằm trong giới hạn đề bài mà vẫn giữ đủ truy vết
  FR1–FR8; gộp/điều chỉnh các story có phạm vi gần nhau, không bỏ yêu cầu mà
  chưa đánh giá tác động.
- **Phần thiết kế bị ảnh hưởng:** Danh sách User Story, liên kết FR–US–UC và
  bảng truy vết.

### 8. Định dạng và thông tin lớp

> Nộp file .docx thay vì PDF, ô Lớp còn để ""[Điền lớp]"".

- **Quyết định:** SỬA.
- **Lý do:** Xuất đúng định dạng yêu cầu và thay placeholder bằng lớp thực tế
  để bản nộp hoàn chỉnh.
- **Phần thiết kế bị ảnh hưởng:** Trang bìa/thông tin sinh viên và định dạng
  tài liệu bàn giao.
- **Trạng thái:** Chưa có thông tin lớp để điền và chưa có nguồn DOCX để xuất
  PDF.

### 9. README và lịch sử commit

> README trống, commit chủ yếu ""Add files via upload"".

- **Quyết định:** SỬA.
- **Lý do:** README đã được bổ sung hướng dẫn project; lịch sử commit cần mô tả
  đúng thay đổi để dễ theo dõi và đánh giá.
- **Phần thiết kế bị ảnh hưởng:** README và lịch sử phiên bản source.
- **Trạng thái:** README đã có nội dung. Commit chưa thực hiện vì thư mục hiện
  chưa phải Git repository và chưa được yêu cầu khởi tạo repository.

### 10. Gợi ý cho BT2

> Xuất các sơ đồ drawio ra ảnh có chú thích, chèn vào tài liệu; thống nhất mã
> màn hình rồi mới viết API nhập/xuất kho.

- **Quyết định:** GIỮ.
- **Lý do:** Đây là thứ tự công việc hợp lý cho BT2: hoàn thiện và thống nhất
  thiết kế giao diện/nghiệp vụ trước khi chốt API nhập/xuất.
- **Phần thiết kế bị ảnh hưởng:** Sơ đồ Draw.io, mã màn hình, wireframe và hợp
  đồng API nhập/xuất kho.
- **Trạng thái:** Ghi nhận làm đầu việc BT2; chưa xuất ảnh hoặc triển khai API
  nhập/xuất kho trong phạm vi Part CRUD hiện tại.

## Phạm vi Sprint 2 (Workshop buổi 10)

- **Đã triển khai trong source:** API tồn kho và lịch sử giao dịch; nhập/xuất
  trong một MySQL transaction; xuất kho cần phiếu bảo hành đang mở; frontend
  riêng ba màn hình gọi API qua module client chung; trạng thái tải/rỗng/lỗi và
  retry; unit/API tests.
- **Luồng UC03 đã chạy trên MySQL thật:**
  1. Đọc tồn `PART-001` tại `MEKONG-01`: 5 cái.
  2. Đọc danh sách phiếu bảo hành đang mở: chọn `BH-2026-002`.
  3. Gửi `OUT`, số lượng 2, người thực hiện `workshop-e2e`, gắn phiếu trên:
     API trả `201`, tồn mới 3.
  4. Đọc lịch sử giao dịch: có giao dịch OUT 2 gắn đúng `BH-2026-002`.
  5. Thử xuất thêm 4 khi tồn là 3: API trả `409`; đọc lại tồn vẫn là 3.
  6. Ảnh kết quả luồng lưu tại `docs/e2e-xuat-kho.png`.
- **Phân loại lỗi ở các bước tích hợp:** Dữ liệu thiếu/sai định dạng (quantity,
  ticketId, loại giao dịch) là lỗi hợp đồng API (`400`); ticket không còn mở là
  lỗi tham chiếu (`404`); xuất vượt tồn là lỗi quy tắc nghiệp vụ (`409`). Lỗi
  vượt tồn được rollback và không làm thay đổi số lượng hiện có.
- **Đã xác minh:** `npm run db:init` báo 5 bảng, 3 linh kiện, 3 dòng tồn và 2
  phiếu bảo hành; `npm test` đạt 16/16; runtime validation đạt 6/6; audit
  dependency không phát hiện lỗ hổng; frontend riêng tại cổng 5173 vẫn hiển thị
  trạng thái lỗi và nút thử lại khi API cổng 3000 tắt.
- **Clone sạch:** Clone mới từ GitHub, cài dependency, init MySQL, chạy 16/16
  tests, khởi động cả API và frontend, rồi xác nhận giao diện hiển thị ba dòng
  tồn kho từ API thật. Sau khi kiểm tra, clone tạm đã được dọn.
- **Chưa hoàn tất:** Ảnh terminal server/database và ảnh kết quả test chưa có;
  peer review cần bạn cùng lớp thực hiện và ghi nhận trong issue.
- **Hoãn:** Màn hình thứ tư trở đi, đăng nhập/phân quyền thật, tự động hóa chụp
  ảnh và peer review trong lớp. Workshop cho phép cắt giao diện bổ sung; xác
  thực quyền cần được triển khai cùng module người dùng thay vì giả lập trong
  module kho.
- **Lý do:** Ưu tiên luồng tồn kho tối thiểu với ba màn hình và bảo đảm giao
  dịch xuất gắn phiếu bảo hành được kiểm tra và ghi nhận nguyên tử. Không đánh
  dấu các kiểm thử hoặc ảnh chưa thực hiện.
