package com.example.osmgraph.service;

import com.example.osmgraph.model.Node;
import com.example.osmgraph.model.Edge;
import org.openstreetmap.osmosis.xml.v0_6.XmlReader;
import org.openstreetmap.osmosis.core.container.v0_6.EntityContainer;
import org.openstreetmap.osmosis.core.task.v0_6.Sink;
import org.openstreetmap.osmosis.core.domain.v0_6.*;

import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.util.*;

@Service
public class OsmFileParser {

    private final Map<String, Node> nodeMap = new HashMap<>();
    private final Map<Node, List<Edge>> graph = new HashMap<>();


    public Map<Node,List<Edge>> parse(String path) throws Exception {

        XmlReader reader =
                new XmlReader(new FileInputStream(path), false);

        reader.setSink(new Sink() {

            @Override
            public void process(EntityContainer ec) {

                Entity e = ec.getEntity();

                // ---------- READ NODES ----------
                if(e instanceof org.openstreetmap.osmosis.core.domain.v0_6.Node){

                    var n = (org.openstreetmap.osmosis.core.domain.v0_6.Node)e;

                    String id = String.valueOf(n.getId());

                    Node node = new Node(
                            id,
                            n.getLatitude(),
                            n.getLongitude(),
                            null
                    );

                    nodeMap.put(id,node);
                }


                // ---------- READ WAYS ----------
                if(e instanceof Way){

                    Way way = (Way)e;

                    String roadName = "UNKNOWN";

                    for(Tag t : way.getTags()){
                        if(t.getKey().equals("name")){
                            roadName = t.getValue();
                        }
                    }

                    List<WayNode> refs = way.getWayNodes();

                    for(int i=0;i<refs.size()-1;i++){

                        String id1 = String.valueOf(refs.get(i).getNodeId());
                        String id2 = String.valueOf(refs.get(i+1).getNodeId());

                        Node a = nodeMap.get(id1);
                        Node b = nodeMap.get(id2);

                        if(a==null || b==null) continue;

                        a.name = roadName;
                        b.name = roadName;

                        connect(a,b);
                        connect(b,a);
                    }
                }
            }

            @Override public void initialize(Map<String,Object> map){}
            @Override public void complete(){}
            @Override public void close(){}
        });

        reader.run();

        return graph;
    }


    private void connect(Node a,Node b){

        double d = distance(a,b);

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
}
