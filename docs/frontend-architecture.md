# Frontend Architecture — Next.js Control Center

## Tech Stack
- **Framework**: Next.js (App Router, React, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Real-Time**: Socket.IO Client
- **Mapping**: Leaflet / MapLibre (SVG Graph & GeoJSON Overlay)
- **Charts**: Recharts (Timeline & Density forecasting)
- **Animations**: Framer Motion

## Page Layout & Routing
```mermaid
flowchart TD
    App[Next.js App Router] --> Dash[/dashboard - Organizer Command Center]
    App --> Spec[/spectator - Spectator Route Guide]
    App --> WhatIf[/what-if - Scenario Simulation Studio]
```

## Key Guidelines
1. **Zero Simulation Logic**: The frontend is strictly a presentation and control interface. It receives state snapshots via Socket.IO/REST and dispatches user actions.
2. **Aggregated Updates**: The client consumes node densities, edge flows, risk scores, and predictions. Individual 2,000 agent coordinates are not streamed to the client to ensure high rendering performance.
3. **F1 Aesthetic**: Premium dark mode theme with dynamic color badges for risk levels (Green SAFE, Yellow MODERATE, Orange HIGH, Red CRITICAL).
