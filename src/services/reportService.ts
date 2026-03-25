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

// Maintenance Report Types
export interface MaintenanceMonthData {
  month: string;
  total: number;
  repairs: number;
  maintenance: number;
  pending: number;
  processing: number;
  done: number;
  unpaid: number;
  paid: number;
}

export interface MaintenanceSnapshotData {
  total: number;
  repairs: number;
  maintenance: number;
  pending: number;
  processing: number;
  done: number;
  unpaid: number;
  paid: number;
}

export const reportService = {
  // Performance reports
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

  // Maintenance & Repair reports
  getMaintenanceByMonth: async (params?: {
    startMonth?: string;
    endMonth?: string;
  }): Promise<MaintenanceMonthData[]> => {
    const response = await api.get<{ success: boolean; data: MaintenanceMonthData[] }>(
      "/reports/maintenance/by-month",
      { params },
    );
    return response.data.data;
  },

  getMaintenanceSnapshot: async (params?: { month?: string }): Promise<MaintenanceSnapshotData> => {
    const response = await api.get<{ success: boolean; data: MaintenanceSnapshotData }>(
      "/reports/maintenance/snapshot",
      { params },
    );
    return response.data.data;
  },

  getPeakMonth: async (params?: {
    startMonth?: string;
    endMonth?: string;
  }): Promise<MaintenanceMonthData | null> => {
    const response = await api.get<{ success: boolean; data: MaintenanceMonthData | null }>(
      "/reports/maintenance/peak",
      { params },
    );
    return response.data.data;
  },
};
