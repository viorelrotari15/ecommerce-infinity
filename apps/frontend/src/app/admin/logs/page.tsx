'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isAdmin } from '@/lib/auth';
import { fetchAPIAuth } from '@/lib/api/client';
import { FileText, Download, RefreshCw, Loader2 } from 'lucide-react';
import { useT } from '@/lib/utils/translations';
import { translationKeys } from '@/lib/utils/translations';

const API_BASE = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '')
  : '';

export default function AdminLogsPage() {
  const router = useRouter();
  const t = useT();
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tail, setTail] = useState(500);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  const loadLogs = async () => {
    if (!API_BASE) {
      setError('API URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetchAPIAuth<{ logs: string; tail: number | null }>(
        `/admin/logs?tail=${tail}`,
        token || undefined,
        { method: 'GET' },
      );
      setLogs(res.logs || '');
    } catch (e: any) {
      setError(e?.message || 'Failed to load logs');
      setLogs('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin() && API_BASE) loadLogs();
  }, [tail]);

  const handleDownload = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !API_BASE) return;
    try {
      const url = `${API_BASE}/api/admin/logs?download=1&tail=10000`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backend-logs-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!isAdmin()) return null;

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            {t(translationKeys.admin.dashboard.backendLogsTitle, 'Backend logs')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(translationKeys.admin.dashboard.backendLogsDescription, 'View or download backend application logs (admin only).')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tail}
            onChange={(e) => setTail(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value={100}>Last 100 lines</option>
            <option value={500}>Last 500 lines</option>
            <option value={1000}>Last 1000 lines</option>
            <option value={5000}>Last 5000 lines</option>
            <option value={10000}>Last 10000 lines</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">{t(translationKeys.common.refresh, 'Refresh')}</span>
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            <span className="ml-2">{t(translationKeys.common.download, 'Download')}</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.common.logOutput, 'Log output')}</CardTitle>
          <CardDescription>
            Logs are written by the backend; the file may be empty until some activity occurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive mb-4">{error}</p>
          )}
          {loading && !logs ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading logs…
            </div>
          ) : (
            <pre className="bg-muted rounded-md p-4 text-sm overflow-auto max-h-[70vh] whitespace-pre-wrap break-words font-mono">
              {logs || 'No log content yet.'}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
