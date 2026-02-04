-- ============================================================
--  CRM MINI — Migración v2
--  Ejecutar sobre la BD crm_mini existente (MySQL 8.0+)
-- ============================================================

USE crm_mini;

-- 1. Agregar rol supervisor al ENUM de users
ALTER TABLE users
  MODIFY role ENUM('admin', 'supervisor', 'asesora') NOT NULL DEFAULT 'asesora';

-- 2. Campos para carga manual en leads
ALTER TABLE leads
  ADD COLUMN observations TEXT NULL AFTER externalId,
  ADD COLUMN createdManually TINYINT(1) NOT NULL DEFAULT 0 AFTER observations;

-- Verificación
SELECT 'Migración v2 completada' AS resultado;
