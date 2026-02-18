import { useState, useCallback, useEffect } from 'react';
import MapCanvas, { type SelectionMode } from './components/MapCanvas';
import ControlPanel from './components/ControlPanel';
import { graphService, type Node, type PathResponse } from './services/api';
import './index.css';

export default function App() {
    const [startNode, setStartNode] = useState<Node | null>(null);
    const [endNode, setEndNode] = useState<Node | null>(null);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
    const [path, setPath] = useState<PathResponse | null>(null);
    const [bfsNodes, setBfsNodes] = useState<Node[]>([]);
    const [graphBounds, setGraphBounds] = useState<[[number, number], [number, number]] | null>(null);
    const [showGraph, setShowGraph] = useState(false);

    // Load graph bounds on mount
    useEffect(() => {
        graphService.getBounds().then(b => {
            if (b && b.minLat && b.maxLat && b.minLat !== b.maxLat) {
                setGraphBounds([[b.minLat, b.minLon], [b.maxLat, b.maxLon]]);
            }
        }).catch(() => { });
    }, []);

    const handleNodeSelect = useCallback((node: Node) => {
        if (selectionMode === 'start') {
            setStartNode(node);
            setSelectionMode('end'); // Auto-advance to end selection
        } else if (selectionMode === 'end') {
            setEndNode(node);
            setSelectionMode(null); // Done selecting
        }
    }, [selectionMode]);

    const handleClear = useCallback(() => {
        setStartNode(null);
        setEndNode(null);
        setPath(null);
        setBfsNodes([]);
        setSelectionMode(null);
    }, []);

    const handlePathFound = useCallback((p: PathResponse) => {
        setPath(p);
        setBfsNodes([]);
    }, []);

    const handleBfsResult = useCallback((nodes: Node[]) => {
        setBfsNodes(nodes);
        setPath(null);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            {/* Full-screen map */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <MapCanvas
                    path={path}
                    startNode={startNode}
                    endNode={endNode}
                    bfsNodes={bfsNodes}
                    selectionMode={selectionMode}
                    onNodeSelect={handleNodeSelect}
                    graphBounds={graphBounds}
                    showGraph={showGraph}
                />
            </div>

            {/* Selection mode banner */}
            {selectionMode && (
                <div style={{
                    position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 1000, padding: '10px 20px', borderRadius: '24px',
                    background: selectionMode === 'start' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                    backdropFilter: 'blur(12px)', color: 'white', fontSize: '13px', fontWeight: 600,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease',
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.2)'
                }} onClick={() => setSelectionMode(null)}>
                    <span style={{ fontSize: '16px' }}>📍</span>
                    Click on map to select {selectionMode === 'start' ? 'Start (A)' : 'End (B)'} node
                    <span style={{ opacity: 0.7, marginLeft: '4px' }}>✕</span>
                </div>
            )}

            {/* Sidebar */}
            <div style={{
                position: 'absolute', top: '16px', left: '16px', bottom: '16px',
                width: '320px', zIndex: 500, overflowY: 'auto', overflowX: 'hidden',
                scrollbarWidth: 'thin'
            }}>
                <ControlPanel
                    startNode={startNode}
                    endNode={endNode}
                    selectionMode={selectionMode}
                    onSetSelectionMode={setSelectionMode}
                    onSetStartNode={setStartNode}
                    onSetEndNode={setEndNode}
                    onPathFound={handlePathFound}
                    onBfsResult={handleBfsResult}
                    onClear={handleClear}
                />
            </div>

            {/* Show Graph toggle button */}
            <button
                onClick={() => setShowGraph(v => !v)}
                style={{
                    position: 'absolute', top: '16px', right: '16px', zIndex: 1000,
                    padding: '9px 16px', borderRadius: '24px', border: `1.5px solid ${showGraph ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)'}`,
                    background: showGraph ? 'rgba(99,102,241,0.25)' : 'rgba(10,14,26,0.75)',
                    backdropFilter: 'blur(12px)', color: showGraph ? '#818cf8' : '#94a3b8',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '7px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transition: 'all 0.2s'
                }}
            >
                <span style={{ fontSize: '15px' }}>🕸</span>
                {showGraph ? 'Hide Graph' : 'Show Graph'}
            </button>

            {/* Route info overlay (bottom right) */}
            {path && (
                <div className="glass animate-fade-in" style={{
                    position: 'absolute', bottom: '24px', right: '24px', zIndex: 500,
                    borderRadius: '14px', padding: '14px 18px', minWidth: '200px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Route Summary</div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                                {(path.totalDistance / 1000).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>km</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border)' }} />
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                                {path.path.length}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>nodes</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
