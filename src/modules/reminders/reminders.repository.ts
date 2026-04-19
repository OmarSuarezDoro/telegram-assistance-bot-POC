/**
 * Persists reminder data and queries reminder records.
 * @author noexdev
 * @version 1.0.0
 */
import { pool } from '../db/postgres.js';

export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

export type Reminder = {
  id: string;
  chatId: number;
  text: string;
  scheduledFor: Date;
  status: ReminderStatus;
  createdAt: Date;
  sentAt: Date | null;
};

export type CreateReminderInput = {
  chatId: number;
  text: string;
  scheduledFor: Date;
};

export type ReminderListFilter = 'today' | 'all' | 'upcoming';

export type UpdateReminderInput = {
  id: string;
  chatId: number;
  newText?: string;
  newScheduledFor?: Date;
};

export class ReminderRepository {
  /**
   * Inserts a new reminder row into the database.
   *
   * @param input - Reminder data to persist.
   * @returns The created reminder row mapped to the domain shape.
   */
  async create(input: CreateReminderInput): Promise<Reminder> {
    const query = `
      INSERT INTO reminders (chat_id, text, scheduled_for)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
    `;

    const values = [input.chatId, input.text, input.scheduledFor];

    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Finds pending reminders whose scheduled time has already arrived.
   *
   * @param limit - Maximum number of reminders to return.
   * @returns The due reminders ordered by scheduled date.
   */
  async findPendingDue(limit = 50): Promise<Reminder[]> {
    const query = `
      SELECT
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
      FROM reminders
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Marks one reminder as sent and stores the delivery timestamp.
   *
   * @param id - Reminder identifier.
   * @returns A promise that resolves when the reminder is updated.
   */
  async markAsSent(id: string): Promise<void> {
    const query = `
      UPDATE reminders
      SET status = 'sent',
          sent_at = NOW()
      WHERE id = $1
    `;

    await pool.query(query, [id]);
  }

  /**
   * Marks one reminder as failed.
   *
   * @param id - Reminder identifier.
   * @returns A promise that resolves when the reminder is updated.
   */
  async markAsFailed(id: string): Promise<void> {
    const query = `
      UPDATE reminders
      SET status = 'failed'
      WHERE id = $1
    `;

    await pool.query(query, [id]);
  }

  /**
   * Lists every reminder that belongs to one chat.
   *
   * @param chatId - Telegram chat identifier.
   * @returns The reminders ordered by scheduled date.
   */
  async listByChatId(chatId: number): Promise<Reminder[]> {
    const query = `
      SELECT
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
      FROM reminders
      WHERE chat_id = $1
      ORDER BY scheduled_for ASC
    `;

    const result = await pool.query(query, [chatId]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Lists pending reminders for one chat using a predefined filter.
   *
   * @param chatId - Telegram chat identifier.
   * @param filter - Reminder filter to apply.
   * @returns The reminders that match the requested filter.
   */
  async listByChatIdAndFilter(chatId: number, filter: ReminderListFilter): Promise<Reminder[]> {
    const query = `
      SELECT
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
      FROM reminders
      WHERE chat_id = $1
        AND status = 'pending'
        AND (
          $2 = 'all'
          OR ($2 = 'today' AND scheduled_for >= date_trunc('day', NOW()) AND scheduled_for < date_trunc('day', NOW()) + INTERVAL '1 day')
          OR ($2 = 'upcoming' AND scheduled_for > NOW())
        )
      ORDER BY scheduled_for ASC
    `;

    const result = await pool.query(query, [chatId, filter]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Cancels one pending reminder selected by id.
   *
   * @param id - Reminder identifier.
   * @param chatId - Telegram chat identifier.
   * @returns The cancelled reminder or null when it does not exist.
   */
  async cancelById(id: string, chatId: number): Promise<Reminder | null> {
    const query = `
      UPDATE reminders
      SET status = 'cancelled'
      WHERE id = $1
        AND chat_id = $2
        AND status = 'pending'
      RETURNING
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
    `;

    const result = await pool.query(query, [id, chatId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Cancels the first pending reminder that matches the provided text.
   *
   * @param chatId - Telegram chat identifier.
   * @param text - Text used to search the reminder.
   * @returns The cancelled reminder or null when none matches.
   */
  async cancelFirstByText(chatId: number, text: string): Promise<Reminder | null> {
    const query = `
      WITH candidate AS (
        SELECT id
        FROM reminders
        WHERE chat_id = $1
          AND status = 'pending'
          AND text ILIKE $2
        ORDER BY scheduled_for ASC
        LIMIT 1
      )
      UPDATE reminders
      SET status = 'cancelled'
      WHERE id IN (SELECT id FROM candidate)
      RETURNING
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
    `;

    const result = await pool.query(query, [chatId, `%${text}%`]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Updates a pending reminder with new text and/or datetime values.
   *
   * @param input - Reminder update data to persist.
   * @returns The updated reminder or null when it does not exist.
   */
  async update(input: UpdateReminderInput): Promise<Reminder | null> {
    const query = `
      UPDATE reminders
      SET text = COALESCE($3, text),
          scheduled_for = COALESCE($4, scheduled_for)
      WHERE id = $1
        AND chat_id = $2
        AND status = 'pending'
      RETURNING
        id,
        chat_id,
        text,
        scheduled_for,
        status,
        created_at,
        sent_at
    `;

    const values = [
      input.id,
      input.chatId,
      input.newText ?? null,
      input.newScheduledFor ?? null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Maps one database row to the reminder domain shape.
   *
   * @param row - Raw row returned by PostgreSQL.
   * @returns The mapped reminder entity.
   */
  private mapRow(row: any): Reminder {
    return {
      id: row.id,
      chatId: Number(row.chat_id),
      text: row.text,
      scheduledFor: new Date(row.scheduled_for),
      status: row.status,
      createdAt: new Date(row.created_at),
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
    };
  }
}

export const reminderRepository = new ReminderRepository();
