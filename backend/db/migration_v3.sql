-- ============================================================
--  CRM MINI — Migración v3: Notas / Bitácora de Caso
--  Ejecutar sobre la BD crm_mini existente (MySQL 8.0+)
-- ============================================================

USE crm_mini;

CREATE TABLE case_notes (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  caseId           CHAR(36)     NOT NULL,
  userId          CHAR(36)     NOT NULL,
  role             ENUM('admin','supervisor','asesora') NOT NULL,
  managementType   ENUM('llamada_realizada','no_contesta','numero_equivocado','cliente_interesado','cliente_no_interesado','reagendar','seguimiento','cierre_de_caso','observacion_interna') NOT NULL,
  content          TEXT         NOT NULL,
  statusSnapshot   VARCHAR(30)  NOT NULL,
  nextFollowUpDate DATETIME(3)  NULL,
  createdAt        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  annulledAt       DATETIME(3)  NULL,

  CONSTRAINT fk_casenotes_case FOREIGN KEY (caseId)  REFERENCES cases(id),
  CONSTRAINT fk_casenotes_user FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificación
SELECT 'Migración v3 completada' AS resultado;
