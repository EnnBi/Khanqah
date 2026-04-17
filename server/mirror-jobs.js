// Side-effecting jobs used by the mirror worker: Supabase reads/writes,
// yt-dlp execution, archive.org upload. Mockable dependencies are passed
// in so the worker tests can swap them out.
module.exports = {};
