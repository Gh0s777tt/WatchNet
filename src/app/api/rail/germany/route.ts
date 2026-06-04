import { NextResponse } from 'next/server';
import {
  fetchGermanyRailInfrastructure,
  OVERPASS_INTERPRETER_URL,
  staticGermanyRailInfrastructure,
} from '@/lib/integrations/rail-germany';
import { errorSourceStatus, okSourceStatus } from '@/lib/integrations/source-metadata';

export const revalidate = 86400;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = clampNumber(Number(searchParams.get('limit') || 160), 1, 500);

  let infrastructure = staticGermanyRailInfrastructure();
  let overpassError: string | null = null;

  try {
    const overpassInfrastructure = await fetchGermanyRailInfrastructure(limit);
    if (overpassInfrastructure.length > 0) {
      infrastructure = mergeInfrastructure(overpassInfrastructure, infrastructure);
    }
  } catch (error) {
    overpassError = error instanceof Error ? error.message : String(error);
  }

  const stations = infrastructure.filter(item => item.kind !== 'line' && typeof item.lat === 'number' && typeof item.lng === 'number');
  const lines = infrastructure.filter(item => item.kind === 'line' && item.geometry);

  return NextResponse.json({
    infrastructure,
    stations,
    lines,
    stats: {
      total: infrastructure.length,
      facilities: stations.length,
      lines: lines.length,
      infrastructure_only: true,
    },
    partial: Boolean(overpassError),
    sources: {
      overpass: overpassError
        ? errorSourceStatus('OpenStreetMap/Overpass', `${overpassError}; returned static German rail hubs`, OVERPASS_INTERPRETER_URL)
        : okSourceStatus('OpenStreetMap/Overpass', OVERPASS_INTERPRETER_URL),
    },
    timestamp: new Date().toISOString(),
  });
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function mergeInfrastructure<T extends { id: string }>(primary: T[], fallback: T[]): T[] {
  const ids = new Set(primary.map(item => item.id));
  return [...primary, ...fallback.filter(item => !ids.has(item.id))];
}
