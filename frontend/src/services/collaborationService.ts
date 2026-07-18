// Simple local state for mocked collaboration requests to show reactivity
let mockRequests = [
  {
    CollaborationRequestID: 1,
    CaseMasterID: 1002,
    RequestingOfficerID: 4,
    Justification: "Suspect matches MO of housebreaking syndicate in Belagavi circle.",
    RequestStatus: "Pending",
  },
  {
    CollaborationRequestID: 2,
    CaseMasterID: 1005,
    RequestingOfficerID: 7,
    Justification: "Need access to victim's call log details to verify alibi.",
    RequestStatus: "Approved",
  },
];

export const collaborationService = {
  async getCollaborationRequests() {
    // Simulate API fetch delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockRequests;
  },

  async approveCollaborationRequest(requestId: number) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    mockRequests = mockRequests.map((req) =>
      req.CollaborationRequestID === requestId ? { ...req, RequestStatus: "Approved" } : req
    );
    return { status: "success", message: "Request approved" };
  },
};
