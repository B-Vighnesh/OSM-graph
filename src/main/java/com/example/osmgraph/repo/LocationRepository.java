package com.example.osmgraph.repo;

import com.example.osmgraph.entity.LocationEntity;
import org.springframework.data.neo4j.repository.Neo4jRepository;

public interface LocationRepository
        extends Neo4jRepository<LocationEntity,String> {
}
