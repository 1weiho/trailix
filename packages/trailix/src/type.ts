export interface TimelineSpan {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  children?: TimelineSpan[];
  level?: number;
  metadata?: Record<string, any>;
}

export interface ColorStyle {
  background: string;
  color: string;
  border?: string;
}
