
package com.example.osmgraph.service;

import com.example.osmgraph.model.*;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GraphService {

 private final RestTemplate rest=new RestTemplate();
 private final Map<Node,List<Edge>> graph=new HashMap<>();

 public void loadFromOSM() throws Exception{

  String url="https://overpass-api.de/api/interpreter";

  String query =
   "[out:json];" +
   "way(around:1500,28.6315,77.2167)[\"highway\"];" +
   "out geom;";

  String res=rest.postForObject(url,query,String.class);

  ObjectMapper mapper=new ObjectMapper();
  JsonNode root=mapper.readTree(res);

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

 public Map<Node,List<Edge>> getGraph(){
  return graph;
 }
}
