CREATE TABLE IF NOT EXISTS part (
  part_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  part_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  part_id BIGINT UNSIGNED NOT NULL,
  center_code VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_inventory_part_center UNIQUE (part_id, center_code),
  INDEX idx_inventory_center_quantity (center_code, quantity),
  CONSTRAINT fk_inventory_part FOREIGN KEY (part_id) REFERENCES part(part_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS warranty_ticket (
  ticket_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS stock_transaction (
  transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inventory_id BIGINT UNSIGNED NOT NULL,
  ticket_id BIGINT UNSIGNED,
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  note VARCHAR(500),
  CONSTRAINT ck_out_ticket CHECK (transaction_type <> 'OUT' OR ticket_id IS NOT NULL),
  INDEX idx_stock_txn_inventory_created (inventory_id, created_at DESC),
  INDEX idx_stock_txn_created (created_at DESC),
  CONSTRAINT fk_stock_transaction_inventory FOREIGN KEY (inventory_id)
    REFERENCES inventory(inventory_id),
  CONSTRAINT fk_stock_transaction_ticket FOREIGN KEY (ticket_id)
    REFERENCES warranty_ticket(ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS stock_alert (
  alert_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inventory_id BIGINT UNSIGNED NOT NULL,
  threshold INTEGER NOT NULL CHECK (threshold >= 0),
  quantity_at_alert INTEGER NOT NULL CHECK (quantity_at_alert >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT fk_stock_alert_inventory FOREIGN KEY (inventory_id)
    REFERENCES inventory(inventory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO part (part_code, name, unit, description)
VALUES
  ('PART-001', 'Màn hình iPhone 11', 'cái', 'Màn hình thay thế iPhone 11'),
  ('PART-002', 'Pin Samsung A52', 'cái', 'Pin thay thế Samsung Galaxy A52'),
  ('PART-003', 'Cáp sạc USB-C', 'cái', 'Cáp sạc USB-C dùng cho điện thoại')
ON DUPLICATE KEY UPDATE part_code = part_code;

INSERT INTO warranty_ticket (ticket_code, status)
VALUES
  ('BH-2026-001', 'OPEN'),
  ('BH-2026-002', 'OPEN')
ON DUPLICATE KEY UPDATE ticket_code = ticket_code;

INSERT INTO inventory (part_id, center_code, quantity, min_quantity)
SELECT part_id, 'MEKONG-01',
  CASE part_code
    WHEN 'PART-001' THEN 5
    WHEN 'PART-002' THEN 8
    ELSE 12
  END,
  CASE part_code
    WHEN 'PART-001' THEN 2
    WHEN 'PART-002' THEN 2
    ELSE 3
  END
FROM part
WHERE part_code IN ('PART-001', 'PART-002', 'PART-003')
ON DUPLICATE KEY UPDATE quantity = inventory.quantity;
