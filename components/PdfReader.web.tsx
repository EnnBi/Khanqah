import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTheme } from '../providers/ThemeProvider';
import { API_BASE_URL } from '../lib/remote-config';

// pdfjs-dist 4.10+ only ships .mjs workers on npm/unpkg. Browsers
// load the worker as a module; Metro's lazy chunker doesn't touch
// this URL, so import.meta inside the worker is fine.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderProps {
  url: string;
}

// Approx A4 aspect ratio — used to size the placeholder slot for each page
// before it's mounted, so scroll height is predictable.
const PAGE_ASPECT_RATIO = 1.414;

// Mount pages whose placeholder is within this distance of the viewport.
// Tight margin keeps the initial burst of range requests to a minimum —
// only the first 1–2 pages fetch at startup, the rest load on scroll.
const PREFETCH_MARGIN_PX = 400;

interface LazyPageProps {
  pageNumber: number;
  width: number;
  accent: string;
  rootRef: React.RefObject<HTMLDivElement | null>;
  onVisibilityChange: (pageNumber: number, ratio: number) => void;
  registerRef: (pageNumber: number, el: HTMLDivElement | null) => void;
}

function LazyPage({
  pageNumber,
  width,
  accent,
  rootRef,
  onVisibilityChange,
  registerRef,
}: LazyPageProps) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  // First page mounts immediately so users see content while other pages stream.
  const [shouldRender, setShouldRender] = useState(pageNumber === 1);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    registerRef(pageNumber, el);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setShouldRender(true);
          onVisibilityChange(pageNumber, e.intersectionRatio);
        }
      },
      {
        root: rootRef.current ?? null,
        rootMargin: `${PREFETCH_MARGIN_PX}px 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      registerRef(pageNumber, null);
    };
  }, [pageNumber, rootRef, onVisibilityChange, registerRef]);

  const placeholderHeight = Math.round(width * PAGE_ASPECT_RATIO);
  const Slot: any = 'div';

  return (
    <Slot
      ref={slotRef}
      data-page-number={pageNumber}
      style={{
        width,
        minHeight: placeholderHeight,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {shouldRender ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <View style={{ height: placeholderHeight, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={accent} />
            </View>
          }
        />
      ) : (
        <ActivityIndicator size="small" color={accent} />
      )}
    </Slot>
  );
}

// In-app PDF reader: renders a continuously-scrolling stack of pages. Pages
// lazy-mount as they approach the viewport, so a 100MB+ book starts
// rendering as soon as the first page arrives and keeps memory bounded.
export function PdfReader({ url }: PdfReaderProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pageNodesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  // Most-visible page tracker — avoids setState thrash while scrolling.
  const visibilityRef = useRef<{ best: number; ratio: number }>({ best: 1, ratio: 0 });

  // archive.org PDFs need to route through our nginx proxy so CORS headers
  // are injected and redirects are followed server-side. Two URL shapes in
  // the wild:
  //   canonical: https://archive.org/download/<id>/<file>
  //   data-node: https://ia<n>.us.archive.org/<dir>/items/<id>/<file>
  // The data-node form pins to one server, which often 503s when that
  // specific node is rate-limited. Both forms normalize to /pdf-proxy/<id>/<file>.
  useEffect(() => {
    setErrorMsg(null);
    setTimedOut(false);
    setLoadProgress(null);
    setNumPages(0);

    const canonical = url.match(/^https?:\/\/archive\.org\/download\/(.+)$/);
    const dataNode = url.match(/^https?:\/\/ia\d+\.us\.archive\.org\/\d+\/items\/(.+)$/);
    const archivePath = canonical?.[1] ?? dataNode?.[1];

    if (archivePath) {
      setResolvedUrl(`${API_BASE_URL}/pdf-proxy/${archivePath}`);
    } else {
      setResolvedUrl(url);
    }
  }, [url, reloadKey]);

  // Watchdog: if the document hasn't loaded after 30s, surface a visible
  // error with a retry button instead of an infinite spinner.
  useEffect(() => {
    if (numPages > 0 || errorMsg || !resolvedUrl) return;
    const t = setTimeout(() => setTimedOut(true), 30000);
    return () => clearTimeout(t);
  }, [resolvedUrl, numPages, errorMsg, reloadKey]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollToPage = useCallback((n: number) => {
    const el = pageNodesRef.current.get(n);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        scrollToPage(Math.max(1, currentPage - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        scrollToPage(Math.min(numPages, currentPage + 1));
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(2.5, s + 0.1));
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.5, s - 0.1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages, currentPage, scrollToPage]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setCurrentPage(1);
    setErrorMsg(null);
    setTimedOut(false);
    visibilityRef.current = { best: 1, ratio: 0 };
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setErrorMsg(err?.message ?? 'Failed to load the PDF.');
  }, []);

  const onDocumentLoadProgress = useCallback(
    ({ loaded, total }: { loaded: number; total: number }) => {
      setLoadProgress({ loaded, total });
    },
    [],
  );

  const registerRef = useCallback((pageNumber: number, el: HTMLDivElement | null) => {
    if (el) pageNodesRef.current.set(pageNumber, el);
    else pageNodesRef.current.delete(pageNumber);
  }, []);

  // Observers for all pages fire independently. We keep track of the page
  // with the largest intersection ratio and update the counter only when
  // the winner changes — prevents setState on every scroll tick.
  const onVisibilityChange = useCallback((pageNumber: number, ratio: number) => {
    const curr = visibilityRef.current;
    if (ratio > curr.ratio || pageNumber === curr.best) {
      if (ratio > 0) {
        visibilityRef.current = { best: pageNumber, ratio };
        setCurrentPage(pageNumber);
      } else if (pageNumber === curr.best) {
        // Current winner scrolled out — let the next observer event pick a new one.
        visibilityRef.current = { best: curr.best, ratio: 0 };
      }
    }
  }, []);

  const pageWidth = containerWidth > 0
    ? Math.min(containerWidth - 32, 900) * scale
    : 800;

  // pdfjs prefers a single streaming GET when the server supports it,
  // which pulls the whole file. Forcing range-only + disabling auto-fetch
  // makes it request one byte range per page on demand. The default chunk
  // size is 64KB which produces a storm of requests against a 100MB+ file —
  // 512KB chunks cut that count ~8× with negligible memory cost.
  // Object identity must stay stable; a fresh `options` re-inits pdfjs.
  const documentOptions = useMemo(
    () => ({
      disableStream: true,
      disableAutoFetch: true,
      disableRange: false,
      rangeChunkSize: 524288,
    }),
    [],
  );

  const Host: any = 'div';

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

      <Host
        ref={hostRef}
        style={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16,
          backgroundColor: (c as any).background,
        }}
      >
        {resolvedUrl ? (
          <Document
            key={reloadKey}
            file={resolvedUrl}
            options={documentOptions}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={onDocumentLoadProgress}
            loading={
              <View style={styles.statusBlock}>
                {timedOut ? (
                  <>
                    <Text style={[styles.statusText, { color: c.liveRed, fontSize: 15 }]}>
                      The book is taking too long to load.
                    </Text>
                    <Text style={[styles.statusText, { color: c.textMuted }]}>
                      The server may be slow right now — you can retry.
                    </Text>
                    <TouchableOpacity
                      onPress={() => setReloadKey((k) => k + 1)}
                      style={{
                        marginTop: 12,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        backgroundColor: c.primary,
                        borderRadius: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: c.onPrimary, fontFamily: 'DMSans-SemiBold', letterSpacing: 1.2, fontSize: 11, textTransform: 'uppercase' }}>
                        Retry
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="large" color={c.accent} />
                    <Text style={[styles.statusText, { color: c.textMuted }]}>
                      {loadProgress && loadProgress.total > 0
                        ? `Loading book… ${Math.round((loadProgress.loaded / loadProgress.total) * 100)}%`
                        : 'Loading book…'}
                    </Text>
                  </>
                )}
              </View>
            }
            error={
              <View style={styles.statusBlock}>
                <Text style={[styles.statusText, { color: c.liveRed }]}>
                  {errorMsg ?? 'Could not load the PDF.'}
                </Text>
                <TouchableOpacity
                  onPress={() => setReloadKey((k) => k + 1)}
                  style={{
                    marginTop: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    backgroundColor: c.primary,
                    borderRadius: 4,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: c.onPrimary, fontFamily: 'DMSans-SemiBold', letterSpacing: 1.2, fontSize: 11, textTransform: 'uppercase' }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            }
          >
            {numPages > 0 &&
              Array.from({ length: numPages }, (_, i) => (
                <LazyPage
                  key={i + 1}
                  pageNumber={i + 1}
                  width={pageWidth}
                  accent={c.accent}
                  rootRef={hostRef}
                  onVisibilityChange={onVisibilityChange}
                  registerRef={registerRef}
                />
              ))}
          </Document>
        ) : (
          <View style={styles.statusBlock}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text style={[styles.statusText, { color: c.textMuted }]}>
              Loading book…
            </Text>
          </View>
        )}
      </Host>

      <View style={[styles.chrome, { backgroundColor: c.surface, borderTopColor: c.hairline }]}>
        <TouchableOpacity
          onPress={() => scrollToPage(Math.max(1, currentPage - 1))}
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
          onPress={() => scrollToPage(Math.min(numPages, currentPage + 1))}
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
