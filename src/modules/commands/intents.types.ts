/**
 * Declares the intent types supported by the command dispatcher.
 * @author noexdev
 * @version 1.0.0
 */
export type BaseIntent = {
  intent: string;
  confidence?: number;
};

export type CreateReminderIntent = {
  intent: "create_reminder";
  text: string;          
  datetime?: string;     
};

export type ListRemindersIntent = {
  intent: "list_reminders";
  filter?: "today" | "all" | "upcoming";
};

export type DeleteReminderIntent = {
  intent: "delete_reminder";
  id?: string;           
  text?: string;         
};

export type UpdateReminderIntent = {
  intent: "update_reminder";
  id?: string;
  newText?: string;
  newDatetime?: string;
};

export type CreateTaskIntent = {
  intent: "create_task";
  text: string;
};

export type ListTasksIntent = {
  intent: "list_tasks";
};

export type DeleteTaskIntent = {
  intent: "delete_task";
  id?: string;           
  text?: string;         
};

export type DeleteAllTasksIntent = {
  intent: "delete_all_tasks";
};

export type CancelIntent = {
  intent: "cancel";
};

export type HelpIntent = {
  intent: "help";
};

export type StartIntent = {
  intent: "start";
};

export type UnknownIntent = {
  intent: "unknown";
  rawText?: string;
};

export type Intent =
  | CreateReminderIntent
  | ListRemindersIntent
  | DeleteReminderIntent
  | UpdateReminderIntent
  | CreateTaskIntent
  | ListTasksIntent
  | DeleteTaskIntent
  | DeleteAllTasksIntent
  | CancelIntent
  | HelpIntent
  | StartIntent
  | UnknownIntent;
