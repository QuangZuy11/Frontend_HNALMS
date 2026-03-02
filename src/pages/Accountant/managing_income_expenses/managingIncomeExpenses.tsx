import { useCallback, useEffect, useState } from "react";
import { cashFlowService } from "../../../services/cashFlowService";
import "./managingIncomeExpenses.css";

interface Room {
  _id: string;
  name: string;
  roomCode?: string;
}

interface FinancialTicket {
  _id: string;
  type: "Receipt" | "Payment" | string;
  amount: number;
  title: string;
  referenceId?: string | { _id: string; tenantId?: string } | null;
  status: string;
  transactionDate: string;
  createdAt?: string;
  room?: Room | null;
}

export default function ManagingIncomeExpenses() {
  const [tickets, setTickets] = useState<FinancialTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState<string>("");

  const fetchTickets = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params: { roomSearch?: string } = {};
      if (roomSearch.trim()) {
        params.roomSearch = roomSearch.trim();
      }

      type ApiResponse = {
        success: boolean;
        data: FinancialTicket[];
        message?: string;
      };

      const response: ApiResponse =
        await cashFlowService.getPaymentTickets(params);

      if (response.success && Array.isArray(response.data)) {
        setTickets(response.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách phiếu chi:", err);
      let msg = "Không thể tải danh sách phiếu chi";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      ) {
        msg = (
          err as { response?: { data?: { message?: string } } }
        ).response!.data!.message as string;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [roomSearch]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== "number") return "0";
    return value.toLocaleString("vi-VN");
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="payments-page">
      <div className="payments-card">
        <div className="payments-header">
          <div>
            <h1>Danh sách phiếu chi</h1>
            <p className="subtitle">
              Các phiếu chi phát sinh từ sửa chữa miễn phí và các nghiệp vụ khác
            </p>
          </div>
          <div className="payments-filter-wrapper">
            <label htmlFor="room-search" className="payments-filter-label">
              Phòng:
            </label>
            <input
              type="text"
              id="room-search"
              className="payments-filter-input"
              placeholder="Nhập số phòng (ví dụ: 320)"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="payments-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="payments-empty">
            <p>Chưa có phiếu chi nào.</p>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="payments-table-wrap">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tiêu đề</th>
                  <th>Phòng</th>
                  <th>Số tiền (VNĐ)</th>
                  <th>Trạng thái</th>
                  <th>Ngày giao dịch</th>
                  <th>Mã tham chiếu</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, index) => (
                  <tr key={t._id}>
                    <td>{index + 1}</td>
                    <td>{t.title}</td>
                    <td>{t.room?.name || t.room?.roomCode || "-"}</td>
                    <td>{formatCurrency(t.amount)}</td>
                    <td>
                      <span className="status-badge">
                        {t.status || "Created"}
                      </span>
                    </td>
                    <td>{formatDateTime(t.transactionDate || t.createdAt)}</td>
                    <td>
                      {typeof t.referenceId === "object" && t.referenceId !== null
                        ? t.referenceId._id
                        : t.referenceId || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
