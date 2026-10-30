# BÁO CÁO BUỔI 12 – L5 KHO LINH KIỆN

## Trang bìa

- [ ] Repo: [smartcrm-2374802010300-lead-management](https://github.com/phanthixuanmai/smartcrm-2374802010300-lead-management)
- [ ] Tag nộp: [v0.2](https://github.com/phanthixuanmai/smartcrm-2374802010300-lead-management/releases/tag/v0.2)
- [ ] Track: SE
- [ ] Mã luồng: L5 – Kho linh kiện
- [ ] Họ tên: Phan Thị Xuân Mai
- [ ] MSSV: 2374802010300
- [ ] Lớp: **[Điền lớp]**

## Mục 1. Tóm tắt hệ thống

- [ ] Nêu bài toán và người dùng mục tiêu.
- [ ] Tóm tắt chức năng quản lý linh kiện, tồn kho, giao dịch nhập/xuất và phiếu bảo hành.
- [ ] Nêu công nghệ sử dụng: Node.js, Express, MySQL và giao diện web.

## Mục 2. Kiến trúc đã hiện thực

- [ ] Mô tả frontend, API routes, services và MySQL.
- [ ] Giải thích luồng request từ giao diện đến database và kết quả trả về.
- [ ] Chèn sơ đồ kiến trúc: [architecture.png](../docs/diagram-images/architecture.png).
- [ ] Đối chiếu mô hình dữ liệu: [erd.png](../docs/diagram-images/erd.png).
- [ ] Đối chiếu chức năng theo vai trò: [usecase.png](../docs/diagram-images/usecase.png).
- [ ] Nêu ranh giới giữa route (HTTP) và service (quy tắc nghiệp vụ).

## Mục 3. Module cốt lõi + ẢNH CHỤP chạy thật

- [ ] Mô tả CRUD linh kiện và phiếu bảo hành.
- [ ] Mô tả giao dịch nhập/xuất kho, kiểm tra số lượng và liên kết phiếu bảo hành.
- [x] Ảnh chụp chạy thật: API/backend hoạt động.
  - API/backend trả dữ liệu thật: [server-running.png](images/server-running.png).
  - Giao diện đọc dữ liệu từ MySQL: [db-connected.png](images/db-connected.png).
- [x] Môi trường và dữ liệu lúc chụp (31/10/2026):
  - Node.js 18.20.7, npm 10.8.2, MySQL Community Server 8.4.9.
  - Backend tại `http://127.0.0.1:3000`, frontend tại `http://127.0.0.1:5173`, MySQL cô lập tại `127.0.0.1:13307`.
  - Backend log xác nhận `MySQL database connected` và `Server running... port 3000`; API `GET /api/parts` trả HTTP 200.
  - Dữ liệu seed đọc trực tiếp qua API: `PART-001` Màn hình iPhone 11, `PART-002` Pin Samsung A52, `PART-003` Cáp sạc USB-C. Giao diện hiển thị 3 linh kiện, tổng tồn 29 đơn vị.
  - Ảnh được chụp bằng Chrome headless mở trực tiếp các URL đang chạy; không dựng dữ liệu hay mock giao diện.
- [ ] Ảnh chụp luồng chính end-to-end.
  - Có thể dùng: [luồng xuất kho UC03](../docs/e2e-xuat-kho.png).
- [x] Ghi rõ dữ liệu/môi trường dùng để chụp; ảnh là bằng chứng từ các URL đang chạy, không phải ảnh minh họa.

## Mục 4. Bộ kiểm thử + ẢNH CHỤP test PASS

- [ ] Mô tả kiểm thử luồng đúng, biên và dữ liệu không hợp lệ.
- [ ] Chạy `npm test` và ghi số test PASS.
- [ ] Chèn ảnh terminal kết quả test: `images/npm-test-pass.png`.
- [ ] Ghi môi trường Node.js/npm khi chạy test.

## Mục 5. Trình bày kết quả + ẢNH CHỤP đủ 3 trạng thái

- [ ] Trạng thái loading: `images/ui-loading.png`.
- [ ] Trạng thái rỗng (empty): `images/ui-empty.png`.
- [ ] Trạng thái lỗi, gồm lúc backend tắt: `images/ui-error.png`.
- [ ] Mô tả cách giao diện thông báo lỗi và cho phép thử lại.
- [ ] Đối chiếu bố cục màn hình: [wireframe.png](../docs/diagram-images/wireframe.png).
- [ ] Ảnh hiện có để tham khảo: [danh sách tồn kho](../docs/inventory-list.png), [form giao dịch](../docs/transaction-form.png), [backend tắt](../docs/backend-offline-error.png).

## Mục 6. Cách dựng lại hệ thống

- [ ] Ghi phiên bản runtime và yêu cầu MySQL.
- [ ] Hướng dẫn clone đúng tag `v0.2`.
- [ ] Hướng dẫn `npm ci`, tạo `.env` từ `.env.example` và điền cấu hình DB cục bộ.
- [ ] Hướng dẫn chạy migration/seed bằng `npm run db:init`.
- [ ] Hướng dẫn chạy backend, frontend và test; mỗi bước dùng một lệnh riêng.
- [ ] Ghi kết quả kiểm tra chạy lại migration/seed lần hai không lỗi, không nhân đôi dữ liệu.

Các lệnh tham khảo:

```powershell
git clone --branch v0.2 https://github.com/phanthixuanmai/smartcrm-2374802010300-lead-management.git
cd smartcrm-2374802010300-lead-management
npm ci
Copy-Item .env.example .env
npm run db:init
npm test
npm run dev
npm run dev:frontend
```

## Mục 7. Thay đổi so với BT1

- [ ] Tóm tắt quyết định sửa/giữ thiết kế và lý do.
- [ ] Nêu tác động đến kiến trúc, dữ liệu, API hoặc giao diện.
- [ ] Đối chiếu chi tiết với [thay-doi-thiet-ke.md](../docs/thay-doi-thiet-ke.md).

## Phụ lục. Bảng khai báo AI

- [ ] Rà soát và hoàn thành bảng khai báo AI bên dưới.

| Công cụ | Việc sử dụng | Tệp/hàm liên quan | Cách kiểm chứng |
|---|---|---|---|
| [Điền công cụ] | [Mô tả phần việc được hỗ trợ] | [Đường dẫn tệp và hàm] | [Đối chiếu yêu cầu, chạy test hoặc kiểm tra thủ công] |
