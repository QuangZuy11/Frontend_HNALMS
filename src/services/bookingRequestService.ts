import api from "./api";

export interface CoResident {
  fullName: string;
  cccd: string;
}

export interface BookingRequestPayload {
  roomId: string;
  name: string;
  phone: string;
  email: string;
  idCard: string;
  dob: string;
  address: string;
  startDate: string;
  duration: number;
  prepayMonths: number | "all";
  coResidents: CoResident[];
}

export interface BookingRequestEntity extends BookingRequestPayload {
  _id: string;
  status: "Pending" | "Processed" | "Rejected";
  createdAt: string;
  roomId: any; // Populated room
}

export const bookingRequestService = {
  createBookingRequest: async (payload: BookingRequestPayload) => {
    try {
      const response = await api.post(`/booking-requests`, payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Không thể kết nối đến máy chủ" };
    }
  },

  getAllBookingRequests: async (status?: string) => {
    try {
      let url = `/booking-requests`;
      if (status) {
        url += `?status=${status}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Không thể kết nối đến máy chủ" };
    }
  },

  getBookingRequestById: async (id: string) => {
    try {
      const response = await api.get(`/booking-requests/${id}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Không thể kết nối đến máy chủ" };
    }
  },

  updateStatus: async (id: string, status: "Processed" | "Rejected" | "Pending") => {
    try {
      const response = await api.patch(`/booking-requests/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Không thể kết nối đến máy chủ" };
    }
  },

  getPaymentStatus: async (transactionCode: string) => {
    try {
      const encoded = encodeURIComponent(transactionCode);
      const response = await api.get(`/booking-requests/payment-status/${encoded}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Không thể kết nối đến máy chủ" };
    }
  }
};
