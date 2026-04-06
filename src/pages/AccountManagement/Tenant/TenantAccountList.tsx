import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Visibility as VisibilityIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Person as PersonIcon,
  ContactPhone as ContactPhoneIcon,
  Badge as BadgeIcon,
  Gavel as GavelIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";
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
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchName, setSearchName] = useState("");
  const [searchContact, setSearchContact] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 8;

  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountService.list("tenants", {
        offset: 0,
        limit: 9999,
      });

      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || "Không thể tải danh sách cư dân");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
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
  }, [accounts, searchName, searchContact, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ROWS_PER_PAGE));
  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchName, searchContact, filterStatus]);

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);

    if (page <= 2) end = Math.min(totalPages, 5);
    if (page >= totalPages - 1) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  const handleViewDetail = async (accountId: string) => {
    try {
      setDetailLoading(true);
      setDetailAccount(null);
      setShowDetailModal(true);

      const response = await accountService.detail("tenants", accountId);
      if (response.success && response.data) {
        setDetailAccount(response.data);
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || "Không thể tải chi tiết cư dân");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDisable = async (accountId: string) => {
    if (!window.confirm("Bạn có chắc muốn đóng tài khoản cư dân này?")) return;

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
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || "Không thể đóng tài khoản");
    } finally {
      setDisablingId(null);
    }
  };

  const handleEnable = async (accountId: string) => {
    if (!window.confirm("Bạn có chắc muốn mở lại tài khoản này?")) return;

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
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || "Không thể mở lại tài khoản");
    } finally {
      setDisablingId(null);
    }
  };

  if (loading) {
    return (
      <div className="tenant-account-list-page">
        <div className="tenant-account-list-card">
          <div className="tenant-account-list-loading">
            <div className="tenant-account-list-loading-spinner" />
            <span className="tenant-account-list-loading-text">Đang tải dữ liệu...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tenant-account-list-page">
        <div className="tenant-account-list-card">
          <div className="tenant-account-list-error">
            <div className="tenant-account-list-error-icon">!</div>
            <h3>Lỗi tải danh sách</h3>
            <p>{error}</p>
            <button type="button" className="tenant-account-list-btn-retry" onClick={fetchAccounts}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-account-list-page">
      <div className="tenant-account-list-card">
        {/* Page Header */}
        <div className="tenant-account-list-header">
          <div className="tenant-account-list-header-left">
            <div className="tenant-account-list-header-icon">
              <GroupsIcon sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h1 className="tenant-account-list-title">Danh sách cư dân</h1>
              <p className="tenant-account-list-subtitle">Quản lý thông tin cư dân trong tòa nhà</p>
            </div>
          </div>
          <div className="tenant-account-list-stats">
            <span className="tenant-account-list-stats-count">
              {filteredAccounts.length} cư dân
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="tenant-account-list-toolbar">
          <div className="tenant-account-list-search-wrap">
            <SearchIcon className="tenant-account-list-search-icon" />
            <input
              type="text"
              className="tenant-account-list-search-input"
              placeholder="Tìm theo tên..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            {searchName && (
              <button
                type="button"
                className="tenant-account-list-search-clear"
                onClick={() => setSearchName("")}
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>

          <div className="tenant-account-list-search-wrap">
            <ContactPhoneIcon className="tenant-account-list-search-icon" />
            <input
              type="text"
              className="tenant-account-list-search-input"
              placeholder="SĐT / Email..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
            />
            {searchContact && (
              <button
                type="button"
                className="tenant-account-list-search-clear"
                onClick={() => setSearchContact("")}
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>

          <div className="tenant-account-list-filter-group">
            <select
              className="tenant-account-list-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>

          {(searchName || searchContact || filterStatus !== "all") && (
            <button
              type="button"
              className="tenant-account-list-btn-clear-filter"
              onClick={() => {
                setSearchName("");
                setSearchContact("");
                setFilterStatus("all");
              }}
            >
              <ClearIcon sx={{ fontSize: 14 }} />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Table */}
        {paginatedAccounts.length === 0 ? (
          <div className="tenant-account-list-empty">
            <div className="tenant-account-list-empty-icon">
              <GroupsIcon sx={{ fontSize: 48, color: "#cbd5e1" }} />
            </div>
            <h3>Chưa có cư dân nào</h3>
            <p>
              {searchName || searchContact || filterStatus !== "all"
                ? "Không tìm thấy cư dân phù hợp với bộ lọc."
                : "Danh sách cư dân đang trống."}
            </p>
          </div>
        ) : (
          <>
            <div className="tenant-account-list-table-wrap">
              <table className="tenant-account-list-table">
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>STT</th>
                    <th style={{ width: "16%" }}>Họ và tên</th>
                    <th style={{ width: "10%" }}>Phòng</th>
                    <th style={{ width: "22%" }}>SĐT / Email</th>
                    <th style={{ width: "12%" }}>Trạng thái</th>
                    <th style={{ width: "12%" }}>Ngày tạo</th>
                    <th style={{ width: "8%" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts.map((acc, index) => (
                    <tr key={acc._id}>
                      <td className="tenant-account-list-td-center">
                        {(page - 1) * ROWS_PER_PAGE + index + 1}
                      </td>
                      <td>
                        <span className="tenant-account-list-tenant-name">
                          {acc.fullname || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="tenant-account-list-room-badge">
                          {acc.roomName || "-"}
                        </span>
                      </td>
                      <td>
                        <div className="tenant-account-list-contact-cell">
                          <span className="tenant-account-list-contact-phone">
                            {acc.phoneNumber || "-"}
                          </span>
                          <span className="tenant-account-list-contact-email">
                            {acc.email || "-"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`tenant-account-list-status-badge tenant-account-list-status-${acc.status}`}>
                          <span className="tenant-account-list-status-dot" />
                          {STATUS_LABELS[acc.status] || acc.status}
                        </span>
                      </td>
                      <td>{formatAccountDate(acc.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="tenant-account-list-btn-view"
                          onClick={() => handleViewDetail(acc._id)}
                          title="Xem chi tiết"
                        >
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="tenant-account-list-pagination">
              <span className="tenant-account-list-pagination-info">
                Tổng: <strong>{filteredAccounts.length}</strong> bản ghi · Trang <strong>{page}</strong>/<strong>{totalPages}</strong>
              </span>
              <div className="tenant-account-list-pagination-controls">
                <button
                  type="button"
                  className="tenant-account-list-pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  title="Trang đầu"
                >
                  <FirstPageIcon sx={{ fontSize: 16 }} />
                </button>
                <button
                  type="button"
                  className="tenant-account-list-pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  title="Trang trước"
                >
                  <PrevIcon sx={{ fontSize: 16 }} />
                </button>

                {getVisiblePages().map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`tenant-account-list-pagination-btn ${pageNumber === page ? "active" : ""}`}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="tenant-account-list-pagination-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  title="Trang sau"
                >
                  <NextIcon sx={{ fontSize: 16 }} />
                </button>
                <button
                  type="button"
                  className="tenant-account-list-pagination-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Trang cuối"
                >
                  <LastPageIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="tenant-detail-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="tenant-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="tenant-detail-header">
              <div className="tenant-detail-header-title">
                <div className="tenant-detail-header-icon">
                  <PersonIcon sx={{ fontSize: 20 }} />
                </div>
                Chi tiết cư dân
              </div>
              <button
                type="button"
                className="tenant-detail-close-btn"
                onClick={() => setShowDetailModal(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="tenant-detail-body">
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
                          <ContactPhoneIcon className="tenant-detail-section-title-icon" sx={{ fontSize: 15 }} />
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
                          <GavelIcon className="tenant-detail-section-title-icon" sx={{ fontSize: 15 }} />
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
                          <BadgeIcon className="tenant-detail-section-title-icon" sx={{ fontSize: 15 }} />
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

                  {/* Actions */}
                  {!isOwner && (
                    <div className="tenant-detail-actions">
                      {detailAccount.status === "active" ? (
                        <button
                          type="button"
                          className="tenant-detail-btn-disable"
                          onClick={() => handleDisable(detailAccount._id)}
                          disabled={disablingId === detailAccount._id}
                        >
                          <LockIcon sx={{ fontSize: 16 }} />
                          {disablingId === detailAccount._id ? "Đang xử lý..." : "Đóng tài khoản"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="tenant-detail-btn-enable"
                          onClick={() => handleEnable(detailAccount._id)}
                          disabled={disablingId === detailAccount._id}
                        >
                          <LockOpenIcon sx={{ fontSize: 16 }} />
                          {disablingId === detailAccount._id ? "Đang xử lý..." : "Mở lại tài khoản"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
