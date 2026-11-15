
INSERT INTO rooms (room_number, room_type, capacity, price_per_night)
VALUES
    ('101', 'single', 1, 1500.00),
    ('102', 'single', 1, 1500.00),
    ('201', 'double', 2, 2500.00),
    ('202', 'double', 2, 2500.00),
    ('301', 'deluxe', 3, 4000.00),
    ('401', 'suite', 4, 6500.00)
ON CONFLICT (room_number) DO NOTHING;
