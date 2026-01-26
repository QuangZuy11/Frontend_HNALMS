/**
 * Service xử lý các API liên quan đến nội quy tòa nhà
 * Cung cấp các hàm gọi API đến backend
 */
import api from "./api";

/**
 * Lấy nội quy đang hoạt động (công khai - không cần đăng nhập)
 * @returns Promise chứa dữ liệu nội quy
 */
export const getActiveBuildingRules = async () => {
  try {
    const response = await api.get("/buildings/rules/active");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Lấy tất cả nội quy (dành cho admin/quản lý)
 * Yêu cầu: Phải đăng nhập với vai trò Admin hoặc Manager
 * @returns Promise chứa danh sách nội quy
 */
export const getAllBuildingRules = async () => {
  try {
    const response = await api.get("/buildings/rules");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Lấy nội quy theo ID (dành cho admin/quản lý)
 * Yêu cầu: Phải đăng nhập với vai trò Admin hoặc Manager
 * @param id - ID của nội quy
 * @returns Promise chứa dữ liệu nội quy
 */
export const getBuildingRuleById = async (id: string) => {
  try {
    const response = await api.get(`/buildings/rules/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Tạo nội quy mới (dành cho admin/quản lý)
 * Yêu cầu: Phải đăng nhập với vai trò Admin hoặc Manager
 * @param rulesData - Dữ liệu nội quy cần tạo
 * @returns Promise chứa nội quy vừa tạo
 */
export const createBuildingRules = async (rulesData: any) => {
  try {
    const response = await api.post("/buildings/rules", rulesData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Cập nhật nội quy (dành cho admin/quản lý)
 * Yêu cầu: Phải đăng nhập với vai trò Admin hoặc Manager
 * @param id - ID của nội quy cần cập nhật
 * @param updateData - Dữ liệu cần cập nhật
 * @returns Promise chứa nội quy sau khi cập nhật
 */
export const updateBuildingRules = async (id: string, updateData: any) => {
  try {
    const response = await api.put(`/buildings/rules/${id}`, updateData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Xóa nội quy (chỉ dành cho admin)
 * Yêu cầu: Phải đăng nhập với vai trò Admin
 * @param id - ID của nội quy cần xóa
 * @returns Promise chứa kết quả xóa
 */
export const deleteBuildingRules = async (id: string) => {
  try {
    const response = await api.delete(`/buildings/rules/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};
