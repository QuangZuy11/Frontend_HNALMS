// Report performance API services
import api from "./api";

export interface VacancyMonthData {
  month: string;
  occupied: number;
  vacant: number;
  vacancyRate: number;
  occupancyRate: number;
}

export interface SnapshotData {
  totalRooms: number;
  occupied: number;
  vacant: number;
  occupancyRate: number;
}

export const reportService = {
  getVacancyReport: async (params?: {
    startMonth?: string;
    endMonth?: string;
  }): Promise<VacancyMonthData[]> => {
    const response = await api.get<{ success: boolean; data: VacancyMonthData[] }>(
      "/reports/performance/vacancy",
      { params },
    );
    return response.data.data;
  },

  getSnapshot: async (params?: { month?: string }): Promise<SnapshotData> => {
    const response = await api.get<{ success: boolean; data: SnapshotData }>(
      "/reports/performance/snapshot",
      { params },
    );
    return response.data.data;
  },
};
