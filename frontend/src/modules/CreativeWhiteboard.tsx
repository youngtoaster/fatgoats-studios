import React, { useState, useRef } from 'react';
import {
  Compass,
  Plus,
  Lock,
  Unlock,
  Pin,
  PinOff,
  Move,
  StickyNote,
  Image as ImageIcon,
  BookOpen,
  Type,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { Whiteboard, WhiteboardNode, WhiteboardEdge, WhiteboardNodeType } from '../types';
import { useExplicitMachine } from '../machines/useExplicitMachine';
import {
  createWhiteboardCanvasMachine,
  CanvasState,
  CanvasEvent,
  CanvasContext,
} from '../machines/whiteboardCanvasMachine';

interface CreativeWhiteboardProps {
  whiteboards: Whiteboard[];
  onSaveWhiteboard: (board: Whiteboard) => void;
  onCreateWhiteboard: () => void;
}

export const CreativeWhiteboard: React.FC<CreativeWhiteboardProps> = ({
  whiteboards,
  onSaveWhiteboard,
  onCreateWhiteboard,
}) => {
  const [activeBoardId, setActiveBoardId] = useState<string>(whiteboards[0]?.id || '');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Add node modal state
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeType, setNewNodeType] = useState<WhiteboardNodeType>('sticky_note');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeContent, setNewNodeContent] = useState('');
  const [newNodeColor, setNewNodeColor] = useState('#f59e0b');
  const [newNodeImageUrl, setNewNodeImageUrl] = useState('');

  const currentBoard = whiteboards.find((b) => b.id === activeBoardId) || whiteboards[0];

  // Explicit Canvas Interaction State Machine
  const [canvasSnapshot, sendCanvas] = useExplicitMachine<CanvasState, CanvasEvent, CanvasContext>(
    () => createWhiteboardCanvasMachine(currentBoard?.id, Boolean(currentBoard?.is_locked)),
    [currentBoard?.id, currentBoard?.is_locked]
  );

  // Dragging nodes handler
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (currentBoard.is_locked) return;
    e.stopPropagation();
    const node = currentBoard.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDraggedNodeId(nodeId);
    sendCanvas({ type: 'START_DRAG_NODE', nodeId });
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId && currentBoard && !currentBoard.is_locked) {
      const newX = Math.round(e.clientX / zoom - dragOffset.x);
      const newY = Math.round(e.clientY / zoom - dragOffset.y);
      const updatedNodes = currentBoard.nodes.map((n) =>
        n.id === draggedNodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
      );
      onSaveWhiteboard({ ...currentBoard, nodes: updatedNodes });
    } else if (isPanning) {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
    sendCanvas({ type: 'STOP_INTERACTION' });
  };

  const handleAddNode = () => {
    if (!newNodeTitle.trim() && !newNodeContent.trim()) return;
    const newNode: WhiteboardNode = {
      id: `node_${Date.now()}`,
      board_id: currentBoard.id,
      node_type: newNodeType,
      x: 150 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      width: newNodeType === 'moodboard_image' ? 260 : 240,
      height: newNodeType === 'moodboard_image' ? 240 : 160,
      title: newNodeTitle.trim() || 'Idea Node',
      content: newNodeContent.trim(),
      color: newNodeColor,
      image_url: newNodeImageUrl.trim() || undefined,
    };

    onSaveWhiteboard({
      ...currentBoard,
      nodes: [...currentBoard.nodes, newNode],
    });

    setNewNodeTitle('');
    setNewNodeContent('');
    setNewNodeImageUrl('');
    setShowAddNode(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (currentBoard.is_locked) return;
    const updatedNodes = currentBoard.nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = currentBoard.edges.filter(
      (e) => e.from_node_id !== nodeId && e.to_node_id !== nodeId
    );
    onSaveWhiteboard({ ...currentBoard, nodes: updatedNodes, edges: updatedEdges });
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Board Management Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">Creative whiteboard</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#151820] text-slate-400 border border-white/5">
                FSM: {canvasSnapshot.state}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Infinite spatial canvas for plot beats, visual moodboards, and story architecture</p>
          </div>
        </div>

        {/* Board Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#151820] rounded-lg border border-white/10 p-0.5 text-xs text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 hover:text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="font-mono px-2 text-[11px] font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              className="p-1.5 hover:text-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Lock / Pin toggles */}
          {currentBoard && (
            <button
              onClick={() => onSaveWhiteboard({ ...currentBoard, is_locked: !currentBoard.is_locked })}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                currentBoard.is_locked
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-[#151820] border-white/10 text-slate-300 hover:text-white'
              }`}
              title={currentBoard.is_locked ? 'Unlock board' : 'Lock board'}
            >
              {currentBoard.is_locked ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{currentBoard.is_locked ? 'Locked' : 'Unlocked'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddNode(true)}
            disabled={currentBoard?.is_locked}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-medium text-xs transition-colors"
          >
            <Plus size={14} />
            <span>Drop node</span>
          </button>
        </div>
      </div>

      {/* Board Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {whiteboards.map((b) => {
          const isSel = b.id === currentBoard?.id;
          return (
            <button
              key={b.id}
              onClick={() => setActiveBoardId(b.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                isSel
                  ? 'bg-[#1a1e28] border-white/10 text-white'
                  : 'bg-[#101217] border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {b.is_pinned && <Pin size={12} className="text-amber-400" />}
              <span>{b.title}</span>
              <span className="text-[10px] text-slate-500 font-mono tabular-nums">({b.nodes.length})</span>
            </button>
          );
        })}
        <button
          onClick={onCreateWhiteboard}
          className="px-2.5 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1a1e28] border border-white/10 text-slate-300 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
        >
          <Plus size={13} />
          <span>New board</span>
        </button>
      </div>

      {/* Infinite Canvas */}
      <div
        className="rounded-xl border border-white/5 relative h-[650px] overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#0a0b0e]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !currentBoard?.is_locked) {
            setIsPanning(true);
            sendCanvas({ type: 'START_PAN' });
          }
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connector Lines */}
          <svg className="absolute inset-0 w-[4000px] h-[4000px] pointer-events-none">
            {currentBoard?.edges.map((edge) => {
              const from = currentBoard.nodes.find((n) => n.id === edge.from_node_id);
              const to = currentBoard.nodes.find((n) => n.id === edge.to_node_id);
              if (!from || !to) return null;

              const x1 = from.x + from.width / 2;
              const y1 = from.y + from.height / 2;
              const x2 = to.x + to.width / 2;
              const y2 = to.y + to.height / 2;

              return (
                <g key={edge.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#d97706"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeOpacity="0.6"
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 8}
                      fill="#e2e8f0"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Canvas Nodes */}
          {currentBoard?.nodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              className="absolute rounded-xl p-3 border transition-shadow cursor-move select-none bg-[#101217]"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderTopColor: node.color,
                borderTopWidth: '2px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: node.color }}
                  />
                  <h4 className="text-xs font-medium text-white truncate">{node.title}</h4>
                </div>
                {!currentBoard.is_locked && (
                  <button
                    onClick={() => handleDeleteNode(node.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete node"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {node.image_url && (
                <div className="rounded-lg overflow-hidden my-2 border border-white/5">
                  <img src={node.image_url} alt={node.title} className="w-full h-28 object-cover pointer-events-none" />
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed font-sans">{node.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Node Dialog */}
      {showAddNode && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#101217] border border-white/10 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Drop node on canvas</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Node type:</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { id: 'sticky_note', label: 'Sticky beat note', icon: StickyNote },
                    { id: 'narrative_card', label: 'Narrative card', icon: BookOpen },
                    { id: 'moodboard_image', label: 'Moodboard image', icon: ImageIcon },
                    { id: 'text_annotation', label: 'Text annotation', icon: Type },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setNewNodeType(t.id as WhiteboardNodeType)}
                      className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-colors ${
                        newNodeType === t.id
                          ? 'bg-[#1a1e28] border-white/20 text-white'
                          : 'bg-[#151820] border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <t.icon size={14} className={newNodeType === t.id ? 'text-amber-400' : 'text-slate-500'} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Title / Header:</label>
                <input
                  type="text"
                  placeholder="e.g. Act 2 Climax Dilemma"
                  value={newNodeTitle}
                  onChange={(e) => setNewNodeTitle(e.target.value)}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Beat notes / Description:</label>
                <textarea
                  placeholder="Write plot beat notes, moodboard thoughts..."
                  value={newNodeContent}
                  onChange={(e) => setNewNodeContent(e.target.value)}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 h-20 focus:border-white/20"
                />
              </div>

              {newNodeType === 'moodboard_image' && (
                <div>
                  <label className="text-[11px] text-slate-400">Image URL:</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newNodeImageUrl}
                    onChange={(e) => setNewNodeImageUrl(e.target.value)}
                    className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] text-slate-400">Accent tone:</label>
                <div className="flex gap-2 mt-1">
                  {['#f59e0b', '#38bdf8', '#ef4444', '#10b981', '#a855f7'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewNodeColor(c)}
                      className={`w-6 h-6 rounded-full border ${
                        newNodeColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddNode(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNode}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium transition-colors"
              >
                Add to canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
