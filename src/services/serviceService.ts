// Service management API services
import api from "./api";

export const serviceService = {
    getServices: async (params?: any) => {
        const response = await api.get("/services", { params });
        return response.data;
    },
};
