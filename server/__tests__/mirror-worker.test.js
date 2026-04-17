const test = require('node:test');
const assert = require('node:assert/strict');
const { processOne } = require('../mirror-worker');

// Reuse the same fake-db pattern from mirror-jobs.test.js but inline
// here so the files stay standalone (easier to read one at a time).
function makeFakeDb(initialRows) {
  const rows = initialRows.map(r => ({ ...r }));

  function from() { return builder(); }
  function builder() {
    const filters = [];
    const order = { column: null, ascending: true };
    let limit = null;
    let updatePayload = null;
    let mode = 'select';

    const api = {
      select() { return api; },
      update(p) { mode = 'update'; updatePayload = p; return api; },
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

  return { client: { from }, rows };
}

function defaultDeps(overrides = {}) {
  const removedPaths = [];
  return {
    tempDir: '/tmp/mirror',
    iaAccessKey: 'AK',
    iaSecretKey: 'SK',
    exec: async () => ({ stdout: '', stderr: '' }),
    stat: async () => ({ size: 100 }),
    openStream: () => 'stream',
    fetch: async () => ({ ok: true, status: 200, text: async () => '' }),
    rm: async (p) => { removedPaths.push(p); },
    removedPaths,
    ...overrides,
  };
}

test('processOne: returns "idle" when no pending rows exist', async () => {
  const { client } = makeFakeDb([
    { id: 'a', mirror_status: 'ready', mirror_attempts: 0, created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  const result = await processOne({ db: client, ...deps });
  assert.equal(result, 'idle');
});

test('processOne: happy path audio → row ends at ready with archive URL and is_video=false', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'abc', title_en: 'Test', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'https://youtu.be/xyz', mirror_format: 'audio',
      media_url: '', is_video: false, created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  const result = await processOne({ db: client, ...deps });

  assert.equal(result, 'done');
  const row = rows[0];
  assert.equal(row.mirror_status, 'ready');
  assert.equal(row.media_url, 'https://archive.org/download/khanqah-yt-abc/abc.mp3');
  assert.equal(row.is_video, false);
  assert.deepEqual(deps.removedPaths, ['/tmp/mirror/abc.mp3']);
});

test('processOne: happy path video → is_video flipped to true, mp4 URL', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'vid', title_en: 'Clip', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'https://youtu.be/xyz', mirror_format: 'video',
      media_url: '', is_video: false, created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  await processOne({ db: client, ...deps });

  const row = rows[0];
  assert.equal(row.mirror_status, 'ready');
  assert.equal(row.media_url, 'https://archive.org/download/khanqah-yt-vid/vid.mp4');
  assert.equal(row.is_video, true);
});

test('processOne: yt-dlp failure → row lands on failed with error tail, attempts incremented', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', title_en: 'T', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'u', mirror_format: 'audio', created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps({
    exec: async () => {
      const err = new Error('Command failed');
      err.stderr = 'ERROR: Video unavailable';
      throw err;
    },
  });

  const result = await processOne({ db: client, ...deps });

  assert.equal(result, 'failed');
  assert.equal(rows[0].mirror_status, 'failed');
  assert.equal(rows[0].mirror_attempts, 1);
  assert.match(rows[0].mirror_error, /Video unavailable/);
});

test('processOne: archive upload failure → failed + attempts incremented, temp file still cleaned', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', title_en: 'T', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'u', mirror_format: 'audio', created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps({
    fetch: async () => ({ ok: false, status: 503, text: async () => 'rate limited' }),
  });

  await processOne({ db: client, ...deps });

  assert.equal(rows[0].mirror_status, 'failed');
  assert.match(rows[0].mirror_error, /archive upload 503/);
  assert.deepEqual(deps.removedPaths, ['/tmp/mirror/x.mp3']);
});

test('processOne: after 3 failed attempts the row stops being claimable', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', title_en: 'T', mirror_status: 'pending', mirror_attempts: 3,
      mirror_source_url: 'u', mirror_format: 'audio', created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  const result = await processOne({ db: client, ...deps });

  assert.equal(result, 'idle');
  assert.equal(rows[0].mirror_status, 'pending'); // untouched
});
