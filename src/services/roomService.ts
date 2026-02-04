import api from "./api";

export const roomService = {
  getRooms: async (params?: any) => {
    const response = await api.get("/room", { params });
    return response.data;
  },

  getRoomById: async (id: string) => {
    const response = await api.get(`/room/${id}`);
    return response.data;
  },

  getFloors: async () => {
    const response = await api.get("/floors");
    return response.data;
  },

  getRoomTypes: async () => {
    const response = await api.get("/roomtypes");
    return response.data;
  },
};
