import { useCallback } from 'react';

interface UseTimeConversionArgs {
  containerWidth: number | undefined;
  viewStart: number;
  viewDuration: number;
}

export function useTimeConversion({
  containerWidth,
  viewStart,
  viewDuration,
}: UseTimeConversionArgs) {
  const timeToPixel = useCallback(
    (time: number, widthOverride?: number) => {
      const width = widthOverride ?? containerWidth ?? 1000;
      const pixel = ((time - viewStart) / viewDuration) * width;
      return Math.max(5, Math.min(width - 5, pixel));
    },
    [containerWidth, viewDuration, viewStart],
  );

  const timeToPixelUnclamped = useCallback(
    (time: number, widthOverride?: number) => {
      const width = widthOverride ?? containerWidth ?? 1000;
      return ((time - viewStart) / viewDuration) * width;
    },
    [containerWidth, viewDuration, viewStart],
  );

  const pixelToTime = useCallback(
    (pixel: number, widthOverride?: number) => {
      const width = widthOverride ?? containerWidth ?? 1000;
      return viewStart + (pixel / width) * viewDuration;
    },
    [containerWidth, viewDuration, viewStart],
  );

  return { timeToPixel, timeToPixelUnclamped, pixelToTime };
}
