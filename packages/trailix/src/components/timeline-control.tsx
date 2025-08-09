import React from 'react';
import ZoomIn from '../icons/zoom-in';
import ZoomOut from '../icons/zoom-out';
import Minus from '../icons/minus';

interface TimelineControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function TimelineControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
}: TimelineControlsProps) {
  return (
    <div className="timeline-controls">
      <button
        className="timeline-control-button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
      >
        <ZoomIn className="timeline-control-icon" />
      </button>
      <button className="timeline-control-button" onClick={onReset}>
        <Minus className="timeline-control-icon" />
      </button>
      <button
        className="timeline-control-button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
      >
        <ZoomOut className="timeline-control-icon" />
      </button>
    </div>
  );
}
