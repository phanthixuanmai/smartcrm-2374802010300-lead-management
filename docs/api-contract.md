# API Contract – L5 Kho linh kiện thay thế (bản đề xuất)
Base path: `/api/v1`. JSON UTF-8. Các endpoint là thiết kế đề xuất cho prototype, chưa phải API đang chạy.

## POST /inventory/{inventoryId}/transactions
Ghi nhận nhập/xuất kho; ánh xạ US02, US03, US04.
Request (nhập):
```json
{"type":"IN","quantity":5,"createdBy":"tech-01","note":"Nhập bổ sung"}
```
Request (xuất):
```json
{"type":"OUT","quantity":2,"ticketId":123,"createdBy":"tech-01","note":"Dùng cho phiếu bảo hành"}
```
Validation: `inventoryId` phải tồn tại; `type` thuộc `IN|OUT`; `quantity` là số nguyên > 0; `createdBy` không rỗng; với `OUT`, `ticketId` bắt buộc và phải tồn tại; tồn khả dụng phải ≥ quantity. Ghi transaction + cập nhật tồn trong cùng transaction CSDL.
Responses: `201` thành công; `400` dữ liệu sai; `401` chưa xác thực; `403` không đủ quyền; `404` không tìm thấy inventory/ticket; `409` không đủ tồn kho.

## GET /inventory
Tra cứu tồn kho; US01. Query: `centerCode`, `q`, `page` (mặc định 1), `pageSize` (mặc định 20, tối đa 100). Response `200`: `items[]` gồm `inventoryId`, `partCode`, `name`, `unit`, `quantity`, `minQuantity`, `lowStock`; `400` query không hợp lệ.

## PATCH /inventory/{inventoryId}/threshold
Thiết lập ngưỡng tồn; US05. Chỉ Quản lý trung tâm. Request: `{"minQuantity":10}`. `minQuantity` là số nguyên ≥ 0. Response `200`; `400`, `401`, `403`, `404`.

## GET /inventory/{inventoryId}/transactions
Lịch sử giao dịch; US07. Query: `from`, `to`, `type`, `page`, `pageSize`. Response `200` với `items[]` gồm `transactionId`, `type`, `quantity`, `createdAt`, `createdBy`, `ticketCode`; lỗi `400` nếu khoảng ngày không hợp lệ.

## Truy vết
- `POST .../transactions` → FR2/FR3/FR4 → US02/US03/US04 → UC02/UC03.
- `GET /inventory` → FR1 → US01 → UC01.
- `PATCH .../threshold` → FR5 → US05 → UC04.
- Cảnh báo tồn thấp được tạo sau cập nhật giao dịch/thiết lập ngưỡng khi `quantity < minQuantity` → FR6 → US06 → UC05.
- `GET .../transactions` → FR7 → US07 → UC06.
- `PATCH /parts/{partId}` (đề xuất tương tự) → FR8 → US08 → UC07.

## API danh mục linh kiện (đã triển khai)
Base path: `/api/parts`. Các trường JSON dùng tên cột `part_id`, `part_code`,
`name`, `unit`, `description` và `is_active`.
Persistence sử dụng MySQL 8+, InnoDB và placeholder tham số `?`.

| Method | Endpoint | Thành công | Lỗi chính |
|---|---|---|---|
| GET | `/api/parts` | `200` với danh sách linh kiện (bao gồm `PART-001`–`PART-003` sau seed) | `500` lỗi máy chủ |
| GET | `/api/parts/{id}` | `200` với một linh kiện | `400` id sai định dạng; `404` không tồn tại |
| POST | `/api/parts` | `201` với linh kiện vừa tạo | `400` body sai; `409` trùng `part_code` |
| PUT | `/api/parts/{id}` | `200` với linh kiện cập nhật | `400` dữ liệu/id sai; `404` không tồn tại; `409` trùng mã |
| DELETE | `/api/parts/{id}` | `204` không có response body | `400` id sai; `404` không tồn tại; `409` đang được tham chiếu |

Body POST/PUT cần có `part_code`, `name`, `unit`; `description` và `is_active`
là tùy chọn. `part_code`, `name`, `unit` phải là chuỗi không rỗng.
