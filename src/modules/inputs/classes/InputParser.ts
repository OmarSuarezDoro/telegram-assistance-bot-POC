/**
 * Declares the shared contract for input parser implementations.
 * @author noexdev
 * @version 1.0.0
 */

import axios from 'axios';
import { readFile } from 'fs/promises';
import path from 'path';

export type AIArgs = Record<string, unknown>;

export type AIResult = {
  intent: string;
  args: AIArgs;
};

/**
 * Defines the behavior required by any input parser implementation.
 */
export abstract class InputParser {
  /**
   * Converts an incoming message into a command object with an intent and arguments.
   *
   * @param msg - The input message received from the client.
   * @returns A promise that resolves to the parsed command.
   */
  abstract getCommand(msg: any): Promise<AIResult>;

  /**
   * Sends user input to a local Ollama instance together with the AI configuration
   * document and expects a structured JSON response.
   *
   * @param userText - Raw user text or any value convertible to string.
   * @returns A normalized object with intent and args.
   */
  async sendToAI(userText: string): Promise<AIResult> {
    const normalizedText = userText?.trim() ?? '';
    const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');

    if (!normalizedText) {
      return this.buildUnknownResult('');
    }

    const configuration = await this.loadAIConfiguration();

    try {
      const response = await axios.post(
        `${ollamaBaseUrl}/api/chat`,
        {
          model: process.env.OLLAMA_MODEL || 'qwen3.5',
          stream: false,
          think: false,
          format: 'json',
          messages: [
            {
              role: 'system',
              content: [
                'Sigue estrictamente el documento de configuración adjunto.',
                'Debes devolver exclusivamente un objeto JSON válido con uno de los intents definidos.',
                'No añadas markdown, explicaciones ni texto fuera del JSON.',
                '',
                configuration,
              ].join('\n'),
            },
            {
              role: 'user',
              content: normalizedText,
            },
          ],
          options: {
            temperature: 0,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120_000,
        }
      );

      return this.parseAIResponse(response.data?.message?.content, normalizedText);
    } catch (error) {
      console.error('AI request failed:', error);
      return this.buildUnknownResult(normalizedText);
    }
  }

  /**
   * Loads the AI configuration markdown file from disk.
   */
  private async loadAIConfiguration(): Promise<string> {
    const configurationPath = path.resolve(process.cwd(), './config/CONFIGURATION_AI.md');
    return readFile(configurationPath, 'utf-8');
  }

  /**
   * Parses the raw model content and normalizes it into the shared AI result shape.
   */
  private parseAIResponse(rawContent: unknown, userText: string): AIResult {
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return this.buildUnknownResult(userText);
    }

    const normalizedContent = this.stripMarkdownFence(rawContent.trim());

    try {
      const parsed = JSON.parse(normalizedContent);
      return this.normalizeAIResult(parsed, userText);
    } catch {
      return this.buildUnknownResult(userText);
    }
  }

  /**
   * Converts the model response into the { intent, args } shape used internally.
   */
  private normalizeAIResult(parsed: unknown, userText: string): AIResult {
    if (!this.isPlainObject(parsed)) {
      return this.buildUnknownResult(userText);
    }

    const intent = typeof parsed.intent === 'string' && parsed.intent.trim()
      ? parsed.intent
      : 'unknown';

    const args: AIArgs = {};

    if (this.isPlainObject(parsed.args)) {
      Object.assign(args, parsed.args);
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (['intent', 'confidence', 'args'].includes(key)) {
        continue;
      }

      args[key] = value;
    }

    if (Object.keys(args).length > 0) {
      return { intent, args };
    }

    if (intent === 'unknown') {
      return this.buildUnknownResult(userText);
    }

    return {
      intent,
      args: {},
    };
  }

  /**
   * Removes a surrounding markdown code fence when the model wraps the JSON.
   */
  private stripMarkdownFence(content: string): string {
    const fencedContent = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fencedContent?.[1]?.trim() ?? content;
  }

  /**
   * Builds the fallback result used when the model response is unavailable or invalid.
   */
  private buildUnknownResult(userText: string): AIResult {
    return {
      intent: 'unknown',
      args: { rawText: userText },
    };
  }

  /**
   * Narrows unknown values to plain JSON-like objects.
   */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
