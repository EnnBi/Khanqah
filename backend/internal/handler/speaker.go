package handler

import "strings"

// Speaker shown when an admin leaves the speaker blank. Keep in sync with the
// column defaults in migrations/008_speaker.up.sql.
const (
	defaultSpeakerEn = "Mufti Abdur Rashid Miftahi Sb"
	defaultSpeakerUr = "مفتی عبدالرشید مفتاحی صاحب"
)

// speakerOrDefault trims s and falls back to def when it is blank.
func speakerOrDefault(s, def string) string {
	if s = strings.TrimSpace(s); s != "" {
		return s
	}
	return def
}

// speakerPtrOrDefault is speakerOrDefault for nullable columns (e.g. content credit).
func speakerPtrOrDefault(s *string, def string) *string {
	v := def
	if s != nil {
		v = speakerOrDefault(*s, def)
	}
	return &v
}
