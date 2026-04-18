import { Alert, Platform } from 'react-native';

/**
 * showMessage / confirm helpers that actually work on React Native Web.
 *
 * Alert.alert renders via JS on native but is implemented as window.alert
 * on RN Web — and button `onPress` callbacks on web are unreliable, which
 * has silently eaten success toasts, validation errors, and delete
 * confirmations throughout this app. These helpers route to
 * window.alert / window.confirm on web and keep Alert.alert on native,
 * so both platforms behave predictably.
 */

function formatBody(title: string, message?: string): string {
  if (!message) return title;
  return `${title}\n\n${message}`;
}

export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(formatBody(title, message));
    return;
  }
  Alert.alert(title, message);
}

export function confirm(
  title: string,
  message?: string,
  confirmLabel: string = 'OK',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(formatBody(title, message)));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function confirmDestructive(
  title: string,
  message?: string,
  confirmLabel: string = 'Delete',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(formatBody(title, message)));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
