# Simulation Architecture — Tick Loop & Agent Movement Engine

## Core Simulation Cycle
The Node.js backend runs a discrete 10-second tick simulation clock (`SimulationEngine`).

```mermaid
sequenceDiagram
    autonumber
    participant Clock as Tick Clock (10s interval)
    participant Sim as SimulationEngine
    participant Graph as VenueGraph & A* Router
    participant Risk as RiskEngine
    participant WS as Socket.IO Gateway

    Clock->>Sim: Advance Tick ()
    Sim->>Sim: Update Event & Weather Multipliers
    Sim->>Sim: Move Active Agents along Edges
    Sim->>Graph: Recalculate Paths if Edge Blocked
    Sim->>Sim: Recalculate Node Occupancies & Flows
    Sim->>Risk: Compute Risk Scores
    Sim->>WS: Broadcast Aggregated State
```

## Agent Movement Rules
- Each agent advances along current edge based on persona speed (`speed_mps`) scaled by weather penalty.
- Arriving at node updates node occupancy and triggers destination evaluation based on current F1 event.
- If destination is a queue facility (`FOOD_N`, `FOOD_S`, `MERCH`, `PIT_WALK`), agent enters queue state.
