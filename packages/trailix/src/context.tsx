'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ColorStyle, TimelineSpan } from './type';

interface TimelineContextType {
  spans: TimelineSpan[];
  totalDuration: number;
  viewStart: number;
  viewEnd: number;
  onViewChange: (start: number, end: number) => void;
  levelStyles: ColorStyle[];
}

const TimelineContext = createContext<TimelineContextType | undefined>(
  undefined,
);

interface TimelineProviderProps {
  spans: TimelineSpan[];
  totalDuration: number;
  initialStart?: number;
  initialEnd?: number;
  levelStyles?: ColorStyle[];
  children: ReactNode;
}

export function TimelineProvider({
  spans,
  totalDuration,
  initialStart = 0,
  initialEnd = totalDuration,
  levelStyles = [
    { background: '#374151', color: 'white' },
    { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
    { background: '#e5e7eb', color: '#1f2937', border: '1px solid #d1d5db' },
    { background: '#d1d5db', color: '#1f2937', border: '1px solid #9ca3af' },
    { background: '#4b5563', color: 'white' },
  ],
  children,
}: TimelineProviderProps) {
  const [viewStart, setViewStart] = useState(initialStart);
  const [viewEnd, setViewEnd] = useState(initialEnd);

  const handleViewChange = (start: number, end: number) => {
    setViewStart(start);
    setViewEnd(end);
  };

  return (
    <TimelineContext.Provider
      value={{
        spans,
        totalDuration,
        viewStart,
        viewEnd,
        onViewChange: handleViewChange,
        levelStyles,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimelineContext() {
  const ctx = useContext(TimelineContext);
  if (!ctx)
    throw new Error('useTimelineContext must be used within TimelineProvider');
  return ctx;
}
