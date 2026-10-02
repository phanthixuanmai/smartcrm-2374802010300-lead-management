# SmartCRM - Kho linh kiện thay thế

## 1. Thông tin sinh viên

- **Họ tên:** Phan Thị Xuân Mai
- **MSSV:** 2374802010300
- **Track:** DA
- **Luồng nghiệp vụ:** L5 - Kho linh kiện thay thế

---

## 2. Giới thiệu bài toán

Hệ thống hỗ trợ Kỹ thuật viên và Quản lý trung tâm theo dõi và quản lý
tồn kho linh kiện thay thế tại từng trung tâm.

Hệ thống cho phép ghi nhận nhập kho, xuất linh kiện cho phiếu bảo hành,
kiểm tra số lượng tồn kho, thiết lập ngưỡng tồn kho và cảnh báo khi
số lượng linh kiện xuống dưới ngưỡng.

Quy trình kết thúc khi số lượng tồn kho được cập nhật thành công.

---

## 3. Phạm vi nghiệp vụ

### Luồng nghiệp vụ

Theo dõi tồn kho
→ Nhập linh kiện
→ Xuất linh kiện cho phiếu bảo hành
→ Kiểm tra tồn kho
→ Cảnh báo dưới ngưỡng
→ Cập nhật số lượng tồn kho

### Đối tượng sử dụng

- **Kỹ thuật viên**
- **Quản lý trung tâm**

### Đối tượng quản lý

- Linh kiện
- Tồn kho linh kiện
- Giao dịch nhập/xuất
- Linh kiện sử dụng cho phiếu bảo hành

---

## 4. User Stories

### US1 - Xem tồn kho

Là Kỹ thuật viên, tôi muốn xem số lượng linh kiện tồn kho tại trung tâm
để biết linh kiện còn đủ để sử dụng hay không.

### US2 - Nhập linh kiện

Là Kỹ thuật viên, tôi muốn ghi nhận nhập linh kiện vào kho để cập nhật
số lượng linh kiện thực tế.

### US3 - Xuất linh kiện

Là Kỹ thuật viên, tôi muốn xuất linh kiện cho phiếu bảo hành để sử dụng
linh kiện khi sửa chữa và bảo hành.

### US4 - Kiểm tra tồn kho

Là Kỹ thuật viên, tôi muốn hệ thống kiểm tra số lượng tồn trước khi xuất
để không xuất quá số lượng đang có trong kho.

### US5 - Thiết lập ngưỡng tồn kho

Là Quản lý trung tâm, tôi muốn thiết lập ngưỡng tồn kho cho linh kiện
để theo dõi và bổ sung linh kiện kịp thời.

### US6 - Cảnh báo tồn kho

Là Quản lý trung tâm, tôi muốn nhận cảnh báo khi linh kiện dưới ngưỡng
tồn kho để có kế hoạch nhập thêm linh kiện.

### US7 - Xem lịch sử nhập/xuất

Là Quản lý trung tâm, tôi muốn xem lịch sử nhập xuất linh kiện để theo
dõi tình hình sử dụng và tồn kho.

---

## 5. Dữ liệu

### Phương thức dữ liệu

- Sinh mô phỏng
- Số lượng dự kiến: khoảng 30 bản ghi

### Các bảng dữ liệu chính

| Bảng | Mô tả |
|---|---|
| `part` | Thông tin linh kiện |
| `part_stock` | Thông tin tồn kho linh kiện |
| `part_transaction` | Giao dịch nhập/xuất linh kiện |
| `ticket_part` | Linh kiện sử dụng cho phiếu bảo hành |

---

## 6. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ | Java |
| Backend | Spring Boot |
| Database | MySQL |
| IDE | IntelliJ IDEA |

---

## 7. Cấu trúc project

```text
smartcrm-2374802010300-lead-management/
│
├── docs/
│   └── diagrams/
│
├── src/
│   ├── backend/
│   └── frontend/
│
├── tests/
│
├── .env.example
├── .gitignore
└── README.md