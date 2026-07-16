export interface DeviceCheckResult {
  cameraReady: boolean;
  microphoneReady: boolean;
  checkedAt: string;
}

export interface VideoTransportAdapter {
  runDeviceCheck(input: { cameraEnabled: boolean; microphoneEnabled: boolean }): Promise<DeviceCheckResult>;
  transportName: string;
}

export function createMockVideoTransport(): VideoTransportAdapter {
  return {
    transportName: "mock-video-transport",
    async runDeviceCheck(input) {
      return {
        cameraReady: input.cameraEnabled,
        microphoneReady: input.microphoneEnabled,
        checkedAt: new Date().toISOString(),
      };
    },
  };
}
