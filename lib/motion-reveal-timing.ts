export const MAX_MOTION_REVEAL_DELAY_MS = 240;

export function normalizeMotionRevealDelayMs(
  value: number | undefined,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(value, MAX_MOTION_REVEAL_DELAY_MS);
}

export function getMotionRevealDelaySeconds(value: number | undefined): number {
  return normalizeMotionRevealDelayMs(value) / 1000;
}
