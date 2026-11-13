INSERT INTO part (part_code, name, unit, unit_price, description, is_active)
VALUES ('DEMO-PART-001', 'Demo replacement part', 'piece', 12.50, 'Sample data for local setup', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  unit = VALUES(unit),
  unit_price = VALUES(unit_price),
  description = VALUES(description),
  is_active = VALUES(is_active);

INSERT INTO service_center (center_code, center_name, city)
VALUES ('DEMO-CENTER', 'Demo service center', 'Demo City')
ON DUPLICATE KEY UPDATE
  center_name = VALUES(center_name),
  city = VALUES(city);

INSERT INTO inventory (part_id, center_code, quantity, min_quantity)
SELECT part_id, 'DEMO-CENTER', 10, 2
FROM part
WHERE part_code = 'DEMO-PART-001'
ON DUPLICATE KEY UPDATE
  quantity = 10,
  min_quantity = 2;
