'use client';

import Link from 'next/link';
import { Timeline, TimelineProvider, type TimelineSpan } from 'trailix';

export default function HomePage() {
  const spans: TimelineSpan[] = [
    {
      id: 'root-load',
      name: 'Load Page',
      startTime: 0,
      duration: 2000,
      children: [
        {
          id: 'init',
          name: 'Init',
          startTime: 0,
          duration: 120,
        },
        {
          id: 'fetch',
          name: 'Fetch Data',
          startTime: 120,
          duration: 820,
          children: [
            {
              id: 'api',
              name: 'API Request',
              startTime: 160,
              duration: 520,
            },
            {
              id: 'parse',
              name: 'Parse JSON',
              startTime: 700,
              duration: 150,
            },
          ],
        },
        {
          id: 'render',
          name: 'Render UI',
          startTime: 980,
          duration: 720,
          children: [
            {
              id: 'list',
              name: 'List / Virtualize',
              startTime: 1040,
              duration: 280,
            },
            {
              id: 'chart',
              name: 'Draw Chart',
              startTime: 1340,
              duration: 260,
            },
          ],
        },
        {
          id: 'hydrate',
          name: 'Hydrate',
          startTime: 1740,
          duration: 180,
        },
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics',
      startTime: 1820,
      duration: 300,
    },
  ];

  const totalDuration = 2200;

  return (
    <main className="flex flex-1 flex-col items-center text-center gap-20 py-16">
      <div className="flex max-w-3xl flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Visualize timelines with Trailix
        </h1>
        <p className="text-fd-muted-foreground text-balance">
          Lightweight, interactive timeline components for product demos,
          performance traces, and UX walkthroughs.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="/docs"
            className="rounded-md bg-fd-foreground px-4 py-2 text-sm font-medium text-fd-background"
          >
            Read the docs
          </Link>
          <a
            href="https://github.com/1weiho/trailix"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            GitHub
          </a>
        </div>
      </div>

      <div className="w-full max-w-5xl">
        <div className="rounded-xl border bg-fd-card p-2">
          <TimelineProvider
            spans={spans}
            totalDuration={totalDuration}
            initialStart={0}
            initialEnd={totalDuration}
          >
            <Timeline className="w-full" />
          </TimelineProvider>
        </div>
      </div>
    </main>
  );
}
