// Typography system for Calm Architecture design
// Crimson Pro = serif (headlines, titles, body emphasis)
// DM Sans = sans (labels, metadata, UI chrome)
// NastaleeqUrdu = Urdu text
// Amiri = Arabic text (fallback, system)

export const font = {
  serif: 'CrimsonPro',
  serifItalic: 'CrimsonPro-Italic',
  serifMedium: 'CrimsonPro-Medium',
  serifSemiBold: 'CrimsonPro-SemiBold',
  sans: 'DMSans',
  sansMedium: 'DMSans-Medium',
  sansSemiBold: 'DMSans-SemiBold',
  sansBold: 'DMSans-Bold',
  urdu: 'NastaleeqUrdu',
} as const;

// Reusable text style presets
export const type = {
  // Display headlines (hero titles)
  display: {
    fontFamily: font.serif,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  displayItalic: {
    fontFamily: font.serifItalic,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  // Section subtitles
  sectionTitle: {
    fontFamily: font.serifItalic,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  // Card titles
  cardTitle: {
    fontFamily: font.serif,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardTitleLarge: {
    fontFamily: font.serif,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  // Labels (uppercase, tracked)
  label: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  // Metadata (caps, smaller tracking)
  meta: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  // Body
  body: {
    fontFamily: font.serif,
    fontSize: 15,
    lineHeight: 22,
  },
  // Button
  button: {
    fontFamily: font.sansMedium,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  // Urdu
  urdu: {
    fontFamily: font.urdu,
    fontSize: 22,
    lineHeight: 36,
  },
} as const;
