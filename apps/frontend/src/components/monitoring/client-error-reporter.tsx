'use client';

import { useEffect } from 'react';
import { getApiBase } from '@/lib/api/client';

const ENDPOINT = '/api/logs/client-error';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;

function sendClientError(payload: {
  message?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  source?: string;
}) {
  const base = getApiBase();
  const url = `${base}${ENDPOINT}`;
  try {
    const body = JSON.stringify({
      message: (payload.message ?? 'Unknown error').slice(0, MAX_MESSAGE_LENGTH),
      stack: payload.stack?.slice(0, MAX_STACK_LENGTH),
      url: payload.url ?? (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      source: payload.source ?? 'client',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // avoid throwing from inside error handlers
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      sendClientError({
        message: event.message ?? String(event.error),
        stack: event.error?.stack,
        url: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
        source: 'window.onerror',
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === 'string'
            ? event.reason
            : String(event.reason);
      const stack = event.reason instanceof Error ? event.reason.stack : undefined;
      sendClientError({
        message: `Unhandled rejection: ${message}`,
        stack,
        source: 'unhandledrejection',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
