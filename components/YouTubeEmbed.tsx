import React from 'react';
import { View, Text, StyleSheet, Platform, Linking, TouchableOpacity } from 'react-native';

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('youtube.com/watch') ||
    url.includes('youtube.com/shorts/') ||
    url.includes('youtube.com/embed/') ||
    url.includes('youtu.be/')
  );
}

// Rough "is this URL a direct video file?" check — matches on the extension
// before any querystring/fragment. We use this to decide whether to render
// an HTML5 <video> element vs. an <audio> element when the row isn't a
// YouTube iframe.
export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split(/[?#]/)[0].toLowerCase();
  return /\.(mp4|m4v|mov|webm|mkv|ogv)$/.test(path);
}

function extractVideoId(url: string): string | null {
  const short = url.match(/youtu\.be\/([^?&#/]+)/);
  if (short) return short[1];
  const long = url.match(/[?&]v=([^?&#]+)/);
  if (long) return long[1];
  const shorts = url.match(/youtube\.com\/shorts\/([^?&#/]+)/);
  if (shorts) return shorts[1];
  const embed = url.match(/youtube\.com\/embed\/([^?&#/]+)/);
  if (embed) return embed[1];
  return null;
}

export function YouTubeEmbed({ url, title }: YouTubeEmbedProps) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Unable to load video.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const embedSrc = `https://www.youtube.com/embed/${videoId}`;
    const Iframe: any = 'iframe';
    return (
      <View style={styles.wrapper}>
        <Iframe
          src={embedSrc}
          title={title ?? 'YouTube video'}
          style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 8 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </View>
    );
  }

  // On native, open in the YouTube app / browser. A proper inline
  // player needs react-native-youtube-iframe, which isn't installed.
  return (
    <TouchableOpacity style={styles.openButton} onPress={() => Linking.openURL(url)}>
      <Text style={styles.openButtonText}>WATCH ON YOUTUBE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  fallback: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  fallbackText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: '#8a7d66',
  },
  openButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    alignItems: 'center',
    marginBottom: 16,
  },
  openButtonText: {
    color: '#ffffff',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
