import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const api = axios.create({ baseURL: API_BASE });

export interface Node {
    id: string;
    lat: number;
    lon: number;
    name?: string;
    highway?: string;
}

export interface PathResponse {
    totalDistance: number;
    path: Node[];
}

export interface GraphBounds {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

export interface StatusResponse {
    nodeCount: number;
    edgeCount: number;
}

export const graphService = {
    loadFile: () => api.get<{ message: string; nodeCount: number }>('/load-file').then(r => r.data),
    loadDb: () => api.get<{ message: string; nodeCount: number }>('/load-db').then(r => r.data),
    clearDb: () => api.get<{ message: string }>('/clear-db').then(r => r.data),
    getStatus: () => api.get<StatusResponse>('/status').then(r => r.data),
    getBounds: () => api.get<GraphBounds>('/bounds').then(r => r.data),
    bfs1: (id: string) => api.get<Node[]>(`/bfs1/${id}`).then(r => r.data),
    dfs: (from: string, to: string) => api.get<boolean>('/dfs', { params: { from, to } }).then(r => r.data),
    shortestPath: (from: string, to: string) => api.get<PathResponse>('/shortest', { params: { from, to } }).then(r => r.data),
    getGraphData: () => api.get<{ nodes: any[]; edges: any[] }>('/graph').then(r => r.data),
};
