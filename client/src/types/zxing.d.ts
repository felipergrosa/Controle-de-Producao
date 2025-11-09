declare module "@zxing/library" {
  export class Exception extends Error {}

  export class NotFoundException extends Exception {}

  export class Result {
    getText(): string;
  }
}

declare module "@zxing/browser" {
  import type { Exception, Result } from "@zxing/library";

  export interface IScannerControls {
    stop(): void;
  }

  export class BrowserMultiFormatReader {
    constructor(hints?: unknown, options?: unknown);

    decodeFromConstraints(
      constraints: MediaStreamConstraints,
      videoElement: HTMLVideoElement,
      callback?: (result: Result | null, error: Exception | null, controls: IScannerControls) => void
    ): Promise<IScannerControls>;

    decodeFromVideoDevice(
      deviceId: string | null,
      videoElement: HTMLVideoElement,
      callback?: (result: Result | null, error: Exception | null, controls: IScannerControls) => void
    ): Promise<IScannerControls>;

    reset(): void;

    static listVideoInputDevices(): Promise<MediaDeviceInfo[]>;
  }
}
