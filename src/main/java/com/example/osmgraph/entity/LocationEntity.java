package com.example.osmgraph.entity;

import org.springframework.data.neo4j.core.schema.*;

@Node("Location")
public class LocationEntity {

    @Id
    public String id;

    public double lat;
    public double lon;

    public LocationEntity(String id,double lat,double lon){
        this.id=id;
        this.lat=lat;
        this.lon=lon;
    }
}
