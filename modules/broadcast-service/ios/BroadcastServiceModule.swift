import ExpoModulesCore
import AVFoundation

public class BroadcastServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BroadcastService")
    Events("interruption")

    AsyncFunction("startSession") { (promise: Promise) in
      do {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(
          .playAndRecord,
          mode: .default,
          options: [.allowBluetooth, .defaultToSpeaker]
        )
        try session.setActive(true, options: [])
        NotificationCenter.default.removeObserver(self)
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.onInterruption(_:)),
          name: AVAudioSession.interruptionNotification,
          object: session
        )
        promise.resolve(nil)
      } catch {
        promise.reject("AUDIO_SESSION_ERROR", error.localizedDescription)
      }
    }

    AsyncFunction("stopSession") { (promise: Promise) in
      NotificationCenter.default.removeObserver(self)
      do {
        try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
        promise.resolve(nil)
      } catch {
        // Deactivation can fail benignly if another app already grabbed
        // audio focus — surface no error to JS.
        promise.resolve(nil)
      }
    }
  }

  @objc private func onInterruption(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let typeRaw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: typeRaw)
    else { return }

    switch type {
    case .began:
      sendEvent("interruption", ["state": "began"])
    case .ended:
      // Always attempt to resume — shouldResume is advisory and is often
      // absent after phone calls, which would leave the session paused forever.
      sendEvent("interruption", ["state": "ended"])
    @unknown default: break
    }
  }
}
