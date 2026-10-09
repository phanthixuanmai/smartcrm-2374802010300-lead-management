# SRS rút gọn – L5 – Kho linh kiện thay thế
**Học phần:** Chuyên đề tốt nghiệp 1 · **Track:** SE  
**Sinh viên:** Phan Thị Xuân Mai · **MSSV:** 2374802010300

## 1. Giới thiệu, phạm vi và thuật ngữ
Hệ thống hỗ trợ quản lý tồn kho linh kiện thay thế tại trung tâm Mekong Mobile. Luồng nghiệp vụ bắt đầu khi kỹ thuật viên hoặc quản lý tra cứu linh kiện, nhập kho hoặc xuất linh kiện cho phiếu bảo hành; hệ thống cập nhật tồn kho và ghi nhận giao dịch. Khi tồn thấp hơn ngưỡng, hệ thống hiển thị cảnh báo.

**Trong phạm vi:** tra cứu tồn, nhập kho, xuất kho gắn phiếu bảo hành, kiểm tra tồn trước xuất, thiết lập ngưỡng, cảnh báo tồn thấp, lịch sử giao dịch và cập nhật thông tin linh kiện.  
**WON'T trong BT1:** gửi SMS/email tự động, quản lý mua hàng/nhà cung cấp, kế toán và đồng bộ ERP; đây là giới hạn đề xuất cho prototype, cần xác nhận với giảng viên.

| Thuật ngữ | Định nghĩa |
|---|---|
| Linh kiện (part) | Mặt hàng thay thế được quản lý trong kho. |
| Tồn kho (inventory) | Số lượng hiện có của một linh kiện tại một trung tâm. |
| Giao dịch kho (stock_transaction) | Bản ghi nhập hoặc xuất làm thay đổi tồn kho. |
| Ngưỡng tồn tối thiểu | Mức tồn kho do quản lý thiết lập để cảnh báo. |
| Phiếu bảo hành (warranty_ticket) | Phiếu nghiệp vụ mà giao dịch xuất linh kiện có thể tham chiếu. |

## 2. Các bên liên quan và vai trò
- **Kỹ thuật viên:** Xem tồn kho; ghi nhận nhập kho; xuất linh kiện cho phiếu bảo hành; xem kết quả kiểm tra tồn kho. Không được sửa ngưỡng tồn kho nếu không có quyền quản lý.
- **Quản lý trung tâm:** Xem tồn kho; thiết lập ngưỡng tồn tối thiểu; xem cảnh báo và lịch sử giao dịch; cập nhật thông tin linh kiện. Không được xác nhận xuất vượt số lượng tồn kho.

## 3. Yêu cầu chức năng và User Story
| Mã | Yêu cầu chức năng kiểm chứng được | US | Use Case | MoSCoW |
|---|---|---|---|---|
| FR1 | Xem danh sách linh kiện và số lượng tồn theo trung tâm. | US01 | UC01 | SHOULD |
| FR2 | Ghi nhận giao dịch nhập kho với số lượng lớn hơn 0; sau khi lưu, tăng tồn kho tương ứng. | US02 | UC02 | MUST |
| FR3 | Ghi nhận giao dịch xuất kho gắn với phiếu bảo hành; sau khi lưu, giảm tồn kho tương ứng. | US03 | UC03 | MUST |
| FR4 | Kiểm tra tồn kho trước khi xuất và từ chối giao dịch nếu số lượng yêu cầu lớn hơn tồn khả dụng. | US04 | UC03 | MUST |
| FR5 | Cho phép quản lý thiết lập ngưỡng tồn tối thiểu cho từng linh kiện tại trung tâm. | US05 | UC04 | SHOULD |
| FR6 | Tạo và hiển thị cảnh báo khi tồn kho thấp hơn ngưỡng tối thiểu. | US06 | UC05 | SHOULD |
| FR7 | Hiển thị lịch sử giao dịch nhập/xuất gồm linh kiện, loại, số lượng và thời gian. | US07 | UC06 | COULD |
| FR8 | Cho phép quản lý cập nhật tên, mô tả và đơn vị tính của linh kiện. | US08 | UC07 | COULD |

