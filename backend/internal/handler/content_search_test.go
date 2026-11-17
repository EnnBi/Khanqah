package handler

import (
	"net/url"
	"strings"
	"testing"

	dbgen "khanqah/api/internal/db/generated"
)

func parse(t *testing.T, qs string) contentSearch {
	t.Helper()
	v, _ := url.ParseQuery(qs)
	s, err := parseContentSearch(v)
	if err != nil {
		t.Fatalf("parseContentSearch(%q): %v", qs, err)
	}
	return s
}

func TestHasSearchParams(t *testing.T) {
	cases := map[string]bool{
		"":                      false,
		"type=bayan":            false,
		"q=":                    false,
		"q=%20%20":              false,
		"q=faiz":                true,
		"speaker=":              true, // empty speaker = "no speaker"
		"speaker=mufti":         true,
		"type=bayan&q=faiz":     true,
		"category_id=x&limit=5": false,
	}
	for qs, want := range cases {
		v, _ := url.ParseQuery(qs)
		if got := hasSearchParams(v); got != want {
			t.Errorf("hasSearchParams(%q) = %v, want %v", qs, got, want)
		}
	}
}

func TestParseContentSearch_Fields(t *testing.T) {
	s := parse(t, "q=%20faiz%20&speaker=Mufti%20Rashid&type=bayan&category_id=11111111-1111-1111-1111-111111111111&limit=5&offset=10")
	if s.Q == nil || *s.Q != "faiz" {
		t.Errorf("q = %v, want trimmed 'faiz'", s.Q)
	}
	if s.Speaker == nil || *s.Speaker != "Mufti Rashid" {
		t.Errorf("speaker = %v", s.Speaker)
	}
	if s.Type == nil || *s.Type != dbgen.ContentTypeBayan {
		t.Errorf("type = %v", s.Type)
	}
	if !s.CategoryID.Valid {
		t.Error("category_id should be valid")
	}
	if s.Limit != 5 || s.Offset != 10 {
		t.Errorf("limit/offset = %d/%d", s.Limit, s.Offset)
	}
}

func TestParseContentSearch_EmptySpeakerMeansNoSpeaker(t *testing.T) {
	s := parse(t, "speaker=")
	if s.Speaker == nil || *s.Speaker != "" {
		t.Errorf("speaker = %v, want pointer to empty string", s.Speaker)
	}
	if s.Q != nil {
		t.Errorf("q = %v, want nil", s.Q)
	}
}

func TestParseContentSearch_BlankQIsIgnored(t *testing.T) {
	if s := parse(t, "q=%20&speaker=x"); s.Q != nil {
		t.Errorf("blank q should be nil, got %v", *s.Q)
	}
}

func TestParseContentSearch_LongQIsCapped(t *testing.T) {
	s := parse(t, "q="+strings.Repeat("a", 500))
	if s.Q == nil || len([]rune(*s.Q)) != 100 {
		t.Errorf("q should be capped at 100 runes, got %v", s.Q)
	}
}

func TestParseContentSearch_Defaults(t *testing.T) {
	s := parse(t, "q=x")
	if s.Limit != 20 || s.Offset != 0 || s.Type != nil || s.CategoryID.Valid {
		t.Errorf("unexpected defaults: %+v", s)
	}
	if got := parse(t, "q=x&limit=1000").Limit; got != 100 {
		t.Errorf("limit should clamp to 100, got %d", got)
	}
	if got := parse(t, "q=x&offset=-5").Offset; got != 0 {
		t.Errorf("negative offset should be ignored, got %d", got)
	}
}

func TestParseContentSearch_Invalid(t *testing.T) {
	for _, qs := range []string{"q=x&type=nope", "q=x&category_id=not-a-uuid"} {
		v, _ := url.ParseQuery(qs)
		if _, err := parseContentSearch(v); err == nil {
			t.Errorf("%q: expected an error", qs)
		}
	}
}
