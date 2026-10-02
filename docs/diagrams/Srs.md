TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
HỆ THỐNG QUẢN LÝ KHO LINH KIỆN THAY THẾ
Sinh viên: Phan Thị Xuân Mai
MSSV: 2374802010300
Track: SE
Luồng: L5 – Kho linh kiện thay thế
Phiên bản: 1.0
1. GIỚI THIỆU
Mục đích: Tài liệu mô tả các yêu cầu của hệ thống quản lý kho linh kiện thay thế, làm cơ sở cho việc thiết kế, phát triển và kiểm thử.
Phạm vi: Hệ thống hỗ trợ quản lý tồn kho, nhập linh kiện, xuất linh kiện cho phiếu bảo hành, thiết lập ngưỡng tồn và cảnh báo linh kiện sắp hết.
2. MÔ TẢ TỔNG QUAN
Đối tượng	Vai trò
Kỹ thuật viên	Xem tồn kho, nhập và xuất linh kiện.
Quản lý trung tâm	Quản lý linh kiện, thiết lập ngưỡng, nhận cảnh báo và xem lịch sử.
Công nghệ: Java, Spring Boot, MySQL, RESTful API.
Giả định: Mỗi linh kiện có mã riêng; số lượng nhập/xuất phải lớn hơn 0; tồn kho không được âm.
3. YÊU CẦU CHỨC NĂNG
Mã	Yêu cầu chức năng	Ưu tiên
FR01	Xem số lượng linh kiện tồn kho.	SHOULD
FR02	Ghi nhận nhập linh kiện và cập nhật tồn kho.	MUST
FR03	Xuất linh kiện cho phiếu bảo hành.	MUST
FR04	Kiểm tra tồn kho trước khi xuất.	MUST
FR05	Thiết lập ngưỡng tồn kho tối thiểu.	SHOULD
FR06	Cảnh báo khi tồn kho thấp hơn ngưỡng.	SHOULD
FR07	Xem lịch sử nhập, xuất linh kiện.	COULD
FR08	Cập nhật thông tin linh kiện.	COULD
4. YÊU CẦU PHI CHỨC NĂNG
Mã	Yêu cầu	Tiêu chí
NFR01	Hiệu năng	Phản hồi trong ≤ 3 giây với 30 bản ghi.
NFR02	Toàn vẹn dữ liệu	Không cho phép tồn kho âm.
NFR03	Bảo mật	Chỉ người có quyền mới được thực hiện chức năng tương ứng.
NFR04	Dễ sử dụng	Thao tác chính có thông báo kết quả rõ ràng.
NFR05	Bảo trì	Tách Controller, Service và Repository.
5. ĐẶC TẢ USE CASE
UC03 – Xuất linh kiện cho phiếu bảo hành
Thuộc tính	Nội dung
Actor	Kỹ thuật viên
Mục tiêu	Xuất linh kiện và cập nhật tồn kho.
Tiền điều kiện	Phiếu bảo hành và linh kiện tồn tại.
Hậu điều kiện	Giao dịch được lưu, tồn kho được cập nhật.
Quan hệ	<<include>> UC04 – Kiểm tra tồn kho.
Luồng chính:
1.	Kỹ thuật viên chọn phiếu bảo hành.
2.	Nhập linh kiện và số lượng cần xuất.
3.	Hệ thống kiểm tra thông tin và tồn kho.
4.	Kỹ thuật viên xác nhận xuất.
5.	Hệ thống lưu giao dịch và cập nhật tồn kho.
6.	Hệ thống thông báo thành công.
Luồng ngoại lệ:
•	Phiếu bảo hành hoặc linh kiện không tồn tại: thông báo lỗi.
•	Số lượng tồn không đủ: từ chối xuất.
•	Số lượng không hợp lệ: yêu cầu nhập lại.
6. BẢNG TRUY VẾT YÊU CẦU
FR	User Story	Use Case	MoSCoW
FR01	US01	UC01	SHOULD
FR02	US02	UC02	MUST
FR03	US03	UC03	MUST
FR04	US04	UC04	MUST
FR05	US05	UC05	SHOULD
FR06	US06	UC06	SHOULD
FR07	US07	UC07	COULD
FR08	US08	UC08	COULD
