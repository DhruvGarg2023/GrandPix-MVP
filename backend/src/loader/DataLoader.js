import fs from 'fs';
import path from 'path';
import { VenueGraph } from '../graph/VenueGraph.js';
import { Agent } from '../models/Agent.js';

/**
 * DataLoader parses, validates, and hydrates dataset files into storage.
 */
export class DataLoader {
  constructor(dataPath) {
    this.dataPath = dataPath;
  }

  loadMasterInput() {
    const masterPath = path.join(this.dataPath, 'f1_master_input.json');
    if (!fs.existsSync(masterPath)) {
      throw new Error(`Master input file not found at: ${masterPath}`);
    }
    const rawData = fs.readFileSync(masterPath, 'utf-8');
    const masterData = JSON.parse(rawData);
    return masterData;
  }

  loadCrowdAgentsCSV() {
    const agentsPath = path.join(this.dataPath, 'crowd_agents_2000.csv');
    if (!fs.existsSync(agentsPath)) {
      throw new Error(`Crowd agents CSV file not found at: ${agentsPath}`);
    }
    const rawData = fs.readFileSync(agentsPath, 'utf-8');
    const lines = rawData.trim().split(/\r?\n/);
    if (lines.length <= 1) {
      throw new Error('Crowd agents CSV is empty or missing data rows');
    }

    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['agent_id', 'persona', 'entry_gate', 'initial_destination', 'speed_mps', 'patience', 'group_size'];
    for (const h of expectedHeaders) {
      if (!header.includes(h)) {
        throw new Error(`Missing expected CSV header '${h}' in crowd_agents_2000.csv`);
      }
    }

    const agents = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim());
      
      const agent = {
        id: cols[0],
        persona: cols[1],
        entryGate: cols[2],
        initialDestination: cols[3],
        speedMps: parseFloat(cols[4]),
        patience: parseFloat(cols[5]),
        groupSize: parseInt(cols[6], 10)
      };

