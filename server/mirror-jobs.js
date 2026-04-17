// Side-effecting jobs used by the mirror worker: Supabase reads/writes,
// yt-dlp execution, archive.org upload. Mockable dependencies are passed
// in so the worker tests can swap them out.

async function claimPendingJob(db) {
  // 1. Find the oldest pending row with attempts remaining
  const { data: row } = await db
    .from('content')
    .select('id, title_en, mirror_source_url, mirror_format, mirror_attempts')
    .eq('mirror_status', 'pending')
    .lt('mirror_attempts', 3)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  // 2. Flip it to 'downloading' with a conditional update so two workers
  //    never double-claim a row. If the conditional update misses (row has
  //    already moved on) we just skip this poll cycle.
  const { data: claimed } = await db
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

  return claimed ? row : null;
}

async function markStatus(db, id, status) {
  await db
    .from('content')
    .update({ mirror_status: status, mirror_updated_at: new Date().toISOString() })
    .eq('id', id)
    .maybeSingle();
}

async function markReady(db, id, mediaUrl, isVideo) {
  await db
    .from('content')
    .update({
      mirror_status: 'ready',
      media_url: mediaUrl,
      is_video: isVideo,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .maybeSingle();
}

async function markFailed(db, id, errorMessage) {
  await db
    .from('content')
    .update({
      mirror_status: 'failed',
      mirror_error: errorMessage,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .maybeSingle();
}

async function resetForRetry(db, id) {
  await db
    .from('content')
    .update({
      mirror_status: 'pending',
      mirror_attempts: 0,
      mirror_error: null,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .maybeSingle();
}

module.exports = {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
};
