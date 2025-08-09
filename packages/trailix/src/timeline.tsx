'use client';

import React from 'react';
import { useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import ZoomIn from './icons/zoom-in';
import ZoomOut from './icons/zoom-out';
import Minus from './icons/minus';
import './style.css';
import { useTimelineContext } from './context';
import { ColorStyle, TimelineSpan } from './type';

interface TimelineProps {
  className?: string;
  snapToSpan?: boolean;
}

const SPAN_HEIGHT = 28;
const SPAN_MARGIN = 6;
const HEADER_HEIGHT = 50;
const ZOOM_FACTOR = 1.5;
const SNAP_MARGIN_PX = 32;

const Timeline = ({ className = '', snapToSpan = false }: TimelineProps) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  const {
    spans,
    totalDuration,
    viewStart,
    viewEnd,
    onViewChange,
    levelStyles,
  } = useTimelineContext();

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
    const rawX = e.clientX - rect.left;

    let useX = rawX;
    if (snapToSpan && flatSpans.length > 0) {
      const boundaries = flatSpans.flatMap((span) => {
        const startPx = timeToPixel(span.startTime, rect.width);
        const endPx = timeToPixel(span.startTime + span.duration, rect.width);
        return [startPx, endPx];
      });
      let nearest = boundaries[0];
      for (const px of boundaries) {
        if (Math.abs(px - rawX) < Math.abs(nearest - rawX)) {
          nearest = px;
        }
      }
      if (Math.abs(nearest - rawX) <= SNAP_MARGIN_PX) {
        useX = nearest;
      }
    }

    const time = pixelToTime(useX, rect.width);
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

  const getLevelStyle = (level: number): ColorStyle => {
    const idx = level % levelStyles.length;
    return levelStyles[idx];
  };

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
                left: `${timeToPixel(
                  mousePosition,
                  containerRef.current?.clientWidth || 0,
                )}px`,
              }}
            >
              {(() => {
                const containerWidth =
                  containerRef.current?.clientWidth || 1000;
                const mouseLeftPx = timeToPixel(mousePosition, containerWidth);
                const tooltipWidth = estimateLabelWidth(mousePosition);
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
                    {formatTime(mousePosition)}
                  </div>
                );
              })()}
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

            const level = span.level || 0;
            const styleDef = getLevelStyle(level);

            return (
              <div
                key={span.id}
                className="timeline-span"
                style={{
                  top: index * (SPAN_HEIGHT + SPAN_MARGIN) + 10,
                  left: `${leftPosition}px`,
                  width: `${width}px`,
                  maxWidth: `${containerWidth - leftPosition}px`,
                  background: styleDef.background,
                  color: styleDef.color,
                  border: styleDef.border,
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
};

export { Timeline };
