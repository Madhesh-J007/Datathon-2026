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

  async generateReport(caseInput: string | number) {
    const response = await apiClient.post("/reports/compile", { case_input: caseInput });
    return response.data;
  },

  async downloadReportPdf(reportJobId: number, caseMasterId?: number) {
    const filename = caseMasterId ? `Case_Dossier_${caseMasterId}.pdf` : `Case_Dossier_${reportJobId}.pdf`;
    const response = await apiClient.get(`/reports/jobs/${reportJobId}/download`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getReportBlobUrl(reportJobId: number) {
    const response = await apiClient.get(`/reports/jobs/${reportJobId}/download`, {
      responseType: "blob",
    });
    return window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  },
};
