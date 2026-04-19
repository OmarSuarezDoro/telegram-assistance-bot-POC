/**
 * Handles task use cases for the application.
 * @author noexdev
 * @version 1.0.0
 */
import { taskRepository } from './tasks.repository.js';
import type { CreateTaskInput, DeleteTaskInput, ListTasksInput, UpdateTaskInput } from './tasks.types.js';

export class TaskService {
  /**
   * Creates a task after validating its text.
   *
   * @param input - Task data received from the command layer.
   * @returns The newly created task.
   */
  async create(input: CreateTaskInput) {
    const text = input.text?.trim();

    if (!text) throw new Error('Task text is required');

    return taskRepository.create({
      chatId: input.chatId,
      text,
    });
  }

  /**
   * Lists pending tasks for one chat.
   *
   * @param input - Chat data used to query tasks.
   * @returns The pending tasks for the given chat.
   */
  async list(input: ListTasksInput) {
    return taskRepository.listByChatId(input.chatId);
  }

  /**
   * Deletes one task by id or by matching text.
   *
   * @param input - Task selector data for the deletion request.
   * @returns The task that was deleted.
   */
  async delete(input: DeleteTaskInput) {
    if (input.id?.trim()) {
      const deleted = await taskRepository.deleteById(input.id.trim(), input.chatId);
      if (!deleted) throw new Error('Task not found');
      return deleted;
    }

    if (input.text?.trim()) {
      const deleted = await taskRepository.deleteFirstByText(
        input.chatId,
        input.text.trim()
      );

      if (!deleted) throw new Error('Task not found');
      return deleted;
    }

    throw new Error('Task id or text is required');
  }

  /**
   * Deletes every pending task that belongs to one chat.
   *
   * @param input - Chat data used to delete pending tasks.
   * @returns The tasks that were deleted.
   */
  async deleteAllPending(input: { chatId: number }) {
    const deletedTasks = await taskRepository.deleteAllPending(input.chatId);
    return deletedTasks;
  }

  /**
   * Updates the text of one existing task.
   *
   * @param input - Task update data received from the command layer.
   * @returns The updated task.
   */
  async update(input: UpdateTaskInput) {
    const id = input.id?.trim();
    const newText = input.newText?.trim();

    if (!id) throw new Error('Task id is required');
    if (!newText) throw new Error('New task text is required');

    const updated = await taskRepository.update({
      id,
      chatId: input.chatId,
      newText,
    });

    if (!updated) throw new Error('Task not found');
    return updated;
  }
}

export const taskService = new TaskService();
