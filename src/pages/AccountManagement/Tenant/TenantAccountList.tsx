import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Eye,
  PersonStanding,
  User,
  Contact,
  ShieldCheck,
  Lock,
  LockOpen,
  Filter,
  ArrowUpDown,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AppModal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { useToast } from "../../../components/common/Toast";
import { accountService } from "../../../services/accountService";
import {
  STATUS_LABELS,
  formatAccountDate,
  type AccountItem,
  type AccountDetail,
} from "../constants";
import useAuth from "../../../hooks/useAuth";
import "../account-management.css";

export default function TenantAccountList() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [searchContact, setSearchContact] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 8;

  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [disablingId, setDisablingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountService.list("tenants", {
        offset: 0,
        limit: 9999,
      });

      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        setAccounts([]);
      }
    } catch {
      showToast("error", "Lỗi kết nối", "Không thể tải danh sách cư dân!");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    result = result.filter((acc) => {
      const name = (acc.fullname || "").toLowerCase();
      const email = (acc.email || "").toLowerCase();
      const phone = (acc.phoneNumber || "").toLowerCase();

      const matchName = name.includes(searchName.toLowerCase());
      const matchContact =
        searchContact.trim() === "" ||
        email.includes(searchContact.toLowerCase()) ||
        phone.includes(searchContact.toLowerCase());
      const matchStatus = filterStatus === "all" || acc.status === filterStatus;

      return matchName && matchContact && matchStatus;
    });

    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => (a.fullname || "").localeCompare(b.fullname || ""));
        break;
      case "name-desc":
        result.sort((a, b) => (b.fullname || "").localeCompare(a.fullname || ""));
        break;
      case "newest":
      default:
        break;
    }

    return result;
  }, [accounts, searchName, searchContact, filterStatus, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ROWS_PER_PAGE));
  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchName, searchContact, filterStatus, sortOption]);

  const handleViewDetail = async (accountId: string) => {
    try {
      setDetailLoading(true);
      setDetailAccount(null);
      setShowDetailModal(true);

      const response = await accountService.detail("tenants", accountId);
      if (response.success && response.data) {
        setDetailAccount(response.data);
      }
    } catch {
      showToast("error", "Lỗi", "Không thể tải chi tiết cư dân.");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDisable = async (accountId: string) => {
    try {
      setDisablingId(accountId);
      const response = await accountService.disable("tenants", accountId);
      const updated = response.data;

      if (updated?._id) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc,
          ),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
        showToast("success", "Thành công", "Đã đóng tài khoản cư dân.");
      }
    } catch {
      showToast("error", "Lỗi", "Không thể đóng tài khoản.");
    } finally {
      setDisablingId(null);
    }
  };

  const handleEnable = async (accountId: string) => {
    try {
      setDisablingId(accountId);
      const response = await accountService.enable("tenants", accountId);
      const updated = response.data;

      if (updated?._id) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc,
          ),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
        showToast("success", "Thành công", "Đã mở lại tài khoản cư dân.");
      }
    } catch {
      showToast("error", "Lỗi", "Không thể mở lại tài khoản.");
    } finally {
      setDisablingId(null);
    }
  };

  const totalCount = accounts.length;
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const inactiveCount = accounts.filter((a) => a.status === "inactive").length;

  const clearFilters = () => {
    setSearchName("");
    setSearchContact("");
    setFilterStatus("all");
  };

  const hasFilters = searchName || searchContact || filterStatus !== "all";

  return (
    <div className="tenant-account-list-page">
      {/* HEADER */}
      <div className="tenant-account-list-header-new">
        <div className="tenant-account-list-header-top">
          <div className="tenant-account-list-title-block">
            <div className="tenant-account-list-title-row">
              <div className="tenant-account-list-title-icon" aria-hidden>
                <Users size={22} strokeWidth={2} />
              </div>
              <div className="tenant-account-list-title-text">
                <h2>Quản lý Cư dân</h2>
                <p className="tenant-account-list-subtitle">
                  Quản lý thông tin cư dân trong tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="tenant-account-list-header-aside">
            <div className="tenant-account-list-stats-summary">
              <div className="tenant-account-list-stat-item">
                <div className="tenant-account-list-stat-icon icon-accent">
                  <Users size={16} strokeWidth={2} />
                </div>
                <div className="tenant-account-list-stat-text">
                  <span className="tenant-account-list-stat-value">{totalCount}</span>
                  <span className="tenant-account-list-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="tenant-account-list-stat-divider" />
              <div className="tenant-account-list-stat-item">
                <div className="tenant-account-list-stat-icon icon-primary">
                  <CheckCircle2 size={16} strokeWidth={2} />
                </div>
                <div className="tenant-account-list-stat-text">
                  <span className="tenant-account-list-stat-value">{activeCount}</span>
                  <span className="tenant-account-list-stat-label">Hoạt động</span>
                </div>
              </div>
              <div className="tenant-account-list-stat-divider" />
              <div className="tenant-account-list-stat-item">
                <div className="tenant-account-list-stat-icon icon-warning">
                  <AlertTriangle size={16} strokeWidth={2} />
                </div>
                <div className="tenant-account-list-stat-text">
                  <span className="tenant-account-list-stat-value">{inactiveCount}</span>
                  <span className="tenant-account-list-stat-label">Không hoạt động</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR LỌC & TÌM KIẾM */}
      <div className="tenant-account-list-toolbar-new">
        <div className="tenant-account-list-toolbar-left">
          <div className="tenant-account-list-search-box">
            <Search size={18} className="tenant-account-list-search-icon" />
            <input
              type="text"
              className="tenant-account-list-search-input"
              placeholder="Tìm theo tên..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>

          <div className="tenant-account-list-search-box">
            <Contact size={18} className="tenant-account-list-search-icon" />
            <input
              type="text"
              className="tenant-account-list-search-input"
              placeholder="SĐT / Email..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
            />
          </div>

          <div className="tenant-account-list-control-group">
            <Filter size={16} className="tenant-account-list-toolbar-icon" aria-hidden />
            <select
              className="tenant-account-list-custom-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              className="tenant-account-list-btn-clear-filter"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
          )}
        </div>

        <div className="tenant-account-list-toolbar-right">
          <ArrowUpDown size={16} className="tenant-account-list-toolbar-icon" aria-hidden />
          <select
            className="tenant-account-list-custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="name-asc">Tên: A - Z</option>
            <option value="name-desc">Tên: Z - A</option>
          </select>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="tenant-account-list-table-container">
        <table className="tenant-account-list-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-name">Họ và tên</th>
              <th className="cell-room">Phòng</th>
              <th className="cell-contact">SĐT / Email</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAccounts.length > 0 ? (
              paginatedAccounts.map((acc, index) => (
                <tr key={acc._id} className={acc.status === "inactive" ? "inactive-row" : ""}>
                  <td className="cell-stt">
                    {(page - 1) * ROWS_PER_PAGE + index + 1}
                  </td>

                  <td className="cell-name">
                    {acc.fullname || "-"}
                  </td>

                  <td className="cell-room">
                    <span className="tenant-account-list-room-badge">
                      {acc.roomName || "-"}
                    </span>
                  </td>

                  <td className="cell-contact">
                    <div className="tenant-account-list-contact-cell">
                      <span className="tenant-account-list-contact-phone">
                        {acc.phoneNumber || "-"}
                      </span>
                      <span className="tenant-account-list-contact-email">
                        {acc.email || "-"}
                      </span>
                    </div>
                  </td>

                  <td className="cell-status">
                    <span className={`status-badge ${acc.status === "active" ? "active" : "inactive"}`}>
                      {acc.status === "active" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {STATUS_LABELS[acc.status] || acc.status}
                    </span>
                  </td>

                  <td className="cell-date">
                    {formatAccountDate(acc.createdAt)}
                  </td>

                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-view"
                        onClick={() => handleViewDetail(acc._id)}
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="table-empty-cell">
                  {loading ? "Đang tải dữ liệu..." : "Không tìm thấy cư dân nào phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredAccounts.length}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Chi tiết cư dân */}
      <AppModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Chi tiết cư dân"
        icon={<User size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setShowDetailModal(false)}
            >
              Đóng
            </button>
            {!isOwner && detailAccount && (
              detailAccount.status === "active" ? (
                <button
                  type="button"
                  className="ms-btn ms-btn--danger"
                  onClick={() => handleDisable(detailAccount._id)}
                  disabled={disablingId === detailAccount._id}
                >
                  <Lock size={16} />
                  {disablingId === detailAccount._id ? "Đang xử lý..." : "Đóng tài khoản"}
                </button>
              ) : (
                <button
                  type="button"
                  className="ms-btn ms-btn--primary"
                  onClick={() => handleEnable(detailAccount._id)}
                  disabled={disablingId === detailAccount._id}
                >
                  <LockOpen size={16} />
                  {disablingId === detailAccount._id ? "Đang xử lý..." : "Mở lại tài khoản"}
                </button>
              )
            )}
          </>
        }
      >
        {detailLoading ? (
          <div className="tenant-detail-loading">
            <div className="tenant-detail-loading-spinner" />
            <span className="tenant-detail-loading-text">Đang tải thông tin...</span>
          </div>
        ) : detailAccount ? (
          <>
            {/* Profile strip */}
            <div className="tenant-detail-profile-strip">
              <div className="tenant-detail-avatar">
                {detailAccount.fullname
                  ? detailAccount.fullname.split(" ").pop()?.charAt(0).toUpperCase() || "?"
                  : detailAccount.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="tenant-detail-profile-info">
                <div className="tenant-detail-profile-name">
                  {detailAccount.fullname || "—"}
                </div>
                <div className="tenant-detail-profile-meta">
                  <span className="tenant-detail-username-tag">
                    @{detailAccount.username}
                  </span>
                  {detailAccount.status === "active" ? (
                    <span className="tenant-detail-status-active">
                      <span className="tenant-detail-status-dot" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="tenant-detail-status-inactive">
                      <span className="tenant-detail-status-dot" />
                      Không hoạt động
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="tenant-detail-two-col">
              {/* Left column */}
              <div className="tenant-detail-col-left">
                {/* Contact info */}
                <div className="tenant-detail-section">
                  <div className="tenant-detail-section-title">
                    <Contact size={15} className="tenant-detail-section-title-icon" />
                    Thông tin liên hệ
                  </div>
                  <div className="tenant-detail-rows">
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">Email</span>
                      <span className="tenant-detail-value">
                        {detailAccount.email || <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">SĐT</span>
                      <span className="tenant-detail-value">
                        {detailAccount.phoneNumber || <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legal info */}
                <div className="tenant-detail-section">
                  <div className="tenant-detail-section-title">
                    <ShieldCheck size={15} className="tenant-detail-section-title-icon" />
                    Thông tin pháp lý
                  </div>
                  <div className="tenant-detail-rows">
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">CCCD / CMND</span>
                      <span className="tenant-detail-value">
                        {detailAccount.cccd || <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="tenant-detail-col-right">
                {/* Personal info */}
                <div className="tenant-detail-section">
                  <div className="tenant-detail-section-title">
                    <PersonStanding size={15} className="tenant-detail-section-title-icon" />
                    Thông tin cá nhân
                  </div>
                  <div className="tenant-detail-rows">
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">Họ và tên</span>
                      <span className="tenant-detail-value">
                        {detailAccount.fullname || <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">Giới tính</span>
                      <span className="tenant-detail-value">
                        {detailAccount.gender === "Male"
                          ? "Nam"
                          : detailAccount.gender === "Female"
                          ? "Nữ"
                          : detailAccount.gender === "Other"
                          ? "Khác"
                          : <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">Ngày sinh</span>
                      <span className="tenant-detail-value">
                        {detailAccount.dob ? formatAccountDate(detailAccount.dob) : <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">Địa chỉ</span>
                      <span className="tenant-detail-value">
                        {detailAccount.address || <span className="tenant-detail-value-empty">—</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </AppModal>
    </div>
  );
}
