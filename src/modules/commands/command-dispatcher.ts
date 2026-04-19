/**
 * Dispatches parsed intents to the corresponding command handlers.
 * @author noexdev
 * @version 1.0.0
 */
import type {
  CancelIntent,
  CreateReminderIntent,
  CreateTaskIntent,
  DeleteAllTasksIntent,
  DeleteReminderIntent,
  DeleteTaskIntent,
  HelpIntent,
  Intent,
  ListRemindersIntent,
  ListTasksIntent,
  StartIntent,
  UnknownIntent,
  UpdateReminderIntent,
} from './intents.types.js';
import { reminderService } from '../reminders/reminders.service.js';
import { taskService } from '../tasks/tasks.service.js';

export type ParsedCommand = {
  intent: string;
  args: Record<string, unknown>;
};

export type CommandDispatchContext = {
  chatId: number;
};

type CommandHandler = (
  command: Intent,
  context: CommandDispatchContext,
) => Promise<string | string[] | void>;

const knownIntents: Intent['intent'][] = [
  'create_reminder',
  'list_reminders',
  'delete_reminder',
  'update_reminder',
  'create_task',
  'list_tasks',
  'delete_task',
  'delete_all_tasks',
  'cancel',
  'help',
  'start',
  'unknown',
];

/**
 * Handles the creation of a reminder command.
 *
 * @param command - Parsed reminder creation intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleCreateReminder(command: CreateReminderIntent, context: CommandDispatchContext): Promise<string> {
  const reminder = await reminderService.create({
    chatId: context.chatId,
    text: command.text,
    ...(command.datetime ? { datetime: command.datetime } : {}),
  });

  return `He guardado tu recordatorio para ${formatDate(reminder.scheduledFor)}.`;
}

/**
 * Handles the listing of reminders for one chat.
 *
 * @param command - Parsed reminder listing intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing reminder list message.
 */
async function handleListReminders(command: ListRemindersIntent, context: CommandDispatchContext): Promise<string> {
  const reminders = await reminderService.list({
    chatId: context.chatId,
    ...(command.filter ? { filter: command.filter } : {}),
  });

  if (reminders.length === 0) {
    return 'No tienes recordatorios pendientes.';
  }

  const lines = reminders.map((reminder) => (
    `- ${reminder.text} (${formatDate(reminder.scheduledFor)})`
  ));

  return ['Tus recordatorios:', ...lines].join('\n');
}

/**
 * Handles the deletion of a reminder.
 *
 * @param command - Parsed reminder deletion intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleDeleteReminder(command: DeleteReminderIntent, context: CommandDispatchContext): Promise<string> {
  const reminder = await reminderService.delete({
    chatId: context.chatId,
    ...(command.id ? { id: command.id } : {}),
    ...(command.text ? { text: command.text } : {}),
  });

  return `Recordatorio cancelado: ${reminder.text}`;
}

/**
 * Handles the update of a reminder.
 *
 * @param command - Parsed reminder update intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleUpdateReminder(command: UpdateReminderIntent, context: CommandDispatchContext): Promise<string> {
  const reminder = await reminderService.update({
    chatId: context.chatId,
    ...(command.id ? { id: command.id } : {}),
    ...(command.newText ? { newText: command.newText } : {}),
    ...(command.newDatetime ? { newDatetime: command.newDatetime } : {}),
  });

  return `He actualizado el recordatorio: ${reminder.text} (${formatDate(reminder.scheduledFor)}).`;
}

/**
 * Handles the creation of a task.
 *
 * @param command - Parsed task creation intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleCreateTask(command: CreateTaskIntent, context: CommandDispatchContext): Promise<string> {
  const task = await taskService.create({
    chatId: context.chatId,
    text: command.text,
  });

  return `He guardado la tarea: ${task.text}.`;
}

/**
 * Handles the listing of pending tasks.
 *
 * @param command - Parsed task listing intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing task list message.
 */
async function handleListTasks(command: ListTasksIntent, context: CommandDispatchContext): Promise<string> {
  const tasks = await taskService.list({
    chatId: context.chatId,
  });

  if (tasks.length === 0) {
    return 'No tienes tareas pendientes.';
  }

  const lines = tasks.map((task) => `- ${task.text}`);
  return ['Tus tareas:', ...lines].join('\n');
}

/**
 * Handles the deletion of one task.
 *
 * @param command - Parsed task deletion intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleDeleteTask(command: DeleteTaskIntent, context: CommandDispatchContext): Promise<string> {
  const task = await taskService.delete({
    chatId: context.chatId,
    ...(command.id ? { id: command.id } : {}),
    ...(command.text ? { text: command.text } : {}),
  });

  return `Tarea borrada: ${task.text}`;
}

/**
 * Handles the deletion of every pending task for one chat.
 *
 * @param command - Parsed bulk task deletion intent.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleDeleteAllTasks(command: DeleteAllTasksIntent, context: CommandDispatchContext): Promise<string> {
  const deletedTasks = await taskService.deleteAllPending({
    chatId: context.chatId,
  });

  if (deletedTasks.length === 0) return 'No había tareas pendientes para borrar.';

  return `He borrado ${deletedTasks.length} tarea(s) pendiente(s).`;
}

/**
 * Handles a cancel command.
 *
 * @param _command - Parsed cancel intent.
 * @param _context - Runtime context for the current chat.
 * @returns The user-facing confirmation message.
 */
