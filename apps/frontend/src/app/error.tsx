'use client';

/**
 * Root error boundary. Avoids using usePathname/useRouter so we don't hit
 * "Cannot read properties of null (reading 'useContext')" when the navigation
 * context is not available during error render.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/';
          }}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
