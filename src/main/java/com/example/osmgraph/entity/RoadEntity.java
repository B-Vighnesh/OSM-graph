
package com.example.osmgraph.entity;

import org.springframework.data.neo4j.core.schema.*;

@RelationshipProperties
public class RoadEntity {

    @Id @GeneratedValue
    private Long id;

    @TargetNode
    public LocationEntity to;

    public double distance;

    public RoadEntity(LocationEntity to,double distance){
        this.to=to;
        this.distance=distance;
    }

    public RoadEntity(){}
}
