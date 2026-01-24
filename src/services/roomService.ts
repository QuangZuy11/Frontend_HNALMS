import api from "./api";

export const roomService = {
  getRooms: async (params?: any) => {
    const response = await api.get("/rooms", { params });
    return response.data;
  },

  getRoomById: async (id: string) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },
};
