import { apiClient } from "./apiClient";

export const reportService = {
  async getCaseReportSummary(caseId: number) {
    const response = await apiClient.get(`/reports/cases/${caseId}/summary`);
    return response.data;
  },

  async getReportHistory() {
    const response = await apiClient.get("/reports/history");
    return response.data;
  },

  async generateReport(caseId: number) {
    const response = await apiClient.post(`/reports/cases/${caseId}/generate`);
    return response.data;
  },
};
