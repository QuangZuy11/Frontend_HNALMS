import api from "./api";

export interface RoomDevice {
  _id: string;
  roomTypeId: string | { _id: string; typeName: string; description?: string; personMax?: number; currentPrice?: number };
  deviceId: {
    _id: string;
    name: string;
    brand: string;
    model: string;
    category: string;
    unit: string;
    price: number;
  };
  quantity: number;
  condition: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  _id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  unit: string;
  price: number;
  description?: string;
}

export interface RoomType {
  _id: string;
  typeName: string;
  description?: string;
  personMax?: number;
  currentPrice?: number;
}

export interface CreateRoomDevicePayload {
  roomTypeId: string;
  deviceId: string;
  quantity: number;
  condition: string;
}

export interface UpdateRoomDevicePayload {
  quantity?: number;
  condition?: string;
}

export const roomDeviceService = {
  // Lấy danh sách thiết bị theo loại phòng
  getByRoomType: async (roomTypeId: string) => {
    const response = await api.get("/roomdevices", { params: { roomTypeId } });
    return response.data;
  },

  // Lấy chi tiết 1 bản ghi roomdevice
  getById: async (id: string) => {
    const response = await api.get(`/roomdevices/${id}`);
    return response.data;
  },

  // Thêm thiết bị vào loại phòng
  create: async (payload: CreateRoomDevicePayload) => {
    const response = await api.post("/roomdevices", payload);
    return response.data;
  },

  // Cập nhật số lượng / tình trạng
  update: async (id: string, payload: UpdateRoomDevicePayload) => {
    const response = await api.put(`/roomdevices/${id}`, payload);
    return response.data;
  },

  // Xoá thiết bị khỏi loại phòng
  remove: async (id: string) => {
    const response = await api.delete(`/roomdevices/${id}`);
    return response.data;
  },

  // Lấy danh sách loại phòng để chọn (dropdown) - dùng endpoint chuyên biệt
  getRoomTypes: async () => {
    const response = await api.get("/roomdevices/roomtypes-select");
    return response.data;
  },

  // Lấy danh sách thiết bị (dùng cho dropdown khi thêm)
  getDevices: async () => {
    const response = await api.get("/devices");
    return response.data;
  },
};
