import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTimelineContext } from './context';
import './style.css';
import { TimelineSpan } from './type';

interface TimelinePreviewProps {
  className?: string;
}

const getSpanPreviewColor = (span: TimelineSpan & { level: number }) => {
  const colors = [
    '#9ca3af', // gray-400
    '#d1d5db', // gray-300
    '#e5e7eb', // gray-200
    '#f3f4f6', // gray-100
    '#6b7280', // gray-500
  ];
  const colorIndex = (span.level || 0) % colors.length;
  return colors[colorIndex];
};

const TimelinePreview = ({ className = '' }: TimelinePreviewProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [forcePreviewUpdate, setForcePreviewUpdate] = useState(0);

  const { spans, totalDuration, viewStart, viewEnd, onViewChange } =
    useTimelineContext();

  const layoutSpans = useMemo(() => {
    const flatten = (
      spans: TimelineSpan[],
      level = 0,
    ): Array<TimelineSpan & { level: number }> => {
      const result: Array<TimelineSpan & { level: number }> = [];
      spans.forEach((span) => {
        result.push({ ...span, level });
        if (span.children) {
          result.push(...flatten(span.children, level + 1));
        }
      });
      return result;
    };

    const flatSpans = flatten(spans);
    const sortedSpans = [...flatSpans].sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime - b.startTime;
      }
      return b.duration - a.duration;
    });

    const layoutedSpans: Array<TimelineSpan & { level: number; row: number }> =
      [];
    const occupiedRows: Array<{ endTime: number }> = [];

    sortedSpans.forEach((span) => {
      const spanEnd = span.startTime + span.duration;
      let assignedRow = 0;

      for (let row = 0; row < occupiedRows.length; row++) {
        if (occupiedRows[row].endTime <= span.startTime) {
          assignedRow = row;
          break;
        }
        assignedRow = row + 1;
      }

      while (occupiedRows.length <= assignedRow) {
        occupiedRows.push({ endTime: 0 });
      }

      occupiedRows[assignedRow].endTime = spanEnd;
      layoutedSpans.push({ ...span, row: assignedRow });
    });

    return {
      spans: layoutedSpans,
      totalRows: occupiedRows.length,
    };
  }, [spans]);

  useLayoutEffect(() => {
    const updatePreviewDimensions = () => {
      if (previewRef.current) {
        const rect = previewRef.current.getBoundingClientRect();
        setPreviewDimensions({
          width: rect.width,
          height: rect.height,
        });
        setForcePreviewUpdate((prev) => prev + 1);
      }
    };

    updatePreviewDimensions();
    window.addEventListener('resize', updatePreviewDimensions);
    const timeoutId = setTimeout(updatePreviewDimensions, 100);

    return () => {
      window.removeEventListener('resize', updatePreviewDimensions);
      clearTimeout(timeoutId);
    };
  }, []);

  const timeToPixel = useCallback(
    (time: number, containerWidth?: number) => {
      const width = containerWidth || previewDimensions.width || 1000;
      return (time / totalDuration) * width;
    },
    [totalDuration, previewDimensions.width],
  );

  const pixelToTime = useCallback(
    (pixel: number, containerWidth?: number) => {
      const width = containerWidth || previewDimensions.width || 1000;
      return (pixel / width) * totalDuration;
    },
    [totalDuration, previewDimensions.width],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = pixelToTime(x, rect.width);

    if (clickTime >= viewStart && clickTime <= viewEnd) {
      setIsDragging(true);
      setDragStart(clickTime);
      setDragOffset(clickTime - viewStart);
    } else {
      const viewDuration = viewEnd - viewStart;
      const newStart = Math.max(0, clickTime - viewDuration / 2);
      const newEnd = Math.min(totalDuration, newStart + viewDuration);
      onViewChange(newStart, newEnd);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const currentTime = pixelToTime(x, rect.width);
    const viewDuration = viewEnd - viewStart;
    const newStart = Math.max(
      0,
      Math.min(totalDuration - viewDuration, currentTime - dragOffset),
    );
    const newEnd = newStart + viewDuration;

    onViewChange(newStart, newEnd);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const previewHeight = Math.max(
    40,
    Math.min(80, 15 + layoutSpans.totalRows * 6),
  );
  const spanHeight = Math.max(
    3,
    Math.min(5, (previewHeight - 20) / Math.max(1, layoutSpans.totalRows)),
  );

  return (
    <div className={`timeline-preview-container ${className}`}>
      <div
        ref={previewRef}
        className="timeline-preview"
        style={{ height: previewHeight }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {layoutSpans.spans.map((span) => {
          const containerWidth = previewRef.current?.clientWidth || 0;
          const rawWidth = Math.max(
            3,
            timeToPixel(span.duration, containerWidth),
          );
          const rawLeft = timeToPixel(span.startTime, containerWidth);
          const left = Math.max(0, Math.min(containerWidth - 3, rawLeft));
          const rightEdge = left + rawWidth;
          const width =
            rightEdge > containerWidth
              ? Math.max(3, containerWidth - left)
              : rawWidth;

          if (left >= containerWidth || left + width <= 0) {
            return null;
          }

          return (
            <div
              key={span.id}
              className="timeline-preview-span"
              style={{
                left: `${left}px`,
                width: `${width}px`,
                top: `${8 + span.row * (spanHeight + 1)}px`,
                height: `${spanHeight}px`,
                backgroundColor: getSpanPreviewColor(span),
              }}
              title={`${span.name} (${span.duration.toFixed(2)}ms)`}
            />
          );
        })}

        {/* Viewport indicator */}
        <div
          className="timeline-preview-viewport"
          style={{
            left: `${Math.max(0, Math.min((previewRef.current?.clientWidth || 0) - 4, timeToPixel(viewStart, previewRef.current?.clientWidth || 0)))}px`,
            width: `${Math.max(4, Math.min(previewRef.current?.clientWidth || 0, timeToPixel(viewEnd - viewStart, previewRef.current?.clientWidth || 0)))}px`,
          }}
        >
          <div className="timeline-preview-viewport-handle timeline-preview-viewport-handle-left" />
          <div className="timeline-preview-viewport-handle timeline-preview-viewport-handle-right" />
        </div>
      </div>
    </div>
  );
};

export { TimelinePreview };
