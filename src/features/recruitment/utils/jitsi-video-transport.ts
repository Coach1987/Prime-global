export interface DeviceCheckResult {
  cameraReady: boolean;
  microphoneReady: boolean;
  checkedAt: string;
}

export type MediaDeviceOption = {
  deviceId: string;
  kind: "audioinput" | "videoinput";
  label: string;
};

type JitsiUserIdentity = {
  displayName: string;
  email?: string;
};

type InitializeOptions = {
  container: HTMLDivElement;
  roomName: string;
  locale: "en" | "ar";
  identity: JitsiUserIdentity;
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
};

export interface JitsiVideoTransport {
  initialize(options: InitializeOptions): Promise<void>;
  destroy(): void;
  toggleAudio(): void;
  toggleVideo(): void;
  toggleScreenShare(): void;
  setAudioInputDevice(deviceId: string): Promise<void>;
  setVideoInputDevice(deviceId: string): Promise<void>;
  listDevices(): Promise<MediaDeviceOption[]>;
  runDeviceCheck(input: { cameraEnabled: boolean; microphoneEnabled: boolean }): Promise<DeviceCheckResult>;
  onConnectionQualityChange(handler: (value: number) => void): void;
  getConnectionQuality(): number | null;
}

type JitsiApi = {
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: unknown[]) => void) => void;
  dispose: () => void;
  setAudioInputDevice?: (deviceId: string) => Promise<void>;
  setVideoInputDevice?: (deviceId: string) => Promise<void>;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        lang: string;
        userInfo: { displayName: string; email?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => JitsiApi;
  }
}

let jitsiScriptPromise: Promise<void> | null = null;

function loadJitsiScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Jitsi transport must run in browser"));
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  if (jitsiScriptPromise) {
    return jitsiScriptPromise;
  }

  jitsiScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi external API"));
    document.body.appendChild(script);
  });

  return jitsiScriptPromise;
}

async function applyInputDevice(api: JitsiApi, kind: "audio" | "video", deviceId: string) {
  if (!deviceId) return;

  if (kind === "audio" && typeof api.setAudioInputDevice === "function") {
    await api.setAudioInputDevice(deviceId);
    return;
  }
  if (kind === "video" && typeof api.setVideoInputDevice === "function") {
    await api.setVideoInputDevice(deviceId);
    return;
  }

  api.executeCommand(kind === "audio" ? "setAudioInputDevice" : "setVideoInputDevice", deviceId);
}

export function createJitsiVideoTransport(): JitsiVideoTransport {
  let api: JitsiApi | null = null;
  let connectionQuality: number | null = null;
  let qualityHandler: ((value: number) => void) | null = null;

  const handleConnectionQualityChanged = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    connectionQuality = Math.max(0, Math.min(100, Math.round(numeric)));
    if (qualityHandler) qualityHandler(connectionQuality);
  };

  return {
    async initialize(options) {
      await loadJitsiScript();
      if (!window.JitsiMeetExternalAPI) {
        throw new Error("Jitsi API unavailable after script load");
      }

      if (api) {
        api.removeListener("connectionQualityChanged", handleConnectionQualityChanged);
        api.dispose();
      }

      api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: options.roomName,
        parentNode: options.container,
        lang: options.locale,
        userInfo: {
          displayName: options.identity.displayName,
          email: options.identity.email,
        },
        configOverwrite: {
          prejoinPageEnabled: true,
          startWithAudioMuted: options.startWithAudioMuted,
          startWithVideoMuted: options.startWithVideoMuted,
          disableDeepLinking: true,
          enableNoisyMicDetection: true,
          disableModeratorIndicator: false,
          enableLayerSuspension: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
          DEFAULT_LOCAL_DISPLAY_NAME: options.identity.displayName,
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "hangup",
            "chat",
            "participants-pane",
            "settings",
            "tileview",
            "select-background",
            "raisehand",
          ],
        },
      });

      api.addListener("connectionQualityChanged", handleConnectionQualityChanged);
    },

    destroy() {
      if (!api) return;
      api.removeListener("connectionQualityChanged", handleConnectionQualityChanged);
      api.dispose();
      api = null;
      connectionQuality = null;
    },

    toggleAudio() {
      if (!api) return;
      api.executeCommand("toggleAudio");
    },

    toggleVideo() {
      if (!api) return;
      api.executeCommand("toggleVideo");
    },

    toggleScreenShare() {
      if (!api) return;
      api.executeCommand("toggleShareScreen");
    },

    async setAudioInputDevice(deviceId: string) {
      if (!api) return;
      await applyInputDevice(api, "audio", deviceId);
    },

    async setVideoInputDevice(deviceId: string) {
      if (!api) return;
      await applyInputDevice(api, "video", deviceId);
    },

    async listDevices() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((device) => device.kind === "audioinput" || device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          kind: device.kind as "audioinput" | "videoinput",
          label: device.label || (device.kind === "audioinput" ? "Microphone" : "Camera"),
        }));
    },

    async runDeviceCheck(input) {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return {
          cameraReady: false,
          microphoneReady: false,
          checkedAt: new Date().toISOString(),
        };
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: input.cameraEnabled,
          audio: input.microphoneEnabled,
        });

        const cameraReady = input.cameraEnabled
          ? stream.getVideoTracks().some((track) => track.readyState === "live")
          : true;
        const microphoneReady = input.microphoneEnabled
          ? stream.getAudioTracks().some((track) => track.readyState === "live")
          : true;

        return {
          cameraReady,
          microphoneReady,
          checkedAt: new Date().toISOString(),
        };
      } catch {
        return {
          cameraReady: false,
          microphoneReady: false,
          checkedAt: new Date().toISOString(),
        };
      } finally {
        stream?.getTracks().forEach((track) => track.stop());
      }
    },

    onConnectionQualityChange(handler) {
      qualityHandler = handler;
      if (connectionQuality !== null) {
        qualityHandler(connectionQuality);
      }
    },

    getConnectionQuality() {
      return connectionQuality;
    },
  };
}
