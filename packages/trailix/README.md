## Trailix

Trailix is a lightweight React timeline for visualizing nested spans, with an interactive mini‑map preview.

## Features

- **Interactive Timeline**: Hover tooltip, click‑drag select/zoom, click span to zoom
- **Preview Mini‑map**: Draggable viewport to pan
- **Snap to Spans**: Optional boundary snapping for precision

## Installation

```bash
pnpm i trailix
```

## Usage

Create a client component and wrap with the provider:

```tsx
'use client';

import { Timeline, TimelinePreview, TimelineProvider } from 'trailix';

const spans = [{ id: 'root', name: 'Load', startTime: 0, duration: 2000 }];

export default function Page() {
  return (
    <TimelineProvider spans={spans} totalDuration={2000}>
      <TimelinePreview />
      <Timeline />
    </TimelineProvider>
  );
}
```

## Documentation

Full API reference and examples: [https://trailix.1wei.dev/](https://trailix.1wei.dev/)
