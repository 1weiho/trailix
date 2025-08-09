import React from 'react';
import type { ColorStyle, TimelineSpan } from '../type';

interface FlattenedSpan extends TimelineSpan {
  level: number;
}

interface TimelineContentProps {
  spans: FlattenedSpan[];
  timeToPixel: (time: number, widthOverride?: number) => number;
  viewStart: number;
  viewEnd: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
  onSpanClick: (span: FlattenedSpan) => void;
  formatTime: (time: number) => string;
  getLevelStyle: (level: number) => ColorStyle;
  mousePosition: number | null;
  isSelecting: boolean;
  selectionStart: number;
  selectionEnd: number;
}

const SPAN_HEIGHT = 28;
const SPAN_MARGIN = 6;

export function TimelineContent({
  spans,
  timeToPixel,
  viewStart,
  viewEnd,
  containerRef,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  onSpanClick,
  formatTime,
  getLevelStyle,
  mousePosition,
  isSelecting,
  selectionStart,
  selectionEnd,
}: TimelineContentProps) {
  const innerHeight = spans.length * (SPAN_HEIGHT + SPAN_MARGIN) + 36;
  return (
    <div className="timeline-content">
      <div
        ref={containerRef}
        className="timeline-inner"
        style={{ height: innerHeight }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {spans.map((span, index) => {
          const spanStart = Math.max(viewStart, span.startTime);
          const spanEnd = Math.min(viewEnd, span.startTime + span.duration);
          const isVisible = spanEnd > spanStart;
          if (!isVisible) return null;

          const containerWidth = containerRef.current?.clientWidth || 0;
          const leftPosition = timeToPixel(spanStart, containerWidth);
          const width = timeToPixel(spanEnd, containerWidth) - leftPosition;

          const styleDef = getLevelStyle(span.level || 0);

          return (
            <div
              key={span.id}
              className="timeline-span"
              style={{
                top: index * (SPAN_HEIGHT + SPAN_MARGIN) + 10,
                left: `${leftPosition}px`,
                width: `${width}px`,
                maxWidth: `${Math.max(0, containerWidth - leftPosition)}px`,
                background: styleDef.background,
                color: styleDef.color,
                border: styleDef.border,
              }}
              title={`${span.name} (${formatTime(span.duration)})`}
              onClick={() => onSpanClick(span)}
            >
              <span className="timeline-span-name">{span.name}</span>
              <span className="timeline-span-duration">
                {formatTime(span.duration)}
              </span>
            </div>
          );
        })}

        {mousePosition !== null && (
          <div
            className="timeline-mouse-line-content"
            style={{
              left: `${timeToPixel(mousePosition, containerRef.current?.clientWidth || 0)}px`,
            }}
          />
        )}

        {isSelecting && (
          <div
            className="timeline-selection-overlay-content"
            style={{
              left: `${timeToPixel(Math.min(selectionStart, selectionEnd), containerRef.current?.clientWidth || 0)}px`,
              width: `${Math.abs(timeToPixel(selectionEnd, containerRef.current?.clientWidth || 0) - timeToPixel(selectionStart, containerRef.current?.clientWidth || 0))}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}
