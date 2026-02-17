
package com.example.osmgraph.controller;

import com.example.osmgraph.model.Node;
import com.example.osmgraph.service.GraphService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class GraphController {

    private final GraphService service;

    public GraphController(GraphService service){
        this.service=service;
    }
    @GetMapping("/bfs1/{id}")
    public List<Node> bfs1(@PathVariable String id){
        return service.bfsLevel1(id);
    }
    @GetMapping("/load-file")
    public String loadFile() throws Exception{

        service.loadFromFile();

        return "Loaded from OSM file";
    }

//    @GetMapping("/load-osm")
//    public String loadOSM() throws Exception{
//
//        service.loadFromOSM();
//
//        return "Loaded from OSM and saved to Neo4j. Nodes = "
//                +service.getGraph().size();
//    }

    @GetMapping("/load-db")
    public String loadDB(){

        service.loadFromDB();

        return "Loaded from Neo4j. Nodes = "
                +service.getGraph().size();
    }

    @GetMapping("/clear-db")
    public String clear(){

        service.persistToDB();

        return "Database refreshed.";
    }
}
