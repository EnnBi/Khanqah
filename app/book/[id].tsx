import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const c = theme.colors;

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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
        Alert.alert('Already downloaded', `Book is saved at:\n${destPath}`);
        return;
      }

      setDownloading(true);
      const { uri } = await FileSystem.downloadAsync(content.media_url, destPath);
      setDownloading(false);
      Alert.alert('Download complete', `Saved to:\n${uri}`);
    } catch (err) {
      setDownloading(false);
      Alert.alert('Download failed', 'Could not download the book. Please try again.');
    }
  }, [content]);

  const title = content
    ? content.title_en || content.title_ur || 'Book'
    : 'Book';

  const headerBg = c.headerBg;
  const headerText = '#ffffff';

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
      <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backArrow, { color: headerText }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: headerText }]} numberOfLines={1}>
            Book
          </Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: c.textSecondary }]}>
            {error ?? 'Something went wrong.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const viewerUrl = buildViewerUrl(content.media_url);

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: headerBg, paddingTop: insets.top },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backArrow, { color: headerText }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: headerText }]} numberOfLines={1}>
          {title}
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDownload}
          disabled={downloading}
          accessibilityLabel="Download book"
        >
          {downloading ? (
            <ActivityIndicator size="small" color={headerText} />
          ) : (
            <Text style={[styles.downloadIcon, { color: headerText }]}>⬇</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
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
          onNavigationStateChange={(navState: WebViewNavigation) => {
            // Allow navigation within the viewer
          }}
          onError={() => {
            setWebViewLoading(false);
            setError('Failed to load the book. Please check your connection.');
          }}
        />

        {/* Loading overlay for WebView */}
        {webViewLoading && (
          <View style={[styles.webViewOverlay, { backgroundColor: c.background }]}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>
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
    gap: 16,
    padding: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    minHeight: 52,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  downloadIcon: {
    fontSize: 20,
  },

  // WebView
  webViewContainer: {
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
    fontSize: 14,
  },

  // Error
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
