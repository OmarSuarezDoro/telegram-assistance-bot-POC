/**
 * Polls due reminders and delivers them through Telegram.
 * @author noexdev
 * @version 1.0.0
 */
import { bot } from '../bot/TelegramBot.js';
import { reminderRepository, type Reminder } from './reminders.repository.js';

export class ReminderNotifier {
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Creates a reminder notifier with polling configuration.
   *
   * @param intervalMs - Milliseconds between polling cycles.
   * @param batchSize - Maximum number of reminders to process per cycle.
   */
  constructor(
    intervalMs = Number(process.env.REMINDER_POLL_INTERVAL_MS ?? 30_000),
    batchSize = Number(process.env.REMINDER_POLL_BATCH_SIZE ?? 50),
  ) {
    this.intervalMs = intervalMs;
    this.batchSize = batchSize;
  }

  /**
   * Starts the reminder polling loop if it is not already running.
   *
   * @returns Nothing.
   */
  start(): void {
    if (this.timer) {
      return;
    }

    void this.processDueReminders();

    this.timer = setInterval(() => {
      void this.processDueReminders();
    }, this.intervalMs);
  }

  /**
   * Stops the reminder polling loop.
   *
   * @returns Nothing.
   */
  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Looks for due reminders and delivers them in batches.
   *
   * @returns A promise that resolves when the current polling cycle ends.
   */
  private async processDueReminders(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (true) {
        const dueReminders = await reminderRepository.findPendingDue(this.batchSize);

        if (dueReminders.length === 0) {
          return;
        }

        for (const reminder of dueReminders) {
          await this.deliverReminder(reminder);
        }

        if (dueReminders.length < this.batchSize) {
          return;
        }
      }
    } catch (error) {
      console.error('Reminder notifier failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sends one reminder through Telegram and stores the delivery outcome.
   *
   * @param reminder - Reminder to deliver.
   * @returns A promise that resolves when delivery has been processed.
   */
  private async deliverReminder(reminder: Reminder): Promise<void> {
    try {
      await bot.sendMessage(reminder.chatId, this.buildReminderMessage(reminder));
      await reminderRepository.markAsSent(reminder.id);
    } catch (error) {
      console.error(`Failed to deliver reminder ${reminder.id}:`, error);
      await reminderRepository.markAsFailed(reminder.id);
    }
  }

  /**
   * Builds the Telegram text shown when a reminder becomes due.
   *
   * @param reminder - Reminder to render as text.
   * @returns The message sent to the user.
   */
  private buildReminderMessage(reminder: Reminder): string {
    return [
      'Recordatorio',
      reminder.text,
      `Programado para: ${reminder.scheduledFor.toLocaleString('es-ES')}`,
    ].join('\n');
  }
}

export const reminderNotifier = new ReminderNotifier();
