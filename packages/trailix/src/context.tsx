'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { TimelineSpan } from './type';

interface TimelineContextType {
  spans: TimelineSpan[];
  totalDuration: number;
  viewStart: number;
  viewEnd: number;
  onViewChange: (start: number, end: number) => void;
}

const TimelineContext = createContext<TimelineContextType | undefined>(
  undefined,
);

interface TimelineProviderProps {
  spans: TimelineSpan[];
  totalDuration: number;
  initialStart?: number;
  initialEnd?: number;
  children: ReactNode;
}

export function TimelineProvider({
  spans,
  totalDuration,
  initialStart = 0,
  initialEnd = totalDuration,
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
