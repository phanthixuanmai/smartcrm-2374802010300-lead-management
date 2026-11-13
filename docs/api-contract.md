# SmartCRM API Reference

This reference lists the implemented HTTP routes only. Base URL defaults to
`http://localhost:3000`; request and response bodies use JSON. The app has no
role-based authorization: parts, inventory, and warranty-ticket operations
require a valid session for the single configured shared account. There is no
user-specific ownership check.

## Authentication and common responses

`POST /api/auth/login` sets an `HttpOnly`, `SameSite=Lax` cookie named
`smartcrm_session`; it expires after eight hours and is held in server memory.
Send the cookie with protected requests. The browser UI handles it automatically.
In production the cookie also gets `Secure` when `NODE_ENV=production`.

The route catalog contains 18 endpoints: one health endpoint, three
authentication endpoints, five parts endpoints, four inventory endpoints, and
five warranty-ticket endpoints.

| HTTP status | Meaning |
|---|---|
| `400` | Invalid ID, query, or request data. |
| `401` | Missing/invalid login session or invalid credentials. |
| `404` | Requested part, inventory item, or ticket does not exist. |
| `409` | Duplicate code, referenced record, or insufficient stock. |
| `500` | Unexpected server/database error. |
| `503` | Login is not configured on the server. |

Error responses are JSON objects with an `error` string. Part input validation
also includes a `details` array.

## Implemented endpoint catalog

Each row documents seven contract items: method/path, authentication and role,
parameters, request body, success status, response contract/example, and error
statuses. “No body” means the request has no JSON body.

| Method and path | Authentication / role | Parameters | Request body | Success | Response contract / example | Errors |
|---|---|---|---|---|---|---|
| `GET /health` | Public; no role | None | No body | `200` | `{"status":"ok"}` | None documented |
| `POST /api/auth/login` | Public; no role | None | `{"username":"<AUTH_USERNAME>","password":"<AUTH_PASSWORD>"}` | `200` | `{"user":{"username":"admin"}}`; sets session cookie | `401`, `503` |
| `POST /api/auth/logout` | Public; no role | Existing cookie is cleared if present | No body | `200` | `{"success":true}` | None documented |
| `GET /api/auth/session` | Public route; requires a valid session for `200` | Session cookie | No body | `200` | `{"user":{"username":"admin"}}` | `401`, `503` |
| `GET /api/parts` | Session required; shared account | None | No body | `200` | Array of part records: `part_id`, `part_code`, `name`, `unit`, `unit_price`, `description`, `is_active` | `401`, `500` |
| `GET /api/parts/{id}` | Session required; shared account | Path `id`: positive integer | No body | `200` | One part record with the fields listed above | `400`, `401`, `404`, `500` |
| `POST /api/parts` | Session required; shared account | None | `{"part_code":"DEMO-PART-002","name":"Demo part","unit":"piece","unit_price":12.5,"description":"Example","is_active":true}`; required: `part_code`, `name`, `unit` | `201` | Newly created part record | `400`, `401`, `409`, `500` |
| `PUT /api/parts/{id}` | Session required; shared account | Path `id`: positive integer | Full part object; `part_code`, `name`, `unit` required | `200` | Updated part record | `400`, `401`, `404`, `409`, `500` |
| `DELETE /api/parts/{id}` | Session required; shared account | Path `id`: positive integer | No body | `204` | Empty body | `400`, `401`, `404`, `409`, `500` |
| `GET /api/inventory` | Session required; shared account | Optional `centerCode`, `q`, `page` (default 1), `pageSize` (default 20, max 100) | No body | `200` | `{"items":[...],"page":1,"pageSize":20}`; item fields include inventory/part/center data, `quantity`, `min_quantity`, and `low_stock` | `400`, `401`, `500` |
| `GET /api/inventory/{id}` | Session required; shared account | Path `id`: positive integer | No body | `200` | One inventory record with joined part and service-center fields | `400`, `401`, `404`, `500` |
| `GET /api/inventory/{id}/transactions` | Session required; shared account | Path `id`: positive integer; response is limited to the latest 100 records | No body | `200` | Array of records with `transaction_id`, `transaction_type`, `quantity`, `created_at`, `created_by`, `note`, `ticket_id`, `ticket_code` | `400`, `401`, `404`, `500` |
| `POST /api/inventory/{id}/transactions` | Session required; shared account | Path `id`: positive integer | `{"type":"OUT","quantity":2,"ticketId":"1","createdBy":"tech-01","note":"Warranty repair"}`; `type` is `IN` or `OUT`; `ticketId` required for `OUT` | `201` | `{"transactionId":"…","inventoryId":"…","type":"OUT","quantity":2,"ticketId":"1","createdBy":"tech-01","newStock":8}` | `400`, `401`, `404`, `409`, `500` |
| `GET /api/warranty-tickets` | Session required; shared account | Optional `status`: `OPEN`, `CLOSED`, or `CANCELLED` (case-insensitive) | No body | `200` | Array of records with `ticket_id`, `ticket_code`, `status`, `created_at` | `400`, `401`, `500` |
| `GET /api/warranty-tickets/{id}` | Session required; shared account | Path `id`: positive integer | No body | `200` | One warranty-ticket record | `400`, `401`, `404`, `500` |
| `POST /api/warranty-tickets` | Session required; shared account | None | `{"ticket_code":"BH-2026-003","status":"OPEN"}`; status defaults to `OPEN` | `201` | Newly created warranty-ticket record | `400`, `401`, `409`, `500` |
| `PUT /api/warranty-tickets/{id}` | Session required; shared account | Path `id`: positive integer | Full ticket object: `ticket_code`, `status` | `200` | Updated warranty-ticket record | `400`, `401`, `404`, `409`, `500` |
| `DELETE /api/warranty-tickets/{id}` | Session required; shared account | Path `id`: positive integer | No body | `204` | Empty body | `400`, `401`, `404`, `409`, `500` |

Part fields have limits of 40 characters for `part_code`, 150 for `name`, 30
for `unit`, and 500 for `description`. `unit_price` must be non-negative with
at most two decimal places. Inventory transaction quantity must be a positive
integer; `createdBy` is required. An `OUT` transaction is atomic with the stock
update, requires an open warranty ticket, and returns `409` if stock is
insufficient. Warranty ticket status is one of `OPEN`, `CLOSED`, or
`CANCELLED`.

## Executed request/response evidence

The examples below are taken from the MySQL-backed run documented in
[`test-report.md`](./test-report.md), not from an unimplemented API proposal.

TC-01 created a part with this request:

```http
POST /api/parts
Content-Type: application/json

{"part_code":"BT2-PART-VALID","name":"BT2 integration part","unit":"piece","unit_price":12345}
```

Observed result: HTTP `201`; response part code and name matched the request,
and the row was read back from MySQL with matching persisted values.

TC-04 attempted to withdraw one more unit than available:

```http
POST /api/inventory/{fixture.inventoryA}/transactions
Content-Type: application/json

{"type":"OUT","quantity":6,"ticketId":"<open-ticket-id>","createdBy":"integration-test"}
```

Observed response:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":"Insufficient stock for this withdrawal"}
```

The same test verified stock remained 5 and the transaction row count did not
change. TC-10 in the report records `401` for an unauthenticated protected
request. `403` is not applicable because this app has no roles or per-user
ownership model.
