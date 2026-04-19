/**
 * Parses plain text messages into command objects.
 * @author noexdev
 * @version 1.0.0
 */
import { InputParser } from './InputParser.js';
import type { AIResult } from './InputParser.js';

/**
 * Handles text-based user input and converts it into an intent plus arguments.
 */
export class TextInputParser extends InputParser {
  /**
   * Parses a text message into a command object.
   *
   * @param msg - The incoming Telegram message containing text.
   * @returns A promise that resolves to the parsed command.
   */
  async getCommand(msg: any): Promise<AIResult> {
    return await this.sendToAI(msg.text);
  }
}

export const textInputParser = new TextInputParser();
