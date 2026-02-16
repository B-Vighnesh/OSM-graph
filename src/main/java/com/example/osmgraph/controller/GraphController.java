
package com.example.osmgraph.controller;

import com.example.osmgraph.model.Edge;
import com.example.osmgraph.model.Node;
import com.example.osmgraph.service.GraphService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GraphController {

 private final GraphService service;

 public GraphController(GraphService service){
  this.service=service;
 }

 @GetMapping("/load")
 public Map<Node, List<Edge>> load() throws Exception{

  service.loadFromOSM();

  return service.getGraph();
 }
}
