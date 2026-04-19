/**
 * Handles reminder use cases for the application.
 * @author noexdev
 * @version 1.0.0
 */
import { reminderRepository } from './reminders.repository.js';
import { parseNaturalDate } from '../bot/NaturalDateParser.js';
import type { CreateReminderInput, DeleteReminderInput, ListRemindersInput, UpdateReminderInput } from './reminders.types.js';

export class ReminderService {
  /**
   * Creates a reminder after validating its text and datetime.
   *
   * @param input - Reminder data received from the command layer.
   * @returns The newly created reminder.
   */
  async create(input: CreateReminderInput) {
    const text = input.text?.trim();
    const datetime = input.datetime?.trim();

    if (!text) throw new Error('Reminder text is required');
    if (!datetime) throw new Error('Reminder datetime is required');
    const scheduledFor = parseNaturalDate(datetime);

    if (!scheduledFor) throw new Error('Reminder datetime is invalid');
    if (scheduledFor.getTime() <= Date.now()) throw new Error('Reminder datetime must be in the future');

    return reminderRepository.create({
      chatId: input.chatId,
      text,
      scheduledFor,
    });
  }

  /**
   * Lists reminders for one chat using the requested filter.
   *
   * @param input - Chat and filter data used to query reminders.
   * @returns The reminders that match the filter.
   */
  async list(input: ListRemindersInput) {
    const filter = input.filter ?? 'all';
    return reminderRepository.listByChatIdAndFilter(input.chatId, filter);
  }

  /**
   * Deletes one reminder by id or by matching text.
   *
   * @param input - Reminder selector data for the deletion request.
   * @returns The reminder that was cancelled.
   */
  async delete(input: DeleteReminderInput) {
    if (input.id?.trim()) {
      const deleted = await reminderRepository.cancelById(input.id.trim(), input.chatId);
      if (!deleted) throw new Error('Reminder not found');
      return deleted;
    }

    if (input.text?.trim()) {
      const deleted = await reminderRepository.cancelFirstByText(
        input.chatId,
        input.text.trim()
      );

      if (!deleted) throw new Error('Reminder not found');
      return deleted;
    }
    throw new Error('Reminder id or text is required');
  }

  /**
   * Updates the text and/or datetime of an existing reminder.
   *
   * @param input - Reminder update data received from the command layer.
   * @returns The updated reminder.
   */
  async update(input: UpdateReminderInput) {
    const id = input.id?.trim();
    const newText = input.newText?.trim();
    const newDatetime = input.newDatetime?.trim();

    if (!id) throw new Error('Reminder id is required');
    if (!newText && !newDatetime) throw new Error('At least one field to update is required');
  
    let newScheduledFor: Date | undefined;

    if (newDatetime) {
      const parsedDate = parseNaturalDate(newDatetime);
      
      if (!parsedDate) throw new Error('New reminder datetime is invalid');
      newScheduledFor = parsedDate;
      if (newScheduledFor.getTime() <= Date.now()) throw new Error('New reminder datetime must be in the future');
    }

    const updated = await reminderRepository.update({
      id,
      chatId: input.chatId,
      ...(newText ? { newText } : {}),
      ...(newScheduledFor ? { newScheduledFor } : {}),
    });

    if (!updated)throw new Error('Reminder not found');
    return updated;
  }
}

export const reminderService = new ReminderService();
