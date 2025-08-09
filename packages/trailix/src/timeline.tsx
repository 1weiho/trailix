'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TimelineContent } from './components/timeline-content';
import { TimelineControls } from './components/timeline-control';
import { TimelineHeader } from './components/timeline-header';
import { useTimelineContext } from './context';
import { useTimeConversion } from './hooks/use-time-conversion';
import './style.css';
import { ColorStyle, TimelineSpan } from './type';
import { flattenSpans } from './utils/spans';
import { formatTimeAdaptive } from './utils/time';

interface TimelineProps {
  className?: string;
  snapToSpan?: boolean;
}

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

  const { timeToPixel, timeToPixelUnclamped, pixelToTime } = useTimeConversion({
    containerWidth: containerDimensions.width,
    viewStart,
    viewDuration,
  });

  const flatSpans = useMemo(() => flattenSpans(spans), [spans]);

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
    if (snapToSpan) {
      const candidateTimes = new Set<number>([viewStart, viewEnd]);
      for (const span of flatSpans) {
        candidateTimes.add(span.startTime);
        candidateTimes.add(span.startTime + span.duration);
      }

      const boundariesPx = Array.from(candidateTimes)
        .filter((t) => t >= viewStart && t <= viewEnd)
        .map((t) => timeToPixelUnclamped(t, rect.width));

      if (boundariesPx.length > 0) {
        let nearest = boundariesPx[0];
        for (const px of boundariesPx) {
          if (Math.abs(px - rawX) < Math.abs(nearest - rawX)) {
            nearest = px;
          }
        }
        if (Math.abs(nearest - rawX) <= SNAP_MARGIN_PX) {
          useX = nearest;
        }
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

  const formatTime = (time: number) => formatTimeAdaptive(time, viewDuration);

  // moved to TimelineHeader component via useMarkers hook

  const getLevelStyle = (level: number): ColorStyle => {
    const idx = level % levelStyles.length;
    return levelStyles[idx];
  };

  return (
    <div className={`timeline-container ${className}`}>
      <TimelineHeader
        viewStart={viewStart}
        viewEnd={viewEnd}
        containerRef={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        timeToPixel={timeToPixel}
        mousePosition={mousePosition}
        isSelecting={isSelecting}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
      />

      <TimelineContent
        spans={flatSpans}
        timeToPixel={timeToPixel}
        viewStart={viewStart}
        viewEnd={viewEnd}
        containerRef={timelineRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onSpanClick={handleSpanClick}
        formatTime={formatTime}
        getLevelStyle={getLevelStyle}
        mousePosition={mousePosition}
        isSelecting={isSelecting}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
      />

      <TimelineControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        canZoomIn={zoomLevel < 100}
        canZoomOut={zoomLevel > 0.1}
      />
    </div>
  );
};

export { Timeline };
