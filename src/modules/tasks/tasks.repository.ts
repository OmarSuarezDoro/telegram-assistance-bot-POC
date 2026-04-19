/**
 * Persists task data and queries task records.
 * @author noexdev
 * @version 1.0.0
 */
import { pool } from '../db/postgres.js';

export type Task = {
  id: string;
  chatId: number;
  text: string;
  createdAt: Date;
  completedAt: Date | null;
};

export type CreateTaskInput = {
  chatId: number;
  text: string;
};

export type UpdateTaskInput = {
  id: string;
  chatId: number;
  newText?: string;
};

export class TaskRepository {
  /**
   * Inserts a new task row into the database.
   *
   * @param input - Task data to persist.
   * @returns The created task row mapped to the domain shape.
   */
  async create(input: CreateTaskInput): Promise<Task> {
    const query = `
      INSERT INTO tasks (chat_id, text)
      VALUES ($1, $2)
      RETURNING
        id,
        chat_id,
        text,
        created_at,
        completed_at
    `;

    const values = [input.chatId, input.text];

    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Lists pending tasks for one chat.
   *
   * @param chatId - Telegram chat identifier.
   * @returns The pending tasks ordered by creation date.
   */
  async listByChatId(chatId: number): Promise<Task[]> {
    const query = `
      SELECT
        id,
        chat_id,
        text,
        created_at,
        completed_at
      FROM tasks
      WHERE chat_id = $1
        AND completed_at IS NULL
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [chatId]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Deletes one pending task selected by id.
   *
   * @param id - Task identifier.
   * @param chatId - Telegram chat identifier.
   * @returns The deleted task or null when it does not exist.
   */
  async deleteById(id: string, chatId: number): Promise<Task | null> {
    const query = `
      DELETE FROM tasks
      WHERE id = $1
        AND chat_id = $2
        AND completed_at IS NULL
      RETURNING
        id,
        chat_id,
        text,
        created_at,
        completed_at
    `;

    const result = await pool.query(query, [id, chatId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Deletes the first pending task that matches the provided text.
   *
   * @param chatId - Telegram chat identifier.
   * @param text - Text used to search the task.
   * @returns The deleted task or null when none matches.
   */
  async deleteFirstByText(chatId: number, text: string): Promise<Task | null> {
    const query = `
      WITH candidate AS (
        SELECT id
        FROM tasks
        WHERE chat_id = $1
          AND completed_at IS NULL
          AND text ILIKE $2
        ORDER BY created_at ASC
        LIMIT 1
      )
      DELETE FROM tasks
      WHERE id IN (SELECT id FROM candidate)
      RETURNING
        id,
        chat_id,
        text,
        created_at,
        completed_at
    `;

    const result = await pool.query(query, [chatId, `%${text}%`]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Deletes every pending task that belongs to one chat.
   *
   * @param chatId - Telegram chat identifier.
   * @returns The deleted tasks.
   */
  async deleteAllPending(chatId: number): Promise<Task[]> {
    const query = `
      DELETE FROM tasks
      WHERE chat_id = $1
        AND completed_at IS NULL
      RETURNING
        id,
        chat_id,
        text,
        created_at,
        completed_at
    `;

    const result = await pool.query(query, [chatId]);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Updates one pending task.
   *
   * @param input - Task update data to persist.
   * @returns The updated task or null when it does not exist.
   */
  async update(input: UpdateTaskInput): Promise<Task | null> {
    const query = `
      UPDATE tasks
      SET text = COALESCE($3, text)
      WHERE id = $1
        AND chat_id = $2
        AND completed_at IS NULL
      RETURNING
        id,
        chat_id,
        text,
        created_at,
        completed_at
    `;

    const values = [
      input.id,
      input.chatId,
      input.newText ?? null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Maps one database row to the task domain shape.
   *
   * @param row - Raw row returned by PostgreSQL.
   * @returns The mapped task entity.
   */
  private mapRow(row: any): Task {
    return {
      id: row.id,
      chatId: Number(row.chat_id),
      text: row.text,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
    };
  }
}

export const taskRepository = new TaskRepository();
