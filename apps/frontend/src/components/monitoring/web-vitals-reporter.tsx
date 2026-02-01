/* eslint-disable no-console */
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const payload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: window.location.pathname,
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/vitals', blob);
        return;
      }
    } catch (error) {
      console.warn('sendBeacon failed for web vitals', error);
    }

    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error) => {
      console.warn('Failed to post web vitals', error);
    });
  });

  return null;
}
