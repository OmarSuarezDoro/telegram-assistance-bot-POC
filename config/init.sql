-- =========================================
-- EXTENSIONES
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================

DO $$ BEGIN
    CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'cancelled', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================================
-- TABLA: tasks
-- =========================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    chat_id BIGINT NOT NULL,
    text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_chat_id
ON tasks(chat_id);

-- =========================================
-- TABLA: reminders
-- =========================================

CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    chat_id BIGINT NOT NULL,
    text TEXT NOT NULL,

    scheduled_for TIMESTAMPTZ NOT NULL,

    status reminder_status NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reminders_due
ON reminders(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_reminders_chat_id
ON reminders(chat_id);