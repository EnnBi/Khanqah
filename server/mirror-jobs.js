// Side-effecting jobs used by the mirror worker: Supabase reads/writes,
// yt-dlp execution, archive.org upload. Mockable dependencies are passed
// in so the worker tests can swap them out.

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const { buildYtDlpArgs } = require('./mirror-lib');

const defaultExec = promisify(execFile);

async function claimPendingJob(db) {
  // 1. Find the oldest pending row with attempts remaining
  const { data: row, error: selectError } = await db
    .from('content')
    .select('id, title_en, mirror_source_url, mirror_format, mirror_attempts')
    .eq('mirror_status', 'pending')
    .lt('mirror_attempts', 3)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;
  if (!row) return null;

  // 2. Flip it to 'downloading' with a conditional update so two workers
  //    never double-claim a row. If the conditional update misses (row has
  //    already moved on) we just skip this poll cycle.
  const { data: claimed, error: updateError } = await db
    .from('content')
    .update({
      mirror_status: 'downloading',
      mirror_attempts: row.mirror_attempts + 1,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('mirror_status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;
  return claimed ? row : null;
}

async function markStatus(db, id, status) {
  const { error } = await db
    .from('content')
    .update({ mirror_status: status, mirror_updated_at: new Date().toISOString() })
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
}

async function markReady(db, id, mediaUrl, isVideo) {
  const { error } = await db
    .from('content')
    .update({
      mirror_status: 'ready',
      media_url: mediaUrl,
      is_video: isVideo,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
}

async function markFailed(db, id, errorMessage) {
  const { error } = await db
    .from('content')
    .update({
      mirror_status: 'failed',
      mirror_error: errorMessage,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
}

async function resetForRetry(db, id) {
  const { error } = await db
    .from('content')
    .update({
      mirror_status: 'pending',
      mirror_attempts: 0,
      mirror_error: null,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
}

async function downloadFromYouTube({
  format, id, url, tempDir,
  exec = defaultExec,
  stat = fs.stat,
}) {
  const outPathTemplate = `${tempDir}/${id}.%(ext)s`;
  const args = buildYtDlpArgs(format, outPathTemplate, url);

  // 256 MB stdout buffer is well above what yt-dlp prints even for chatty
  // progress output — prevents "stdout maxBuffer exceeded" on long downloads.
  await exec('yt-dlp', args, { maxBuffer: 256 * 1024 * 1024 });

  const ext = format === 'audio' ? 'mp3' : 'mp4';
  const filePath = `${tempDir}/${id}.${ext}`;
  await stat(filePath); // confirms the file actually exists post-download
  return { filePath, ext };
}

module.exports = {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
  downloadFromYouTube,
};
