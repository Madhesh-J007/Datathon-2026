import { apiClient } from "./apiClient";

let mockReports = [
  {
    CaseMasterID: 1002,
    CompiledAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    PDFUrl: "#",
  },
  {
    CaseMasterID: 1005,
    CompiledAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    PDFUrl: "#",
  },
];

export const reportService = {
  async getCaseReportSummary(caseId: number) {
    const response = await apiClient.get(`/reports/cases/${caseId}/summary`);
    return response.data;
  },

  async getReportHistory() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { history: mockReports };
  },

  async generateReport(caseId: number) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newReport = {
      CaseMasterID: caseId,
      CompiledAt: new Date().toISOString(),
      PDFUrl: "#",
    };
    mockReports = [newReport, ...mockReports];
    return newReport;
  },
};