      agents.push(agent);
    }

    return agents;
  }

  validateDataset(masterData, agentsData) {
    const errors = [];

    // 1. Validate Nodes
    if (!Array.isArray(masterData.nodes) || masterData.nodes.length === 0) {
      errors.push('Master input must contain a non-empty nodes array.');
    }
    const nodeIds = new Set();
    for (const node of masterData.nodes || []) {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Invalid or missing node ID in node: ${JSON.stringify(node)}`);
      } else {
        nodeIds.add(node.id);
      }
      if (typeof node.capacity !== 'number' || node.capacity <= 0) {
        errors.push(`Node ${node.id} has invalid capacity: ${node.capacity}`);
      }
    }

    // 2. Validate Edges
    if (!Array.isArray(masterData.edges) || masterData.edges.length === 0) {
      errors.push('Master input must contain a non-empty edges array.');
    }
    const edgeIds = new Set();
    for (const edge of masterData.edges || []) {
      if (!edge.id || typeof edge.id !== 'string') {
        errors.push(`Invalid or missing edge ID in edge: ${JSON.stringify(edge)}`);
      } else {
        edgeIds.add(edge.id);
      }
      if (!nodeIds.has(edge.from)) {
        errors.push(`Edge ${edge.id} references invalid 'from' node ID: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(`Edge ${edge.id} references invalid 'to' node ID: ${edge.to}`);
      }
      if (typeof edge.distance_m !== 'number' || edge.distance_m <= 0) {
        errors.push(`Edge ${edge.id} has invalid distance_m: ${edge.distance_m}`);
      }
      if (typeof edge.capacity_per_min !== 'number' || edge.capacity_per_min <= 0) {
        errors.push(`Edge ${edge.id} has invalid capacity_per_min: ${edge.capacity_per_min}`);
      }
    }

    // 3. Validate Initial Occupancy
    if (masterData.initial_occupancy) {
      for (const [nodeId, count] of Object.entries(masterData.initial_occupancy)) {
        if (!nodeIds.has(nodeId)) {
          errors.push(`Initial occupancy references unknown node ID: ${nodeId}`);
        }
        if (typeof count !== 'number' || count < 0) {
          errors.push(`Initial occupancy count for ${nodeId} must be a non-negative number.`);
        }
      }
    }

    // 4. Validate Personas & Destination Probabilities
    if (masterData.personas) {
      for (const [personaName, spec] of Object.entries(masterData.personas)) {
        if (typeof spec.share !== 'number' || typeof spec.speed_mps !== 'number' || typeof spec.patience !== 'number') {
          errors.push(`Invalid persona spec for '${personaName}'`);
        }
      }
    }

    // 5. Validate Agents CSV
    if (!Array.isArray(agentsData) || agentsData.length === 0) {
      errors.push('Crowd agents dataset is empty or invalid.');
    }
    for (const agent of agentsData || []) {
      if (!nodeIds.has(agent.entryGate)) {
        errors.push(`Agent ${agent.id} references unknown entry_gate: ${agent.entryGate}`);
      }
      if (!nodeIds.has(agent.initialDestination)) {
        errors.push(`Agent ${agent.id} references unknown initial_destination: ${agent.initialDestination}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Dataset validation failed with ${errors.length} error(s):\n - ${errors.join('\n - ')}`);
    }

    return true;
  }

  loadAndHydrate(storage) {
    const masterData = this.loadMasterInput();
    const agentsData = this.loadCrowdAgentsCSV();

    this.validateDataset(masterData, agentsData);

    // Instantiate VenueGraph & set initial occupancies
    const graph = VenueGraph.fromMasterInput(masterData);
    if (masterData.initial_occupancy) {
      for (const [nodeId, count] of Object.entries(masterData.initial_occupancy)) {
        const node = graph.getNode(nodeId);
        if (node) {
          node.setOccupancy(count);
        }
      }
    }
    storage.setVenueGraph(graph);

    // Instantiate Agent objects
    const agentModels = agentsData.map(data => new Agent(data));
    storage.setAgents(agentModels);

    const metadata = {
      version: masterData.version,
      scenario: masterData.scenario,
      initialOccupancy: masterData.initial_occupancy,
      gateDistribution: masterData.gate_distribution,
      personas: masterData.personas,
      destinationProbabilities: masterData.destination_probabilities,
      eventDestinationProbabilities: masterData.event_destination_probabilities,
      queueService: masterData.queue_service,
      schedule: masterData.schedule,
      weather: masterData.weather,
      incidents: masterData.incidents,
      simulationPopulation: masterData.simulation_population,
      attendanceScaleFactor: masterData.attendance_scale_factor
    };

    storage.setMetadata(metadata);

    return {
      nodesCount: masterData.nodes.length,
      edgesCount: masterData.edges.length,
      agentsCount: agentModels.length,
      scenario: masterData.scenario
    };
  }

  parseAgentsCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length <= 1) {
      throw new Error('Agents CSV is empty or missing header');
    }

    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['agent_id', 'persona', 'entry_gate', 'initial_destination', 'speed_mps', 'patience', 'group_size'];
    for (const h of expectedHeaders) {
      if (!header.includes(h)) {
        throw new Error(`Missing expected CSV header '${h}' in agents CSV`);
      }
    }

    const idIdx = header.indexOf('agent_id');
    const personaIdx = header.indexOf('persona');
    const gateIdx = header.indexOf('entry_gate');
    const destIdx = header.indexOf('initial_destination');
    const speedIdx = header.indexOf('speed_mps');
    const patienceIdx = header.indexOf('patience');
    const groupIdx = header.indexOf('group_size');

    const agents = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim());
      
      agents.push({
        id: cols[idIdx],
        persona: cols[personaIdx],
        entryGate: cols[gateIdx],
        initialDestination: cols[destIdx],
        speedMps: parseFloat(cols[speedIdx]) || 1.2,
        patience: parseFloat(cols[patienceIdx]) || 600,
        groupSize: parseInt(cols[groupIdx], 10) || 1
      });
    }
    return agents;
  }

  parseScheduleCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length <= 1) {
      throw new Error('Schedule CSV is empty or missing header');
    }

    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['time', 'event', 'demand_multiplier'];
    for (const h of expectedHeaders) {
      if (!header.includes(h)) {
        throw new Error(`Missing expected CSV header '${h}' in schedule CSV`);
      }
    }

    const timeIdx = header.indexOf('time');
    const eventIdx = header.indexOf('event');
    const multiplierIdx = header.indexOf('demand_multiplier');

    const schedule = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim());
      
      schedule.push({
        time: cols[timeIdx],
        event: cols[eventIdx],
        demand_multiplier: parseFloat(cols[multiplierIdx]) || 1.0
      });
    }
    return schedule;
  }

  loadCustomAndHydrate(storage, graphJson, agentsCsvText, scheduleCsvText) {
    let agentsData = [];
    if (agentsCsvText) {
      agentsData = this.parseAgentsCSV(agentsCsvText);
    } else {
      agentsData = this.loadCrowdAgentsCSV();
    }

    if (scheduleCsvText) {
      const scheduleData = this.parseScheduleCSV(scheduleCsvText);
      graphJson.schedule = scheduleData;
    }

    this.validateDataset(graphJson, agentsData);

    const graph = VenueGraph.fromMasterInput(graphJson);
    if (graphJson.initial_occupancy) {
      for (const [nodeId, count] of Object.entries(graphJson.initial_occupancy)) {
        const node = graph.getNode(nodeId);
        if (node) {
          node.setOccupancy(count);
        }
      }
    }
    storage.setVenueGraph(graph);

    const agentModels = agentsData.map(data => new Agent(data));
    storage.setAgents(agentModels);

    const metadata = {
      version: graphJson.version || "1.0",
      scenario: graphJson.scenario || { circuit: "Custom Circuit", attendance: agentModels.length },
      initialOccupancy: graphJson.initial_occupancy,
      gateDistribution: graphJson.gate_distribution,
      personas: graphJson.personas,
      destinationProbabilities: graphJson.destination_probabilities,
      eventDestinationProbabilities: graphJson.event_destination_probabilities,
      queueService: graphJson.queue_service,
      schedule: graphJson.schedule,
      weather: graphJson.weather || { condition: "sunny", intensity: 0.1 },
      incidents: graphJson.incidents || [],
      simulationPopulation: graphJson.simulation_population,
      attendanceScaleFactor: graphJson.attendance_scale_factor
    };

    storage.setMetadata(metadata);

    return {
      nodesCount: graphJson.nodes.length,
      edgesCount: graphJson.edges.length,
      agentsCount: agentModels.length,
      scenario: metadata.scenario
    };
  }
}
