# OSM Graph Traversal Explorer

A full-stack web application to visualize, explore, and traverse OpenStreetMap (OSM) data using graph algorithms. The system uses a Spring Boot backend with Neo4j and an in-memory graph, and a React + Leaflet frontend for interactive visualization.

---

## Features

* Load and parse `.osm` map files
* Build road network as a graph (nodes + edges)
* Store and reload data from Neo4j
* Shortest path calculation using Dijkstra
* BFS and DFS traversal
* Interactive map with start/end selection
* Animated route visualization
* Full graph overlay toggle
* Coordinate-to-node snapping
* Premium dark UI with glassmorphism

---

## Project Architecture

```
OSM File
   ↓
OsmFileParser
   ↓
In-Memory Graph (RAM)  ←→  Neo4j
   ↓
Graph Algorithms
   ↓
REST API (Spring Boot)
   ↓
React + Leaflet Frontend
   ↓
User Interface
```

---

## Project Structure

```
OSM-graph-main/
│
├── backend/                 # Spring Boot backend
│   ├── src/main/java/
│   │   └── com/example/osmgraph/
│   │       ├── controller/  # REST controllers
│   │       ├── service/     # Business logic
│   │       ├── model/       # Graph models
│   │       ├── entity/      # Neo4j entities
│   │       └── repo/        # Repositories
│   └── resources/
│       └── osm/map.osm      # Sample OSM file
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── services/        # API client
│   │   └── App.tsx
│   └── vite.config.ts
│
└── README.md
```

---

## Tech Stack

### Backend

* Java 17+
* Spring Boot
* Spring Data Neo4j
* Maven
* Neo4j Database

### Frontend

* React
* TypeScript
* Vite
* Leaflet / React-Leaflet
* Axios
* CSS Variables
* Lucide Icons

---

## Setup Instructions

### Prerequisites

* Java 17+
* Node.js 18+
* Maven
* Neo4j Desktop / Server

---

## Backend Setup

### Step 1: Configure Neo4j

Edit `backend/src/main/resources/application.properties`:

```
spring.neo4j.uri=bolt://localhost:7687
spring.neo4j.authentication.username=neo4j
spring.neo4j.authentication.password=your_password
```

---

### Step 2: Run Backend

```bash
cd backend
mvn spring-boot:run
```

Backend runs at:

```
http://localhost:8080
```

---

## Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Run Frontend

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## API Endpoints

### Load OSM File

```
POST /api/load/file
```

### Load from Database

```
GET /api/load/db
```

### Find Shortest Path

```
POST /api/path
```

Body:

```json
{
  "start": "lat,lon",
  "end": "lat,lon"
}
```

### Get Full Graph

```
GET /api/graph
```

---

## Core Components

### OsmFileParser

* Reads `.osm` XML files
* Extracts nodes and ways
* Builds in-memory graph

### GraphService

* Maintains nodeIndex and graph
* Implements Dijkstra, BFS, DFS
* Handles coordinate snapping

### GraphController

* Exposes REST APIs
* Communicates with frontend

### GraphOverlay.tsx

* Fetches `/api/graph`
* Renders full network
* Toggleable for performance

---

## Coordinate Snapping

Map clicks return coordinates, but the graph uses OSM node IDs.

If an ID contains `,`, it is treated as coordinates.

Process:

1. Parse lat/lon
2. Scan all nodes
3. Find nearest node
4. Return matched node

Current approach is linear scan (O(n)).

---

## Graph Algorithms

### Dijkstra

* Finds shortest path
* Uses edge distance as weight

### BFS

* Explores nearby nodes
* Used for neighborhood search

### DFS

* Checks reachability
* Used for connectivity

---

## Frontend Workflow

1. User clicks "Select A"
2. User clicks map
3. User clicks "Select B"
4. Backend calculates path
5. Path is animated on map

---

## Graph Overlay

The overlay shows the complete road network.

To enable:

1. Load data
2. Click 🕸 button
3. System fetches `/api/graph`
4. Nodes and edges are rendered

If nothing appears:

* Restart backend
* Reload OSM file
* Check Network tab

---

## Common Issues

### CORS Error

Handled by `CorsConfig.java`.

If issues persist, verify allowed origins.

---

### Graph Not Showing

Make sure:

* OSM file is loaded
* Backend is running
* `/api/graph` returns data

---

### Slow Performance

Causes:

* Large graph
* Full overlay rendering
* Linear coordinate scan

---

## Future Improvements

* Spatial indexing (KD-Tree / R-Tree)
* Bounding-box based graph loading
* Tiled rendering
* User authentication
* Saved routes
* Caching

---


## Contribution

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open Pull Request