### User Story
- **US01 (SHOULD):** Là Kỹ thuật viên, tôi muốn xem số lượng linh kiện tồn kho tại trung tâm để biết linh kiện nào còn đủ phục vụ sửa chữa.
- **US02 (MUST):** Là Kỹ thuật viên, tôi muốn ghi nhận việc nhập linh kiện vào kho để số lượng tồn kho được cập nhật chính xác sau khi nhập.
- **US03 (MUST):** Là Kỹ thuật viên, tôi muốn xuất linh kiện cho phiếu bảo hành để ghi nhận số linh kiện đã sử dụng cho từng phiếu.
- **US04 (MUST):** Là Kỹ thuật viên, tôi muốn kiểm tra số lượng tồn trước khi xuất linh kiện để tránh xuất vượt quá số lượng hiện có.
- **US05 (SHOULD):** Là Quản lý trung tâm, tôi muốn thiết lập ngưỡng tồn kho tối thiểu cho từng linh kiện để kiểm soát số lượng cần dự trữ.
- **US06 (SHOULD):** Là Quản lý trung tâm, tôi muốn nhận cảnh báo khi số lượng linh kiện thấp hơn ngưỡng tối thiểu để kịp thời lên kế hoạch bổ sung.
- **US07 (COULD):** Là Quản lý trung tâm, tôi muốn xem lịch sử nhập và xuất linh kiện để theo dõi các giao dịch phát sinh trong kho.
- **US08 (COULD):** Là Quản lý trung tâm, tôi muốn cập nhật thông tin linh kiện để thông tin trong hệ thống luôn chính xác và dễ quản lý.

## 4. Yêu cầu phi chức năng
| Mã | Nhóm | Ngưỡng đo được |
|---|---|---|
| NFR1 | Hiệu năng | Danh sách tồn kho hiển thị trong ≤ 2 giây với 10.000 bản ghi và 20 dòng/trang trong môi trường kiểm thử. |
| NFR2 | Toàn vẹn dữ liệu | 100% giao dịch nhập/xuất hợp lệ cập nhật tồn kho và ghi lịch sử trong cùng một transaction CSDL. |
| NFR3 | Phân quyền | 100% yêu cầu thiết lập ngưỡng/cập nhật danh mục phải được kiểm tra vai trò ở tầng nghiệp vụ; người không có quyền bị từ chối. |
| NFR4 | Tính dễ bảo trì | Thay đổi một quy tắc tính tồn kho không yêu cầu sửa quá 1 module nghiệp vụ. |
| NFR5 | Tra cứu lịch sử | Lịch sử 10.000 giao dịch, lọc theo linh kiện và khoảng ngày, trả kết quả trong ≤ 3 giây trong môi trường kiểm thử. |

## 5. Ràng buộc và quy tắc nghiệp vụ
- **BR1:** Số lượng nhập và xuất phải là số nguyên dương (> 0).
- **BR2:** Không được xuất linh kiện nếu số lượng yêu cầu lớn hơn số lượng tồn khả dụng.
- **BR3:** Mỗi giao dịch nhập/xuất phải lưu loại giao dịch, linh kiện, số lượng, thời điểm và người thực hiện.
- **BR4:** Giao dịch xuất phải liên kết với phiếu bảo hành hợp lệ.
- **BR5:** Cảnh báo tồn kho thấp được phát sinh khi số lượng tồn nhỏ hơn ngưỡng tối thiểu đã thiết lập.

## 6. Bảng truy vết
| FR | User Story | Use Case | MoSCoW | Bảng dữ liệu | Màn hình |
|---|---|---|---|---|---|
| FR1 | Xem danh sách linh kiện và số lượng tồn theo trung tâm. | US01 | UC01 | SHOULD | part, inventory | M1 Danh sách tồn kho |
| FR2 | Ghi nhận giao dịch nhập kho với số lượng lớn hơn 0; sau khi lưu, tăng tồn kho tương ứng. | US02 | UC02 | MUST | part, inventory, stock_transaction | M2 Nhập kho |
| FR3 | Ghi nhận giao dịch xuất kho gắn với phiếu bảo hành; sau khi lưu, giảm tồn kho tương ứng. | US03 | UC03 | MUST | part, inventory, stock_transaction, warranty_ticket | M3 Xuất kho |
| FR4 | Kiểm tra tồn kho trước khi xuất và từ chối giao dịch nếu số lượng yêu cầu lớn hơn tồn khả dụng. | US04 | UC03 | MUST | inventory, stock_transaction | M3 Xuất kho |
| FR5 | Cho phép quản lý thiết lập ngưỡng tồn tối thiểu cho từng linh kiện tại trung tâm. | US05 | UC04 | SHOULD | inventory | M1 Danh sách tồn kho |
| FR6 | Tạo và hiển thị cảnh báo khi tồn kho thấp hơn ngưỡng tối thiểu. | US06 | UC05 | SHOULD | inventory, stock_alert | M1 Danh sách tồn kho |
| FR7 | Hiển thị lịch sử giao dịch nhập/xuất gồm linh kiện, loại, số lượng và thời gian. | US07 | UC06 | COULD | stock_transaction, part | M4 Lịch sử giao dịch |
| FR8 | Cho phép quản lý cập nhật tên, mô tả và đơn vị tính của linh kiện. | US08 | UC07 | COULD | part | M5 Cập nhật linh kiện |