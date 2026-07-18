import { apiClient } from "./apiClient";

export const authService = {
  async login(payload: any) {
    const response = await apiClient.post("/auth/login", payload);
    return response.data;
  },
  async logout(refreshToken: string) {
    await apiClient.post("/auth/logout", { refresh_token: refreshToken });
  },
  async getMe() {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },
};
