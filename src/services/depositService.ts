import api from "./api";

export interface DepositInitiateRequest {
    roomId: string;
    name: string;
    phone: string;
    email: string;
}

export interface BankInfo {
    bankBin: string;
    bankAccount: string;
    bankAccountName: string;
    content: string;
}

export interface DepositInitiateData {
    depositId: string;
    transactionCode: string;
    depositAmount: number;
    roomName: string;
    qrUrl: string;
    bankInfo: BankInfo;
    expireAt: string;
    expireInSeconds: number;
    expireNote: string;
}

export interface DepositInitiateResponse {
    success: boolean;
    message: string;
    data: DepositInitiateData;
}

export interface DepositStatusData {
    status: "Pending" | "Held" | "Expired" | "Refunded" | "Forfeited";
    depositId: string;
    transactionCode: string;
    amount: number;
    room: {
        _id: string;
        name: string;
        status: string;
    };
    expireAt: string;
    expireInSeconds: number;
}

export interface DepositStatusResponse {
    success: boolean;
    data: DepositStatusData;
}

export interface DepositCancelResponse {
    success: boolean;
    message: string;
    data: {
        transactionCode: string;
        status: string;
    };
}

export const depositService = {
    /**
     * Khởi tạo đặt cọc phòng - POST /deposits/initiate
     */
    initiateDeposit: async (payload: DepositInitiateRequest): Promise<DepositInitiateResponse> => {
        const response = await api.post<DepositInitiateResponse>("/deposits/initiate", payload);
        return response.data;
    },

    /**
     * Kiểm tra trạng thái thanh toán - GET /deposits/status/:transactionCode
     */
    getDepositStatus: async (transactionCode: string): Promise<DepositStatusResponse> => {
        const encoded = encodeURIComponent(transactionCode);
        const response = await api.get<DepositStatusResponse>(`/deposits/status/${encoded}`);
        return response.data;
    },

    /**
     * Hủy giao dịch đặt cọc - POST /deposits/cancel/:transactionCode
     */
    cancelDeposit: async (transactionCode: string): Promise<DepositCancelResponse> => {
        const encoded = encodeURIComponent(transactionCode);
        const response = await api.post<DepositCancelResponse>(`/deposits/cancel/${encoded}`);
        return response.data;
    },
};
