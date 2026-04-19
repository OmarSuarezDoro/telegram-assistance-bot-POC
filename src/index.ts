/**
 * Boots the Telegram bot, routes incoming messages to the
 * appropriate parser, and replies with the parsed command result.
 * @author noexdev
 * @version 1.0.0
 */
import { bot } from './modules/bot/TelegramBot.js';
import { dispatchCommand } from './modules/commands/command-dispatcher.js';
import { audioInputParser } from './modules/inputs/classes/AudioInputparser.js';
import { textInputParser } from './modules/inputs/classes/TextInputParser.js';
import { reminderNotifier } from './modules/reminders/reminder-notifier.js';
import type { InputParser } from './modules/inputs/classes/InputParser.js';

/**
 * Executes the selected parser, dispatches the command and sends the responses.
 *
 * @param chatId - Telegram chat identifier.
 * @param parser - Parser selected for the current message type.
 * @param msg - Incoming Telegram message.
 * @returns A promise that resolves when the message has been processed.
 */
async function handleMessage(chatId: number, parser: InputParser, msg: any): Promise<void> {
  try {
    const parsedCommand = await parser.getCommand(msg);

    const replies = await dispatchCommand(parsedCommand, { chatId });

    for (const reply of replies) {
      await bot.sendMessage(chatId, reply);
    }
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, (error as Error).message || 'Error procesando mensaje');
  }
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (msg.text) {
    void handleMessage(chatId, textInputParser, msg);
    return;
  }

  if (msg.voice) {
    void handleMessage(chatId, audioInputParser, msg);
    return;
  }

  void bot.sendMessage(chatId, 'No entiendo ese tipo de mensaje');
});

reminderNotifier.start();

console.log('Bot is running...');
