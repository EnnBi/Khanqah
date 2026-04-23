import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { useTheme } from '../providers/ThemeProvider';

interface PdfReaderProps {
  url: string;
}

export function PdfReader({ url }: PdfReaderProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onLoadComplete = useCallback((n: number) => {
    setNumPages(n);
    setCurrentPage(1);
    setErrorMsg(null);
  }, []);

  const onPageChanged = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const onError = useCallback((err: object) => {
    const message = (err as { message?: string })?.message ?? 'Failed to load the PDF.';
    setErrorMsg(message);
  }, []);

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
          <Pdf
            source={{ uri: url, cache: true }}
            page={currentPage}
            scale={scale}
            minScale={0.5}
            maxScale={3.0}
            trustAllCerts={false}
            onLoadComplete={onLoadComplete}
            onPageChanged={onPageChanged}
            onError={onError}
            renderActivityIndicator={() => <ActivityIndicator size="large" color={c.accent} />}
            style={[styles.pdf, { backgroundColor: c.background }]}
          />
        )}
      </View>

      <View style={[styles.chrome, { backgroundColor: c.surface, borderTopColor: c.hairline }]}>
        <TouchableOpacity
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
          activeOpacity={0.7}
          accessibilityLabel="Previous page"
        >
          <Text style={[styles.navArrow, { color: c.primary }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.pageLabel, { color: c.text }]}>
          {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
        </Text>

        <TouchableOpacity
          onPress={() => setCurrentPage((p) => Math.min(numPages || 1, p + 1))}
          disabled={currentPage >= numPages}
          style={[styles.navBtn, currentPage >= numPages && styles.navBtnDisabled]}
          activeOpacity={0.7}
          accessibilityLabel="Next page"
        >
          <Text style={[styles.navArrow, { color: c.primary }]}>›</Text>
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
  },
  pdf: {
    flex: 1,
    width: '100%',
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
