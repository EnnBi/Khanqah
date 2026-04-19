import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// Native fallback: the react-pdf library is web-only (needs a browser
// canvas + pdfjs worker). On iOS/Android we drop into a WebView
// pointed at the raw PDF — both platforms' WebViews render PDFs
// natively in modern OS versions.

interface PdfReaderProps {
  url: string;
}

export function PdfReader({ url }: PdfReaderProps) {
  return (
    <View style={styles.wrapper}>
      <WebView
        source={{ uri: url }}
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
