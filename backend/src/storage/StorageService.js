/**
 * Abstract StorageService interface preserving extensibility
 * (e.g. future PostgresStorage migration).
 */
export class StorageService {
  async getNodes() {
    throw new Error('StorageService.getNodes must be implemented');
  }

  async getNode(id) {
    throw new Error('StorageService.getNode must be implemented');
  }

  async getEdges() {
    throw new Error('StorageService.getEdges must be implemented');
  }

  async getEdge(id) {
    throw new Error('StorageService.getEdge must be implemented');
  }

  async getAgents() {
    throw new Error('StorageService.getAgents must be implemented');
  }

  async getMetadata() {
    throw new Error('StorageService.getMetadata must be implemented');
  }

  async saveSnapshot(snapshot) {
    throw new Error('StorageService.saveSnapshot must be implemented');
  }
}
