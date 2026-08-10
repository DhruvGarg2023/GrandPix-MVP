import { Node } from '../models/Node.js';
import { Edge } from '../models/Edge.js';

/**
 * VenueGraph represents the circuit topology of nodes and dynamic pathways.
 */
export class VenueGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyMap = new Map();        // nodeId -> Array of Edge objects
    this.reverseAdjacencyMap = new Map(); // nodeId -> Array of Edge objects
  }

  static fromMasterInput(masterInputData) {
    const graph = new VenueGraph();

    for (const nodeData of masterInputData.nodes || []) {
      const node = new Node(nodeData);
      graph.addNode(node);
    }

    for (const edgeData of masterInputData.edges || []) {
      const edge = new Edge(edgeData);
      graph.addEdge(edge);
    }

    return graph;
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    if (!this.adjacencyMap.has(node.id)) {
      this.adjacencyMap.set(node.id, []);
    }
    if (!this.reverseAdjacencyMap.has(node.id)) {
      this.reverseAdjacencyMap.set(node.id, []);
    }
  }

  addEdge(edge) {
    this.edges.set(edge.id, edge);

    if (!this.adjacencyMap.has(edge.from)) {
      this.adjacencyMap.set(edge.from, []);
    }
    this.adjacencyMap.get(edge.from).push(edge);

    if (!this.reverseAdjacencyMap.has(edge.to)) {
      this.reverseAdjacencyMap.set(edge.to, []);
    }
    this.reverseAdjacencyMap.get(edge.to).push(edge);
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getEdge(id) {
    return this.edges.get(id) || null;
  }

  getNodes() {
    return Array.from(this.nodes.values());
  }

  getEdges() {
    return Array.from(this.edges.values());
  }

  getOutgoingEdges(nodeId) {
    return this.adjacencyMap.get(nodeId) || [];
  }

  getIncomingEdges(nodeId) {
    return this.reverseAdjacencyMap.get(nodeId) || [];
  }

  getNeighbors(nodeId) {
    const neighbors = [];
    const outgoing = this.adjacencyMap.get(nodeId) || [];
    for (const edge of outgoing) {
      neighbors.push({ edge, targetNodeId: edge.to });
    }
    const incoming = this.reverseAdjacencyMap.get(nodeId) || [];
    for (const edge of incoming) {
      neighbors.push({ edge, targetNodeId: edge.from });
    }
    return neighbors;
  }

  getEdgeBetween(fromNodeId, toNodeId) {
    const outgoing = this.getOutgoingEdges(fromNodeId);
    const match = outgoing.find(e => e.to === toNodeId);
    if (match) return match;

    const incoming = this.getIncomingEdges(fromNodeId);
    return incoming.find(e => e.from === toNodeId) || null;
  }

  blockEdge(edgeId) {
    const edge = this.getEdge(edgeId);
    if (edge) {
      edge.block();
      return true;
    }
    return false;
  }

  unblockEdge(edgeId) {
    const edge = this.getEdge(edgeId);
    if (edge) {
      edge.unblock();
      return true;
    }
    return false;
  }

  resetOccupancies() {
    for (const node of this.nodes.values()) {
      node.setOccupancy(0);
    }
  }

  toJSON() {
    return {
      nodes: this.getNodes().map(n => n.toJSON()),
      edges: this.getEdges().map(e => e.toJSON())
    };
  }
}
