
package com.example.osmgraph.controller;

import com.example.osmgraph.model.Node;
import com.example.osmgraph.service.GraphService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class GraphController {

    private final GraphService service;

    public GraphController(GraphService service) {
        this.service = service;
    }

    @GetMapping("/bfs1/{id}")
    public List<Node> bfs1(@PathVariable("id") String id) {
        return service.bfsLevel1(id);
    }

    @GetMapping("/load-file")
    public Map<String, Object> loadFile() throws Exception {
        service.loadFromFile();
        return Map.of(
                "message", "Loaded from OSM file",
                "nodeCount", service.getNodeCount());
    }

    // @GetMapping("/load-osm")
    // public String loadOSM() throws Exception{
    //
    // service.loadFromOSM();
    //
    // return "Loaded from OSM and saved to Neo4j. Nodes = "
    // +service.getGraph().size();
    // }

    @GetMapping("/load-db")
    public Map<String, Object> loadDB() {
        service.loadFromDB();
        return Map.of(
                "message", "Loaded from Neo4j",
                "nodeCount", service.getNodeCount());
    }

    @GetMapping("/clear-db")
    public Map<String, String> clear() {
        service.persistToDB();
        return Map.of("message", "Database refreshed and persisted.");
    }

    @GetMapping("/dfs")
    public boolean dfs(@RequestParam("from") String from, @RequestParam("to") String to) {
        return service.dfsReachability(from, to);
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "nodeCount", service.getNodeCount(),
                "edgeCount", service.getEdgeCount());
    }

    @GetMapping("/bounds")
    public Map<String, Double> getBounds() {
        return service.getGraphBounds();
    }

    @GetMapping("/graph")
    public com.example.osmgraph.model.GraphData getGraph() {
        return service.getGraphData();
    }

    @GetMapping("/shortest")
    public org.springframework.http.ResponseEntity<?> shortest(@RequestParam("from") String from,
            @RequestParam("to") String to) {

        try {
            com.example.osmgraph.model.PathResponse path = service.shortestPath(from, to);
            if (path == null) {
                return org.springframework.http.ResponseEntity.status(404).body(Map.of("message", "Path not found"));
            }
            return org.springframework.http.ResponseEntity.ok(path);
        } catch (IllegalArgumentException e) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
    @PostMapping("/upload-file")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            service.handleUpload(file);
            return ResponseEntity.ok(Map.of("message", "File uploaded successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
