package com.example.osmgraph.entity;
import org.springframework.data.annotation.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;
import org.springframework.data.annotation.Version;

import java.util.List;

@Node("Location")
public class LocationEntity {

    @Id
    private String id;

    private double lat;
    private double lon;

    @Version
    private Long version;

    @Relationship(type = "ROAD")
    private List<RoadEntity> roads;

    public LocationEntity() {}

    public LocationEntity(String id, double lat, double lon) {
        this.id = id;
        this.lat = lat;
        this.lon = lon;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<RoadEntity> getRoads() {
        return roads;
    }

    public void setRoads(List<RoadEntity> roads) {
        this.roads = roads;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public double getLon() {
        return lon;
    }

    public void setLon(double lon) {
        this.lon = lon;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }
}
