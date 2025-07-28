'use client';

import React from 'react';
import { useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import ZoomIn from './icons/zoom-in';
import ZoomOut from './icons/zoom-out';
import Minus from './icons/minus';
import './style.css';
import { useTimelineContext } from './context';

export interface TimelineSpan {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  children?: TimelineSpan[];
  level?: number;
  metadata?: Record<string, any>;
}

interface TimelinePreviewProps {
  className?: string;
}

export function TimelinePreview({ className = '' }: TimelinePreviewProps) {
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
}

function getSpanPreviewColor(span: TimelineSpan & { level: number }) {
  const colors = [
    '#9ca3af', // gray-400
    '#d1d5db', // gray-300
    '#e5e7eb', // gray-200
    '#f3f4f6', // gray-100
    '#6b7280', // gray-500
  ];
  const colorIndex = (span.level || 0) % colors.length;
  return colors[colorIndex];
}

interface TimelineProps {
  className?: string;
}

const SPAN_HEIGHT = 28;
const SPAN_MARGIN = 6;
const HEADER_HEIGHT = 50;
const ZOOM_FACTOR = 1.5;

export function Timeline({ className = '' }: TimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  const { spans, totalDuration, viewStart, viewEnd, onViewChange } =
    useTimelineContext();

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [mousePosition, setMousePosition] = useState<number | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewDuration = viewEnd - viewStart;

  const timeToPixel = useCallback(
    (time: number, containerWidth?: number) => {
      const width = containerWidth || containerDimensions.width || 1000;
      const pixel = ((time - viewStart) / viewDuration) * width;
      return Math.max(5, Math.min(width - 5, pixel));
    },
    [viewStart, viewDuration, containerDimensions.width],
  );

  const pixelToTime = useCallback(
    (pixel: number, containerWidth?: number) => {
      const width = containerWidth || containerDimensions.width || 1000;
      return viewStart + (pixel / width) * viewDuration;
    },
    [viewStart, viewDuration, containerDimensions.width],
  );

  const flattenSpans = useCallback(
    (
      spans: TimelineSpan[],
      level = 0,
    ): Array<TimelineSpan & { level: number }> => {
      const result: Array<TimelineSpan & { level: number }> = [];
      spans.forEach((span) => {
        result.push({ ...span, level });
        if (span.children) {
          result.push(...flattenSpans(span.children, level + 1));
        }
      });
      return result;
    },
    [],
  );

  const flatSpans = useMemo(() => flattenSpans(spans), [spans, flattenSpans]);

  const handleSpanClick = (span: TimelineSpan & { level: number }) => {
    const spanStart = span.startTime;
    const spanEnd = Math.min(totalDuration, span.startTime + span.duration);
    const spanLength = spanEnd - spanStart;

    const paddingRatio = 0.1;
    const padding = spanLength * paddingRatio;

    const newStart = Math.max(0, spanStart - padding);
    const newEnd = Math.min(totalDuration, spanEnd + padding);

    onViewChange(newStart, newEnd);

    const oldDuration = viewDuration;
    const newDuration = newEnd - newStart;
    const ratio = oldDuration / newDuration;
    setZoomLevel((prev) => prev * ratio);
  };

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && timelineRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const timelineRect = timelineRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: containerRect.width,
          height: timelineRect.height,
        });
        setForceUpdate((prev) => prev + 1);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const timeoutId = setTimeout(updateDimensions, 100);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x, rect.width);
    setMousePosition(time);

    if (isSelecting) {
      setSelectionEnd(time);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x, rect.width);

    setIsSelecting(true);
    setSelectionStart(time);
    setSelectionEnd(time);
  };

  const handleMouseUp = () => {
    if (
      isSelecting &&
      Math.abs(selectionEnd - selectionStart) > viewDuration * 0.01
    ) {
      const newStart = Math.min(selectionStart, selectionEnd);
      const newEnd = Math.max(selectionStart, selectionEnd);

      if (timelineRef.current) {
        timelineRef.current.style.transition =
          'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      if (containerRef.current) {
        containerRef.current.style.transition =
          'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }

      onViewChange(Math.max(0, newStart), Math.min(totalDuration, newEnd));
      setZoomLevel(zoomLevel * (totalDuration / (newEnd - newStart)));

      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.style.transition = '';
        }
        if (containerRef.current) {
          containerRef.current.style.transition = '';
        }
      }, 300);
    }

    setIsSelecting(false);
    setSelectionStart(0);
    setSelectionEnd(0);
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(0);
      setSelectionEnd(0);
    }
  };

  const zoomIn = () => {
    const center = (viewStart + viewEnd) / 2;
    const newDuration = viewDuration / ZOOM_FACTOR;
    const newStart = Math.max(0, center - newDuration / 2);
    const newEnd = Math.min(totalDuration, center + newDuration / 2);

    if (timelineRef.current) {
      timelineRef.current.style.transition =
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    if (containerRef.current) {
      containerRef.current.style.transition =
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    onViewChange(newStart, newEnd);
    setZoomLevel(zoomLevel * ZOOM_FACTOR);

    setTimeout(() => {
      if (timelineRef.current) {
        timelineRef.current.style.transition = '';
      }
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
    }, 300);
  };

  const zoomOut = () => {
    const center = (viewStart + viewEnd) / 2;
    const newDuration = viewDuration * ZOOM_FACTOR;
    const newStart = Math.max(0, center - newDuration / 2);
    const newEnd = Math.min(totalDuration, center + newDuration / 2);

    if (timelineRef.current) {
      timelineRef.current.style.transition =
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    if (containerRef.current) {
      containerRef.current.style.transition =
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    onViewChange(newStart, newEnd);
    setZoomLevel(zoomLevel / ZOOM_FACTOR);

    setTimeout(() => {
      if (timelineRef.current) {
        timelineRef.current.style.transition = '';
      }
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
    }, 300);
  };

  const resetZoom = () => {
    if (timelineRef.current) {
      timelineRef.current.style.transition =
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    if (containerRef.current) {
      containerRef.current.style.transition =
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    onViewChange(0, totalDuration);
    setZoomLevel(1);

    setTimeout(() => {
      if (timelineRef.current) {
        timelineRef.current.style.transition = '';
      }
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
    }, 300);
  };

  const getSpanClassName = (span: TimelineSpan & { level: number }): string => {
    const level = (span.level || 0) % 5;
    return `timeline-span timeline-span-level-${level}`;
  };

  const formatTime = (time: number) => {
    if (time < 1000) {
      if (viewDuration < 10) {
        return `${time.toFixed(3)}ms`;
      } else if (viewDuration < 100) {
        return `${time.toFixed(2)}ms`;
      } else {
        return `${time.toFixed(1)}ms`;
      }
    } else {
      const seconds = time / 1000;
      if (seconds < 10) {
        return `${seconds.toFixed(1)}s`;
      } else if (seconds < 60) {
        return `${Math.round(seconds)}s`;
      } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m${remainingSeconds}s`;
      }
    }
  };

  const estimateLabelWidth = (time: number) => {
    const formatted = formatTime(time);
    return formatted.length * 9 + 20;
  };

  const timeMarkers = useMemo(() => {
    const markers = [];
    const containerWidth = containerRef.current?.clientWidth || 1000;

    if (containerWidth < 100) return [];

    const sampleTime = viewStart + viewDuration / 2;
    const sampleLabelWidth = estimateLabelWidth(sampleTime);
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
        const labelWidth = estimateLabelWidth(time);
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
      if (viewStart < firstMarker - bestStep * 0.3) {
        markers.unshift(viewStart);
      }
      if (viewEnd > lastMarker + bestStep * 0.3) {
        markers.push(viewEnd);
      }
    }

    const filteredMarkers = [];
    let lastLabelEnd = Number.NEGATIVE_INFINITY;

    for (const time of markers) {
      const labelWidth = estimateLabelWidth(time);
      const labelStart = timeToPixel(time, containerWidth) - labelWidth / 2;
      const labelEnd = labelStart + labelWidth;

      if (labelStart < 5 || labelEnd > containerWidth - 5) {
        continue;
      }

      if (labelStart > lastLabelEnd + 10) {
        filteredMarkers.push(time);
        lastLabelEnd = labelEnd;
      }
    }

    if (filteredMarkers.length === 0) {
      const startLabelWidth = estimateLabelWidth(viewStart);
      const endLabelWidth = estimateLabelWidth(viewEnd);
      if (startLabelWidth <= containerWidth - 10) {
        filteredMarkers.push(viewStart);
      }
      if (endLabelWidth <= containerWidth - 10 && viewEnd !== viewStart) {
        filteredMarkers.push(viewEnd);
      }
    }

    return filteredMarkers;
  }, [
    viewStart,
    viewEnd,
    viewDuration,
    containerRef.current?.clientWidth,
    timeToPixel,
  ]);

  return (
    <div className={`timeline-container ${className}`}>
      {/* Header with time markers */}
      <div className="timeline-header">
        <div
          ref={containerRef}
          className="timeline-header-container"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Time markers */}
          {timeMarkers.map((time, index) => {
            const leftPosition = timeToPixel(
              time,
              containerRef.current?.clientWidth || 0,
            );
            const labelWidth = estimateLabelWidth(time);
            const containerWidth = containerRef.current?.clientWidth || 1000;

            let labelLeft = '-50%';
            let transform = 'translateX(50%)';

            const labelStart = leftPosition - labelWidth / 2;
            const labelEnd = leftPosition + labelWidth / 2;

            if (labelStart < 5) {
              labelLeft = '5px';
              transform = 'none';
            } else if (labelEnd > containerWidth - 5) {
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
                  style={{
                    left: labelLeft,
                    transform: transform,
                  }}
                >
                  {formatTime(time)}
                </span>
              </div>
            );
          })}

          {/* Mouse position line */}
          {mousePosition !== null && (
            <div
              className="timeline-mouse-line"
              style={{
                left: `${timeToPixel(mousePosition, containerRef.current?.clientWidth || 0)}px`,
              }}
            >
              <div className="timeline-mouse-tooltip">
                {formatTime(mousePosition)}
              </div>
            </div>
          )}

          {/* Selection overlay */}
          {isSelecting && (
            <div
              className="timeline-selection-overlay"
              style={{
                left: `${timeToPixel(Math.min(selectionStart, selectionEnd), containerRef.current?.clientWidth || 0)}px`,
                width: `${Math.abs(timeToPixel(selectionEnd, containerRef.current?.clientWidth || 0) - timeToPixel(selectionStart, containerRef.current?.clientWidth || 0))}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* Timeline content */}
      <div className="timeline-content">
        <div
          ref={timelineRef}
          className="timeline-inner"
          style={{
            height: flatSpans.length * (SPAN_HEIGHT + SPAN_MARGIN) + 20,
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Spans */}
          {flatSpans.map((span, index) => {
            const spanStart = Math.max(viewStart, span.startTime);
            const spanEnd = Math.min(viewEnd, span.startTime + span.duration);
            const isVisible = spanEnd > spanStart;

            if (!isVisible) return null;

            const leftPosition = timeToPixel(
              spanStart,
              timelineRef.current?.clientWidth || 0,
            );
            const width =
              timeToPixel(spanEnd, timelineRef.current?.clientWidth || 0) -
              leftPosition;
            const containerWidth = timelineRef.current?.clientWidth || 1000;

            return (
              <div
                key={span.id}
                className={getSpanClassName(span)}
                style={{
                  top: index * (SPAN_HEIGHT + SPAN_MARGIN) + 10,
                  left: `${leftPosition}px`,
                  width: `${width}px`,
                  maxWidth: `${containerWidth - leftPosition}px`,
                }}
                title={`${span.name} (${formatTime(span.duration)})`}
                onClick={() => handleSpanClick(span)}
              >
                <span className="timeline-span-name">{span.name}</span>
                <span className="timeline-span-duration">
                  {formatTime(span.duration)}
                </span>
              </div>
            );
          })}

          {/* Mouse position line for content area */}
          {mousePosition !== null && (
            <div
              className="timeline-mouse-line-content"
              style={{
                left: `${timeToPixel(mousePosition, timelineRef.current?.clientWidth || 0)}px`,
              }}
            />
          )}

          {/* Selection overlay for content area */}
          {isSelecting && (
            <div
              className="timeline-selection-overlay-content"
              style={{
                left: `${timeToPixel(Math.min(selectionStart, selectionEnd), timelineRef.current?.clientWidth || 0)}px`,
                width: `${Math.abs(timeToPixel(selectionEnd, containerRef.current?.clientWidth || 0) - timeToPixel(selectionStart, containerRef.current?.clientWidth || 0))}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="timeline-controls">
        <button
          className="timeline-control-button"
          onClick={zoomIn}
          disabled={zoomLevel >= 100}
        >
          <ZoomIn className="timeline-control-icon" />
        </button>
        <button className="timeline-control-button" onClick={resetZoom}>
          <Minus className="timeline-control-icon" />
        </button>
        <button
          className="timeline-control-button"
          onClick={zoomOut}
          disabled={zoomLevel <= 0.1}
        >
          <ZoomOut className="timeline-control-icon" />
        </button>
      </div>
    </div>
  );
}