async function handleCancel(_command: CancelIntent, _context: CommandDispatchContext): Promise<string> {
  return 'Acción cancelada.';
}

/**
 * Handles a help command.
 *
 * @param _command - Parsed help intent.
 * @param _context - Runtime context for the current chat.
 * @returns The user-facing help message.
 */
async function handleHelp(_command: HelpIntent, _context: CommandDispatchContext): Promise<string> {
  return [
    'Comandos disponibles:',
    '- Crear recordatorios',
    '- Listar recordatorios',
    '- Borrar recordatorios',
    '- Actualizar recordatorios',
    '- Crear tareas',
    '- Listar tareas',
    '- Borrar tareas',
    '- Borrar todas las tareas pendientes',
  ].join('\n');
}

/**
 * Handles a start command.
 *
 * @param _command - Parsed start intent.
 * @param _context - Runtime context for the current chat.
 * @returns The user-facing welcome message.
 */
async function handleStart(_command: StartIntent, _context: CommandDispatchContext): Promise<string> {
  return 'Hola. Dime qué quieres hacer y lo intento convertir en una acción.';
}

/**
 * Handles commands that could not be classified reliably.
 *
 * @param command - Parsed unknown intent.
 * @param _context - Runtime context for the current chat.
 * @returns The user-facing fallback message.
 */
async function handleUnknown(command: UnknownIntent, _context: CommandDispatchContext): Promise<string> {
  if (command.rawText) {
    return `No he entendido el comando: "${command.rawText}"`;
  }

  return 'No he entendido ese comando.';
}

const handlers: Partial<Record<Intent['intent'], CommandHandler>> = {
  create_reminder: (command, context) => handleCreateReminder(command as CreateReminderIntent, context),
  list_reminders: (command, context) => handleListReminders(command as ListRemindersIntent, context),
  delete_reminder: (command, context) => handleDeleteReminder(command as DeleteReminderIntent, context),
  update_reminder: (command, context) => handleUpdateReminder(command as UpdateReminderIntent, context),
  create_task: (command, context) => handleCreateTask(command as CreateTaskIntent, context),
  list_tasks: (command, context) => handleListTasks(command as ListTasksIntent, context),
  delete_task: (command, context) => handleDeleteTask(command as DeleteTaskIntent, context),
  delete_all_tasks: (command, context) => handleDeleteAllTasks(command as DeleteAllTasksIntent, context),
  cancel: (command, context) => handleCancel(command as CancelIntent, context),
  help: (command, context) => handleHelp(command as HelpIntent, context),
  start: (command, context) => handleStart(command as StartIntent, context),
  unknown: (command, context) => handleUnknown(command as UnknownIntent, context),
};

/**
 * Dispatches a parsed command to the matching application handler.
 *
 * @param parsedCommand - Parsed command received from the input parser.
 * @param context - Runtime context for the current chat.
 * @returns The user-facing replies generated by the matched handler.
 */
export async function dispatchCommand(
  parsedCommand: ParsedCommand,
  context: CommandDispatchContext,
): Promise<string[]> {
  const command = toIntent(parsedCommand);
  const handler = handlers[command.intent] ?? handlers.unknown;

  if (!handler) {
    return ['No hay ningún manejador configurado para este comando.'];
  }

  const result = await handler(command, context);

  if (!result) {
    return [];
  }

  return Array.isArray(result) ? result : [result];
}

/**
 * Converts the parser output into the command shape used by the dispatcher.
 *
 * @param parsedCommand - Parsed command received from the input parser.
 * @returns The command normalized to a supported intent shape.
 */
function toIntent(parsedCommand: ParsedCommand): Intent {
  const intent = isKnownIntent(parsedCommand.intent)
    ? parsedCommand.intent
    : 'unknown';

  return {
    intent,
    ...parsedCommand.args,
  } as Intent;
}

/**
 * Checks whether an incoming intent is supported by the dispatcher.
 *
 * @param intent - Intent name returned by the parser.
 * @returns True when the intent is supported by the dispatcher.
 */
function isKnownIntent(intent: string): intent is Intent['intent'] {
  return knownIntents.includes(intent as Intent['intent']);
}

/**
 * Formats reminder dates in a compact, readable way for Telegram replies.
 *
 * @param date - Reminder date to format.
 * @returns The localized string representation of the date.
 */
function formatDate(date: Date): string {
  return date.toLocaleString('es-ES');
}
