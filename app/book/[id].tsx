import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from '../../lib/alert';
import { useSafeBack } from '../../hooks/useSafeBack';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../lib/supabase';
import { Content } from '../../lib/types';
import { useTheme } from '../../providers/ThemeProvider';

const BOOKMARK_KEY_PREFIX = 'book_scroll_';

function buildViewerUrl(pdfUrl: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
}

export default function BookViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const c = theme.colors;

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch content from supabase
  useEffect(() => {
    if (!id) return;
    supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError('Content not found.');
        } else if ((data as Content).type !== 'book') {
          setError('This content is not a book.');
        } else {
          setContent(data as Content);
        }
        setLoading(false);
      });
  }, [id]);

  // Save scroll position bookmark (best-effort via message from WebView)
  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      if (!id) return;
      try {
        const scrollY = parseFloat(event.nativeEvent.data);
        if (!isNaN(scrollY)) {
          await AsyncStorage.setItem(`${BOOKMARK_KEY_PREFIX}${id}`, String(scrollY));
        }
      } catch {
        // ignore
      }
    },
    [id],
  );

  // Injected JS: send scroll position to RN every 3s
  const injectedJavaScript = `
    (function() {
      setInterval(function() {
        var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        window.ReactNativeWebView.postMessage(String(scrollY));
      }, 3000);
    })();
    true;
  `;

  // Download PDF to device
  const handleDownload = useCallback(async () => {
    if (!content) return;
    const fileName = `book_${content.id}.pdf`;
    const destPath = `${FileSystem.documentDirectory}${fileName}`;

    try {
      // Check if already downloaded
      const info = await FileSystem.getInfoAsync(destPath);
      if (info.exists) {
        showMessage('Already downloaded', `Book is saved at:\n${destPath}`);
        return;
      }

      setDownloading(true);
      const { uri } = await FileSystem.downloadAsync(content.media_url, destPath);
      setDownloading(false);
      showMessage('Download complete', `Saved to:\n${uri}`);
    } catch {
      setDownloading(false);
      showMessage('Download failed', 'Could not download the book. Please try again.');
    }
  }, [content]);

  const title = content
    ? content.title_en || content.title_ur || 'Book'
    : 'Book';

  // --- Loading state ---
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  // --- Error state ---
  if (error || !content) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background }]}>
        <View
          style={[
            styles.topBar,
            { backgroundColor: c.background, paddingTop: insets.top + 8, borderBottomColor: c.hairline },
          ]}
        >
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={goBack}
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backArrow, { color: c.primary }]}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: c.text }]} numberOfLines={1}>
            Book
          </Text>
          <View style={styles.topBarBtn} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: c.textMuted }]}>
            {error ?? 'Something went wrong.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.primary }]}
            onPress={goBack}
          >
            <Text style={[styles.retryBtnText, { color: c.onPrimary }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const viewerUrl = buildViewerUrl(content.media_url);

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      {/* Minimal top bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: c.background, paddingTop: insets.top + 8, borderBottomColor: c.hairline },
        ]}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={goBack}
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backArrow, { color: c.primary }]}>{'‹'}</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.topBarTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>

        {/* Menu (⋮) — triggers download */}
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={() => {
            setMenuOpen(!menuOpen);
            handleDownload();
          }}
          disabled={downloading}
          accessibilityLabel="More options"
        >
          {downloading ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <Text style={[styles.menuIcon, { color: c.primary }]}>{'⋮'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* PDF viewer area — on web, a native <iframe> renders the PDF
          via the browser's built-in PDF viewer (Chromium PDFium / Firefox
          PDF.js). react-native-webview's iframe fallback combined with
          Google Docs Viewer gets blocked by X-Frame-Options, which was
          leaving the "Loading book..." overlay stuck forever. Native
          platforms keep the WebView + Google Docs Viewer path since
          iOS/Android WebViews can't render PDF URLs directly. */}
      <View style={[styles.webViewSurround, { backgroundColor: c.background }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            src: content.media_url,
            title,
            onLoad: () => setWebViewLoading(false),
            onError: () => {
              setWebViewLoading(false);
              setError('Failed to load the book. Please check your connection.');
            },
            style: {
              width: '100%',
              height: '100%',
              border: 0,
              backgroundColor: '#fff',
              display: 'block',
            },
          })
        ) : (
          <WebView
            source={{ uri: viewerUrl }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onMessage={handleMessage}
            injectedJavaScript={injectedJavaScript}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            allowsInlineMediaPlayback
            onNavigationStateChange={(_navState: WebViewNavigation) => {
              // Allow navigation within the viewer
            }}
            onError={() => {
              setWebViewLoading(false);
              setError('Failed to load the book. Please check your connection.');
            }}
          />
        )}

        {/* Loading overlay */}
        {webViewLoading && (
          <View style={[styles.webViewOverlay, { backgroundColor: c.background }]}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={[styles.loadingText, { color: c.textMuted }]}>
              Loading book...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'CrimsonPro',
    fontSize: 34,
    lineHeight: 38,
  },
  topBarTitle: {
    flex: 1,
    fontFamily: 'CrimsonPro-Medium',
    fontSize: 17,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  menuIcon: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },

  // WebView
  webViewSurround: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  webViewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 16,
  },

  // Error
  errorText: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 4,
  },
  retryBtnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
