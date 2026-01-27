import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../services/authService";
import "../Login/login.css";

const EnvelopeIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const AlertIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const CheckIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const BuildingIcon = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [validationPopup, setValidationPopup] = useState<{ show: boolean, message: string, type: 'error' | 'success' }>({
        show: false,
        message: "",
        type: 'error'
    });

    const emailRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const showValidationPopup = (message: string, type: 'error' | 'success' = 'error') => {
        setValidationPopup({ show: true, message, type });
        setTimeout(() => {
            setValidationPopup({ show: false, message: "", type: 'error' });
        }, 3000);
    };

    const validateEmail = (email: string): boolean => {
        if (!email) {
            showValidationPopup("Vui lòng nhập địa chỉ email");
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showValidationPopup("Vui lòng nhập địa chỉ email hợp lệ (ví dụ: user@example.com)");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        const email = emailRef.current?.value.trim() || "";

        // Custom validation
        if (!validateEmail(email)) {
            emailRef.current?.focus();
            return;
        }

        setLoading(true);

        try {
            const response = await authService.forgotPassword(email);

            showValidationPopup(response.message || "Mật khẩu mới đã được gửi đến email của bạn", 'success');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            let errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại";

            if (err.response) {
                errorMessage = err.response.data?.message || "Đã xảy ra lỗi";
            } else if (err.request) {
                errorMessage = "Không thể kết nối đến máy chủ";
            }

            showValidationPopup(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
            <div className="w-full flex flex-col justify-center items-center px-6 py-12 bg-background" style={{ height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="login-form-container">
                    <div className="login-icon-wrapper mb-6">
                        <div className="login-icon-box">
                            <BuildingIcon />
                        </div>
                    </div>

                    <h1 className="login-title mb-2">Quên mật khẩu</h1>
                    <p className="login-subtitle mb-8">Nhập email để nhận mật khẩu mới</p>

                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        {/* Validation Popup */}
                        {validationPopup.show && (
                            <div className="validation-popup">
                                <div className={validationPopup.type === 'success' ? 'validation-popup-success' : 'validation-popup-content'}>
                                    {validationPopup.type === 'success' ? <CheckIcon /> : <AlertIcon />}
                                    <span>{validationPopup.message}</span>
                                </div>
                            </div>
                        )}


                        <div>
                            <label htmlFor="email" className="login-label">Email</label>
                            <div className="login-input-wrapper">
                                <div className="login-input-icon">
                                    <EnvelopeIcon />
                                </div>
                                <input
                                    ref={emailRef}
                                    id="email"
                                    name="email"
                                    type="text"
                                    onChange={() => {
                                        if (validationPopup.show) setValidationPopup({ show: false, message: "", type: 'error' });
                                    }}
                                    autoComplete="username"
                                    className="login-input"
                                    placeholder="email@example.com"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="login-button"
                        >
                            {loading ? "Đang xử lý..." : "Gửi mật khẩu mới"}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="login-forgot-link"
                                disabled={loading}
                            >
                                ← Quay lại đăng nhập
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
