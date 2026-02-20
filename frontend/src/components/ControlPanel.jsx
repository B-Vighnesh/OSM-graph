import { useState, useEffect, useCallback, useRef } from 'react';
import { graphService } from '../services/api';

export default function ControlPanel({
    startNode,
    endNode,
    currentLocation,
    selectionMode,
    onSetSelectionMode,
    onSetStartNode,
    onSetEndNode,
    onPathFound,
    onBfsResult,
    onClear,
}) {
    const [algorithm, setAlgorithm] = useState('shortest');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [result, setResult] = useState(null);
    const [fromInput, setFromInput] = useState('');
    const [toInput, setToInput] = useState('');
    const [inputMode, setInputMode] = useState('click');
    const [attachedOsmName, setAttachedOsmName] = useState('');
    const fileInputRef = useRef(null);

    const refreshStatus = useCallback(() => {
        graphService.getStatus().then(setStatus).catch(() => {});
    }, []);

    useEffect(() => {
        refreshStatus();
        const intervalId = setInterval(refreshStatus, 5000);
        return () => clearInterval(intervalId);
    }, [refreshStatus]);

    useEffect(() => {
        if (startNode) setFromInput(startNode.id);
    }, [startNode]);

    useEffect(() => {
        if (endNode) setToInput(endNode.id);
    }, [endNode]);

    useEffect(() => {
        if (algorithm === 'bfs') {
            onSetEndNode(null);
            setToInput('');
            if (selectionMode === 'end') {
                onSetSelectionMode(null);
            }
        }
    }, [algorithm, selectionMode, onSetEndNode, onSetSelectionMode]);

    const handleRun = async () => {
        const fromId = inputMode === 'type' ? fromInput.trim() : startNode?.id;
        const toId = inputMode === 'type' ? toInput.trim() : endNode?.id;

        if (algorithm === 'bfs') {
            if (!fromId) {
                setResult({ type: 'error', message: 'Select or enter a Start node.' });
                return;
            }

            setLoading(true);
            setResult(null);
            try {
                const nodes = await graphService.bfs1(fromId);
                onBfsResult(nodes);
                setResult({ type: 'success', message: `BFS found ${nodes.length} neighbor(s).` });
            } catch (e) {
                setResult({ type: 'error', message: e.response?.data?.message || e.message });
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!fromId || !toId) {
            setResult({ type: 'error', message: 'Select or enter both Start and End nodes.' });
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            if (algorithm === 'shortest') {
                const path = await graphService.shortestPath(fromId, toId);
                onPathFound(path);
                const km = (path.totalDistance / 1000).toFixed(2);
                setResult({ type: 'success', message: `Route found! ${km} km - ${path.path.length} nodes` });
            } else {
                const reachable = await graphService.dfs(fromId, toId);
                setResult({
                    type: reachable ? 'success' : 'info',
                    message: reachable ? 'Path exists (DFS confirmed)' : 'No path found between these nodes',
                });
            }
        } catch (e) {
            setResult({ type: 'error', message: e.response?.data?.message || e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleLoadFile = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await graphService.loadFile();
            setResult({ type: 'success', message: `Loaded ${response.nodeCount.toLocaleString()} nodes from file.` });
            refreshStatus();
        } catch (e) {
            setResult({ type: 'error', message: e.response?.data?.message || e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleLoadDb = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await graphService.loadDb();
            setResult({ type: 'success', message: `Loaded ${response.nodeCount.toLocaleString()} nodes from DB.` });
            refreshStatus();
        } catch (e) {
            setResult({ type: 'error', message: e.response?.data?.message || e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAttachOsmClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleOsmFileSelected = async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.toLowerCase().endsWith('.osm')) {
            setResult({ type: 'error', message: 'Please select a valid .osm file.' });
            event.target.value = '';
            return;
        }

        setAttachedOsmName(selectedFile.name);
        setLoading(true);
        setResult(null);

        try {
            const response = await graphService.uploadOsm(selectedFile);
            const countText = response?.nodeCount ? ` (${response.nodeCount.toLocaleString()} nodes)` : '';
            setResult({
                type: 'success',
                message: response?.message || `Uploaded ${selectedFile.name}${countText}.`,
            });
            refreshStatus();
        } catch (e) {
            setResult({ type: 'error', message: e.response?.data?.message || e.message });
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    const handleClear = () => {
        onClear();
        setResult(null);
        setFromInput('');
        setToInput('');
    };

    const handleUseMyLocationAsStart = () => {
        if (!currentLocation) {
            setResult({ type: 'error', message: 'Current location is not available yet.' });
            return;
        }

        const lat = parseFloat(currentLocation.lat.toFixed(4));
        const lon = parseFloat(currentLocation.lon.toFixed(4));
        const startFromLocation = { id: `${lat},${lon}`, lat, lon, name: 'My Location' };
        onSetStartNode(startFromLocation);
        setFromInput(startFromLocation.id);
        onSetSelectionMode(algorithm === 'bfs' ? null : 'end');
        setResult({ type: 'success', message: 'Start node set from your current location.' });
    };

    const isRunDisabled =
        loading ||
        (algorithm === 'bfs'
            ? !(inputMode === 'click' ? startNode?.id : fromInput.trim())
            : !((inputMode === 'click' ? startNode?.id : fromInput) && (inputMode === 'click' ? endNode?.id : toInput)));

    return (
        <div className="animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="glass" style={{ borderRadius: '16px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            OSM Graph
                        </h1>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Graph Traversal Explorer</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: status && status.nodeCount > 0 ? 'var(--success)' : 'var(--error)', boxShadow: status && status.nodeCount > 0 ? '0 0 8px var(--success)' : 'none' }} className={status && status.nodeCount > 0 ? 'animate-glow' : ''} />
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {status ? `${status.nodeCount.toLocaleString()} nodes` : 'Connecting...'}
                            </span>
                        </div>
                        {status && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{status.edgeCount.toLocaleString()} edges</span>}
                    </div>
                </div>
            </div>

            <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Data Source</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={handleLoadFile} disabled={loading} style={{ fontSize: '12px', padding: '9px 12px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Load File
                    </button>
                    <button className="btn btn-secondary" onClick={handleLoadDb} disabled={loading} style={{ fontSize: '12px', padding: '9px 12px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                        Load DB
                    </button>
                    <button className="btn btn-secondary" onClick={handleAttachOsmClick} disabled={loading} style={{ fontSize: '12px', padding: '9px 12px', gridColumn: '1 / -1' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5-5 5 5" /><path d="M12 5v10" /></svg>
                        Attach .osm File
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".osm"
                    style={{ display: 'none' }}
                    onChange={handleOsmFileSelected}
                />
                {attachedOsmName && (
                    <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Attached: {attachedOsmName}
                    </p>
                )}
            </div>

            <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Route</p>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.62)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
                        {['click', 'type'].map(mode => (
                            <button key={mode} onClick={() => setInputMode(mode)} style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, background: inputMode === mode ? 'var(--accent)' : 'transparent', color: inputMode === mode ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                                {mode === 'click' ? 'Click' : 'Type'}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={handleUseMyLocationAsStart}
                    disabled={loading || !currentLocation}
                    style={{ width: '100%', fontSize: '12px', padding: '8px 12px', marginBottom: '10px' }}
                >
                    Use My Location as A
                </button>

                {inputMode === 'click' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            onClick={() => onSetSelectionMode(selectionMode === 'start' ? null : 'start')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                                borderRadius: '10px', border: `1.5px solid ${selectionMode === 'start' ? 'var(--node-start)' : startNode ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                                background: selectionMode === 'start' ? 'rgba(16,185,129,0.12)' : startNode ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.62)',
                                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%',
                                boxShadow: selectionMode === 'start' ? '0 0 12px rgba(16,185,129,0.2)' : 'none'
                            }}
                        >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: startNode ? 'var(--node-start)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${startNode ? 'var(--node-start)' : 'rgba(16,185,129,0.3)'}` }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: startNode ? 'white' : 'var(--node-start)' }}>A</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '1px' }}>Start Node</div>
                                <div style={{ fontSize: '12px', color: startNode ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: startNode ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {startNode ? startNode.id : selectionMode === 'start' ? 'Click on map...' : 'Click to select'}
                                </div>
                            </div>
                            {startNode && (
                                <button onClick={e => { e.stopPropagation(); onSetStartNode(null); setFromInput(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', fontSize: '14px' }}>X</button>
                            )}
                        </button>

                        {algorithm !== 'bfs' && (
                            <button
                                onClick={() => onSetSelectionMode(selectionMode === 'end' ? null : 'end')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                                    borderRadius: '10px', border: `1.5px solid ${selectionMode === 'end' ? 'var(--node-end)' : endNode ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                                    background: selectionMode === 'end' ? 'rgba(239,68,68,0.12)' : endNode ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.62)',
                                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%',
                                    boxShadow: selectionMode === 'end' ? '0 0 12px rgba(239,68,68,0.2)' : 'none'
                                }}
                            >
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: endNode ? 'var(--node-end)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${endNode ? 'var(--node-end)' : 'rgba(239,68,68,0.3)'}` }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: endNode ? 'white' : 'var(--node-end)' }}>B</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '1px' }}>End Node</div>
                                    <div style={{ fontSize: '12px', color: endNode ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: endNode ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {endNode ? endNode.id : selectionMode === 'end' ? 'Click on map...' : 'Click to select'}
                                    </div>
                                </div>
                                {endNode && (
                                    <button onClick={e => { e.stopPropagation(); onSetEndNode(null); setToInput(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', fontSize: '14px' }}>X</button>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input className="input" placeholder="Start Node ID" value={fromInput} onChange={e => setFromInput(e.target.value)} style={{ fontSize: '12px' }} />
                        {algorithm !== 'bfs' && (
                            <input className="input" placeholder="End Node ID" value={toInput} onChange={e => setToInput(e.target.value)} style={{ fontSize: '12px' }} />
                        )}
                    </div>
                )}
            </div>

            <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Algorithm</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                    {[
                        { id: 'shortest', label: 'Shortest' },
                        { id: 'bfs', label: 'BFS' },
                        { id: 'dfs', label: 'DFS' },
                    ].map(alg => (
                        <button
                            key={alg.id}
                            onClick={() => setAlgorithm(alg.id)}
                            style={{
                                padding: '8px 6px', borderRadius: '8px', border: `1.5px solid ${algorithm === alg.id ? 'var(--border-active)' : 'var(--border)'}`,
                                background: algorithm === alg.id ? 'var(--accent-glow)' : 'rgba(255,255,255,0.62)',
                                cursor: 'pointer', transition: 'all 0.2s', fontSize: '11px', fontWeight: 600,
                                color: algorithm === alg.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
                            }}
                        >
                            {alg.label}
                        </button>
                    ))}
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleRun}
                    disabled={isRunDisabled}
                    style={{ width: '100%', fontSize: '13px', padding: '11px', borderRadius: '10px', position: 'relative', overflow: 'hidden' }}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            Running...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            Run {algorithm === 'shortest' ? 'Shortest Path' : algorithm === 'bfs' ? 'BFS' : 'DFS'}
                        </>
                    )}
                </button>
            </div>

            {result && (
                <div className="animate-fade-in glass" style={{
                    borderRadius: '12px', padding: '12px 14px',
                    borderColor: result.type === 'success' ? 'rgba(16,185,129,0.3)' : result.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)',
                    background: result.type === 'success' ? 'rgba(16,185,129,0.08)' : result.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
                }}>
                    <p style={{ fontSize: '12px', color: result.type === 'success' ? 'var(--success)' : result.type === 'error' ? 'var(--error)' : 'var(--accent-hover)', lineHeight: 1.5 }}>
                        {result.message}
                    </p>
                </div>
            )}

            {(startNode || endNode) && (
                <button className="btn btn-ghost animate-fade-in" onClick={handleClear} style={{ width: '100%', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Clear Route
                </button>
            )}
        </div>
    );
}
