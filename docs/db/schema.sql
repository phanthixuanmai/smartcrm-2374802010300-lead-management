-- SQL DDL skeleton – Track SE / L5 Kho linh kiện thay thế
CREATE TABLE part (
  part_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE inventory (
  inventory_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_id BIGINT NOT NULL REFERENCES part(part_id),
  center_code VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_inventory_part_center UNIQUE (part_id, center_code)
);

CREATE TABLE warranty_ticket (
  ticket_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transaction (
  transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id),
  ticket_id BIGINT REFERENCES warranty_ticket(ticket_id),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  note VARCHAR(500),
  CONSTRAINT ck_out_ticket CHECK (transaction_type <> 'OUT' OR ticket_id IS NOT NULL)
);

CREATE TABLE stock_alert (
  alert_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id),
  threshold INTEGER NOT NULL CHECK (threshold >= 0),
  quantity_at_alert INTEGER NOT NULL CHECK (quantity_at_alert >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Indexes supporting list/history filtering and sorting
CREATE INDEX idx_inventory_center_quantity ON inventory(center_code, quantity);
CREATE INDEX idx_stock_txn_inventory_created ON stock_transaction(inventory_id, created_at DESC);
CREATE INDEX idx_stock_txn_created ON stock_transaction(created_at DESC);
