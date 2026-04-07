import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

export async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play, Capability.Pause, Capability.SkipToNext,
        Capability.SkipToPrevious, Capability.SeekTo, Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
  } catch (error) {
    // Player already set up
    console.log('Player already initialized');
  }
}

// Register playback service — this must be called at module scope
export function registerPlaybackService() {
  TrackPlayer.registerPlaybackService(() => async () => {
    // Empty service handler — TrackPlayer handles events internally
  });
}
