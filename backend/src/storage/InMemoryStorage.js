import { StorageService } from './StorageService.js';

/**
 * InMemoryStorage implementation for MVP.
 */
export class InMemoryStorage extends StorageService {
  constructor() {
    super();
    this.nodesMap = new Map();
    this.edgesMap = new Map();
    this.agentsMap = new Map();
    this.venueGraph = null;
    this.metadata = {};
    this.snapshots = [];
  }

  async getNodes() {
    return Array.from(this.nodesMap.values());
  }

  async getNode(id) {
    return this.nodesMap.get(id) || null;
  }

  async getEdges() {
    return Array.from(this.edgesMap.values());
  }

  async getEdge(id) {
    return this.edgesMap.get(id) || null;
  }

  async getAgents() {
    return Array.from(this.agentsMap.values());
  }

  async getVenueGraph() {
    return this.venueGraph;
  }

  async getMetadata() {
    return { ...this.metadata };
  }

  async saveSnapshot(snapshot) {
    this.snapshots.push({
      timestamp: new Date().toISOString(),
      ...snapshot
    });
    return true;
  }

  setVenueGraph(graph) {
    this.venueGraph = graph;
    this.nodesMap = graph.nodes;
    this.edgesMap = graph.edges;
  }

  // Direct synchronous helper methods for high-performance simulation tick access
  setNodes(nodesList) {
    this.nodesMap.clear();
    for (const node of nodesList) {
      this.nodesMap.set(node.id, node);
    }
  }

  setEdges(edgesList) {
    this.edgesMap.clear();
    for (const edge of edgesList) {
      this.edgesMap.set(edge.id, edge);
    }
  }

  setAgents(agentsList) {
    this.agentsMap.clear();
    for (const agent of agentsList) {
      this.agentsMap.set(agent.id, agent);
    }
  }

  setMetadata(metadataObj) {
    this.metadata = { ...metadataObj };
  }

  getNodeSync(id) {
    return this.nodesMap.get(id) || null;
  }

  getEdgeSync(id) {
    return this.edgesMap.get(id) || null;
  }

  getAgentSync(id) {
    return this.agentsMap.get(id) || null;
  }

  getVenueGraphSync() {
    return this.venueGraph;
  }
}
