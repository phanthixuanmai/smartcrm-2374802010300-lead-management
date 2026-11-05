CREATE TABLE IF NOT EXISTS part (
  part_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  part_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_center (
  center_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  center_code VARCHAR(30) NOT NULL UNIQUE,
  center_name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  part_id BIGINT UNSIGNED NOT NULL,
  center_code VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 2 CHECK (min_quantity >= 0),
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

CREATE TABLE IF NOT EXISTS imported_transaction_source (
  source_transaction_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  transaction_id BIGINT UNSIGNED NOT NULL UNIQUE,
  CONSTRAINT fk_imported_source_transaction FOREIGN KEY (transaction_id)
    REFERENCES stock_transaction(transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
