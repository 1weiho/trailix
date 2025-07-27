'use client';

import { useState } from 'react';
import { Timeline, TimelinePreview, type TimelineSpan } from 'trailix';

const deploymentSpans: TimelineSpan[] = [
  {
    id: 'vercel-deployment',
    name: 'Vercel Deployment',
    startTime: 0,
    duration: 45000, // 45 seconds total
    level: 0,
    children: [
      {
        id: 'git-clone',
        name: 'Git Clone',
        startTime: 500,
        duration: 2000,
        level: 1,
        children: [
          {
            id: 'fetch-repo',
            name: 'Fetch Repository',
            startTime: 800,
            duration: 1200,
            level: 2,
          },
          {
            id: 'extract-files',
            name: 'Extract Files',
            startTime: 2100,
            duration: 400,
            level: 2,
          },
        ],
      },
      {
        id: 'install-dependencies',
        name: 'Install Dependencies',
        startTime: 3000,
        duration: 8000,
        level: 1,
        children: [
          {
            id: 'npm-install',
            name: 'npm install',
            startTime: 3200,
            duration: 6000,
            level: 2,
          },
          {
            id: 'cache-deps',
            name: 'Cache Dependencies',
            startTime: 9300,
            duration: 700,
            level: 2,
          },
        ],
      },
      {
        id: 'build-process',
        name: 'Build Process',
        startTime: 12000,
        duration: 25000,
        level: 1,
        children: [
          {
            id: 'next-build',
            name: 'Next.js Build',
            startTime: 12500,
            duration: 18000,
            level: 2,
            children: [
              {
                id: 'compile-js',
                name: 'Compile JavaScript',
                startTime: 13000,
                duration: 8000,
                level: 3,
              },
              {
                id: 'optimize-images',
                name: 'Optimize Images',
                startTime: 22000,
                duration: 3000,
                level: 3,
              },
            ],
          },
          {
            id: 'generate-static',
            name: 'Generate Static Pages',
            startTime: 31000,
            duration: 4000,
            level: 2,
          },
          {
            id: 'create-manifest',
            name: 'Create Build Manifest',
            startTime: 36000,
            duration: 1000,
            level: 2,
          },
        ],
      },
      {
        id: 'deploy-to-edge',
        name: 'Deploy to Edge Network',
        startTime: 38000,
        duration: 7000,
        level: 1,
        children: [
          {
            id: 'upload-assets',
            name: 'Upload Assets',
            startTime: 38500,
            duration: 3000,
            level: 2,
          },
          {
            id: 'distribute-cdn',
            name: 'Distribute to CDN',
            startTime: 42000,
            duration: 2500,
            level: 2,
          },
          {
            id: 'update-routing',
            name: 'Update Edge Routing',
            startTime: 45000,
            duration: 2000,
            level: 2,
          },
        ],
      },
    ],
  },
];

export default function Page() {
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(45000);

  const handleViewChange = (start: number, end: number) => {
    setViewStart(start);
    setViewEnd(end);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Timeline Preview/Minimap */}
      <TimelinePreview
        spans={deploymentSpans}
        totalDuration={45000}
        viewStart={viewStart}
        viewEnd={viewEnd}
        onViewChange={handleViewChange}
        className="w-full"
      />

      {/* Main Timeline */}
      <div
        className="w-full overflow-hidden relative"
        style={{ maxWidth: '100%' }}
      >
        <Timeline
          spans={deploymentSpans}
          totalDuration={45000}
          viewStart={viewStart}
          viewEnd={viewEnd}
          onViewChange={handleViewChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
