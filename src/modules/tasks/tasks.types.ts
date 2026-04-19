/**
 * Declares the input types used by the task module.
 * @author noexdev
 * @version 1.0.0
 */
export type CreateTaskInput = {
  chatId: number;
  text?: string;
};

export type ListTasksInput = {
  chatId: number;
};

export type DeleteTaskInput = {
  chatId: number;
  id?: string;
  text?: string;
};

export type DeleteAllTasksInput = {
  chatId: number;
};

export type UpdateTaskInput = {
  chatId: number;
  id?: string;
  newText?: string;
};
