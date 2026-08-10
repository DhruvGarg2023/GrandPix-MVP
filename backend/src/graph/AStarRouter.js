/**
 * PriorityQueue for A* Min-Heap pathfinding.
 */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[index].priority < this.heap[parentIdx].priority) {
        [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let smallest = index;

      if (leftChildIdx < length && this.heap[leftChildIdx].priority < this.heap[smallest].priority) {
        smallest = leftChildIdx;
      }
      if (rightChildIdx < length && this.heap[rightChildIdx].priority < this.heap[smallest].priority) {
        smallest = rightChildIdx;
      }
      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }
}

/**
 * AStarRouter calculates optimal congestion-aware shortest paths across the circuit venue graph.
 */
export class AStarRouter {
  constructor(options = {}) {
    this.congestionWeight = options.congestionWeight ?? 3.0;
  }

  /**
   * Calculates dynamic traversal cost of an edge based on distance, blocked state, and target node density.
   * Cost = distance_m * (1.0 + congestionWeight * (occupancy / capacity)^2)
   */
  calculateEdgeCost(edge, targetNode) {
    if (!edge || edge.isBlocked) {
      return Infinity;
    }

    const distance = edge.distanceM || 0;
    const density = targetNode ? targetNode.densityRatio : 0;
    const congestionMultiplier = 1.0 + this.congestionWeight * Math.pow(density, 2);

    return distance * congestionMultiplier;
  }

  /**
   * Calculates congestion-aware path from startNodeId to targetNodeId using A*.
   * Returns array of node IDs: ['START_NODE', 'INTERMEDIATE_NODE', 'TARGET_NODE']
   */
  findPath(graph, startNodeId, targetNodeId) {
    if (!graph || !startNodeId || !targetNodeId) {
      return [startNodeId];
    }
    if (startNodeId === targetNodeId) {
      return [startNodeId];
    }

    const startNode = graph.getNode(startNodeId);
    const targetNode = graph.getNode(targetNodeId);

    if (!startNode || !targetNode) {
      return [startNodeId];
    }

    const gScore = new Map(); // nodeId -> lowest cost from start
    const fScore = new Map(); // nodeId -> estimated total cost
    const cameFrom = new Map(); // nodeId -> preceding nodeId

    const openSet = new MinHeap();

    gScore.set(startNodeId, 0);
    fScore.set(startNodeId, 0);

    openSet.push({ node: startNodeId, priority: 0 });

    const visited = new Set();

    while (!openSet.isEmpty()) {
      const { node: currentId } = openSet.pop();

      if (currentId === targetNodeId) {
        // Reconstruct path
        const path = [targetNodeId];
        let curr = targetNodeId;
        while (cameFrom.has(curr)) {
          curr = cameFrom.get(curr);
          path.unshift(curr);
        }
        return path;
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentG = gScore.get(currentId) ?? Infinity;
      const neighbors = graph.getNeighbors ? graph.getNeighbors(currentId) : graph.getOutgoingEdges(currentId).map(e => ({ edge: e, targetNodeId: e.to }));

      for (const { edge, targetNodeId: neighborId } of neighbors) {
        if (edge.isBlocked) continue;

        const neighborNode = graph.getNode(neighborId);
        
        const edgeCost = this.calculateEdgeCost(edge, neighborNode);
        if (!isFinite(edgeCost)) continue;

        const tentativeG = currentG + edgeCost;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          
          // Admissible heuristic: h(n) = 0 (guarantees exact global minimum cost path)
          const h = 0;
          const tentativeF = tentativeG + h;
          fScore.set(neighborId, tentativeF);

          openSet.push({ node: neighborId, priority: tentativeF });
        }
      }
    }

    // Path unreachable (e.g. edge blocked isolate target)
    return [startNodeId];
  }
}
