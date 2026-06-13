'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Interactive Link Editor (React Flow)
 *  Manual relationship-mapping canvas for the Personal Ontology.
 *
 *  Inspired by the OSINT Mapping Tool's "Information tab": each
 *  person-data entity is a draggable, typed node; drag a handle to
 *  another node to wire a relationship by hand. Reads and writes the
 *  SAME personal-ontology store the force graph uses, so the two
 *  views stay in sync — this is purely an additional way to look at
 *  and edit the data, nothing is replaced.
 * ═══════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  PersonalEntity, PersonalRelationship,
  PERSONAL_TYPE_COLORS, PERSONAL_TYPE_LABELS, PERSONAL_TYPE_GLYPHS,
} from '@/lib/personal-ontology';

interface Props {
  entities: PersonalEntity[];
  relationships: PersonalRelationship[];
  /** Draw a new relationship between two entities. */
  onConnect: (sourceId: string, targetId: string) => void;
  /** Remove a relationship by id. */
  onDeleteRelationship: (id: string) => void;
  /** Remove an entity (and, upstream, its relationships) by id. */
  onDeleteEntity: (id: string) => void;
  /** Persist a node's new canvas position. */
  onMoveEntity: (id: string, pos: { x: number; y: number }) => void;
  /** Selecting a node lifts it up so the panel can show details / locate. */
  onSelectEntity: (id: string) => void;
}

const SIDES = [
  { position: Position.Top, id: 'top' },
  { position: Position.Right, id: 'right' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
] as const;

// ── Custom typed node ──
type EntityNodeData = { entity: PersonalEntity };

function EntityNode({ data, selected }: NodeProps) {
  const entity = (data as EntityNodeData).entity;
  const color = PERSONAL_TYPE_COLORS[entity.type] || '#888';
  const glyph = PERSONAL_TYPE_GLYPHS[entity.type] || '?';
  const typeLabel = PERSONAL_TYPE_LABELS[entity.type] || entity.type;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        minWidth: 150, maxWidth: 240, padding: '8px 10px',
        borderRadius: 8,
        background: 'rgba(10,10,16,0.92)',
        border: `1px solid ${selected ? color : `${color}55`}`,
        boxShadow: selected ? `0 0 0 1px ${color}, 0 0 14px ${color}55` : '0 2px 8px rgba(0,0,0,0.5)',
        fontFamily: "'JetBrains Mono', monospace",
        cursor: 'grab',
      }}
    >
      {SIDES.map(({ position, id }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          style={{ width: 8, height: 8, background: color, border: '1px solid rgba(0,0,0,0.6)' }}
        />
      ))}
      <div
        style={{
          flex: '0 0 auto', width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}22`, border: `1px solid ${color}66`,
          color, fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
        }}
      >
        {glyph}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {typeLabel}
        </div>
        <div
          style={{
            fontSize: 11, color: '#fff', fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          title={entity.label}
        >
          {entity.label || '—'}
        </div>
      </div>
    </div>
  );
}

const NODE_TYPES = { entity: EntityNode };

function defaultPos(index: number): { x: number; y: number } {
  // Spread nodes in a loose grid when they have no saved position yet.
  const COLS = 4;
  return { x: 80 + (index % COLS) * 240, y: 80 + Math.floor(index / COLS) * 150 };
}

function LinkEditorInner({
  entities, relationships,
  onConnect, onDeleteRelationship, onDeleteEntity, onMoveEntity, onSelectEntity,
}: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Reconcile nodes from entities; saved graphPos is authoritative.
  useEffect(() => {
    setNodes((current) => {
      const currentMap = new Map(current.map((n) => [n.id, n]));
      return entities.map((e, i) => {
        const existing = currentMap.get(e.id);
        return {
          id: e.id,
          type: 'entity',
          position: e.graphPos ?? existing?.position ?? defaultPos(i),
          data: { entity: e },
          selected: existing?.selected ?? false,
        } as Node;
      });
    });
  }, [entities]);

  // Edges mirror relationships exactly (deduped defensively).
  useEffect(() => {
    const seen = new Set<string>();
    const next: Edge[] = [];
    for (const r of relationships) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      next.push({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        label: r.label,
        animated: r.strength >= 0.85,
        style: { stroke: 'rgba(212,175,55,0.55)', strokeWidth: Math.max(1, (r.strength || 0.5) * 2) },
        labelStyle: { fill: 'rgba(255,255,255,0.6)', fontSize: 8, fontFamily: "'JetBrains Mono', monospace" },
        labelBgStyle: { fill: 'rgba(0,0,0,0.6)' },
      });
    }
    setEdges(next);
  }, [relationships]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((es) => applyEdgeChanges(changes, es));
  }, []);

  const handleConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return;
    onConnect(params.source, params.target);
  }, [onConnect]);

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    for (const n of deleted) onDeleteEntity(n.id);
  }, [onDeleteEntity]);

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const e of deleted) onDeleteRelationship(e.id);
  }, [onDeleteRelationship]);

  const handleNodeDragStop = useCallback((_e: unknown, node: Node) => {
    onMoveEntity(node.id, { x: node.position.x, y: node.position.y });
  }, [onMoveEntity]);

  const handleNodeClick = useCallback((_e: unknown, node: Node) => {
    onSelectEntity(node.id);
  }, [onSelectEntity]);

  const miniMapColor = useCallback(
    (n: Node) => PERSONAL_TYPE_COLORS[(n.data as EntityNodeData)?.entity?.type] || '#888',
    [],
  );

  const isEmpty = entities.length === 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        connectionMode="loose"
        defaultViewport={{ x: 20, y: 20, zoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Control', 'Meta']}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        fitView
      >
        <Background gap={20} size={1} color="rgba(255,255,255,0.06)" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={miniMapColor} maskColor="rgba(0,0,0,0.6)" style={{ background: 'rgba(0,0,0,0.4)' }} />
      </ReactFlow>

      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', textAlign: 'center',
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>NO ENTITY DATA</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Add entities, then drag node handles to wire relationships</p>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, padding: '4px 10px', borderRadius: 6,
          background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.45)',
          pointerEvents: 'none',
        }}>
          <span>DRAG HANDLE → CONNECT</span>
          <span>·</span>
          <span>CLICK → DETAILS</span>
          <span>·</span>
          <span>DEL → REMOVE</span>
        </div>
      )}
    </div>
  );
}

export default function LinkEditorGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <LinkEditorInner {...props} />
    </ReactFlowProvider>
  );
}
