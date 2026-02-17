package com.example.osmgraph.model;

import java.util.List;

public class PathResponse {

    private double totalDistance;
    private List<Node> path;

    public PathResponse(double totalDistance, List<Node> path) {
        this.totalDistance = totalDistance;
        this.path = path;
    }

    public double getTotalDistance() {
        return totalDistance;
    }

    public void setTotalDistance(double totalDistance) {
        this.totalDistance = totalDistance;
    }

    public List<Node> getPath() {
        return path;
    }

    public void setPath(List<Node> path) {
        this.path = path;
    }
}
