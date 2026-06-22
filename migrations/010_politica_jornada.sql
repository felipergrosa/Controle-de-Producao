-- Migration 008: Política de Jornada de Trabalho (Inteligência Operacional)
-- Cria tabela configurável de horários e dias de trabalho por vigência

CREATE TABLE IF NOT EXISTS `politica_jornada` (
  `id`                  int AUTO_INCREMENT NOT NULL,
  `descricao`           varchar(255) NOT NULL DEFAULT 'Política Padrão',
  `segunda`             boolean NOT NULL DEFAULT true,
  `terca`               boolean NOT NULL DEFAULT true,
  `quarta`              boolean NOT NULL DEFAULT true,
  `quinta`              boolean NOT NULL DEFAULT true,
  `sexta`               boolean NOT NULL DEFAULT true,
  `sabado`              boolean NOT NULL DEFAULT false,
  `domingo`             boolean NOT NULL DEFAULT false,
  `manha_inicio`        varchar(8) NOT NULL DEFAULT '07:30',
  `manha_fim`           varchar(8) NOT NULL DEFAULT '12:00',
  `tarde_inicio`        varchar(8) NOT NULL DEFAULT '13:00',
  `tarde_fim_seg_qui`   varchar(8) NOT NULL DEFAULT '17:30',
  `tarde_fim_sex`       varchar(8) NOT NULL DEFAULT '16:30',
  `custo_hora_reais`    decimal(10,2) DEFAULT NULL,
  `vigencia_inicio`     date NOT NULL,
  `vigencia_fim`        date DEFAULT NULL,
  `ativo`               boolean NOT NULL DEFAULT true,
  `created_at`          timestamp NOT NULL DEFAULT (now()),
  `updated_at`          timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `politica_jornada_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `politica_jornada`
  (`id`, `descricao`, `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado`, `domingo`,
   `manha_inicio`, `manha_fim`, `tarde_inicio`, `tarde_fim_seg_qui`, `tarde_fim_sex`,
   `vigencia_inicio`, `ativo`)
VALUES
  (1, 'Política Padrão Nobre', true, true, true, true, true, false, false,
   '07:30', '12:00', '13:00', '17:30', '16:30',
   '2024-01-01', true)
