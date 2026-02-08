'use client';

/**
 * Catches root-level errors (e.g. ChunkLoadError when loading app/layout).
 * ChunkLoadError often happens in dev/Docker when the chunk load times out;
 * refreshing the page usually fixes it.
 */
export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkLoad =
    error?.name === 'ChunkLoadError' ||
    (error?.message && /loading chunk .* failed/i.test(error.message));

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          {isChunkLoad ? 'Page failed to load' : 'Something went wrong'}
        </h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          {isChunkLoad
            ? 'A script chunk did not load in time. This can happen in development or after a new deployment. Try refreshing the page.'
            : error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => (window.location.href = window.location.pathname)}
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Refresh page
        </button>
      </body>
    </html>
  );
}
