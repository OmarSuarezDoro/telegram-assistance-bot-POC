/**
 * Parses Telegram voice messages into command objects.
 * @author noexdev
 * @version 1.0.0
 */
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { execFile } from 'child_process';
import { mkdir, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { bot } from '../../bot/TelegramBot.js';

import { InputParser } from './InputParser.js';
import type { AIResult } from './InputParser.js';

/**
 * Handles audio-based user input and converts it into an intent plus arguments.
 */
export class AudioInputParser extends InputParser {
  /**
   * Orchestrates the full audio parsing flow from Telegram message to parsed command.
   *
   * @param msg - The incoming Telegram message containing a voice note.
   * @returns A parsed command object with an intent and its arguments.
   */
  async getCommand(msg: any): Promise<AIResult> {
    const { fileId, chatId } = this.extractAudioMetadata(msg);
    let audioPath: string | undefined;

    await this.notifyProcessing(chatId);

    try {
      audioPath = await this.downloadAudio(fileId);
      const text = await this.transcribeAudio(audioPath);
      return await this.sendToAI(text);
    } catch (error) {
      console.error(error);
      await this.notifyProcessingError(chatId);

      return {
        intent: 'unknown',
        args: { rawText: '' },
      };
    } finally {
      await this.removeAudioFile(audioPath);
    }
  }

  /**
   * Extracts the minimal metadata required to process an audio message.
   *
   * @param msg - The incoming Telegram message.
   * @returns The voice file identifier and the chat identifier.
   */
  private extractAudioMetadata(msg: any): { fileId: string, chatId: number } {
    return {
      fileId: msg.voice.file_id,
      chatId: msg.chat.id,
    };
  }

  /**
   * Notifies the user that audio processing has started.
   *
   * @param chatId - The Telegram chat identifier.
   */
  private async notifyProcessing(chatId: number): Promise<void> {
    await bot.sendMessage(chatId, 'Procesando tu mensaje de voz...');
  }

  /**
   * Downloads the remote Telegram audio file and stores it locally.
   *
   * @param fileId - The Telegram file identifier for the voice message.
   * @returns The local path where the audio file was saved.
   */
  private async downloadAudio(fileId: string): Promise<string> {
    const fileLink = await bot.getFileLink(fileId);
    const audioPath = this.buildAudioPath();

    await mkdir(path.dirname(audioPath), { recursive: true });

    const response = await axios({
      url: fileLink,
      method: 'GET',
      responseType: 'stream',
    });

    await pipeline(response.data, fs.createWriteStream(audioPath));

    return audioPath;
  }

  /**
   * Builds a unique local path for a temporary audio file.
   *
   * @returns A relative file path for the downloaded audio.
   */
  private buildAudioPath(): string {
    return `./audio/audio_${Date.now()}.ogg`;
  }

  /**
   * Runs the transcription worker and returns the recognized text.
   *
   * @param audioPath - The local path to the downloaded audio file.
   * @returns The transcribed text produced by the Python worker.
   */
  private async transcribeAudio(audioPath: string): Promise<string> {
    const commands = this.getPythonCommands(audioPath);
    let lastError: unknown;

    for (const { command, args } of commands) {
      try {
        return await this.runTranscriptionCommand(command, args);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No Python interpreter available for audio transcription.');
  }

  /**
   * Builds the list of Python commands to try depending on the current platform.
   */
  private getPythonCommands(audioPath: string): Array<{ command: string, args: string[] }> {
    const scriptPath = './pworker/transcribe.py';
    const configuredBinary = process.env.PYTHON_BIN;

    if (configuredBinary) {
      return [{ command: configuredBinary, args: [scriptPath, audioPath] }];
    }

    if (process.platform === 'win32') {
      return [
        { command: 'py', args: ['-3', scriptPath, audioPath] },
        { command: 'python', args: [scriptPath, audioPath] },
        { command: 'python3', args: [scriptPath, audioPath] },
      ];
    }

    return [
      { command: 'python3', args: [scriptPath, audioPath] },
      { command: 'python', args: [scriptPath, audioPath] },
    ];
  }

  /**
   * Executes a single transcription command candidate.
   */
  private async runTranscriptionCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(command, args, {
        encoding: 'utf8',
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
        },
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }

        resolve(stdout.trim());
      });
    });
  }

  /**
   * Notifies the user that audio processing failed.
   *
   * @param chatId - The Telegram chat identifier.
   */
  private async notifyProcessingError(chatId: number): Promise<void> {
    await bot.sendMessage(chatId, 'Error procesando audio');
  }

  /**
   * Deletes the temporary local audio file when it exists.
   *
   * @param audioPath - The local file path to remove.
   */
  private async removeAudioFile(audioPath?: string): Promise<void> {
    if (!audioPath) {
      return;
    }

    try {
      await unlink(audioPath);
    } catch (error) {
      console.error(error);
    }
  }
}

export const audioInputParser = new AudioInputParser();
