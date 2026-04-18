// Entry point: polls Supabase for pending mirror jobs and processes them
// one at a time. Run by systemd as khanqah-mirror.service.

const {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  downloadFromYouTube,
  uploadToArchive,
} = require('./mirror-jobs');

const {
  buildArchiveIdentifier,
  buildArchiveDownloadUrl,
  buildArchiveUploadUrl,
  buildArchiveHeaders,
  tailStderr,
} = require('./mirror-lib');

async function processOne({
  db, tempDir, iaAccessKey, iaSecretKey,
  exec, stat, openStream, fetch, rm, cookiesPath,
}) {
  const job = await claimPendingJob(db);
  if (!job) return 'idle';

  let filePath = null;
  try {
    const dl = await downloadFromYouTube({
      format: job.mirror_format,
      id: job.id,
      url: job.mirror_source_url,
      tempDir,
      exec,
      stat,
      cookiesPath,
    });
    filePath = dl.filePath;

    await markStatus(db, job.id, 'uploading');

    const identifier = buildArchiveIdentifier(job.id);
    const filename = `${job.id}.${dl.ext}`;
    await uploadToArchive({
      filePath,
      uploadUrl: buildArchiveUploadUrl(identifier, filename),
      headers: buildArchiveHeaders({
        format: job.mirror_format,
        title: job.title_en,
        accessKey: iaAccessKey,
        secretKey: iaSecretKey,
      }),
      fetch,
      stat,
      openStream,
    });

    await markReady(
      db,
      job.id,
      buildArchiveDownloadUrl(identifier, filename),
      job.mirror_format === 'video',
    );
    return 'done';
  } catch (err) {
    const message = tailStderr(err.stderr || err.message || String(err));
    await markFailed(db, job.id, message);
    return 'failed';
  } finally {
    if (filePath) await rm(filePath).catch(() => {});
  }
}

module.exports = { processOne };

// ── Entry point (only runs when invoked directly, not when required in tests)
if (require.main === module) {
  const { createClient } = require('@supabase/supabase-js');
  const { execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const fs = require('node:fs/promises');
  const { createReadStream } = require('node:fs');

  const {
    SUPABASE_URL, SUPABASE_SERVICE_KEY,
    IA_ACCESS_KEY, IA_SECRET_KEY,
  } = process.env;

  for (const [k, v] of Object.entries({
    SUPABASE_URL, SUPABASE_SERVICE_KEY, IA_ACCESS_KEY, IA_SECRET_KEY,
  })) {
    if (!v) { console.error(`[mirror] missing env: ${k}`); process.exit(1); }
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const deps = {
    db,
    tempDir: '/tmp/mirror',
    iaAccessKey: IA_ACCESS_KEY,
    iaSecretKey: IA_SECRET_KEY,
    exec: promisify(execFile),
    stat: fs.stat,
    openStream: (p) => createReadStream(p),
    fetch: (...a) => fetch(...a),
    rm: (p) => fs.rm(p, { force: true }),
    // Only used if the file actually exists (downloadFromYouTube checks).
    // Upload a Netscape-format cookies.txt to this path when YouTube
    // starts demanding "sign in to confirm you're not a bot".
    cookiesPath: '/opt/khanqah/yt-cookies.txt',
  };

  (async () => {
    await fs.mkdir('/tmp/mirror', { recursive: true });
    console.log('[mirror] worker started');
    while (true) {
      try {
        const result = await processOne(deps);
        if (result !== 'idle') console.log(`[mirror] ${result}`);
      } catch (err) {
        console.error('[mirror] loop error:', err);
      }
      await new Promise(r => setTimeout(r, 30_000));
    }
  })();
}
