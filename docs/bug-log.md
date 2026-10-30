# Bug log

## Inventory service leaked HTTP status codes

- **Reproduce:** call `createTransactionPlan` with an `OUT` quantity greater than the current stock, or without a warranty ticket.
- **Cause:** `InventoryError` stored HTTP status codes, coupling the stock-domain service to the transport layer.
- **Fix:** the service now reports domain error codes; the inventory route maps known codes to HTTP responses.
- **Verify:** `npm test` covers valid stock movement, invalid quantities, missing tickets, and insufficient stock.
