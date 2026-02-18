import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Node, PathResponse } from '../services/api';

// Fix Leaflet default icon paths for Vite
const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });


// Custom SVG marker factory
function createSvgIcon(color: string, label: string, size = 36) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${color}" flood-opacity="0.5"/>
      </filter>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" filter="url(#shadow)" opacity="0.95"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="white" opacity="0.25"/>
      <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="white">${label}</text>
      <line x1="${size / 2}" y1="${size - 2}" x2="${size / 2}" y2="${size + 6}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [size, size + 8],
        iconAnchor: [size / 2, size + 8],
        popupAnchor: [0, -(size + 8)],
    });
}

const startIcon = createSvgIcon('#10b981', 'A');
const endIcon = createSvgIcon('#ef4444', 'B');
const waypointIcon = createSvgIcon('#6366f1', '·', 20);

export type SelectionMode = 'start' | 'end' | null;

interface MapCanvasProps {
    path: PathResponse | null;
    startNode: Node | null;
    endNode: Node | null;
    bfsNodes: Node[];
    selectionMode: SelectionMode;
    onNodeSelect: (node: Node) => void;
    graphBounds: [[number, number], [number, number]] | null;
}

// Inner component that handles map events and rendering
function MapController({
    path, startNode, endNode, bfsNodes, selectionMode, onNodeSelect, graphBounds
}: MapCanvasProps) {
    const map = useMap();
    const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
    const pathLayerRef = useRef<L.LayerGroup>(L.layerGroup());
    const animFrameRef = useRef<number | null>(null);

    // Add layer groups to map once
    useEffect(() => {
        layerGroupRef.current.addTo(map);
        pathLayerRef.current.addTo(map);
        return () => {
            layerGroupRef.current.remove();
            pathLayerRef.current.remove();
        };
    }, [map]);

    // Handle map click for node selection
    useMapEvents({
        click(e) {
            if (!selectionMode) return;
            // Create a synthetic node from click position
            const syntheticNode: Node = {
                id: `${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`,
                lat: e.latlng.lat,
                lon: e.latlng.lng,
            };
            onNodeSelect(syntheticNode);
        },
        mousemove() {
            if (selectionMode) {
                map.getContainer().style.cursor = 'crosshair';
            } else {
                map.getContainer().style.cursor = '';
            }
        }
    });

    // Render markers and path
    useEffect(() => {
        layerGroupRef.current.clearLayers();
        pathLayerRef.current.clearLayers();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        // Start marker
        if (startNode) {
            const m = L.marker([startNode.lat, startNode.lon], { icon: startIcon, zIndexOffset: 1000 });
            m.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px"><b style="color:#10b981">Start Node</b><br><span style="color:#94a3b8">ID: ${startNode.id}</span>${startNode.name ? `<br><span style="color:#94a3b8">${startNode.name}</span>` : ''}</div>`);
            layerGroupRef.current.addLayer(m);
        }

        // End marker
        if (endNode) {
            const m = L.marker([endNode.lat, endNode.lon], { icon: endIcon, zIndexOffset: 999 });
            m.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px"><b style="color:#ef4444">End Node</b><br><span style="color:#94a3b8">ID: ${endNode.id}</span>${endNode.name ? `<br><span style="color:#94a3b8">${endNode.name}</span>` : ''}</div>`);
            layerGroupRef.current.addLayer(m);
        }

        // BFS neighbor markers
        bfsNodes.forEach(node => {
            const m = L.circleMarker([node.lat, node.lon], {
                radius: 6, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.8, weight: 2
            });
            m.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:12px"><b style="color:#f59e0b">Neighbor</b><br><span style="color:#94a3b8">ID: ${node.id}</span></div>`);
            layerGroupRef.current.addLayer(m);
        });

        // Animated path drawing
        if (path && path.path.length > 1) {
            const coords: [number, number][] = path.path.map(n => [n.lat, n.lon]);

            // Draw background path (faint)
            L.polyline(coords, {
                color: '#6366f1', weight: 6, opacity: 0.15, lineCap: 'round', lineJoin: 'round'
            }).addTo(pathLayerRef.current);

            // Animated foreground path - draw segment by segment
            let i = 1;
            const drawNext = () => {
                if (i >= coords.length) {
                    // Add waypoint markers for intermediate nodes
                    path.path.slice(1, -1).forEach((node, idx) => {
                        if (idx % 3 === 0) { // Only every 3rd to avoid clutter
                            L.marker([node.lat, node.lon], { icon: waypointIcon, zIndexOffset: 100 })
                                .addTo(pathLayerRef.current);
                        }
                    });
                    return;
                }
                L.polyline([coords[i - 1], coords[i]], {
                    color: '#818cf8', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round'
                }).addTo(pathLayerRef.current);
                i++;
                animFrameRef.current = requestAnimationFrame(drawNext);
            };
            // Small delay before starting animation
            setTimeout(() => { animFrameRef.current = requestAnimationFrame(drawNext); }, 100);

            // Fly to path bounds
            const bounds = L.latLngBounds(coords);
            map.flyToBounds(bounds, { padding: [60, 60], duration: 1.2, easeLinearity: 0.25 });
        } else if (startNode && endNode) {
            // Fit to show both markers
            const bounds = L.latLngBounds([[startNode.lat, startNode.lon], [endNode.lat, endNode.lon]]);
            map.flyToBounds(bounds, { padding: [80, 80], duration: 0.8 });
        } else if (startNode) {
            map.flyTo([startNode.lat, startNode.lon], 15, { duration: 0.8 });
        } else if (graphBounds && !startNode && !endNode) {
            map.flyToBounds(graphBounds, { padding: [40, 40], duration: 1.0 });
        }

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [path, startNode, endNode, bfsNodes, graphBounds, map]);

    return null;
}

export default function MapCanvas(props: MapCanvasProps) {
    return (
        <MapContainer
            center={[51.505, -0.09]}
            zoom={13}
            scrollWheelZoom
            zoomControl
            style={{ width: '100%', height: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                maxZoom={19}
            />
            <MapController {...props} />
        </MapContainer>
    );
}
