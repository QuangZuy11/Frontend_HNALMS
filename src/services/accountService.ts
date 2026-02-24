import api from "./api";

export type AccountGroup = "owners" | "managers" | "tenants";

export interface CreateOwnerPayload {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export interface CreateManagerPayload extends CreateOwnerPayload {
  role: "manager" | "accountant";
}

export const accountService = {
  list: async (group: AccountGroup) => {
    const response = await api.get(`/accounts/${group}`);
    return response.data;
  },

  detail: async (group: AccountGroup, accountId: string) => {
    const response = await api.get(`/accounts/${group}/${accountId}`);
    return response.data;
  },

  createOwner: async (data: CreateOwnerPayload) => {
    const response = await api.post("/accounts/owners", data);
    return response.data;
  },

  createManagerOrAccountant: async (data: CreateManagerPayload) => {
    const response = await api.post("/accounts/managers", data);
    return response.data;
  },

  disable: async (group: AccountGroup, accountId: string) => {
    const response = await api.put(`/accounts/${group}/${accountId}/disable`);
    return response.data;
  },

  enable: async (group: AccountGroup, accountId: string) => {
    const response = await api.put(`/accounts/${group}/${accountId}/enable`);
    return response.data;
  },
};

// Account management API services
export { }
