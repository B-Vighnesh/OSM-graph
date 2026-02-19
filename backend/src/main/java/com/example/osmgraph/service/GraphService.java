
package com.example.osmgraph.service;

import com.example.osmgraph.model.*;
import com.example.osmgraph.entity.*;
import com.example.osmgraph.repo.LocationRepository;
import com.fasterxml.jackson.databind.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GraphService {

    private final RestTemplate rest = new RestTemplate();

    private final Map<String, Node> nodeIndex = new HashMap<>();
    private final Map<Node, List<Edge>> graph = new HashMap<>();

    @Autowired
    private LocationRepository repo;

    @Autowired
    private OsmFileParser parser;

    public synchronized void loadFromFile() throws Exception {

        String path = "src/main/resources/osm/kundapura.osm";

        graph.clear();
        nodeIndex.clear();

        Map<Node, List<Edge>> parsed = parser.parse(path);

        graph.putAll(parsed);
        for (Node n : graph.keySet()) {
            nodeIndex.put(n.id, n);
        }

//        persistToDB();
    }

    private void connect(Node a, Node b) {

        double d = distance(a, b);

        graph
                .computeIfAbsent(a, k -> new ArrayList<>())
                .add(new Edge(b, d));
    }

    private double distance(Node a, Node b) {

        double R = 6371000;

        double lat1 = Math.toRadians(a.lat);
        double lat2 = Math.toRadians(b.lat);

        double dLat = lat2 - lat1;
        double dLon = Math.toRadians(b.lon - a.lon);

        double x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

        return R * y;
    }

    @Transactional
    public void persistToDB() {

        System.out.println("Persisting (batch mode)...");

        // Snapshot
        Map<Node, List<Edge>> snapshot = new HashMap<>(graph);

        // Clear DB
        repo.deleteAll();

        Map<String, LocationEntity> saved = new HashMap<>();

        // ==========================
        // 1️⃣ BATCH SAVE NODES
        // ==========================

        List<LocationEntity> nodeBatch = new ArrayList<>();

        int BATCH_SIZE = 500;

        for (Node n : snapshot.keySet()) {

            LocationEntity e = new LocationEntity(
                    n.id,
                    n.lat,
                    n.lon,
                    n.name,
                    n.highway);

            saved.put(n.id, e);
            nodeBatch.add(e);

            if (nodeBatch.size() == BATCH_SIZE) {
                repo.saveAll(nodeBatch);
                nodeBatch.clear();
            }
        }

        // Save remaining
        if (!nodeBatch.isEmpty()) {
            repo.saveAll(nodeBatch);
        }

        System.out.println("Nodes saved");

        // ==========================
        // 2️⃣ BATCH SAVE ROADS
        // ==========================

        List<LocationEntity> relBatch = new ArrayList<>();

        for (Map.Entry<Node, List<Edge>> entry : snapshot.entrySet()) {

            Node from = entry.getKey();

            LocationEntity fromDB = saved.get(from.id);

            List<RoadEntity> roads = new ArrayList<>();

            for (Edge e : entry.getValue()) {

                LocationEntity toDB = saved.get(e.to.id);

                roads.add(
                        new RoadEntity(toDB, e.distance));
            }

            fromDB.setRoads(roads);
            relBatch.add(fromDB);

            if (relBatch.size() == BATCH_SIZE) {
                repo.saveAll(relBatch);
                relBatch.clear();
            }
        }

        // Save remaining
        if (!relBatch.isEmpty()) {
            repo.saveAll(relBatch);
        }

        System.out.println("Relationships saved");
        System.out.println("Persist done (batch)");
    }

    @Autowired
    private org.springframework.data.neo4j.core.Neo4jClient neo4jClient;

    public synchronized void loadFromDB() {

        graph.clear();
        nodeIndex.clear();

        System.out.println("Loading nodes...");

        // 1. Load all nodes
        Collection<Map<String, Object>> nodesData = neo4jClient
                .query("MATCH (n:Location) RETURN n.id AS id, n.lat AS lat, n.lon AS lon, n.name AS name, n.highway AS highway")
                .fetch()
                .all();

        for (Map<String, Object> row : nodesData) {
            String id = (String) row.get("id");
            if (id == null)
                continue;

            double lat = ((Number) row.get("lat")).doubleValue();
            double lon = ((Number) row.get("lon")).doubleValue();
            String name = (String) row.get("name");
            String highway = (String) row.get("highway");

            Node n = new Node(id, lat, lon, name, highway);
            nodeIndex.put(id, n);
            graph.put(n, new ArrayList<>());
        }
        System.out.println("Nodes loaded: " + nodeIndex.size());

        System.out.println("Loading edges...");

        // 2. Load all edges
        Collection<Map<String, Object>> edgesData = neo4jClient
                .query("MATCH (n:Location)-[r:ROAD]->(m:Location) RETURN n.id AS from, m.id AS to, r.distance AS dist")
                .fetch()
                .all();

        int edgeCount = 0;
        for (Map<String, Object> row : edgesData) {
            String fromId = (String) row.get("from");
            String toId = (String) row.get("to");
            double dist = ((Number) row.get("dist")).doubleValue();

            Node from = nodeIndex.get(fromId);
            Node to = nodeIndex.get(toId);

            if (from != null && to != null) {
                graph.get(from).add(new Edge(to, dist));
                edgeCount++;
            }
        }
        System.out.println("Edges loaded: " + edgeCount);
    }

    public List<Node> bfsLevel1(String startId) {

        List<Node> result = new ArrayList<>();

        // Lookup with coordinate support
        Node start = findNode(startId);

        if (start == null) {
            return result; // empty
        }

        List<Edge> edges = graph.get(start);
        if (edges != null) {
            for (Edge e : edges) {
                result.add(e.to);
            }
        }
        return result;
    }

    public boolean dfsReachability(String fromId, String toId) {
        Node start = findNode(fromId);
        Node end = findNode(toId);

        if (start == null || end == null)
            return false;

        Set<Node> visited = new HashSet<>();
        Stack<Node> stack = new Stack<>();

        stack.push(start);
        visited.add(start);

        while (!stack.isEmpty()) {
            Node current = stack.pop();

            if (current.equals(end))
                return true;

            List<Edge> neighbors = graph.get(current);
            if (neighbors != null) {
                for (Edge edge : neighbors) {
                    if (!visited.contains(edge.to)) {
                        visited.add(edge.to);
                        stack.push(edge.to);
                    }
                }
            }
        }
        return false;
    }
    private Node findNode(String input) {

        // 1️⃣ Try direct ID match first
        Node byId = nodeIndex.get(input);
        if (byId != null) {
            return byId;
        }

        // 2️⃣ Check if input is lat,lon
        if (input == null || !input.contains(",")) {
            return null;
        }

        String[] parts = input.split(",");

        if (parts.length != 2) {
            return null;
        }

        try {
            double lat = Double.parseDouble(parts[0].trim());
            double lon = Double.parseDouble(parts[1].trim());

            return findByLatLon(lat, lon);

        } catch (NumberFormatException e) {
            return null;
        }
    }
    private Node findByLatLon(double lat, double lon) {

        double epsilon = 0.0001; // ~11 meters

        Node closest = null;
        double minDist = Double.MAX_VALUE;

        for (Node node : nodeIndex.values()) {

            double dLat = node.lat - lat;
            double dLon = node.lon - lon;

            double dist = dLat * dLat + dLon * dLon;

            if (dist < minDist) {
                minDist = dist;
                closest = node;
            }
        }

        return closest;
    }


    public PathResponse shortestPath(String fromId, String toId) {
        Node start=findNode(fromId);
        Node end=findNode(toId);
        if (start == null)
            throw new IllegalArgumentException("Start node " + fromId + " not found in graph.");
        if (end == null)
            throw new IllegalArgumentException("End node " + toId + " not found in graph.");

        Map<Node, Double> distances = new HashMap<>();
        Map<Node, Node> previous = new HashMap<>(); // To reconstruct path
        PriorityQueue<Node> queue = new PriorityQueue<>(Comparator.comparingDouble(distances::get));

        for (Node node : nodeIndex.values()) {
            distances.put(node, Double.MAX_VALUE);
        }
        distances.put(start, 0.0);
        queue.add(start);

        Set<Node> visited = new HashSet<>();

        while (!queue.isEmpty()) {
            Node current = queue.poll();

            if (current.equals(end))
                break; // Reached destination
            if (visited.contains(current))
                continue;
            visited.add(current);

            List<Edge> neighbors = graph.get(current);
            if (neighbors != null) {
                for (Edge edge : neighbors) {
                    double newDist = distances.get(current) + edge.distance;
                    if (newDist < distances.get(edge.to)) {
                        distances.put(edge.to, newDist);
                        previous.put(edge.to, current);
                        queue.add(edge.to); // Priority queue update (add duplicate, handled by visited)
                    }
                }
            }
        }

        if (distances.get(end) == Double.MAX_VALUE)
            return null; // Unreachable

        // Reconstruct path
        List<Node> path = new LinkedList<>();
        Node curr = end;
        while (curr != null) {
            path.add(0, curr);
            curr = previous.get(curr);
        }

        return new PathResponse(distances.get(end), path);
    }

    public Map<Node, List<Edge>> getGraph() {
        return graph;
    }

    public int getNodeCount() {
        return nodeIndex.size();
    }

    public int getEdgeCount() {
        return graph.values().stream().mapToInt(List::size).sum();
    }

    public Map<String, Double> getGraphBounds() {
        if (nodeIndex.isEmpty())
            return Collections.emptyMap();

        double minLat = Double.MAX_VALUE, maxLat = -Double.MAX_VALUE;
        double minLon = Double.MAX_VALUE, maxLon = -Double.MAX_VALUE;

        for (Node n : nodeIndex.values()) {
            if (n.lat < minLat)
                minLat = n.lat;
            if (n.lat > maxLat)
                maxLat = n.lat;
            if (n.lon < minLon)
                minLon = n.lon;
            if (n.lon > maxLon)
                maxLon = n.lon;
        }

        Map<String, Double> bounds = new HashMap<>();
        bounds.put("minLat", minLat);
        bounds.put("maxLat", maxLat);
        bounds.put("minLon", minLon);
        bounds.put("maxLon", maxLon);
        return bounds;
    }

    public GraphData getGraphData() {
        List<GraphData.NodeDto> nodes = new ArrayList<>();
        List<GraphData.EdgeDto> edges = new ArrayList<>();

        for (Map.Entry<Node, List<Edge>> entry : graph.entrySet()) {
            Node from = entry.getKey();
            nodes.add(new GraphData.NodeDto(from.id, from.lat, from.lon, from.name));
            for (Edge edge : entry.getValue()) {
                edges.add(new GraphData.EdgeDto(from.lat, from.lon, edge.to.lat, edge.to.lon));
            }
        }

        return new GraphData(nodes, edges);
    }
}
