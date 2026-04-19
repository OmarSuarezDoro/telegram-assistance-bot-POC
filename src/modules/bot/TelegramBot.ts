/**
 * Creates and exports the configured Telegram bot instance.
 * @author noexdev
 * @version 1.0.0
 */
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

const token = process.env.TELEGRAM_API ?? '';
export const bot = new TelegramBot(token, { polling: true });
