import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// iOS WebView renders PDFs inline. Android WebView triggers a download
// instead of rendering — so on Android we route through Google Docs
// Viewer which renders a PDF as HTML.

interface PdfReaderProps {
  url: string;
}

function toViewerUrl(pdfUrl: string): string {
  if (Platform.OS === 'android') {
    // Mozilla's hosted pdf.js viewer ships with a toolbar that exposes
    // page navigation (prev/next + page-number field) and zoom (+/−
    // + fit-page). iOS WebView renders PDFs inline natively with its
    // own controls, so we only need this shim on Android.
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
  }
  return pdfUrl;
}

export function PdfReader({ url }: PdfReaderProps) {
  return (
    <View style={styles.wrapper}>
      <WebView
        source={{ uri: toViewerUrl(url) }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  webView: { flex: 1 },
});
