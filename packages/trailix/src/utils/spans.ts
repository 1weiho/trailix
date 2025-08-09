import type { TimelineSpan } from '../type';

export type FlattenedSpan = TimelineSpan & { level: number };

export function flattenSpans(
  spans: TimelineSpan[],
  level: number = 0,
): FlattenedSpan[] {
  const result: FlattenedSpan[] = [];
  for (const span of spans) {
    result.push({ ...span, level });
    if (span.children && span.children.length > 0) {
      result.push(...flattenSpans(span.children, level + 1));
    }
  }
  return result;
}
