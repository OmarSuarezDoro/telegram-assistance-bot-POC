/**
 * Declares the input types used by the reminder module.
 * @author noexdev
 * @version 1.0.0
 */
export type CreateReminderInput = {
  chatId: number;
  text?: string;
  datetime?: string;
};

export type ListRemindersInput = {
  chatId: number;
  filter?: 'today' | 'all' | 'upcoming';
};

export type DeleteReminderInput = {
  chatId: number;
  id?: string;
  text?: string;
};

export type UpdateReminderInput = {
  chatId: number;
  id?: string;
  newText?: string;
  newDatetime?: string;
};
