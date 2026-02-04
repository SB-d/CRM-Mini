-- ============================================================
--  CRM MINI — Esquema completo de base de datos MySQL
--  Ejecutar en orden sobre una instancia MySQL 8.0+
--  CHARACTER SET: utf8mb4 | COLLATE: utf8mb4_unicode_ci
-- ============================================================

-- ─── 1. Crear y seleccionar la base de datos ─────────────────

CREATE DATABASE IF NOT EXISTS crm_mini
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE crm_mini;

-- ============================================================
--  TABLAS
-- ============================================================

-- ─── users ────────────────────────────────────────────────────
-- Almacena administradores y asesoras del call center.
-- role: 'admin' | 'asesora'
-- isActive: si está en FALSE la asesora se excluye del round-robin

CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)                  NOT NULL PRIMARY KEY,
  email       VARCHAR(255)              NOT NULL UNIQUE,
  password    VARCHAR(255)              NOT NULL COMMENT 'Hash bcrypt (cost 10)',
  name        VARCHAR(255)              NOT NULL,
  role        ENUM('admin','asesora')   NOT NULL DEFAULT 'asesora',
  isActive    TINYINT(1)                NOT NULL DEFAULT 1,
  createdAt   DATETIME(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                              ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── lead_sources ─────────────────────────────────────────────
-- Catalogo de fuentes de origen del lead (Zapier, n8n, Web…)

CREATE TABLE IF NOT EXISTS lead_sources (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL UNIQUE,
  description VARCHAR(500)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── leads ────────────────────────────────────────────────────
-- Registro central de cada lead que entra al sistema.
-- externalId: identificador enviado por Zapier/n8n → prevención de duplicados.
-- assignedUserId: asesora asignada por round-robin automático.

CREATE TABLE IF NOT EXISTS leads (
  id              CHAR(36)  NOT NULL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  phone           VARCHAR(30)   NOT NULL,
  email           VARCHAR(255)  NULL,
  sourceId        CHAR(36)      NULL,
  status          ENUM(
                    'nuevo',
                    'pendiente_llamada',
                    'contactado',
                    'no_contesta',
                    'seguimiento',
                    'cerrado'
                  )             NOT NULL DEFAULT 'nuevo',
  assignedUserId  CHAR(36)      NULL,
  assignedAt      DATETIME(3)   NULL,
  externalId      VARCHAR(255)  NULL UNIQUE,
  createdAt       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_leads_source
    FOREIGN KEY (sourceId) REFERENCES lead_sources(id),

  CONSTRAINT fk_leads_assignedUser
    FOREIGN KEY (assignedUserId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── clients ──────────────────────────────────────────────────
-- Se crea al convertir un lead → cliente.
-- leadId UNIQUE garantiza conversión 1:1.
-- Todo el historial del lead se conserva íntegro.

CREATE TABLE IF NOT EXISTS clients (
  id        CHAR(36)      NOT NULL PRIMARY KEY,
  name      VARCHAR(255)  NOT NULL,
  phone     VARCHAR(30)   NOT NULL,
  email     VARCHAR(255)  NULL,
  leadId    CHAR(36)      NOT NULL UNIQUE,
  createdAt DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_clients_lead
    FOREIGN KEY (leadId) REFERENCES leads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── cases ────────────────────────────────────────────────────
-- Pipeline operativo por cliente.
-- Se crea automáticamente al convertir un lead.
-- status define la etapa actual del caso.

CREATE TABLE IF NOT EXISTS cases (
  id        CHAR(36)  NOT NULL PRIMARY KEY,
  clientId  CHAR(36)  NOT NULL,
  leadId    CHAR(36)  NULL,
  status    ENUM(
              'nuevo',
              'pendiente_llamada',
              'contactado',
              'no_contesta',
              'seguimiento',
              'cerrado'
            )         NOT NULL DEFAULT 'nuevo',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_cases_client
    FOREIGN KEY (clientId) REFERENCES clients(id),

  CONSTRAINT fk_cases_lead
    FOREIGN KEY (leadId) REFERENCES leads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── call_logs ────────────────────────────────────────────────
-- Registro manual de cada llamada realizada por una asesora.
-- duration: en minutos.

CREATE TABLE IF NOT EXISTS call_logs (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  caseId       CHAR(36)      NOT NULL,
  userId      CHAR(36)      NOT NULL,
  date         DATETIME(3)   NOT NULL,
  duration     INT           NOT NULL COMMENT 'Duración en minutos',
  result       VARCHAR(100)  NOT NULL,
  observations TEXT          NULL,
  createdAt    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_calllogs_case
    FOREIGN KEY (caseId) REFERENCES cases(id),

  CONSTRAINT fk_calllogs_user
    FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── status_history ───────────────────────────────────────────
-- Historial de cada cambio de estado en un caso.
-- previousStatus NULL indica la creación inicial.
-- Obligatorio para trazabilidad y auditoría.

CREATE TABLE IF NOT EXISTS status_history (
  id             CHAR(36)  NOT NULL PRIMARY KEY,
  caseId         CHAR(36)  NOT NULL,
  previousStatus ENUM(
                   'nuevo',
                   'pendiente_llamada',
                   'contactado',
                   'no_contesta',
                   'seguimiento',
                   'cerrado'
                 )         NULL,
  newStatus      ENUM(
                   'nuevo',
                   'pendiente_llamada',
                   'contactado',
                   'no_contesta',
                   'seguimiento',
                   'cerrado'
                 )         NOT NULL,
  userId        CHAR(36)  NOT NULL,
  createdAt      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_statushistory_case
    FOREIGN KEY (caseId) REFERENCES cases(id),

  CONSTRAINT fk_statushistory_user
    FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── audit_logs ───────────────────────────────────────────────
-- Log centralizado de todas las operaciones del sistema.
-- action: CREATE | UPDATE | DELETE | ACTIVATE | DEACTIVATE | LOGIN | CONVERT_LEAD | UPDATE_STATUS
-- entity: user | lead | client | case | call_log
-- details: JSON como texto con contexto de la operación.

CREATE TABLE IF NOT EXISTS audit_logs (
  id        CHAR(36)      NOT NULL PRIMARY KEY,
  userId   CHAR(36)      NULL,
  action    VARCHAR(50)   NOT NULL,
  entity    VARCHAR(50)   NOT NULL,
  entityId  CHAR(36)      NULL,
  details   TEXT          NULL COMMENT 'JSON serializado',
  createdAt DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_auditlogs_user
    FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  ÍNDICES (mejoran consultas frecuentes del CRM)
-- ============================================================

CREATE INDEX idx_leads_phone           ON leads(phone);
CREATE INDEX idx_leads_status          ON leads(status);
CREATE INDEX idx_leads_assignedUser    ON leads(assignedUserId);
CREATE INDEX idx_leads_externalId      ON leads(externalId);

CREATE INDEX idx_cases_client          ON cases(clientId);
CREATE INDEX idx_cases_status          ON cases(status);

CREATE INDEX idx_calllogs_case         ON call_logs(caseId);
CREATE INDEX idx_calllogs_user         ON call_logs(userId);

CREATE INDEX idx_statushistory_case    ON status_history(caseId);

CREATE INDEX idx_auditlogs_entity      ON audit_logs(entity, entityId);
CREATE INDEX idx_auditlogs_user        ON audit_logs(userId);
CREATE INDEX idx_auditlogs_created     ON audit_logs(createdAt);


-- ============================================================
--  DATOS SEED — Fuentes de leads
-- ============================================================

INSERT INTO lead_sources (id, name, description) VALUES
  (UUID(), 'Zapier',    'Leads automáticos desde Zapier'),
  (UUID(), 'n8n',       'Leads automáticos desde n8n'),
  (UUID(), 'Web',       'Formulario de contacto web'),
  (UUID(), 'Teléfono',  'Llamada directa al call center');


-- ============================================================
--  DATOS SEED — Usuarios de prueba
--  Las contraseñas son hashes bcrypt (cost 10).
--
--    admin@crm.local   →  admin123
--    maria@crm.local   →  asesora123
--    laura@crm.local   →  asesora123
--    ana@crm.local     →  asesora123
--    sara@crm.local    →  asesora123
--
--  Los hashes de abajo son válidos y generados con bcryptjs.
-- ============================================================

INSERT INTO users (id, email, password, name, role, isActive) VALUES
  (UUID(), 'admin@crm.local', '$2b$10$.rl/KSgLia.kDrnBOiNehejYMzVIXTnrew4cw1xerBSsGih1fRoLy', 'Admin Principal', 'admin',   1),
  (UUID(), 'maria@crm.local', '$2b$10$6R7Hs.wK8kuzMuzW3yWNfOAJYdgu9d0KdN5pAsZKebwxzJC7xllLa', 'María García',    'asesora', 1),
  (UUID(), 'laura@crm.local', '$2b$10$6R7Hs.wK8kuzMuzW3yWNfOAJYdgu9d0KdN5pAsZKebwxzJC7xllLa', 'Laura López',     'asesora', 1),
  (UUID(), 'ana@crm.local',   '$2b$10$6R7Hs.wK8kuzMuzW3yWNfOAJYdgu9d0KdN5pAsZKebwxzJC7xllLa', 'Ana Martínez',    'asesora', 1),
  (UUID(), 'sara@crm.local',  '$2b$10$6R7Hs.wK8kuzMuzW3yWNfOAJYdgu9d0KdN5pAsZKebwxzJC7xllLa', 'Sara Rodríguez',  'asesora', 1);


-- ============================================================
--  DATOS DE PRUEBA — Lead de ejemplo (entrada tipo Zapier)
-- ============================================================

-- Este INSERT simula un lead llegando desde Zapier.
-- El assignedUserId se debe poner manualmente aquí para pruebas;
-- en producción lo asigna el backend automáticamente (round-robin).

INSERT INTO leads (id, name, phone, email, sourceId, status, assignedUserId, assignedAt, externalId, createdAt, updatedAt)
SELECT
  UUID(),
  'Juan Pérez',
  '5512345678',
  'juan@ejemplo.com',
  ls.id,
  'nuevo',
  u.id,
  NOW(3),
  'ext-zapier-001',
  NOW(3),
  NOW(3)
FROM lead_sources ls
JOIN users u ON u.email = 'maria@crm.local'
WHERE ls.name = 'Zapier';


-- ============================================================
--  VERIFICACIÓN rápida
-- ============================================================

SELECT '── Usuarios ──' AS seccion, COUNT(*) AS total FROM users;
SELECT '── Fuentes   ──' AS seccion, COUNT(*) AS total FROM lead_sources;
SELECT '── Leads     ──' AS seccion, COUNT(*) AS total FROM leads;
