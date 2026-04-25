import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

interface PdfReaderProps {
  url: string;
}

// Stable, filesystem-safe filename derived from the remote URL.
function filenameFor(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h) + url.charCodeAt(i);
    h |= 0;
  }
  return `pdf-${Math.abs(h).toString(36)}.pdf`;
}

export function PdfReader({ url }: PdfReaderProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const pdfRef = useRef<React.ComponentRef<typeof Pdf> | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadPercent, setLoadPercent] = useState(0);
  // Local file:// URI after the PDF is fetched. Rendering from a local file
  // avoids react-native-blob-util's custom trust-manager code path, which
  // throws "Use of own trust manager but none defined" on some Android TLS
  // stacks (Jio 4G/5G). expo-file-system uses Android's stock HttpURLConnection.
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDownloading(true);
    setErrorMsg(null);
    setNumPages(0);
    setCurrentPage(1);
    setLoadPercent(0);
    setLocalUri(null);

    (async () => {
      try {
        const dir = new Directory(Paths.cache, 'pdfs');
        if (!dir.exists) dir.create({ intermediates: true });
        const target = new File(dir, filenameFor(url));
        if (!target.exists) {
          await File.downloadFileAsync(url, target, { idempotent: true });
        }
        if (cancelled) return;
        setLocalUri(target.uri);
      } catch (err) {
        if (cancelled) return;
        const message = (err as { message?: string })?.message ?? 'Failed to download the PDF.';
        setErrorMsg(message);
      } finally {
        if (!cancelled) setDownloading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const onLoadComplete = useCallback((n: number) => {
    setNumPages(n);
    setCurrentPage(1);
    setErrorMsg(null);
    setLoadPercent(100);
  }, []);

  // onPageChanged fires on user scroll/swipe. We keep state read-only-ish
  // here — the Pdf component drives the page indicator, we only write
  // when the user taps prev/next (see goToPage below).
  const onPageChanged = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const onError = useCallback((err: object) => {
    const message = (err as { message?: string })?.message ?? 'Failed to load the PDF.';
    setErrorMsg(message);
  }, []);

  const onLoadProgress = useCallback((percent: number) => {
    setLoadPercent(Math.round(percent * 100));
  }, []);

  const goToPage = useCallback(
    (target: number) => {
      if (!pdfRef.current) return;
      if (target < 1 || (numPages > 0 && target > numPages)) return;
      pdfRef.current.setPage(target);
      setCurrentPage(target);
    },
    [numPages],
  );

  const loading = !errorMsg && (downloading || !localUri || numPages === 0);

  return (
    <View style={[styles.wrapper, { backgroundColor: c.background }]}>
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: c.accent,
              width: numPages > 0 ? `${(currentPage / numPages) * 100}%` : '0%',
            },
          ]}
        />
      </View>

      <View style={styles.viewport}>
        {errorMsg ? (
          <View style={styles.statusBlock}>
            <Text style={[styles.statusText, { color: c.liveRed }]}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            {localUri && (
              <Pdf
                ref={pdfRef}
                source={{ uri: localUri }}
                scale={scale}
                minScale={0.5}
                maxScale={3.0}
                onLoadComplete={onLoadComplete}
                onPageChanged={onPageChanged}
                onError={onError}
                onLoadProgress={onLoadProgress}
                style={[styles.pdf, { backgroundColor: c.background }]}
              />
            )}
            {loading && (
              <View style={[styles.loadingOverlay, { backgroundColor: c.background }]}>
                <ActivityIndicator size="large" color={c.accent} />
                <Text style={[styles.statusText, { color: c.textMuted, marginTop: 14 }]}>
                  {downloading
                    ? 'Downloading book…'
                    : loadPercent > 0
                    ? `Loading book… ${loadPercent}%`
                    : 'Loading book…'}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={[styles.chrome, { backgroundColor: c.surface, borderTopColor: c.hairline }]}>
        <TouchableOpacity
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
          activeOpacity={0.7}
          accessibilityLabel="Previous page"
        >
          <Ionicons name="chevron-back" size={26} color={c.primary} />
        </TouchableOpacity>

        <Text style={[styles.pageLabel, { color: c.text }]}>
          {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
        </Text>

        <TouchableOpacity
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= numPages}
          style={[styles.navBtn, currentPage >= numPages && styles.navBtnDisabled]}
          activeOpacity={0.7}
          accessibilityLabel="Next page"
        >
          <Ionicons name="chevron-forward" size={26} color={c.primary} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity
          onPress={() => setScale((s) => Math.max(0.5, s - 0.1))}
          style={[styles.zoomBtn, { borderColor: c.border }]}
          activeOpacity={0.7}
          accessibilityLabel="Zoom out"
        >
          <Text style={[styles.zoomLabel, { color: c.textMuted }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.zoomValue, { color: c.textMuted }]}>
          {Math.round(scale * 100)}%
        </Text>
        <TouchableOpacity
          onPress={() => setScale((s) => Math.min(3.0, s + 0.1))}
          style={[styles.zoomBtn, { borderColor: c.border }]}
          activeOpacity={0.7}
          accessibilityLabel="Zoom in"
        >
          <Text style={[styles.zoomLabel, { color: c.textMuted }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
  },
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
  viewport: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  statusText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    textAlign: 'center',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navArrow: {
    fontFamily: 'CrimsonPro',
    fontSize: 26,
    lineHeight: 26,
  },
  pageLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    minWidth: 70,
    textAlign: 'center',
    letterSpacing: 1,
  },
  spacer: {
    flex: 1,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  zoomLabel: {
    fontSize: 16,
    lineHeight: 18,
  },
  zoomValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    minWidth: 42,
    textAlign: 'center',
  },
});
