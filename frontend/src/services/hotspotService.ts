/**
 * Typed client for /hotspots endpoints. Used by: corresponding module's hooks/components.
 *
 * NOTE: Scaffold placeholder only. Implementation to be added
 * during the corresponding roadmap milestone.
 */

import { apiClient } from "./apiClient";

export const hotspotService = {
  async getHotspots(stationId?: number) {
    const params = stationId !== undefined ? { stationId } : {};
    const response = await apiClient.get("/hotspot", { params });
    return response.data;
  },

  async getPredictedHotspots() {
    const response = await apiClient.get("/hotspot/predicted");
    return response.data;
  },
};
