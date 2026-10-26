package handler

import (
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"

	dbgen "khanqah/api/internal/db/generated"
)

func sp(s string) *string { return &s }

func existingContent() dbgen.Content {
	dur := int32(1800)
	return dbgen.Content{
		ID:         pgtype.UUID{Bytes: [16]byte{1}, Valid: true},
		TitleEn:    "Old title",
		TitleUr:    "پرانا عنوان",
		CreditEn:   sp("Maulana Ahmad"),
		CreditUr:   sp("مولانا احمد"),
		Type:       dbgen.ContentTypeBayan,
		CategoryID: pgtype.UUID{Bytes: [16]byte{2}, Valid: true},
		MediaUrl:   "https://cdn.example/a.mp3",
		Duration:   &dur,
		IsVideo:    true,
	}
}

// The admin app edits with only title + category; everything else must be kept.
func TestMergeContentUpdate_PartialBodyKeepsOtherFields(t *testing.T) {
	cat := "11111111-1111-1111-1111-111111111111"
	got, err := mergeContentUpdate(existingContent(),
		strings.NewReader(`{"title_en":"New title","title_ur":"نیا عنوان","category_id":"`+cat+`"}`))
	if err != nil {
		t.Fatal(err)
	}
	if got.TitleEn != "New title" || got.TitleUr != "نیا عنوان" {
		t.Errorf("titles not updated: %q / %q", got.TitleEn, got.TitleUr)
	}
	if got.Type != dbgen.ContentTypeBayan {
		t.Errorf("type = %q, want bayan (would be rejected by the enum if empty)", got.Type)
	}
	if got.MediaUrl != "https://cdn.example/a.mp3" {
		t.Errorf("media_url wiped: %q", got.MediaUrl)
	}
	if got.CreditEn == nil || *got.CreditEn != "Maulana Ahmad" {
		t.Errorf("credit_en wiped: %v", got.CreditEn)
	}
	if got.Duration == nil || *got.Duration != 1800 || !got.IsVideo {
		t.Errorf("duration/is_video wiped: %v %v", got.Duration, got.IsVideo)
	}
	if !got.ID.Valid || got.ID.Bytes != [16]byte{1} {
		t.Errorf("id not preserved: %v", got.ID)
	}
	if got.CategoryID.Bytes == ([16]byte{2}) {
		t.Errorf("category_id was not updated")
	}
}

func TestMergeContentUpdate_FullBodyOverridesEverything(t *testing.T) {
	got, err := mergeContentUpdate(existingContent(), strings.NewReader(
		`{"title_en":"T","title_ur":"ٹ","credit_en":"Other","type":"clip","media_url":"u","is_video":false}`))
	if err != nil {
		t.Fatal(err)
	}
	if got.Type != dbgen.ContentTypeClip || got.MediaUrl != "u" || got.IsVideo ||
		got.CreditEn == nil || *got.CreditEn != "Other" {
		t.Errorf("full body not applied: %+v", got)
	}
}

func TestMergeContentUpdate_InvalidJSON(t *testing.T) {
	if _, err := mergeContentUpdate(existingContent(), strings.NewReader(`{nope`)); err == nil {
		t.Error("expected an error for invalid JSON")
	}
}
