import type {
  ContentType, UserRole, User, Category, Content, Topic,
  Playlist, LiveSession, ScheduledSession, ListeningProgress,
} from '../../lib/types';

describe('types', () => {
  it('ContentType includes all content types', () => {
    const types: ContentType[] = ['bayan', 'clip', 'nazam', 'quran', 'hamd_naat', 'book'];
    expect(types).toHaveLength(6);
  });

  it('UserRole includes all roles', () => {
    const roles: UserRole[] = ['listener', 'editor', 'admin'];
    expect(roles).toHaveLength(3);
  });

  it('Content object satisfies the type', () => {
    const content: Content = {
      id: '123', title_en: 'Test Bayan', title_ur: 'ٹیسٹ بیان',
      description_en: null, description_ur: null, type: 'bayan',
      category_id: '456', media_url: 'https://archive.org/download/test/test.mp3',
      thumbnail_url: null, duration: 2700, file_size: null,
      is_video: false, uploaded_by: '789',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      mirror_status: 'not_applicable', mirror_format: null,
      mirror_source_url: null, mirror_error: null,
      mirror_attempts: 0, mirror_updated_at: '2026-01-01T00:00:00Z',
    };
    expect(content.type).toBe('bayan');
    expect(content.is_video).toBe(false);
  });

  it('LiveSession has correct status values', () => {
    const statuses: LiveSession['status'][] = ['live', 'ended', 'processing'];
    expect(statuses).toHaveLength(3);
  });
});
