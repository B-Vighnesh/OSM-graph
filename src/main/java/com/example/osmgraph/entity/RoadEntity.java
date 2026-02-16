package com.example.osmgraph.entity;

import org.springframework.data.neo4j.core.schema.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.neo4j.core.schema.GeneratedValue;

@RelationshipProperties
public class RoadEntity {

    @Id
    @GeneratedValue
    private Long id;   // REQUIRED by Spring Data

    @TargetNode
    private LocationEntity to;

    private double distance;

    public RoadEntity() {}

    public RoadEntity(LocationEntity to, double distance) {
        this.to = to;
        this.distance = distance;
    }

    public Long getId() {
        return id;
    }

    public LocationEntity getTo() {
        return to;
    }

    public void setTo(LocationEntity to) {
        this.to = to;
    }

    public double getDistance() {
        return distance;
    }

    public void setDistance(double distance) {
        this.distance = distance;
    }
}
