# Data Model & Schema Specs

## Source Dataset Files
1. `data/f1_master_input.json`: Circuit geometry, node capacities, edge properties, personas, F1 event schedule, weather schedule, queue specs.
2. `data/crowd_agents_2000.csv`: Agent initial states (2,000 synthetic agents).
3. `data/historical_simulation_training.csv`: Training dataset for 10-min density regression.

## Core Entities
- **Node**: `{ id, type, capacity, currentOccupancy, densityRatio, riskScore, queueLength }`
- **Edge**: `{ id, from, to, distance_m, capacity_per_min, currentFlowRate, isBlocked }`
- **Agent**: `{ id, persona, entryGate, currentNode, destination, speedMps, patience, route, routeIndex, status }`
- **Incident**: `{ time, type, edge_id, node_id, duration_min }`
