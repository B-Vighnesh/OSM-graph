import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { graphService } from '../services/api';

interface GraphNode {
    id: string;
    lat: number;
    lon: number;
    name?: string;
}

interface GraphEdge {
    fromLat: number;
    fromLon: number;
    toLat: number;
    toLon: number;
}

interface GraphOverlayProps {
    visible: boolean;
}

export default function GraphOverlay({ visible }: GraphOverlayProps) {
    const map = useMap();
    const layerRef = useRef<L.LayerGroup>(L.layerGroup());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        layerRef.current.addTo(map);
        return () => { layerRef.current.remove(); };
    }, [map]);

    useEffect(() => {
        if (!visible) {
            layerRef.current.clearLayers();
            setLoaded(false);
            return;
        }

        if (loaded) return; // Already rendered

        graphService.getGraphData().then(data => {
            layerRef.current.clearLayers();

            // Draw edges first (below nodes)
            data.edges.forEach((edge: GraphEdge) => {
                L.polyline(
                    [[edge.fromLat, edge.fromLon], [edge.toLat, edge.toLon]],
                    { color: '#334155', weight: 1.5, opacity: 0.7 }
                ).addTo(layerRef.current);
            });

            // Draw nodes as small circles
            data.nodes.forEach((node: GraphNode) => {
                const circle = L.circleMarker([node.lat, node.lon], {
                    radius: 3,
                    color: '#6366f1',
                    fillColor: '#818cf8',
                    fillOpacity: 0.9,
                    weight: 1,
                });
                circle.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:12px">
            <b style="color:#818cf8">Node</b><br>
            <span style="color:#94a3b8;font-size:11px">ID: ${node.id}</span>
            ${node.name ? `<br><span style="color:#94a3b8">${node.name}</span>` : ''}
          </div>`
                );
                circle.addTo(layerRef.current);
            });

            setLoaded(true);
        }).catch(err => {
            console.error('Failed to load graph data:', err);
        });
    }, [visible, loaded, map]);

    return null;
}
