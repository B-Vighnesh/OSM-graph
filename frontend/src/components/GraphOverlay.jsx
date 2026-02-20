import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { graphService } from '../services/api';

export default function GraphOverlay({ visible, refreshKey }) {
    const map = useMap();
    const layerRef = useRef(L.layerGroup());

    useEffect(() => {
        layerRef.current.addTo(map);
        return () => {
            layerRef.current.remove();
        };
    }, [map]);

    useEffect(() => {
        if (!visible) {
            layerRef.current.clearLayers();
            return;
        }

        graphService.getGraphData().then(data => {
            layerRef.current.clearLayers();

            data.edges.forEach(edge => {
                L.polyline(
                    [[edge.fromLat, edge.fromLon], [edge.toLat, edge.toLon]],
                    { color: '#94a3b8', weight: 1.4, opacity: 0.65 }
                ).addTo(layerRef.current);
            });

            data.nodes.forEach(node => {
                const circle = L.circleMarker([node.lat, node.lon], {
                    radius: 3,
                    color: '#64748b',
                    fillColor: '#94a3b8',
                    fillOpacity: 0.8,
                    weight: 1,
                });
                circle.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:12px">
            <b style="color:#475569">Node</b><br>
            <span style="color:#64748b;font-size:11px">ID: ${node.id}</span>
            ${node.name ? `<br><span style="color:#64748b">${node.name}</span>` : ''}
          </div>`
                );
                circle.addTo(layerRef.current);
            });
        }).catch(err => {
            console.error('Failed to load graph data:', err);
        });
    }, [visible, refreshKey]);

    return null;
}
