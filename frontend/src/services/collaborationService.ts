import { apiClient } from "./apiClient";

export const collaborationService = {
  async getCollaborationRequests() {
    const response = await apiClient.get("/collaboration/requests");
    return response.data;
  },

  async approveCollaborationRequest(requestId: number) {
    const response = await apiClient.post(`/collaboration/requests/${requestId}/approve`);
    return response.data;
  },
};
