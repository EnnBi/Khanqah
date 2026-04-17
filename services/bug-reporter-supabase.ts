// Supabase-backed storage for bug reports.
// Works on both native and web since supabase-js is cross-platform.

import { supabase } from '../lib/supabase';
import type { Storage } from './bug-reporter-core';
import type { BugReport, BugStatus } from './bug-reporter-types';

interface Row {
  id: string;
  client_id: string;
  timestamp: string;
  type: BugReport['type'];
  note: string | null;
  route: string;
  app_version: string;
  platform: BugReport['platform'];
  logs: BugReport['logs'];
  network: BugReport['network'];
  error: BugReport['error'] | null;
  status: BugStatus;
  fixed_at: string | null;
  fixed_by: string | null;
  fixed_note: string | null;
}

function rowToReport(r: Row): BugReport {
  return {
    // Expose the client_id as id so the UI can cross-reference
    id: r.client_id,
    timestamp: r.timestamp,
    type: r.type,
    note: r.note,
    route: r.route,
    appVersion: r.app_version,
    platform: r.platform,
    logs: r.logs || [],
    network: r.network || [],
    error: r.error || undefined,
    status: r.status,
    fixedAt: r.fixed_at,
    fixedBy: r.fixed_by,
    fixedNote: r.fixed_note,
  };
}

export function createSupabaseStorage(): Storage {
  return {
    async save(report: BugReport) {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('bug_reports').insert({
        client_id: report.id,
        timestamp: report.timestamp,
        type: report.type,
        note: report.note,
        route: report.route,
        app_version: report.appVersion,
        platform: report.platform,
        logs: report.logs,
        network: report.network,
        error: report.error ?? null,
        reported_by: userData.user?.id ?? null,
        status: 'open',
      });
      if (error) throw error;
    },

    async list() {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as Row[]).map(rowToReport);
    },

    async clear() {
      // Only admins will have RLS permission to do this
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .gte('timestamp', '1970-01-01');
      if (error) throw error;
    },

    async deleteOldest(count: number) {
      // Find oldest `count` ids and delete
      const { data, error } = await supabase
        .from('bug_reports')
        .select('id')
        .order('timestamp', { ascending: true })
        .limit(count);
      if (error || !data) return;
      const ids = (data as { id: string }[]).map((r) => r.id);
      if (ids.length === 0) return;
      await supabase.from('bug_reports').delete().in('id', ids);
    },

    async get(clientId: string) {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error || !data) return null;
      return rowToReport(data as Row);
    },

    async updateStatus(clientId: string, status: BugStatus, fixedNote?: string | null) {
      const { data: userData } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = { status };
      if (status === 'fixed') {
        patch.fixed_at = new Date().toISOString();
        patch.fixed_by = userData.user?.id ?? null;
        if (fixedNote !== undefined) patch.fixed_note = fixedNote;
      } else if (status === 'open') {
        patch.fixed_at = null;
        patch.fixed_by = null;
        patch.fixed_note = null;
      } else if (fixedNote !== undefined) {
        patch.fixed_note = fixedNote;
      }
      const { error } = await supabase
        .from('bug_reports')
        .update(patch)
        .eq('client_id', clientId);
      if (error) throw error;
    },
  };
}
