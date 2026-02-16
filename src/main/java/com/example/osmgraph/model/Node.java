
package com.example.osmgraph.model;

public class Node {

 public String id;
 public double lat;
 public double lon;

 public Node(String id,double lat,double lon){
  this.id=id;
  this.lat=lat;
  this.lon=lon;
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
