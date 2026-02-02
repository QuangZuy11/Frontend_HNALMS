import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User as UserIcon,
  CreditCard,
  Lock,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Pencil,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import { authService } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";
import type { User } from "../../../types/auth.types";
import "./Profile.css";

// Import Header Dashboard và các Sidebar theo role
import HeaderDashboard from "../../../components/layout/Header/HeaderDashboard/HeaderDashboard";
import OwnerSidebar from "../../../components/layout/Sidebar/OwnerSidebar/OwnerSidebar";
import ManagerSidebar from "../../../components/layout/Sidebar/ManagerSidebar/ManagerSidebar";
import AccountantSidebar from "../../../components/layout/Sidebar/AccountantSidebar/AccountantSidebar";
import AdminSidebar from "../../../components/layout/Sidebar/AdminSidebar/AdminSidebar";

// Import CSS từ ManagerDashboard để tái sử dụng layout
import "../../Dashboard/ManagerDashboard/ManagerDashboard.css";

interface FormData {
  fullname: string;
  cccd: string;
  address: string;
  dob: string;
  gender: string; // Can be "male", "female", "other", "Male", "Female", "Other", or empty
  phone: string;
}

export default function ViewProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});

  // Đổi mật khẩu
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState<string | null>(
    null,
  );
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<
    string | null
  >(null);
  // Toast hiển thị thông báo đổi mật khẩu thành công (kiểu giống trang Login)
  const [passwordToast, setPasswordToast] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullname: "",
    cccd: "",
    address: "",
    dob: "",
    gender: "",
    phone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token || !token.trim()) {
        setError("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }
      const response = await authService.getProfile();
      setProfile(response.data);
      // Keep gender as is from backend (Male, Female, Other) for form
      const genderValue = response.data.gender || "";
      setFormData({
        fullname: response.data.fullname || "",
        cccd: response.data.cccd || "",
        address: response.data.address || "",
        dob: response.data.dob
          ? new Date(response.data.dob).toISOString().split("T")[0]
          : "",
        gender: genderValue,
        phone: response.data.phoneNumber || "",
      });
    } catch (err: unknown) {
      console.error("Error fetching profile:", err);
      const errorResponse =
        err && typeof err === "object" && "response" in err
          ? (
            err as {
              response?: { status?: number; data?: { message?: string } };
            }
          ).response
          : undefined;
      if (errorResponse?.status === 401) {
        const errorMessage =
          errorResponse?.data?.message ||
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        setError(errorMessage);
        setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }, 2000);
      } else {
        const errorMessage = errorResponse?.data?.message;
        setError(errorMessage || "Không thể tải thông tin profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    if (profile) {
      setFormData({
        fullname: profile.fullname || "",
        cccd: profile.cccd || "",
        address: profile.address || "",
        dob: profile.dob
          ? new Date(profile.dob).toISOString().split("T")[0]
          : "",
        gender: profile.gender || "",
        phone: profile.phoneNumber || "",
      });
    }
  };

  const handleOpenChangePassword = () => {
    setIsChangePasswordOpen(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleCloseChangePassword = () => {
    if (changePasswordLoading) return;
    setIsChangePasswordOpen(false);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setPasswordToast(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    const fullname = formData.fullname.trim();
    const cccd = formData.cccd.trim();
    const phone = formData.phone.trim();
    const dob = formData.dob.trim();
    const address = formData.address.trim();

    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!fullname) {
      errors.fullname = "Vui lòng nhập Họ và tên.";
    } else if (fullname.length < 2) {
      errors.fullname = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (cccd && !/^\d{9,12}$/.test(cccd)) {
      errors.cccd = "CCCD/CMND phải là số và có từ 9–12 chữ số.";
    }

    if (!phone) {
      errors.phone = "Vui lòng nhập Số điện thoại.";
    } else if (!/^0\d{9,10}$/.test(phone)) {
      errors.phone =
        "Số điện thoại không hợp lệ (bắt đầu bằng 0 và có 10–11 số).";
    }

    if (dob) {
      const date = new Date(dob);
      if (Number.isNaN(date.getTime())) {
        errors.dob = "Ngày sinh không hợp lệ.";
      }
      const today = new Date();
      if (date > today) {
        errors.dob = "Ngày sinh không được lớn hơn ngày hiện tại.";
      }
    }

    if (address && address.length < 5) {
      errors.address =
        "Địa chỉ thường trú quá ngắn. Vui lòng nhập chi tiết hơn.";
    }

    setFieldErrors(errors);
    const hasErrors = Object.keys(errors).length > 0;
    setFormError(
      hasErrors ? "Vui lòng kiểm tra lại các trường được đánh dấu." : null,
    );
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSaving(true);
      setFormError(null);
      await authService.updateProfile({
        fullname: formData.fullname.trim() || null,
        cccd: formData.cccd.trim() || null,
        address: formData.address.trim() || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
      });
      updateUser({ fullname: formData.fullname.trim() || undefined });
      await fetchProfile();
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
            ?.data?.message
          : undefined;
      setFormError(errorMessage || "Không thể cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePasswordLoading) return;

    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError("Vui lòng nhập đầy đủ các trường.");
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setChangePasswordLoading(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      setChangePasswordSuccess("Đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Đóng modal và hiển thị toast thành công giống Login
      setIsChangePasswordOpen(false);
      setChangePasswordError(null);
      setPasswordToast("Đổi mật khẩu thành công.");
      setTimeout(() => setPasswordToast(null), 3000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Không thể đổi mật khẩu. Vui lòng thử lại.";
      setChangePasswordError(message);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Chưa cập nhật";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    } catch {
      return "Chưa cập nhật";
    }
  };

  const getRoleTag = (role: string) => {
    const map: Record<string, string> = {
      tenant: "Đang Thuê",
      owner: "Chủ căn hộ",
      admin: "Quản trị viên",
      manager: "Quản lý tòa nhà",
      accountant: "Kế toán",
    };
    return map[role] || role;
  };

  const getRoleDashboardPath = (role: string): string => {
    const map: Record<string, string> = {
      admin: "/admin",
      manager: "/manager",
      owner: "/owner",
      tenant: "/homepage",
      accountant: "/accountant",
    };
    return map[role] || "/homepage";
  };

  // Render Sidebar theo role
  const renderSidebar = () => {
    const role = profile?.role?.toLowerCase();
    switch (role) {
      case "admin":
        return <AdminSidebar />;
      case "owner":
        return <OwnerSidebar />;
      case "manager":
        return <ManagerSidebar />;
      case "accountant":
        return <AccountantSidebar />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="manager-dashboard-wrapper">
        {renderSidebar()}
        <div className="manager-dashboard-body">
          <HeaderDashboard />
          <main className="manager-dashboard-main">
            <div className="profile-page">
              <div className="profile-loading">
                <div className="spinner"></div>
                <p>Đang tải thông tin...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-dashboard-wrapper">
        {renderSidebar()}
        <div className="manager-dashboard-body">
          <HeaderDashboard />
          <main className="manager-dashboard-main">
            <div className="profile-page">
              <div className="profile-error">
                <p>{error}</p>
                <button onClick={fetchProfile} className="btn-retry">
                  Thử lại
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="manager-dashboard-wrapper">
        {renderSidebar()}
        <div className="manager-dashboard-body">
          <HeaderDashboard />
          <main className="manager-dashboard-main">
            <div className="profile-page">
              <div className="profile-error">
                <p>Không tìm thấy thông tin profile</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard-wrapper">
      {renderSidebar()}
      <div className="manager-dashboard-body">
        <HeaderDashboard />
        <main className="manager-dashboard-main">
          <div className="profile-page">
            {passwordToast && (
              <div className="validation-popup">
                <div className="validation-popup-success">
                  <span>{passwordToast}</span>
                </div>
              </div>
            )}
            {/* Header: Back, Title, Subtitle, Chỉnh Sửa */}
            <div className="profile-page-header">
              <div className="profile-page-title-row">
                <div>
                  <h1 className="profile-page-title">Thông Tin Cá Nhân</h1>
                  <p className="profile-page-subtitle">
                    Quản lý thông tin tài khoản của bạn
                  </p>
                </div>
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={handleOpenModal}
                >
                  <Pencil size={18} />
                  <span>Cập Nhật Thông Tin</span>
                </button>
              </div>
            </div>

            {/* 3-card layout: left 2 stacked, right 1 large */}
            <div className="profile-cards-layout">
              {/* Left column */}
              <div className="profile-left-column">
                {/* Card 1: Tóm tắt hồ sơ */}
                <div className="profile-card profile-summary-card">
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar">
                      <UserIcon size={42} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="profile-summary-name">
                    {profile.fullname || "Chưa cập nhật"}
                  </h3>
                  <p className="profile-summary-email">{profile.email || ""}</p>
                  <Link
                    to={getRoleDashboardPath(profile.role)}
                    className="profile-role-btn"
                  >
                    {getRoleTag(profile.role)}
                  </Link>
                </div>
              </div>

              {/* Right column: Thông tin chi tiết */}
              <div className="profile-card profile-detail-card">
                <h3 className="profile-card-title">Thông Tin Chi Tiết</h3>
                <p className="profile-detail-subtitle">
                  Xem và cập nhật thông tin cá nhân của bạn.
                </p>
                <div className="profile-detail-list">
                  <div className="profile-detail-row">
                    <UserIcon size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">Họ và Tên</span>
                    <span className="profile-detail-value">
                      {profile.fullname || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <CreditCard size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">CCCD/CMND</span>
                    <span className="profile-detail-value-wrap">
                      <Lock size={14} className="profile-detail-lock" />
                      <span className="profile-detail-value">
                        {profile.cccd || "Chưa cập nhật"}
                      </span>
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <Phone size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">Số Điện Thoại *</span>
                    <span className="profile-detail-value">
                      {profile.phoneNumber || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <Mail size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">Email *</span>
                    <span className="profile-detail-value">
                      {profile.email || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <Calendar size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">Ngày Sinh</span>
                    <span className="profile-detail-value">
                      {formatDate(profile.dob)}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <Users size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">Giới Tính</span>
                    <span className="profile-detail-value">
                      {profile.gender ? (
                        profile.gender.toLowerCase() === "male" ? "Nam" :
                          profile.gender.toLowerCase() === "female" ? "Nữ" :
                            "Khác"
                      ) : "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <MapPin size={20} className="profile-detail-icon" />
                    <span className="profile-detail-label">Địa Chỉ Thường Trú</span>
                    <span className="profile-detail-value">
                      {profile.address || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="profile-detail-row profile-security-row">
                    <span className="profile-detail-label">Bảo mật & mật khẩu</span>
                    <div className="profile-security-actions">
                      <button
                        type="button"
                        className="profile-security-link primary"
                        onClick={handleOpenChangePassword}
                      >
                        Đổi mật khẩu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Chỉnh sửa */}
            {isModalOpen && (
              <div className="modal-overlay" onClick={handleCloseModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>Cập Nhật Thông Tin Cá Nhân</h2>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={handleCloseModal}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    {formError && (
                      <div className="form-error">
                        <p>{formError}</p>
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="profile-form">
                      <div className="profile-section">
                        <h3>Thông Tin Cá Nhân</h3>
                        <div className="profile-grid">
                          <div className="profile-item full-width">
                            <label htmlFor="fullname">Họ và tên *</label>
                            <input
                              type="text"
                              id="fullname"
                              name="fullname"
                              value={formData.fullname}
                              onChange={handleFormChange}
                              placeholder="Nhập họ và tên"
                              className={fieldErrors.fullname ? "input-error" : ""}
                            />
                            {fieldErrors.fullname && (
                              <p className="field-error">{fieldErrors.fullname}</p>
                            )}
                          </div>
                          <div className="profile-item">
                            <label htmlFor="cccd">CCCD/CMND</label>
                            <input
                              type="text"
                              id="cccd"
                              name="cccd"
                              value={formData.cccd}
                              onChange={handleFormChange}
                              placeholder="Nhập số CCCD/CMND"
                              className={fieldErrors.cccd ? "input-error" : ""}
                            />
                            {fieldErrors.cccd && (
                              <p className="field-error">{fieldErrors.cccd}</p>
                            )}
                          </div>
                          <div className="profile-item">
                            <label htmlFor="phone">Số điện thoại</label>
                            <input
                              type="tel"
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleFormChange}
                              placeholder="0901234567"
                              className={fieldErrors.phone ? "input-error" : ""}
                            />
                            {fieldErrors.phone && (
                              <p className="field-error">{fieldErrors.phone}</p>
                            )}
                          </div>
                          <div className="profile-item">
                            <label htmlFor="dob">Ngày sinh</label>
                            <input
                              type="date"
                              id="dob"
                              name="dob"
                              value={formData.dob}
                              onChange={handleFormChange}
                              className={fieldErrors.dob ? "input-error" : ""}
                            />
                            {fieldErrors.dob && (
                              <p className="field-error">{fieldErrors.dob}</p>
                            )}
                          </div>
                          <div className="profile-item">
                            <label htmlFor="gender">Giới tính</label>
                            <select
                              id="gender"
                              name="gender"
                              value={formData.gender}
                              onChange={handleFormChange}
                            >
                              <option value="">Chọn giới tính</option>
                              <option value="Male">Nam</option>
                              <option value="Female">Nữ</option>
                              <option value="Other">Khác</option>
                            </select>
                          </div>
                          <div className="profile-item full-width">
                            <label htmlFor="address">
                              Địa chỉ thường trú
                            </label>
                            <textarea
                              id="address"
                              name="address"
                              value={formData.address}
                              onChange={handleFormChange}
                              placeholder="Nhập địa chỉ thường trú"
                              rows={3}
                              className={
                                fieldErrors.address ? "input-error" : ""
                              }
                            />
                            {fieldErrors.address && (
                              <p className="field-error">
                                {fieldErrors.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="btn-secondary"
                          disabled={saving}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={saving}
                        >
                          {saving ? "Đang lưu..." : "Lưu thông tin"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Đổi mật khẩu */}
            {isChangePasswordOpen && (
              <div className="modal-overlay" onClick={handleCloseChangePassword}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>Đổi Mật Khẩu</h2>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={handleCloseChangePassword}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    {changePasswordError && (
                      <div className="form-error">
                        <p>{changePasswordError}</p>
                      </div>
                    )}
                    {changePasswordSuccess && (
                      <div className="change-password-alert success">
                        {changePasswordSuccess}
                      </div>
                    )}
                    <form
                      onSubmit={handleChangePasswordSubmit}
                      className="profile-form"
                    >
                      <div className="profile-section">
                        <div className="profile-grid">
                          <div className="profile-item full-width">
                            <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
                            <div className="password-input-wrapper">
                              <input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Nhập mật khẩu hiện tại"
                              />
                              <button
                                type="button"
                                className="password-eye-icon"
                                onClick={() => setShowCurrentPassword((v) => !v)}
                                aria-label={
                                  showCurrentPassword
                                    ? "Ẩn mật khẩu hiện tại"
                                    : "Hiện mật khẩu hiện tại"
                                }
                              >
                                {showCurrentPassword ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="profile-item">
                            <label htmlFor="newPassword">Mật khẩu mới</label>
                            <div className="password-input-wrapper">
                              <input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới"
                              />
                              <button
                                type="button"
                                className="password-eye-icon"
                                onClick={() => setShowNewPassword((v) => !v)}
                                aria-label={
                                  showNewPassword
                                    ? "Ẩn mật khẩu mới"
                                    : "Hiện mật khẩu mới"
                                }
                              >
                                {showNewPassword ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="profile-item">
                            <label htmlFor="confirmPassword">
                              Xác nhận mật khẩu mới
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                              />
                              <button
                                type="button"
                                className="password-eye-icon"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                aria-label={
                                  showConfirmPassword
                                    ? "Ẩn mật khẩu xác nhận"
                                    : "Hiện mật khẩu xác nhận"
                                }
                              >
                                {showConfirmPassword ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button
                          type="button"
                          onClick={handleCloseChangePassword}
                          className="btn-secondary"
                          disabled={changePasswordLoading}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={changePasswordLoading}
                        >
                          {changePasswordLoading ? "Đang đổi..." : "Đổi mật khẩu"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
