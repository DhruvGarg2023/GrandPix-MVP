# Socket.IO Event Payloads

## Events Emitted by Server

### 1. `simulation:tick`
Emitted every tick (10s simulation time). Contains aggregated node occupancies, densities, risk levels, and edge flows.

### 2. `risk:updated`
Emitted when risk scores transition across severity thresholds (`SAFE`, `MODERATE`, `HIGH`, `CRITICAL`).

### 3. `prediction:updated`
Emitted when Python ML service returns updated 10-minute future density ratios.

### 4. `recommendation:new`
Emitted when Hugging Face (or Fallback Engine) generates a new operational recommendation.

### 5. `incident:created`
Emitted when an operator or scenario triggers an incident (e.g., edge closure).
