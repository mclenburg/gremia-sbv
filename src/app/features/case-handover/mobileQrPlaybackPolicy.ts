export type MobileQrPlaybackSpeed = 'compatible' | 'standard' | 'fast';

export const MOBILE_QR_PLAYBACK_SPEED_OPTIONS: Array<{
  value: MobileQrPlaybackSpeed;
  label: string;
  frameIntervalMs: number;
}> = [
  { value: 'compatible', label: 'Kompatibel · 1 Frame/s', frameIntervalMs: 1000 },
  { value: 'standard', label: 'Standard · 2 Frames/s', frameIntervalMs: 500 },
  { value: 'fast', label: 'Schnell · 3 Frames/s', frameIntervalMs: 333 },
];

export const MOBILE_QR_DEFAULT_SPEED: MobileQrPlaybackSpeed = 'standard';

export function mobileQrFrameIntervalMs(speed: MobileQrPlaybackSpeed): number {
  return MOBILE_QR_PLAYBACK_SPEED_OPTIONS.find((option) => option.value === speed)?.frameIntervalMs ?? 500;
}

export function nextLoopingQrFrameIndex(current: number, frameCount: number): number {
  if (frameCount <= 1) return 0;
  return (current + 1) % frameCount;
}

export function mobileQrTransferTimeoutSeconds(frameCount: number): number {
  return Math.min(Math.max(frameCount * 4, 120), 600);
}
