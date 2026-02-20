import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { graphService } from '../services/api';

export default function GraphOverlay({ visible }) {
    const map = useMap();
    const layerRef = useRef(L.layerGroup());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        layerRef.current.addTo(map);
        return () => {
            layerRef.current.remove();
        };
    }, [map]);

    useEffect(() => {
        if (!visible) {
            layerRef.current.clearLayers();
            setLoaded(false);
            return;
        }

        if (loaded) return;

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
                    color: '#0ea5e9',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.9,
                    weight: 1,
                });
                circle.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:12px">
            <b style="color:#0284c7">Node</b><br>
            <span style="color:#64748b;font-size:11px">ID: ${node.id}</span>
            ${node.name ? `<br><span style="color:#64748b">${node.name}</span>` : ''}
          </div>`
                );
                circle.addTo(layerRef.current);
            });

            setLoaded(true);
        }).catch(err => {
            console.error('Failed to load graph data:', err);
        });
    }, [visible, loaded]);

    return null;
}
