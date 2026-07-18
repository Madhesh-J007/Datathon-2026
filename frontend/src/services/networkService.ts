import { apiClient } from "./apiClient";

export const networkService = {
  async getGangs() {
    const response = await apiClient.get("/network/gangs");
    return response.data;
  },

  async establishLink(payload: { SourcePersonID: number; TargetPersonID: number; RelationshipType: string; EvidenceSource?: string }) {
    const response = await apiClient.post("/network/relationships", payload);
    return response.data;
  },

  async verifyLink(relationshipId: number, status: string) {
    const response = await apiClient.put(`/network/relationships/${relationshipId}/verify`, { Status: status });
    return response.data;
  },
};

