# REST API Contracts

## Base URL: `http://localhost:5000/api`

### 1. Simulation Endpoints
- `POST /simulations` — Initialize simulation
- `POST /simulations/:id/start` — Start clock
- `POST /simulations/:id/pause` — Pause clock
- `POST /simulations/:id/resume` — Resume clock
- `POST /simulations/:id/reset` — Reset to baseline dataset
- `GET /simulations/:id/state` — Get current state snapshot

### 2. Analytics & Risks
- `GET /simulations/:id/predictions` — Get latest 10-min density predictions
- `GET /simulations/:id/risks` — Get current risk scores and alerts

### 3. Incidents & Scenarios
- `POST /simulations/:id/incidents` — Trigger incident (`route_closure`, `weather_change`, `medical_incident`)
- `POST /simulations/:id/scenarios` — Run sandbox what-if scenario comparison

### 4. Spectator Endpoints
- `GET /spectator/state` — Get spectator public venue map state
- `GET /spectator/routes` — Get optimal spectator walking route (`?from=GATE_A&to=GS_B`)

### 5. AI Copilot
- `POST /ai/copilot` — Generate operational recommendation for current state
