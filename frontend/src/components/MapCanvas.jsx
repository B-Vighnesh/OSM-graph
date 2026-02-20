import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GraphOverlay from './GraphOverlay';

// OSM data bounds: lat [12.86440, 12.88858], lon [74.82913, 74.87247] -> Mangalore, India
const DEFAULT_CENTER = [12.8765, 74.8508]; // fallback center
const DEFAULT_ZOOM = 12; // fallback zoom
const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function createSvgIcon(color, label, size = 36) {
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
const waypointBlueIcon = createSvgIcon('#0ea5e9', '.', 20);
const waypointOrangeIcon = createSvgIcon('#f97316', '.', 20);
const userLocationIcon = L.divIcon({
    className: '',
    html: `
    <div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.2);"></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

function InitialBoundsFitter({ bounds }) {
    const map = useMap();
    const zoomedRef = useRef(false);

    useEffect(() => {
        if (bounds && !zoomedRef.current) {
            map.fitBounds(bounds, { padding: [20, 20] });
            zoomedRef.current = true;
        }
    }, [map, bounds]);

    return null;
}

function MapController({
    path,
    startNode,
    endNode,
    bfsNodes,
    selectionMode,
    onNodeSelect,
    graphBounds,
    showGraph,
    currentLocation,
    locationRequestId,
}) {
    const map = useMap();
    const layerGroupRef = useRef(L.layerGroup());
    const pathLayerRef = useRef(L.layerGroup());
    const animFrameRef = useRef(null);
    const lastLocationRequestRef = useRef(0);

    useEffect(() => {
        layerGroupRef.current.addTo(map);
        pathLayerRef.current.addTo(map);

        return () => {
            layerGroupRef.current.remove();
            pathLayerRef.current.remove();
        };
    }, [map]);

    useMapEvents({
        click(e) {
            if (!selectionMode) return;

            const lat = parseFloat(e.latlng.lat.toFixed(4));
            const lon = parseFloat(e.latlng.lng.toFixed(4));
            const syntheticNode = {
                id: `${lat},${lon}`,
                lat,
                lon,
            };
            onNodeSelect(syntheticNode);
        },
        mousemove() {
            if (selectionMode) {
                map.getContainer().style.cursor = 'crosshair';
            } else {
                map.getContainer().style.cursor = '';
            }
        },
    });

    useEffect(() => {
        layerGroupRef.current.clearLayers();
        pathLayerRef.current.clearLayers();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const routeBaseColor = showGraph ? '#fdba74' : '#38bdf8';
        const routeMainColor = showGraph ? '#ea580c' : '#0284c7';
        const routeWaypointIcon = showGraph ? waypointOrangeIcon : waypointBlueIcon;

        if (startNode) {
            const marker = L.marker([startNode.lat, startNode.lon], { icon: startIcon, zIndexOffset: 1000 });
            marker.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px"><b style="color:#10b981">Start Node</b><br><span style="color:#64748b">ID: ${startNode.id}</span>${startNode.name ? `<br><span style="color:#64748b">${startNode.name}</span>` : ''}</div>`);
            layerGroupRef.current.addLayer(marker);
        }

        if (endNode) {
            const marker = L.marker([endNode.lat, endNode.lon], { icon: endIcon, zIndexOffset: 999 });
            marker.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px"><b style="color:#ef4444">End Node</b><br><span style="color:#64748b">ID: ${endNode.id}</span>${endNode.name ? `<br><span style="color:#64748b">${endNode.name}</span>` : ''}</div>`);
            layerGroupRef.current.addLayer(marker);
        }

        bfsNodes.forEach(node => {
            const marker = L.circleMarker([node.lat, node.lon], {
                radius: 6,
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.8,
                weight: 2,
            });
            marker.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:12px"><b style="color:#f59e0b">Neighbor</b><br><span style="color:#64748b">ID: ${node.id}</span></div>`);
            layerGroupRef.current.addLayer(marker);
        });

        if (currentLocation) {
            const locationMarker = L.marker([currentLocation.lat, currentLocation.lon], {
                icon: userLocationIcon,
                zIndexOffset: 1100,
            });
            locationMarker.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:12px"><b style="color:#2563eb">My Location</b><br><span style="color:#64748b">Lat: ${currentLocation.lat.toFixed(6)}<br>Lon: ${currentLocation.lon.toFixed(6)}</span></div>`);
            layerGroupRef.current.addLayer(locationMarker);

            if (currentLocation.accuracy && Number.isFinite(currentLocation.accuracy)) {
                const accuracyCircle = L.circle([currentLocation.lat, currentLocation.lon], {
                    radius: currentLocation.accuracy,
                    color: '#2563eb',
                    fillColor: '#60a5fa',
                    fillOpacity: 0.12,
                    weight: 1.5,
                });
                layerGroupRef.current.addLayer(accuracyCircle);
            }
        }

        if (path && path.path.length > 1) {
            const coords = path.path.map(node => [node.lat, node.lon]);

            L.polyline(coords, {
                color: routeBaseColor,
                weight: 6,
                opacity: 0.22,
                lineCap: 'round',
                lineJoin: 'round',
            }).addTo(pathLayerRef.current);

            let i = 1;
            const drawNext = () => {
                if (i >= coords.length) {
                    path.path.slice(1, -1).forEach((node, idx) => {
                        if (idx % 3 === 0) {
                            L.marker([node.lat, node.lon], { icon: routeWaypointIcon, zIndexOffset: 100 })
                                .addTo(pathLayerRef.current);
                        }
                    });
                    return;
                }

                L.polyline([coords[i - 1], coords[i]], {
                    color: routeMainColor,
                    weight: 5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                }).addTo(pathLayerRef.current);

                i += 1;
                animFrameRef.current = requestAnimationFrame(drawNext);
            };

            setTimeout(() => {
                animFrameRef.current = requestAnimationFrame(drawNext);
            }, 100);

            const bounds = L.latLngBounds(coords);
            map.flyToBounds(bounds, { padding: [60, 60], duration: 1.2, easeLinearity: 0.25 });
        } else if (startNode && endNode) {
            const bounds = L.latLngBounds([
                [startNode.lat, startNode.lon],
                [endNode.lat, endNode.lon],
            ]);
            map.flyToBounds(bounds, { padding: [80, 80], duration: 0.8 });
        } else if (startNode) {
            map.flyTo([startNode.lat, startNode.lon], 15, { duration: 0.8 });
        } else if (graphBounds && !startNode && !endNode) {
            map.flyToBounds(graphBounds, { padding: [40, 40], duration: 1.0 });
        }

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [path, startNode, endNode, bfsNodes, graphBounds, map, showGraph, currentLocation]);

    useEffect(() => {
        if (!currentLocation || !locationRequestId) return;
        if (lastLocationRequestRef.current === locationRequestId) return;

        lastLocationRequestRef.current = locationRequestId;
        map.flyTo([currentLocation.lat, currentLocation.lon], Math.max(map.getZoom(), 15), { duration: 0.8 });
    }, [currentLocation, locationRequestId, map]);

    return null;
}

export default function MapCanvas(props) {
    return (
        <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                maxZoom={19}
            />
            <InitialBoundsFitter bounds={props.graphBounds} />
            <GraphOverlay visible={props.showGraph} refreshKey={props.graphRefreshKey} />
            <ZoomControl position="topright" />
            <MapController {...props} />
        </MapContainer>
    );
}
