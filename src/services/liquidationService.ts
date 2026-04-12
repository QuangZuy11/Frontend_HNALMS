import api from "./api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type LiquidationType = "force_majeure" | "violation";

export interface RoomInfo {
  _id: string;
  name: string;
}

export interface TenantInfo {
  _id: string;
  username: string;
  email?: string;
}

export interface ContractInfo {
  _id: string;
  contractCode: string;
  roomId: RoomInfo;
  tenantId: TenantInfo;
  startDate: string;
  endDate: string;
}

export interface MeterReadingInfo {
  _id: string;
  utilityId: string;
  oldIndex: number;
  newIndex: number;
  usageAmount: number;
  readingDate: string;
}

export interface LiquidationItem {
  _id: string;
  contractId: ContractInfo | string;
  liquidationType: LiquidationType;
  liquidationDate: string;
  note: string;
  images: string[];
  depositRefundAmount: number | null;
  remainingRentAmount: number | null;
  rentDebtAmount: number | null;
  totalSettlement: number;
  invoiceId?: any;
  meterReadingIds: MeterReadingInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface LiquidationListResponse {
  success: boolean;
  count: number;
  data: LiquidationItem[];
}

export interface LiquidationDetailResponse {
  success: boolean;
  data: LiquidationItem;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────
export const liquidationService = {
  /**
   * Lấy tất cả bản ghi thanh lý hợp đồng
   * GET /api/liquidations
   */
  getAll: async (): Promise<LiquidationListResponse> => {
    const response = await api.get<LiquidationListResponse>("/liquidations");
    return response.data;
  },

  /**
   * Lấy chi tiết một bản ghi thanh lý
   * GET /api/liquidations/:id
   */
  getById: async (id: string): Promise<LiquidationItem> => {
    const response = await api.get<LiquidationDetailResponse>(`/liquidations/${id}`);
    return response.data.data;  // bóc wrapper, trả về object liquidation
  },

  /**
   * Lấy thông tin thanh lý theo contractId
   * GET /api/liquidations/contract/:contractId
   */
  getByContractId: async (contractId: string): Promise<LiquidationDetailResponse> => {
    const response = await api.get<LiquidationDetailResponse>(`/liquidations/contract/${contractId}`);
    return response.data;
  },

  /**
   * Xem trước thông tin thanh lý (preflight)
   * GET /api/liquidations/preflight/:contractId?liquidationDate=YYYY-MM-DD
   */
  getPreflight: async (contractId: string, liquidationDate?: string): Promise<any> => {
    const params: Record<string, string> = {};
    if (liquidationDate) params.liquidationDate = liquidationDate;
    const response = await api.get(`/liquidations/preflight/${contractId}`, { params });
    return response.data;
  },

  /**
   * Hoàn tác thanh lý hợp đồng (khôi phục về active)
   * POST /api/liquidations/restore/:id
   */
  restore: async (id: string): Promise<RestoreResponse> => {
    const response = await api.post<RestoreResponse>(`/liquidations/restore/${id}`);
    return response.data;
  },
};
