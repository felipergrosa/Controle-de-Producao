-- Migration 004: Seed default admin user for production
-- Default password: Admin@123 (change immediately after first login)

SET @adminEmail := 'admin@controle.com';
SET @passwordHash := '$2a$10$9Dxv4i.1Q0nJZNitzCmga.lxOHjgOjP.lbaDsmolnjkHbYOhSn5CC';

INSERT INTO users (
  email,
  password_hash,
  name,
  role,
  loginMethod,
  is_active,
  must_change_password,
  createdAt,
  updatedAt,
  lastSignedIn
)
SELECT
  @adminEmail,
  @passwordHash,
  'Administrador',
  'admin',
  'local',
  TRUE,
  TRUE,
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = @adminEmail COLLATE utf8mb4_unicode_ci
);

-- Rollback manual: DELETE FROM users WHERE email = @adminEmail;
