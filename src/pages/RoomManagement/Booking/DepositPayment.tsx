import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle, Copy, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { depositService } from "../../../services/depositService";
import type { DepositInitiateData } from "../../../services/depositService";
import "./DepositPayment.css";

interface DepositPaymentProps {
    depositData: DepositInitiateData;
    onSuccess: () => void;
    onCancel: () => void;
}

const POLL_INTERVAL_MS = 3000;

export default function DepositPayment({ depositData, onSuccess, onCancel }: DepositPaymentProps) {
    const [status, setStatus] = useState<"Pending" | "Held" | "Expired" | "Refunded" | "Forfeited">("Pending");
    const [secondsLeft, setSecondsLeft] = useState<number>(depositData.expireInSeconds);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [pollError, setPollError] = useState(false);
    const [qrError, setQrError] = useState(false);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    const pollStatus = useCallback(async () => {
        try {
            const res = await depositService.getDepositStatus(depositData.transactionCode);
            const newStatus = res.data.status;
            setStatus(newStatus);
            setPollError(false);

            if (res.data.expireInSeconds !== undefined) {
                setSecondsLeft(res.data.expireInSeconds);
            }

            if (newStatus === "Held") {
                stopPolling();
                // Small delay to let user see the success state in this component
                setTimeout(() => onSuccess(), 1200);
            } else if (newStatus === "Expired" || newStatus === "Refunded" || newStatus === "Forfeited") {
                stopPolling();
            }
        } catch (err: unknown) {
            // 404 = deposit đã bị xóa khỏi DB (hết 5 phút)
            const axiosErr = err as { response?: { status?: number } };
            if (axiosErr?.response?.status === 404) {
                stopPolling();
                setStatus("Expired");
                return;
            }
            setPollError(true);
        }
    }, [depositData.transactionCode, stopPolling, onSuccess]);

    // Start countdown & polling
    useEffect(() => {
        // Countdown timer
        countdownRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    stopPolling();
                    setStatus("Expired");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Polling every 3 seconds
        pollingRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

        return () => stopPolling();
    }, [pollStatus, stopPolling]);

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // fallback
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const isExpiredState = status === "Expired" || status === "Forfeited" || status === "Refunded";

    if (status === "Held") {
        return (
            <div className="dp-card dp-success-card">
                <div className="dp-success-icon">
                    <CheckCircle size={56} />
                </div>
                <h3 className="dp-success-title">Thanh Toán Thành Công!</h3>
                <p className="dp-success-msg">Giao dịch đã được xác nhận. Đang chuyển hướng...</p>
            </div>
        );
    }

    if (isExpiredState) {
        return (
            <div className="dp-card dp-expired-card">
                <div className="dp-expired-icon">
                    <AlertCircle size={48} />
                </div>
                <h3 className="dp-expired-title">
                    {status === "Expired" ? "Giao Dịch Hết Hạn" : "Giao Dịch Không Hợp Lệ"}
                </h3>
                <p className="dp-expired-msg">
                    {status === "Expired"
                        ? "Thời gian thanh toán đã hết. Vui lòng thực hiện lại."
                        : "Giao dịch đã bị hủy hoặc hoàn tiền."}
                </p>
                <button className="dp-retry-btn" onClick={onCancel}>
                    <RefreshCw size={16} />
                    Thử Lại
                </button>
            </div>
        );
    }

    return (
        <div className="dp-card">
            {/* Header with countdown */}
            <div className="dp-header">
                <div>
                    <h3 className="dp-title">Quét Mã QR Thanh Toán</h3>
                    <p className="dp-subtitle">Sử dụng ứng dụng ngân hàng hoặc ví điện tử</p>
                </div>
                <div className={`dp-countdown ${secondsLeft <= 60 ? "urgent" : ""}`}>
                    <Clock size={16} />
                    <span>{formatTime(secondsLeft)}</span>
                </div>
            </div>

            {/* Polling error notice */}
            {pollError && (
                <div className="dp-poll-error">
                    <AlertCircle size={14} />
                    Đang thử kết nối lại...
                </div>
            )}

            <div className="dp-body">
                {/* QR Code */}
                <div className="dp-qr-wrapper">
                    {!qrError ? (
                        <img
                            src={depositData.qrUrl}
                            alt="QR Code thanh toán"
                            className="dp-qr-img"
                            onError={() => setQrError(true)}
                        />
                    ) : (
                        <div className="dp-qr-fallback">
                            <AlertCircle size={32} />
                            <span>Không tải được QR</span>
                        </div>
                    )}
                    <div className="dp-polling-badge">
                        <span className="dp-dot" />
                        Đang chờ xác nhận...
                    </div>
                </div>

                {/* Payment Info */}
                <div className="dp-info-panel">
                    <div className="dp-amount-box">
                        <span className="dp-amount-label">Số tiền cần chuyển</span>
                        <span className="dp-amount-value">
                            {depositData.depositAmount.toLocaleString("vi-VN")}đ
                        </span>
                    </div>

                    <div className="dp-info-rows">
                        {/* Bank */}
                        <div className="dp-info-row">
                            <span className="dp-info-label">Ngân hàng</span>
                            <span className="dp-info-value">BIDV</span>
                        </div>

                        {/* Account Number */}
                        <div className="dp-info-row">
                            <span className="dp-info-label">Số tài khoản</span>
                            <div className="dp-copy-row">
                                <span className="dp-info-value mono">{depositData.bankInfo.bankAccount}</span>
                                <button
                                    className="dp-copy-btn"
                                    onClick={() => copyToClipboard(depositData.bankInfo.bankAccount, "account")}
                                    title="Sao chép"
                                >
                                    {copiedField === "account" ? <CheckCircle size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Account Name */}
                        <div className="dp-info-row">
                            <span className="dp-info-label">Chủ tài khoản</span>
                            <span className="dp-info-value">{depositData.bankInfo.bankAccountName}</span>
                        </div>

                        {/* Transfer content */}
                        <div className="dp-info-row">
                            <span className="dp-info-label">Nội dung chuyển khoản</span>
                            <div className="dp-copy-row">
                                <span className="dp-info-value mono content-highlight">
                                    {depositData.bankInfo.content}
                                </span>
                                <button
                                    className="dp-copy-btn"
                                    onClick={() => copyToClipboard(depositData.bankInfo.content, "content")}
                                    title="Sao chép"
                                >
                                    {copiedField === "content" ? <CheckCircle size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button className="dp-back-btn" onClick={onCancel}>
                Hủy thanh toán
            </button>
        </div>
    );
}
