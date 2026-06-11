/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Collaborative Workspaces API
 *  CRUD for persistent mission workspaces
 *  Stores workspace snapshots as JSON files
 * ═══════════════════════════════════════════════════════════════
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data', 'workspaces');

async function ensureDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pinCount: number;
  layerCount: number;
  hasBriefing: boolean;
}

export interface Workspace extends WorkspaceMeta {
  pins: any[];
  activeLayers: Record<string, boolean>;
  mapView: { zoom: number; latitude: number; longitude: number };
  mapProjection: string;
  mapStyle: string;
  annotations: { text: string; createdAt: string; author: string }[];
  analysisHistory: { type: string; query: string; timestamp: string }[];
}

function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── LIST all workspaces ──
export async function GET() {
  try {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    const workspaces: WorkspaceMeta[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const ws: Workspace = JSON.parse(content);
        workspaces.push({
          id: ws.id,
          name: ws.name,
          createdBy: ws.createdBy,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
          pinCount: ws.pinCount,
          layerCount: ws.layerCount,
          hasBriefing: ws.hasBriefing,
        });
      } catch {}
    }
    return NextResponse.json({ workspaces: workspaces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, workspaces: [] }, { status: 500 });
  }
}

// ── CREATE or SAVE a workspace ──
export async function POST(req: NextRequest) {
  try {
    await ensureDir();
    const body = await req.json();
    const now = new Date().toISOString();
    const id = body.id || generateId();

    const meta: WorkspaceMeta = {
      id,
      name: body.name || 'Untitled Workspace',
      createdBy: body.createdBy || 'analyst',
      createdAt: body.createdAt || now,
      updatedAt: now,
      pinCount: Array.isArray(body.pins) ? body.pins.length : 0,
      layerCount: body.activeLayers ? Object.values(body.activeLayers).filter(Boolean).length : 0,
      hasBriefing: body.hasBriefing || false,
    };

    const workspace: Workspace = {
      ...meta,
      pins: body.pins || [],
      activeLayers: body.activeLayers || {},
      mapView: body.mapView || { zoom: 2.5, latitude: 20, longitude: 25.48 },
      mapProjection: body.mapProjection || 'globe',
      mapStyle: body.mapStyle || 'dark',
      annotations: body.annotations || [],
      analysisHistory: body.analysisHistory || [],
    };

    await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(workspace, null, 2));
    return NextResponse.json({ workspace: meta, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── LOAD a specific workspace by ID (via query param) ──
export async function PUT(req: NextRequest) {
  try {
    await ensureDir();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const filePath = path.join(DATA_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const workspace: Workspace = JSON.parse(content);
    return NextResponse.json({ workspace });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}

// ── DELETE a workspace ──
export async function DELETE(req: NextRequest) {
  try {
    await ensureDir();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath).catch(() => {});
    return NextResponse.json({ deleted: id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
