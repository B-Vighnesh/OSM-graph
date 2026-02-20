import { useState, useCallback, useEffect } from 'react';
import MapCanvas from './components/MapCanvas';
import ControlPanel from './components/ControlPanel';
import { graphService } from './services/api';
import './index.css';

export default function App() {
    const [startNode, setStartNode] = useState(null);
    const [endNode, setEndNode] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);
    const [path, setPath] = useState(null);
    const [bfsNodes, setBfsNodes] = useState([]);
    const [graphBounds, setGraphBounds] = useState(null);
    const [showGraph, setShowGraph] = useState(false);
    const [graphRefreshKey, setGraphRefreshKey] = useState(0);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationRequestId, setLocationRequestId] = useState(0);

    useEffect(() => {
        graphService.getBounds().then(bounds => {
            if (bounds && bounds.minLat && bounds.maxLat && bounds.minLat !== bounds.maxLat) {
                setGraphBounds([[bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]]);
            }
        }).catch(() => {});
    }, []);

    const requestCurrentLocation = useCallback((recenter = false) => {
        if (!navigator.geolocation) return;

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                setCurrentLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                if (recenter) setLocationRequestId(id => id + 1);
                setIsLocating(false);
            },
            error => {
                console.warn('Geolocation error:', error.message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        requestCurrentLocation(false);
    }, [requestCurrentLocation]);

    const handleNodeSelect = useCallback((node) => {
        if (selectionMode === 'start') {
            setStartNode(node);
            setSelectionMode('end');
        } else if (selectionMode === 'end') {
            setEndNode(node);
            setSelectionMode(null);
        }
    }, [selectionMode]);

    const handleClear = useCallback(() => {
        setStartNode(null);
        setEndNode(null);
        setPath(null);
        setBfsNodes([]);
        setSelectionMode(null);
    }, []);

    const handlePathFound = useCallback(foundPath => {
        setPath(foundPath);
        setBfsNodes([]);
    }, []);

    const handleBfsResult = useCallback(nodes => {
        setBfsNodes(nodes);
        setPath(null);
    }, []);

    const handleGraphDataChanged = useCallback(() => {
        setGraphRefreshKey(key => key + 1);
    }, []);

    return (
        <div className="app-shell">
            <div className="app-map-layer">
                <MapCanvas
                    path={path}
                    startNode={startNode}
                    endNode={endNode}
                    bfsNodes={bfsNodes}
                    selectionMode={selectionMode}
                    onNodeSelect={handleNodeSelect}
                    graphBounds={graphBounds}
                    showGraph={showGraph}
                    graphRefreshKey={graphRefreshKey}
                    currentLocation={currentLocation}
                    locationRequestId={locationRequestId}
                />
            </div>

            {selectionMode && (
                <div
                    className="app-selection-banner"
                    style={{
                        background: selectionMode === 'start' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                    }}
                    onClick={() => setSelectionMode(null)}
                >
                    <span style={{ fontSize: '16px' }}>+</span>
                    Click on map to select {selectionMode === 'start' ? 'Start (A)' : 'End (B)'} node
                    <span style={{ opacity: 0.7, marginLeft: '4px' }}>x</span>
                </div>
            )}

            <div className="app-sidebar">
                <ControlPanel
                    startNode={startNode}
                    endNode={endNode}
                    currentLocation={currentLocation}
                    selectionMode={selectionMode}
                    onSetSelectionMode={setSelectionMode}
                    onSetStartNode={setStartNode}
                    onSetEndNode={setEndNode}
                    onPathFound={handlePathFound}
                    onBfsResult={handleBfsResult}
                    onClear={handleClear}
                    onGraphDataChanged={handleGraphDataChanged}
                />
            </div>

            <button
                className="app-graph-toggle"
                onClick={() => setShowGraph(v => !v)}
                style={{
                    border: `1.5px solid ${showGraph ? 'rgba(14,165,233,0.55)' : 'var(--border)'}`,
                    background: showGraph ? 'rgba(14,165,233,0.16)' : 'rgba(255,255,255,0.82)',
                    color: showGraph ? '#0284c7' : 'var(--text-secondary)',
                }}
            >
                <span style={{ fontSize: '15px' }}>#</span>
                {showGraph ? 'Hide Graph' : 'Show Graph'}
            </button>

            <button
                className="app-locate-btn"
                onClick={() => requestCurrentLocation(true)}
                disabled={isLocating}
                style={{
                    border: '1.5px solid var(--border)',
                    background: 'rgba(255,255,255,0.9)',
                    color: 'var(--text-secondary)',
                }}
            >
                <span style={{ fontSize: '14px' }}>◎</span>
                {isLocating ? 'Locating...' : 'Locate Me'}
            </button>

            {path && (
                <div className="glass animate-fade-in app-route-summary">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Route Summary
                    </div>
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
