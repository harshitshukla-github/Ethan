-- Zero-Waste & Sustainability Matchmaker — MySQL 8.0+ schema
--
-- Apply with `npm run db:setup`, which creates the database named in DB_NAME first.
-- To apply by hand, create and select a database, then run this file:
--   mysql -u root -p -e "CREATE DATABASE zero_waste_matchmaker CHARACTER SET utf8mb4"
--   mysql -u root -p zero_waste_matchmaker < db/schema.sql
--
-- Every statement is idempotent, so re-running this file never drops data.

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS locations (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150) NOT NULL,
  category     ENUM('compost', 'electronics', 'bulk_goods', 'recycling_center') NOT NULL,
  description  TEXT         NULL,
  address      VARCHAR(255) NOT NULL,
  latitude     DECIMAL(9,6) NOT NULL,
  longitude    DECIMAL(9,6) NOT NULL,
  website      VARCHAR(255) NULL,
  phone        VARCHAR(40)  NULL,
  hours        VARCHAR(255) NULL,
  -- Community submissions start unverified and stay hidden from the public API until a moderator flips this flag.
  is_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  submitted_by INT UNSIGNED NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_locations_verified_category (is_verified, category),
  CONSTRAINT fk_locations_submitted_by FOREIGN KEY (submitted_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_locations_latitude  CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_locations_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  location_id INT UNSIGNED     NOT NULL,
  user_id     INT UNSIGNED     NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     TEXT             NULL,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_location_created (location_id, created_at),
  CONSTRAINT fk_reviews_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
