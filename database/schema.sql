
-- Enable GiST support for equality comparisons on room IDs
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Hotel rooms
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type VARCHAR(30) NOT NULL
        CHECK (room_type IN ('single', 'double', 'deluxe', 'suite')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    price_per_night NUMERIC(10, 2) NOT NULL
        CHECK (price_per_night >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guest reservations
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_reference VARCHAR(30) NOT NULL UNIQUE,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    guest_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_reservation_dates
        CHECK (check_out > check_in),

    -- Prevent overlapping confirmed bookings for the same room.
    -- Checkout date is exclusive.
    CONSTRAINT no_overlapping_confirmed_reservations
        EXCLUDE USING gist (
            room_id WITH =,
            daterange(check_in, check_out, '[)') WITH &&
        )
        WHERE (status = 'confirmed')
);

-- Useful lookup indexes
CREATE INDEX IF NOT EXISTS idx_rooms_type
    ON rooms(room_type);

CREATE INDEX IF NOT EXISTS idx_reservations_room_dates
    ON reservations(room_id, check_in, check_out);

CREATE INDEX IF NOT EXISTS idx_reservations_status
    ON reservations(status);
