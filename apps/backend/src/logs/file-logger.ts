import { LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const LOG_FILE = process.env.LOG_FILE || path.join(LOG_DIR, 'backend.log');
const CLIENT_ERRORS_FILE = process.env.LOG_CLIENT_ERRORS_FILE || path.join(LOG_DIR, 'client-errors.log');

function ensureDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

function append(message: string) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  try {
    ensureDir();
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // ignore write errors
  }
}

/**
 * Logger that writes to console and to a file (for admin log viewer).
 */
export class FileLogger implements LoggerService {
  log(message: string, ...optionalParams: string[]) {
    const out = optionalParams.length ? `${message} ${optionalParams.join(' ')}` : message;
    console.log(message, ...optionalParams);
    append(`LOG ${out}`);
  }

  error(message: string, ...optionalParams: string[]) {
    const out = optionalParams.length ? `${message} ${optionalParams.join(' ')}` : message;
    console.error(message, ...optionalParams);
    append(`ERROR ${out}`);
  }

  warn(message: string, ...optionalParams: string[]) {
    const out = optionalParams.length ? `${message} ${optionalParams.join(' ')}` : message;
    console.warn(message, ...optionalParams);
    append(`WARN ${out}`);
  }

  debug(message: string, ...optionalParams: string[]) {
    const out = optionalParams.length ? `${message} ${optionalParams.join(' ')}` : message;
    if (process.env.NODE_ENV !== 'production') {
      console.debug?.(message, ...optionalParams);
    }
    append(`DEBUG ${out}`);
  }

  verbose(message: string, ...optionalParams: string[]) {
    const out = optionalParams.length ? `${message} ${optionalParams.join(' ')}` : message;
    append(`VERBOSE ${out}`);
  }
}

export function getLogFilePath(): string {
  return LOG_FILE;
}

export function getClientErrorsLogFilePath(): string {
  return CLIENT_ERRORS_FILE;
}

/**
 * Append a frontend/client error line to client-errors.log (and optionally to backend.log).
 * Safe to call from any context; ignores write errors.
 */
export function appendClientError(line: string): void {
  try {
    ensureDir();
    const entry = `[${new Date().toISOString()}] ${line}\n`;
    fs.appendFileSync(CLIENT_ERRORS_FILE, entry);
  } catch {
    // ignore
  }
}
