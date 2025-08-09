import React from 'react';
import { useMarkers } from '../hooks/use-markers';
import { formatTimeAdaptive, estimateLabelWidthPx } from '../utils/time';

interface TimelineHeaderProps {
  viewStart: number;
  viewEnd: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  timeToPixel: (time: number, widthOverride?: number) => number;
  mousePosition: number | null;
  isSelecting: boolean;
  selectionStart: number;
  selectionEnd: number;
}

export function TimelineHeader({
  viewStart,
  viewEnd,
  containerRef,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  timeToPixel,
  mousePosition,
  isSelecting,
  selectionStart,
  selectionEnd,
}: TimelineHeaderProps) {
  const containerWidth = containerRef.current?.clientWidth || 0;
  const viewDuration = viewEnd - viewStart;
  const timeMarkers = useMarkers({
    viewStart,
    viewEnd,
    containerWidth,
    timeToPixel,
  });

  return (
    <div className="timeline-header">
      <div
        ref={containerRef}
        className="timeline-header-container"
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {timeMarkers.map((time) => {
          const leftPosition = timeToPixel(time, containerWidth);
          const labelWidth = estimateLabelWidthPx(
            formatTimeAdaptive(time, viewDuration),
          );
          const containerWidthLocal = containerWidth || 1000;

          let labelLeft = '-50%';
          let transform = 'translateX(50%)';

          const labelStart = leftPosition - labelWidth / 2;
          const labelEnd = leftPosition + labelWidth / 2;

          if (labelStart < 5) {
            labelLeft = '5px';
            transform = 'none';
          } else if (labelEnd > containerWidthLocal - 5) {
            labelLeft = `-${labelWidth - 5}px`;
            transform = 'none';
          } else {
            labelLeft = '-50%';
            transform = 'translateX(50%)';
          }

          return (
            <div
              key={time}
              className="timeline-time-marker"
              style={{ left: `${leftPosition}px` }}
            >
              <span
                className="timeline-time-marker-label"
                style={{ left: labelLeft, transform }}
              >
                {formatTimeAdaptive(time, viewDuration)}
              </span>
            </div>
          );
        })}

        {mousePosition !== null && (
          <div
            className="timeline-mouse-line"
            style={{ left: `${timeToPixel(mousePosition, containerWidth)}px` }}
          >
            {(() => {
              const mouseLeftPx = timeToPixel(mousePosition, containerWidth);
              const tooltipWidth = estimateLabelWidthPx(
                formatTimeAdaptive(mousePosition, viewDuration),
              );
              const shouldFlipLeft =
                mouseLeftPx + 4 + tooltipWidth > containerWidth - 5;
              return (
                <div
                  className="timeline-mouse-tooltip"
                  style={{
                    left: shouldFlipLeft ? '0px' : '4px',
                    transform: shouldFlipLeft
                      ? 'translateX(calc(-100% - 4px))'
                      : 'none',
                  }}
                >
                  {formatTimeAdaptive(mousePosition, viewDuration)}
                </div>
              );
            })()}
          </div>
        )}

        {isSelecting && (
          <div
            className="timeline-selection-overlay"
            style={{
              left: `${timeToPixel(Math.min(selectionStart, selectionEnd), containerWidth)}px`,
              width: `${Math.abs(timeToPixel(selectionEnd, containerWidth) - timeToPixel(selectionStart, containerWidth))}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}
