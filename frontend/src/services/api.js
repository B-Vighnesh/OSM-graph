import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const api = axios.create({ baseURL: API_BASE });

export const graphService = {
    loadFile: () => api.get('/load-file').then(r => r.data),
    uploadOsm: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
    },
    loadDb: () => api.get('/load-db').then(r => r.data),
    clearDb: () => api.get('/clear-db').then(r => r.data),
    getStatus: () => api.get('/status').then(r => r.data),
    getBounds: () => api.get('/bounds').then(r => r.data),
    bfs1: id => api.get(`/bfs1/${id}`).then(r => r.data),
    dfs: (from, to) => api.get('/dfs', { params: { from, to } }).then(r => r.data),
    shortestPath: (from, to) => api.get('/shortest', { params: { from, to } }).then(r => r.data),
    getGraphData: () => api.get('/graph').then(r => r.data),
};
