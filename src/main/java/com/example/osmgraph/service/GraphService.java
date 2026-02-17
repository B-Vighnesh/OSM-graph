
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

    private final RestTemplate rest=new RestTemplate();

    private final Map<Node,List<Edge>> graph=new HashMap<>();

    @Autowired
    private LocationRepository repo;

    @Autowired
    private OsmFileParser parser;


    public synchronized void loadFromFile() throws Exception {

        String path =
                "src/main/resources/osm/map.osm";

        graph.clear();

        Map<Node,List<Edge>> parsed =
                parser.parse(path);

        graph.putAll(parsed);

        persistToDB();
    }


    private void connect(Node a,Node b){

        double d=distance(a,b);

        graph
         .computeIfAbsent(a,k->new ArrayList<>())
         .add(new Edge(b,d));
    }

    private double distance(Node a,Node b){

        double R=6371000;

        double lat1=Math.toRadians(a.lat);
        double lat2=Math.toRadians(b.lat);

        double dLat=lat2-lat1;
        double dLon=Math.toRadians(b.lon-a.lon);

        double x=
         Math.sin(dLat/2)*Math.sin(dLat/2)+
         Math.cos(lat1)*Math.cos(lat2)*
         Math.sin(dLon/2)*Math.sin(dLon/2);

        double y=2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));

        return R*y;
    }

    @Transactional
    public void persistToDB(){

        System.out.println("Persisting (batch mode)...");

        // Snapshot
        Map<Node, List<Edge>> snapshot =
                new HashMap<>(graph);

        // Clear DB
        repo.deleteAll();

        Map<String, LocationEntity> saved =
                new HashMap<>();

        // ==========================
        // 1️⃣ BATCH SAVE NODES
        // ==========================

        List<LocationEntity> nodeBatch = new ArrayList<>();

        int BATCH_SIZE = 500;

        for (Node n : snapshot.keySet()) {

            LocationEntity e =
                    new LocationEntity(
                            n.id,
                            n.lat,
                            n.lon,
                            n.name,
                            n.highway
                    );


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

            LocationEntity fromDB =
                    saved.get(from.id);

            List<RoadEntity> roads =
                    new ArrayList<>();

            for (Edge e : entry.getValue()) {

                LocationEntity toDB =
                        saved.get(e.to.id);

                roads.add(
                        new RoadEntity(toDB, e.distance)
                );
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



    public synchronized void loadFromDB()
    {

        graph.clear();

        List<LocationEntity> all=repo.findAll();

        Map<String,Node> nodes=new HashMap<>();

        for(LocationEntity e:all){

            Node n = new Node(
                    e.getId(),
                    e.getLat(),
                    e.getLon(),
                    e.getName(),
                    e.getHighway()
            );

            nodes.put(e.getId(),n);
            graph.put(n,new ArrayList<>());
        }

        for(LocationEntity e:all){

            Node from=nodes.get(e.getId());

            if(e.getRoads() ==null) continue;

            for(RoadEntity r: e.getRoads()){

                Node to=nodes.get(r.getTo().getId());

                graph.get(from)
                  .add(new Edge(to, r.getDistance()));
            }
        }
    }
    public List<Node> bfsLevel1(String startId){

        List<Node> result = new ArrayList<>();

        // Find start node
        Node start = null;

        for(Node n : graph.keySet()){
            if(n.id.equals(startId)){
                start = n;
                break;
            }
        }

        if(start == null){
            return result; // empty
        }

        // Visited set (avoid loops)
        Set<Node> visited = new HashSet<>();

        Queue<Node> queue = new LinkedList<>();

        // Start BFS
        queue.add(start);
        visited.add(start);

        int level = 0;

        while(!queue.isEmpty()){

            int size = queue.size();

            // One BFS layer
            for(int i=0;i<size;i++){

                Node curr = queue.poll();

                // Stop at level 1
                if(level == 1){
                    result.add(curr);
                    continue;
                }

                // Visit neighbors
                for(Edge e : graph.get(curr)){

                    Node next = e.to;

                    if(!visited.contains(next)){
                        visited.add(next);
                        queue.add(next);
                    }
                }
            }

            level++;

            if(level > 1) break;
        }

        return result;
    }

    public Map<Node,List<Edge>> getGraph(){
        return graph;
    }
}
