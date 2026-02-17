
package com.example.osmgraph.model;

public class Node {

    public String id;
    public double lat;
    public double lon;

    public String name;       // road name
    public String highway;    // road type


    public Node(String id, double lat, double lon,
                String name, String highway){

        this.id = id;
        this.lat = lat;
        this.lon = lon;
        this.name = name;
        this.highway = highway;
    }


 @Override
 public boolean equals(Object o){
  if(this==o) return true;
  if(!(o instanceof Node)) return false;
  Node n=(Node)o;
  return id.equals(n.id);
 }

 @Override
 public int hashCode(){
  return id.hashCode();
 }
}
