import { NextRequest, NextResponse } from 'next/server';
import {
  createIncident,
  getIncidents,
  getIncidentStats,
  acknowledgeIncident,
  updateIncidentStatus,
  onIncident,
} from '@/lib/incidents/engine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'list';

  if (mode === 'stats') {
    return NextResponse.json(getIncidentStats());
  }

  if (mode === 'stream') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

        const unsubscribe = onIncident((incident) => {
          const data = JSON.stringify(incident);
          controller.enqueue(encoder.encode(`event: incident\ndata: ${data}\n\n`));
        });

        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'));
        }, 30000);

        request.signal.addEventListener('abort', () => {
          unsubscribe();
          clearInterval(keepAlive);
          controller.close();
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const status = searchParams.get('status') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const source = searchParams.get('source') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const incidents = getIncidents({ status, severity, source, limit });
  return NextResponse.json({ incidents, total: incidents.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'ingest') {
      const incident = createIncident({
        title: body.title,
        description: body.description || '',
        source: body.source || 'osiris-ingest',
        location: body.location,
        entities: body.entities,
        tags: body.tags,
        timestamp: body.timestamp,
      });

      if (!incident) {
        return NextResponse.json({ error: 'Duplicate incident', code: 'DUPLICATE' }, { status: 409 });
      }

      return NextResponse.json({ incident, message: 'Incident created' }, { status: 201 });
    }

    if (action === 'acknowledge') {
      const incident = acknowledgeIncident(body.id);
      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      return NextResponse.json({ incident });
    }

    if (action === 'update-status') {
      const incident = updateIncidentStatus(body.id, body.status);
      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      return NextResponse.json({ incident });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
