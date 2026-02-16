
package com.example.osmgraph.model;

public class Edge {

 public Node to;
 public double distance;

 public Edge(Node to,double distance){
  this.to=to;
  this.distance=distance;
 }
}
