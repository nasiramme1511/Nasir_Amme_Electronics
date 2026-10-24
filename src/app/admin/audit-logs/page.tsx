'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  actor?: {
    fullName: string;
    email: string;
  } | null;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const url =
        filterAction === 'ALL'
          ? '/api/admin/audit-logs'
          : `/api/admin/audit-logs?action=${filterAction}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterAction]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const url =
          filterAction === 'ALL'
            ? '/api/admin/audit-logs'
            : `/api/admin/audit-logs?action=${filterAction}`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.data)) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [filterAction]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              <span>System Audit Logs</span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Activity history of staff logins, credential changes, and system events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => void fetchLogs()}
          >
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'LOGIN', 'CREATE_USER', 'UPDATE_USER', 'RESET_STAFF_PASSWORD', 'PASSWORD_CHANGED', 'SALE_POSTED'].map((act) => (
          <button
            key={act}
            onClick={() => setFilterAction(act)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterAction === act
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            {act.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recorded Security & Audit Events</CardTitle>
              <CardDescription>
                {logs.length} events logged in PostgreSQL
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading secure audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">No audit logs matching this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Action</th>
                    <th className="pb-3">Actor / Staff</th>
                    <th className="pb-3">Entity</th>
                    <th className="pb-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(log.occurredAt)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            log.action.includes('PASSWORD')
                              ? 'warning'
                              : log.action.includes('LOGIN')
                              ? 'success'
                              : log.action.includes('CREATE')
                              ? 'accent'
                              : 'neutral'
                          }
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {log.actor ? (
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {log.actor.fullName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {log.actor.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">System Automation</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {log.entityType}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate font-mono text-[11px]">
                        {log.newValues ? JSON.stringify(log.newValues) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
