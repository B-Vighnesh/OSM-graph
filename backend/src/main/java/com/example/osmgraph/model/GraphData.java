package com.example.osmgraph.model;

import java.util.List;

/**
 * DTO returned by /api/graph — contains all nodes and edges for map overlay
 * rendering.
 */
public class GraphData {

    public List<NodeDto> nodes;
    public List<EdgeDto> edges;

    public GraphData(List<NodeDto> nodes, List<EdgeDto> edges) {
        this.nodes = nodes;
        this.edges = edges;
    }

    public static class NodeDto {
        public String id;
        public double lat;
        public double lon;
        public String name;

        public NodeDto(String id, double lat, double lon, String name) {
            this.id = id;
            this.lat = lat;
            this.lon = lon;
            this.name = name;
        }
    }

    public static class EdgeDto {
        public double fromLat;
        public double fromLon;
        public double toLat;
        public double toLon;

        public EdgeDto(double fromLat, double fromLon, double toLat, double toLon) {
            this.fromLat = fromLat;
            this.fromLon = fromLon;
            this.toLat = toLat;
            this.toLon = toLon;
        }
    }
}
