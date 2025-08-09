import { useMemo } from 'react';
import { estimateLabelWidthPx, formatTimeAdaptive } from '../utils/time';

interface UseMarkersArgs {
  viewStart: number;
  viewEnd: number;
  containerWidth: number;
  timeToPixel: (time: number, widthOverride?: number) => number;
}

export function useMarkers({
  viewStart,
  viewEnd,
  containerWidth,
  timeToPixel,
}: UseMarkersArgs) {
  const viewDuration = viewEnd - viewStart;

  return useMemo(() => {
    const markers: number[] = [];
    if (!containerWidth || containerWidth < 100) return [];

    const sampleTime = viewStart + viewDuration / 2;
    const sampleLabelWidth = estimateLabelWidthPx(
      formatTimeAdaptive(sampleTime, viewDuration),
    );
    const maxLabels = Math.floor(containerWidth / (sampleLabelWidth + 30));
    const targetLabels = Math.min(maxLabels, 12);

    if (targetLabels < 2) {
      return [viewStart, viewEnd].filter(
        (time) => time >= viewStart && time <= viewEnd,
      );
    }

    const idealStep = viewDuration / (targetLabels - 1);
    const stepSizes = [
      0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25,
      50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000,
      50000, 100000,
    ];

    let bestStep = stepSizes[0];
    for (const step of stepSizes) {
      if (step >= idealStep) {
        bestStep = step;
        break;
      }
      bestStep = step;
    }

    const startMarker = Math.ceil(viewStart / bestStep) * bestStep;
    const endMarker = Math.floor(viewEnd / bestStep) * bestStep;

    for (let time = startMarker; time <= endMarker; time += bestStep) {
      if (time >= viewStart && time <= viewEnd) {
        const markerPosition = timeToPixel(time, containerWidth);
        const labelWidth = estimateLabelWidthPx(
          formatTimeAdaptive(time, viewDuration),
        );
        if (
          markerPosition >= labelWidth / 2 + 5 &&
          markerPosition <= containerWidth - labelWidth / 2 - 5
        ) {
          markers.push(time);
        }
      }
    }

    if (markers.length > 0) {
      const firstMarker = markers[0];
      const lastMarker = markers[markers.length - 1];
      if (viewStart < firstMarker - bestStep * 0.3) markers.unshift(viewStart);
      if (viewEnd > lastMarker + bestStep * 0.3) markers.push(viewEnd);
    }

    const filteredMarkers: number[] = [];
    let lastLabelEnd = Number.NEGATIVE_INFINITY;

    for (const time of markers) {
      const labelWidth = estimateLabelWidthPx(
        formatTimeAdaptive(time, viewDuration),
      );
      const labelStart = timeToPixel(time, containerWidth) - labelWidth / 2;
      const labelEnd = labelStart + labelWidth;

      if (labelStart < 5 || labelEnd > containerWidth - 5) continue;

      if (labelStart > lastLabelEnd + 10) {
        filteredMarkers.push(time);
        lastLabelEnd = labelEnd;
      }
    }

    if (filteredMarkers.length === 0) {
      const startLabelWidth = estimateLabelWidthPx(
        formatTimeAdaptive(viewStart, viewDuration),
      );
      const endLabelWidth = estimateLabelWidthPx(
        formatTimeAdaptive(viewEnd, viewDuration),
      );
      if (startLabelWidth <= containerWidth - 10)
        filteredMarkers.push(viewStart);
      if (endLabelWidth <= containerWidth - 10 && viewEnd !== viewStart)
        filteredMarkers.push(viewEnd);
    }

    return filteredMarkers;
  }, [containerWidth, timeToPixel, viewDuration, viewStart, viewEnd]);
}
