import { OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { getConfig } from '../lib/remote-config';

export function initNotifications() {
  const appId = getConfig().onesignalAppId;
  if (!appId) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  OneSignal.initialize(appId);

  // Request permission (iOS only — Android grants automatically on install for API < 33)
  OneSignal.Notifications.requestPermission(true);
}

// Save the OneSignal player/subscription ID to Supabase for the current user
export async function registerDevice(userId: string) {
  try {
    // getIdAsync returns the push subscription ID (OneSignal player ID)
    // API note: some SDK versions expose this as OneSignal.User.pushSubscription.id
    // or OneSignal.User.pushSubscription.getIdAsync() — adjust if needed.
    const subscriptionId: string | null = await OneSignal.User.pushSubscription.getIdAsync();

    if (!subscriptionId) {
      console.warn('OneSignal: no push subscription ID available yet');
      return;
    }

    const deviceType: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        onesignal_player_id: subscriptionId,
        device_type: deviceType,
      },
      { onConflict: 'user_id,onesignal_player_id' }
    );

    if (error) {
      console.error('Failed to upsert push subscription:', error);
    }
  } catch (error) {
    console.error('Failed to register device:', error);
  }
}

// Placeholder — actual broadcast sending happens server-side via OneSignal REST API
// or a Supabase Edge Function. This function exists as a call-site reference.
export async function sendNotificationToAll(title: string, message: string) {
  console.log('Notification intent (send via server-side):', { title, message });
}
