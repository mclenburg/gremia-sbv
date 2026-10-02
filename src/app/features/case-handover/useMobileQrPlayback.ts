import { useEffect, useMemo, useState } from 'react';
import {
  MOBILE_QR_DEFAULT_SPEED,
  mobileQrFrameIntervalMs,
  mobileQrTransferTimeoutSeconds,
  nextLoopingQrFrameIndex,
  type MobileQrPlaybackSpeed,
} from './mobileQrPlaybackPolicy';

export function useMobileQrPlayback(sessionKey: string, frameCount: number) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [speed, setSpeed] = useState<MobileQrPlaybackSpeed>(MOBILE_QR_DEFAULT_SPEED);
  const [running, setRunning] = useState(frameCount > 1);
  const [aborted, setAborted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => mobileQrTransferTimeoutSeconds(frameCount));
  const expired = secondsLeft <= 0;

  useEffect(() => {
    setFrameIndex(0);
    setRunning(frameCount > 1);
    setAborted(false);
    setSecondsLeft(mobileQrTransferTimeoutSeconds(frameCount));
  }, [frameCount, sessionKey]);

  useEffect(() => {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) setRunning(false);
  }, [sessionKey]);

  useEffect(() => {
    if (!running || aborted || expired || frameCount <= 1) return undefined;
    const timerId = window.setInterval(() => {
      setFrameIndex((current) => nextLoopingQrFrameIndex(current, frameCount));
    }, mobileQrFrameIntervalMs(speed));
    return () => window.clearInterval(timerId);
  }, [aborted, expired, frameCount, running, speed]);

  useEffect(() => {
    if (!running || aborted || expired) return undefined;
    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [aborted, expired, running]);

  return useMemo(() => ({
    aborted,
    expired,
    frameIndex,
    running,
    secondsLeft,
    speed,
    abort: () => {
      setAborted(true);
      setRunning(false);
    },
    restart: () => {
      setFrameIndex(0);
      setAborted(false);
      setRunning(frameCount > 1);
      setSecondsLeft(mobileQrTransferTimeoutSeconds(frameCount));
    },
    setFrameIndex,
    setSpeed,
    toggleRunning: () => setRunning((current) => frameCount > 1 && !current),
  }), [aborted, expired, frameCount, frameIndex, running, secondsLeft, speed]);
}
