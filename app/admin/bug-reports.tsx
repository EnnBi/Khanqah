import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../providers/ThemeProvider';
import { showMessage, confirmDestructive } from '../../lib/alert';
import { useSafeBack } from '../../hooks/useSafeBack';
import {
  getAllReports,
  clearReports,
  exportReportsJson,
  updateBugStatus,
} from '../../services/bug-reporter';
import type { BugReport, BugStatus, BugType } from '../../services/bug-reporter-types';

type StatusFilter = 'all' | BugStatus;

const STATUS_COLOR: Record<BugStatus, string> = {
  open: '#c23e3e',
  fixed: '#16a34a',
  ignored: '#8a7d66',
};

const TYPE_COLOR: Record<BugType, string> = {
  ui: '#0f2e24',
  backend: '#1a4638',
  'auto-error': '#c23e3e',
  'auto-warn': '#d4a853',
  'auto-network': '#d4a853',
  other: '#8a7d66',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BugReportsScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/admin');
  const { theme } = useTheme();
  const c = theme.colors;

  const [reports, setReports] = useState<BugReport[]>([]);
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BugType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getAllReports();
    setReports(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!__DEV__) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={[styles.back, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Bug reports are only available in development builds.
          </Text>
        </View>
      </View>
    );
  }

  async function handleExport() {
    const json = await exportReportsJson();
    await Clipboard.setStringAsync(json);
    showMessage('Exported', `Copied ${reports.length} report(s) to clipboard.`);
  }

  async function handleClear() {
    const ok = await confirmDestructive('Clear all reports?', 'This cannot be undone.', 'Clear');
    if (!ok) return;
    await clearReports();
    await load();
    setSelected(null);
  }

  const filtered = reports.filter((r) => {
    const byType = filter === 'all' || r.type === filter;
    const status = r.status ?? 'open';
    const byStatus = statusFilter === 'all' || status === statusFilter;
    return byType && byStatus;
  });

  async function handleMarkFixed(report: BugReport) {
    try {
      await updateBugStatus(report.id, 'fixed', null);
      await load();
      setSelected((prev) =>
        prev && prev.id === report.id
          ? { ...prev, status: 'fixed', fixedAt: new Date().toISOString() }
          : prev,
      );
    } catch (err: any) {
      showMessage('Could not mark fixed', err?.message ?? String(err));
    }
  }

  async function handleMarkOpen(report: BugReport) {
    try {
      await updateBugStatus(report.id, 'open', null);
      await load();
      setSelected((prev) =>
        prev && prev.id === report.id ? { ...prev, status: 'open', fixedAt: null } : prev,
      );
    } catch (err: any) {
      showMessage('Could not reopen', err?.message ?? String(err));
    }
  }

  if (selected) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: c.background }]}
        contentContainerStyle={styles.detailContent}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={[styles.back, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailHead}>
          <View style={[styles.typeBadge, { backgroundColor: TYPE_COLOR[selected.type] }]}>
            <Text style={styles.typeBadgeText}>{selected.type.toUpperCase()}</Text>
          </View>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: STATUS_COLOR[selected.status ?? 'open'] },
            ]}
          >
            <Text style={styles.typeBadgeText}>{(selected.status ?? 'open').toUpperCase()}</Text>
          </View>
          <Text style={[styles.detailTime, { color: c.textMuted }]}>
            {new Date(selected.timestamp).toLocaleString()}
          </Text>
        </View>

        {/* Mark fixed / reopen */}
        {(selected.status ?? 'open') === 'fixed' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: c.border }]}
            onPress={() => handleMarkOpen(selected)}
            activeOpacity={0.75}
          >
            <Text style={[styles.actionBtnText, { color: c.textMuted }]}>REOPEN</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#16a34a', borderColor: '#16a34a' }]}
            onPress={() => handleMarkFixed(selected)}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>MARK AS FIXED ✓</Text>
          </TouchableOpacity>
        )}

        <DetailRow label="ROUTE" value={selected.route} colors={c} />
        <DetailRow label="PLATFORM" value={selected.platform} colors={c} />
        <DetailRow label="APP VERSION" value={selected.appVersion} colors={c} />
        {selected.note ? <DetailRow label="NOTE" value={selected.note} colors={c} /> : null}

        {selected.error ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>ERROR</Text>
            <View style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <Text style={[styles.codeText, { color: c.text }]}>
                {selected.error.message}
              </Text>
              {selected.error.stack ? (
                <Text style={[styles.codeText, { color: c.textMuted, marginTop: 8 }]}>
                  {selected.error.stack}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          LOGS ({selected.logs.length})
        </Text>
        <View style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
          {selected.logs.length === 0 ? (
            <Text style={[styles.codeText, { color: c.textMuted }]}>(empty)</Text>
          ) : (
            selected.logs.map((l, i) => (
              <Text
                key={i}
                style={[
                  styles.codeText,
                  {
                    color:
                      l.level === 'error'
                        ? '#c23e3e'
                        : l.level === 'warn'
                          ? '#d4a853'
                          : c.text,
                  },
                ]}
              >
                [{l.level.toUpperCase()}] {l.message}
              </Text>
            ))
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          NETWORK ({selected.network.length})
        </Text>
        <View style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
          {selected.network.length === 0 ? (
            <Text style={[styles.codeText, { color: c.textMuted }]}>(empty)</Text>
          ) : (
            selected.network.map((n, i) => (
              <Text
                key={i}
                style={[
                  styles.codeText,
                  {
                    color:
                      n.error || (n.status && n.status >= 400) ? '#c23e3e' : c.text,
                  },
                ]}
              >
                {n.method} {n.url} — {n.status ?? 'ERR'} ({n.durationMs ?? '?'}ms)
                {n.error ? ` ${n.error}` : ''}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack}>
          <Text style={[styles.back, { color: c.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExport} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: c.primary }]}>EXPORT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#c23e3e' }]}>CLEAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: c.textMuted }]}>
          {String(reports.length).padStart(2, '0')} · BUG REPORTS
        </Text>
        <Text style={[styles.title, { color: c.primary }]}>Triage</Text>
      </View>

      {/* Status filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['open', 'fixed', 'ignored', 'all'] as const).map((f) => {
          const active = f === statusFilter;
          const color = f === 'all' ? c.primary : STATUS_COLOR[f];
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? color : c.surface,
                  borderColor: active ? color : c.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? '#fff' : c.textMuted }]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Type filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['all', 'ui', 'backend', 'auto-error', 'auto-warn', 'auto-network', 'other'] as const).map((f) => {
          const active = f === filter;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? c.primary : c.surface,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? '#fff' : c.textMuted }]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            No reports yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {filtered.map((r) => {
            const preview = r.note ?? r.error?.message ?? '(no message)';
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelected(r)}
                style={[styles.row, { borderBottomColor: c.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.rowBadge, { backgroundColor: TYPE_COLOR[r.type] }]}>
                  <Text style={styles.rowBadgeText}>{r.type.toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text
                    style={[
                      styles.rowPreview,
                      {
                        color: c.primary,
                        textDecorationLine: (r.status ?? 'open') === 'fixed' ? 'line-through' : 'none',
                        opacity: (r.status ?? 'open') === 'fixed' ? 0.55 : 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {preview}
                  </Text>
                  <Text style={[styles.rowMeta, { color: c.textMuted }]}>
                    {r.route} · {relativeTime(r.timestamp)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLOR[r.status ?? 'open'] },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['theme']['colors'];
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  back: { fontFamily: 'CrimsonPro-Italic', fontSize: 16 },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerBtn: { paddingVertical: 4 },
  headerBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, letterSpacing: 1.5 },
  hero: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 8 },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: { fontFamily: 'CrimsonPro-Italic', fontSize: 30, letterSpacing: -0.3 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  filterText: { fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 1.5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontFamily: 'CrimsonPro-Italic', fontSize: 15, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  rowBadgeText: { fontFamily: 'DMSans-SemiBold', fontSize: 9, letterSpacing: 1.5, color: '#fff' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionBtnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowPreview: { fontFamily: 'CrimsonPro', fontSize: 16, letterSpacing: -0.2 },
  rowMeta: { fontFamily: 'DMSans', fontSize: 11, marginTop: 2 },
  detailContent: { paddingHorizontal: 20, paddingBottom: 80 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  typeBadgeText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#fff',
  },
  detailTime: { fontFamily: 'DMSans', fontSize: 12 },
  sectionLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  detailValue: { fontFamily: 'CrimsonPro', fontSize: 15, letterSpacing: -0.1 },
  code: { borderWidth: 1, borderRadius: 6, padding: 12 },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
