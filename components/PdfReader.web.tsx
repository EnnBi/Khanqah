import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

// react-pdf + pdfjs-dist reach for browser-only globals (DOMMatrix,
// OffscreenCanvas, etc.) at module load, which crashes Metro's SSR/
// prerender pass. Guard the entire wiring behind a client-only
// dynamic import — the component first renders a lightweight loader
// and swaps to the real reader once the bundle arrives.

interface PdfReaderProps {
  url: string;
}

export function PdfReader(props: PdfReaderProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [mod, setMod] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ Document, Page, pdfjs }] = await Promise.all([
          import('react-pdf'),
          // CSS side-effect imports, required for text/annotation layers
          import('react-pdf/dist/Page/TextLayer.css'),
          import('react-pdf/dist/Page/AnnotationLayer.css'),
        ]);
        // Pin the worker to the matching CDN build so the deployed
        // bundle doesn't have to carry the worker itself. pdfjs-dist
        // v4's classic-module worker uses .min.js (not .mjs) — this
        // avoids Metro's inability to transform pdfjs v5's ESM-only
        // import.meta references.
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        if (!cancelled) setMod({ Document, Page });
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message ?? 'Failed to load PDF engine.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loadError) {
    return (
      <View style={[styles.wrapper, { backgroundColor: c.background }]}>
        <View style={styles.statusBlock}>
          <Text style={[styles.statusText, { color: c.liveRed }]}>{loadError}</Text>
        </View>
      </View>
    );
  }

  if (!mod) {
    return (
      <View style={[styles.wrapper, { backgroundColor: c.background }]}>
        <View style={styles.statusBlock}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[styles.statusText, { color: c.textMuted }]}>
            Loading reader…
          </Text>
        </View>
      </View>
    );
  }

  return <PdfReaderInner {...props} Document={mod.Document} Page={mod.Page} />;
}

interface InnerProps extends PdfReaderProps {
  Document: any;
  Page: any;
}

function PdfReaderInner({ url, Document, Page }: InnerProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  // Track available render width; refits the page to the viewport.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard navigation — arrows + zoom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1));
      else if (e.key === 'ArrowRight') setPage((p) => Math.min(numPages, p + 1));
      else if (e.key === '+' || e.key === '=') setScale((s) => Math.min(2.5, s + 0.1));
      else if (e.key === '-') setScale((s) => Math.max(0.5, s - 0.1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setPage(1);
    setErrorMsg(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setErrorMsg(err?.message ?? 'Failed to load the PDF.');
  }, []);

  const pageWidth = containerWidth > 0
    ? Math.min(containerWidth - 32, 900) * scale
    : 800;

  const Host: any = 'div';

  return (
    <View style={[styles.wrapper, { backgroundColor: c.background }]}>
      {/* Progress bar across the top in gold */}
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: c.accent,
              width: numPages > 0 ? `${(page / numPages) * 100}%` : '0%',
            },
          ]}
        />
      </View>

      {/* PDF host */}
      <Host
        ref={hostRef}
        style={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 16,
          backgroundColor: (c as any).background,
        }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <View style={styles.statusBlock}>
              <ActivityIndicator size="large" color={c.accent} />
              <Text style={[styles.statusText, { color: c.textMuted }]}>
                Loading book…
              </Text>
            </View>
          }
          error={
            <View style={styles.statusBlock}>
              <Text style={[styles.statusText, { color: c.liveRed }]}>
                {errorMsg ?? 'Could not load the PDF.'}
              </Text>
            </View>
          }
        >
          {numPages > 0 && (
            <Page
              pageNumber={page}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              loading={
                <View style={styles.statusBlock}>
                  <ActivityIndicator size="small" color={c.accent} />
                </View>
              }
            />
          )}
        </Document>
      </Host>

      {/* Bottom chrome */}
      <View style={[styles.chrome, { backgroundColor: c.surface, borderTopColor: c.hairline }]}>
        <TouchableOpacity
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={[styles.navBtn, page <= 1 && styles.navBtnDisabled]}
          activeOpacity={0.7}
          accessibilityLabel="Previous page"
        >
          <Text style={[styles.navArrow, { color: c.primary }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.pageLabel, { color: c.text }]}>
          {numPages > 0 ? `${page} / ${numPages}` : '—'}
        </Text>

        <TouchableOpacity
          onPress={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          style={[styles.navBtn, page >= numPages && styles.navBtnDisabled]}
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
          onPress={() => setScale((s) => Math.min(2.5, s + 0.1))}
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
  statusBlock: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    fontFamily: 'DMSans',
    fontSize: 13,
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
