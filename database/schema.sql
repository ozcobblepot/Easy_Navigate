CREATE DATABASE IF NOT EXISTS easy_navigate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE easy_navigate;

CREATE TABLE IF NOT EXISTS service_searches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_type ENUM('hotel', 'car', 'flights', 'attractions', 'taxi') NOT NULL,
    page_path VARCHAR(255) NOT NULL,
    search_data JSON NOT NULL,
    user_uid VARCHAR(128) NULL,
    user_name VARCHAR(255) NULL,
    user_email VARCHAR(255) NULL,
    user_provider VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_type (service_type),
    INDEX idx_created_at (created_at),
    INDEX idx_user_email (user_email)
);

CREATE TABLE IF NOT EXISTS hotels (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hotel_name VARCHAR(255) NOT NULL,
    city VARCHAR(120) NOT NULL,
    address VARCHAR(255) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    stars TINYINT UNSIGNED NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hotel_location (hotel_name, city, address),
    INDEX idx_city (city),
    INDEX idx_price_per_night (price_per_night),
    INDEX idx_rating (rating),
    INDEX idx_stars (stars)
);

INSERT INTO hotels (hotel_name, city, address, price_per_night, rating)
VALUES
    ('Savoy Hotel', 'Pasay', 'Andrews Avenue, Newport City', 4800.00, 4.5, 4),
    ('Bayview Park Hotel', 'Manila', 'Roxas Boulevard, Ermita', 3500.00, 4.2, 3),
    ('The Manor at Camp John Hay', 'Baguio', 'Camp John Hay', 6200.00, 4.6, 5),
    ('Quest Hotel', 'Cebu City', 'Archbishop Reyes Avenue', 4000.00, 4.3, 4),
    ('Seda Abreeza', 'Davao City', 'J.P. Laurel Avenue', 5200.00, 4.4, 4),
    ('Widus Hotel', 'Clark', 'Manuel A. Roxas Highway', 5000.00, 4.3, 4)
ON DUPLICATE KEY UPDATE
    price_per_night = VALUES(price_per_night),
    rating = VALUES(rating);
