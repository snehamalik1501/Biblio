CREATE DATABASE IF NOT EXISTS shelfspace
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE shelfspace;

DROP TABLE IF EXISTS books;

CREATE TABLE books (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  author      VARCHAR(255) NOT NULL,
  category    ENUM('Programming','Fiction','Science','History','Business','Others') NOT NULL,
  year        INT NOT NULL DEFAULT 2024,
  copies      INT UNSIGNED NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_title ON books(title);
