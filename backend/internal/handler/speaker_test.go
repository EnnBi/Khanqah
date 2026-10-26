package handler

import "testing"

func TestSpeakerOrDefault(t *testing.T) {
	cases := []struct {
		name, in, def, want string
	}{
		{"empty uses default", "", defaultSpeakerEn, defaultSpeakerEn},
		{"whitespace uses default", "  \t\n", defaultSpeakerEn, defaultSpeakerEn},
		{"given is kept", "Maulana Ahmad", defaultSpeakerEn, "Maulana Ahmad"},
		{"given is trimmed", "  Maulana Ahmad ", defaultSpeakerEn, "Maulana Ahmad"},
		{"urdu default", "", defaultSpeakerUr, defaultSpeakerUr},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := speakerOrDefault(c.in, c.def); got != c.want {
				t.Errorf("speakerOrDefault(%q) = %q, want %q", c.in, got, c.want)
			}
		})
	}
}

func TestSpeakerPtrOrDefault(t *testing.T) {
	blank, given := "  ", " Maulana Ahmad "
	if got := speakerPtrOrDefault(nil, defaultSpeakerEn); got == nil || *got != defaultSpeakerEn {
		t.Errorf("nil should yield default, got %v", got)
	}
	if got := speakerPtrOrDefault(&blank, defaultSpeakerEn); got == nil || *got != defaultSpeakerEn {
		t.Errorf("blank should yield default, got %v", got)
	}
	if got := speakerPtrOrDefault(&given, defaultSpeakerEn); got == nil || *got != "Maulana Ahmad" {
		t.Errorf("given should be kept and trimmed, got %v", got)
	}
}
