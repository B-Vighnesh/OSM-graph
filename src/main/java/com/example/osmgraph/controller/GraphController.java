
package com.example.osmgraph.controller;

import com.example.osmgraph.service.GraphService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class GraphController {

    private final GraphService service;

    public GraphController(GraphService service){
        this.service=service;
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
