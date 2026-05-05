import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../services/authService";
import logoImage from "../../../assets/images/z7463676981543_494642986e53789b49de728b4f4a3a1e.jpg";
import bg1 from "../../../assets/images/Overview.jpg";
import bg2 from "../../../assets/images/NhaXe.jpg";
import bg3 from "../../../assets/images/Gate2.jpg";
import bg4 from "../../../assets/images/Tang5.png";
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
        <main className="login-main-container">
            <div className="login-slideshow-pane hidden lg:flex">
                <div className="login-slideshow">
                    <div className="slide" style={{ backgroundImage: `url(${bg1})` }}></div>
                    <div className="slide" style={{ backgroundImage: `url(${bg2})` }}></div>
                    <div className="slide" style={{ backgroundImage: `url(${bg3})` }}></div>
                    <div className="slide" style={{ backgroundImage: `url(${bg4})` }}></div>
                </div>
                <div className="login-slideshow-overlay">
                    <div className="hero-content">
                        <h2>Hoàng Nam Apartment</h2>
                        <p>Hệ thống quản lý căn hộ dịch vụ cao cấp và tiện lợi.</p>
                    </div>
                </div>
            </div>

            <div className="login-form-pane">
                <div className="login-form-container">
                    <div className="login-logo-wrapper">
                        <img
                            src={logoImage}
                            alt="HOÀNG NAM APARTMENT"
                            className="login-logo"
                        />
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
