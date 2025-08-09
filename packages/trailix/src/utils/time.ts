export function formatTimeAdaptive(timeMs: number, viewDurationMs: number) {
  if (timeMs < 1000) {
    if (viewDurationMs < 10) return `${timeMs.toFixed(3)}ms`;
    if (viewDurationMs < 100) return `${timeMs.toFixed(2)}ms`;
    return `${timeMs.toFixed(1)}ms`;
  }
  const seconds = timeMs / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m${remainingSeconds}s`;
}

export function estimateLabelWidthPx(label: string) {
  return label.length * 9 + 20;
}
