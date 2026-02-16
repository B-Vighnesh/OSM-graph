
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

    public synchronized void loadFromOSM() throws Exception
    {

        String url="https://overpass-api.de/api/interpreter";

        // Mangaluru coordinates
        String query =
         "[out:json];" +
         "way(around:3000,12.9141,74.8560)[\"highway\"];" +
         "out geom;";

        String res=rest.postForObject(url,query,String.class);

        ObjectMapper mapper=new ObjectMapper();
        JsonNode root=mapper.readTree(res);

        graph.clear();

        for(JsonNode way:root.get("elements")){

            JsonNode geo=way.get("geometry");

            for(int i=0;i<geo.size()-1;i++){

                double lat1=geo.get(i).get("lat").asDouble();
                double lon1=geo.get(i).get("lon").asDouble();

                double lat2=geo.get(i+1).get("lat").asDouble();
                double lon2=geo.get(i+1).get("lon").asDouble();

                Node a=new Node(lat1+":"+lon1,lat1,lon1);
                Node b=new Node(lat2+":"+lon2,lat2,lon2);

                connect(a,b);
                connect(b,a);
            }
        }

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

        // Make snapshot copy first (IMPORTANT)
        Map<Node, List<Edge>> snapshot =
                new HashMap<>(graph);

        // Clear DB first
        repo.deleteAll();

        Map<String,LocationEntity> saved =
                new HashMap<>();

        // Save nodes
        for(Node n : snapshot.keySet()){

            LocationEntity e =
                    new LocationEntity(n.id,n.lat,n.lon);

            saved.put(n.id,e);
        }

        repo.saveAll(saved.values());

        // Save relationships
        for(Map.Entry<Node,List<Edge>> entry
                : snapshot.entrySet()){

            Node from = entry.getKey();

            LocationEntity fromDB =
                    saved.get(from.id);

            List<RoadEntity> roads =
                    new ArrayList<>();

            for(Edge e : entry.getValue()){

                LocationEntity toDB =
                        saved.get(e.to.id);

                roads.add(
                        new RoadEntity(toDB,e.distance)
                );
            }

            fromDB.roads = roads;
            repo.save(fromDB);
        }
    }


    public synchronized void loadFromDB()
    {

        graph.clear();

        List<LocationEntity> all=repo.findAll();

        Map<String,Node> nodes=new HashMap<>();

        for(LocationEntity e:all){

            Node n=new Node(e.id,e.lat,e.lon);
            nodes.put(e.id,n);
            graph.put(n,new ArrayList<>());
        }

        for(LocationEntity e:all){

            Node from=nodes.get(e.id);

            if(e.roads==null) continue;

            for(RoadEntity r:e.roads){

                Node to=nodes.get(r.to.id);

                graph.get(from)
                  .add(new Edge(to,r.distance));
            }
        }
    }

    public Map<Node,List<Edge>> getGraph(){
        return graph;
    }
}
