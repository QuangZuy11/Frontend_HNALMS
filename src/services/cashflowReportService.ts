import api from "./api";

export interface CashflowSummary {
  expectedRevenue: number;
  actualCollected: number;
  actualExpense: number;
  totalDebt: number;
  netCashFlow: number;
  collectionRate: string;
}

export interface CashflowLedgerItem {
  id: string;
  code: string;
  date: string;
  room: string;
  transactionType: "THU" | "CHI" | "NỢ";
  category: string;
  paymentMethod: string;
  description: string;
  inflow: number;
  outflow: number;
  status: string;
}

export interface CashflowReportData {
  summary: CashflowSummary;
  ledger: CashflowLedgerItem[];
}

export const cashflowReportService = {
  getCashflowReport: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<CashflowReportData> => {
    const response = await api.get<{ success: boolean; data: CashflowReportData }>(
      "/finance/cashflow",
      { params },
    );
    return response.data.data;
  },
};
