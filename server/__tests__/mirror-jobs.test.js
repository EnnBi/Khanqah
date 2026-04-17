const test = require('node:test');
const assert = require('node:assert/strict');
const {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
} = require('../mirror-jobs');

// ── Fake Supabase client ───────────────────────────────────────
function makeFakeDb(initialRows) {
  const rows = initialRows.map(r => ({ ...r }));
  const calls = { selects: [], updates: [] };

  function from(table) {
    assert.equal(table, 'content');
    return builder();
  }

  function builder() {
    const filters = [];
    const order = { column: null, ascending: true };
    let limit = null;
    let projection = null;
    let updatePayload = null;
    let mode = 'select';

    const api = {
      select(cols) { projection = cols; return api; },
      update(payload) { mode = 'update'; updatePayload = payload; return api; },
      eq(col, val) { filters.push({ col, op: 'eq', val }); return api; },
      lt(col, val) { filters.push({ col, op: 'lt', val }); return api; },
      order(col, opts) { order.column = col; order.ascending = !!opts?.ascending; return api; },
      limit(n) { limit = n; return api; },
      maybeSingle() { return execute().then(arr => ({ data: arr[0] ?? null, error: null })); },
    };

    function matches(row) {
      return filters.every(f => {
        if (f.op === 'eq') return row[f.col] === f.val;
        if (f.op === 'lt') return row[f.col] < f.val;
        return false;
      });
    }

    async function execute() {
      if (mode === 'select') {
        calls.selects.push({ filters: [...filters], order, limit, projection });
        let out = rows.filter(matches);
        if (order.column) {
          out = [...out].sort((a, b) =>
            order.ascending
              ? (a[order.column] > b[order.column] ? 1 : -1)
              : (a[order.column] < b[order.column] ? 1 : -1),
          );
        }
        if (limit) out = out.slice(0, limit);
        return out.map(r => ({ ...r }));
      }
      // update
      calls.updates.push({ filters: [...filters], payload: { ...updatePayload } });
      const updated = [];
      for (const row of rows) {
        if (matches(row)) {
          Object.assign(row, updatePayload);
          updated.push({ ...row });
        }
      }
      return updated;
    }

    return api;
  }

  return { client: { from }, rows, calls };
}

// ── claimPendingJob ────────────────────────────────────────────
test('claimPendingJob: selects oldest pending row, flips it to downloading', async () => {
  const { client, rows, calls } = makeFakeDb([
    { id: 'a', mirror_status: 'pending', mirror_attempts: 0, created_at: '2026-04-10', title_en: 'A',
      mirror_source_url: 'u-a', mirror_format: 'audio' },
    { id: 'b', mirror_status: 'pending', mirror_attempts: 0, created_at: '2026-04-09', title_en: 'B',
      mirror_source_url: 'u-b', mirror_format: 'audio' },
    { id: 'c', mirror_status: 'ready',   mirror_attempts: 0, created_at: '2026-04-08', title_en: 'C' },
  ]);

  const job = await claimPendingJob(client);

  assert.equal(job.id, 'b', 'picks oldest pending row');
  assert.equal(rows.find(r => r.id === 'b').mirror_status, 'downloading');
  assert.equal(rows.find(r => r.id === 'b').mirror_attempts, 1);
});

test('claimPendingJob: skips rows that already hit the attempt cap', async () => {
  const { client } = makeFakeDb([
    { id: 'burnt',  mirror_status: 'pending', mirror_attempts: 3, created_at: '2026-04-05', title_en: 'X' },
    { id: 'fresh',  mirror_status: 'pending', mirror_attempts: 0, created_at: '2026-04-06', title_en: 'Y',
      mirror_source_url: 'u-y', mirror_format: 'audio' },
  ]);
  const job = await claimPendingJob(client);
  assert.equal(job.id, 'fresh');
});

test('claimPendingJob: returns null when no pending rows', async () => {
  const { client } = makeFakeDb([
    { id: 'done', mirror_status: 'ready', mirror_attempts: 0, created_at: '2026-04-05', title_en: 'X' },
  ]);
  const job = await claimPendingJob(client);
  assert.equal(job, null);
});

// ── markStatus / markReady / markFailed / resetForRetry ───────
test('markStatus: updates status + updated_at', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'downloading', mirror_updated_at: '2026-01-01' },
  ]);
  await markStatus(client, 'x', 'uploading');
  assert.equal(rows[0].mirror_status, 'uploading');
  assert.notEqual(rows[0].mirror_updated_at, '2026-01-01');
});

test('markReady: writes media_url + is_video + flips to ready', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'uploading', media_url: '', is_video: false },
  ]);
  await markReady(client, 'x', 'https://archive.org/download/khanqah-yt-x/x.mp4', true);
  assert.equal(rows[0].mirror_status, 'ready');
  assert.equal(rows[0].media_url, 'https://archive.org/download/khanqah-yt-x/x.mp4');
  assert.equal(rows[0].is_video, true);
});

test('markFailed: records the error tail + flips to failed', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'downloading' },
  ]);
  await markFailed(client, 'x', 'yt-dlp: Video unavailable');
  assert.equal(rows[0].mirror_status, 'failed');
  assert.equal(rows[0].mirror_error, 'yt-dlp: Video unavailable');
});

test('resetForRetry: flips failed back to pending and clears counters', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'failed', mirror_attempts: 3, mirror_error: 'boom' },
  ]);
  await resetForRetry(client, 'x');
  assert.equal(rows[0].mirror_status, 'pending');
  assert.equal(rows[0].mirror_attempts, 0);
  assert.equal(rows[0].mirror_error, null);
});

// ── Error-path ────────────────────────────────────────────────
test('markStatus: throws when Supabase returns an error', async () => {
  const dbErr = new Error('rls violation');
  const client = {
    from() {
      return {
        update() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: null, error: dbErr }; },
      };
    },
  };

  await assert.rejects(
    () => markStatus(client, 'x', 'uploading'),
    (err) => err === dbErr,
  );
});
