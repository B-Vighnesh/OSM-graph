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
    private String name;
    private String highway;

    @Version
    private Long version;

    @Relationship(type = "ROAD")
    private List<RoadEntity> roads;

    public LocationEntity() {}

    public LocationEntity(String id, double lat, double lon,
                          String name, String highway) {

        this.id = id;
        this.lat = lat;
        this.lon = lon;
        this.name = name;
        this.highway = highway;
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
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getHighway() {
        return highway;
    }

    public void setHighway(String highway) {
        this.highway = highway;
    }

}
