import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";
import logoImage from "../../../assets/images/z7463676981543_494642986e53789b49de728b4f4a3a1e.jpg";
import "./login.css";

type View = "login" | "forgot-password";

// Icon components
const EnvelopeIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const LockIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const EyeIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [validationPopup, setValidationPopup] = useState<{
    show: boolean;
    message: string;
  }>({
    show: false,
    message: "",
  });

  // Sử dụng ref để giữ giá trị input (uncontrolled components)
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  const showValidationPopup = (message: string) => {
    setValidationPopup({ show: true, message });
    setTimeout(() => {
      setValidationPopup({ show: false, message: "" });
    }, 3000);
  };

  const validateEmail = (email: string): boolean => {
    if (!email) {
      showValidationPopup("Vui lòng nhập địa chỉ email");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showValidationPopup(
        "Vui lòng nhập địa chỉ email hợp lệ (ví dụ: user@example.com)",
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Ngăn form submit nhiều lần
    if (loading) return;

    const email = emailRef.current?.value.trim() || "";
    const password = passwordRef.current?.value || "";

    // Custom validation
    if (!validateEmail(email)) {
      emailRef.current?.focus();
      return;
    }

    if (!password) {
      showValidationPopup("Vui lòng nhập mật khẩu");
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);

      // Debug log
      console.log("📥 Login response:", {
        hasToken: !!response.token,
        tokenLength: response.token?.length,
        tokenPreview: response.token?.substring(0, 30) + "...",
        user: response.user,
        userKeys: Object.keys(response.user || {}),
        rawResponse: response,
      });

      // Validate response
      if (!response.token || !response.user) {
        console.error("❌ Invalid login response:", response);
        showValidationPopup("Đăng nhập thất bại. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      // Validate user has required fields
      if (!response.user.email || !response.user.role) {
        console.error("❌ User missing required fields:", {
          hasEmail: !!response.user.email,
          hasRole: !!response.user.role,
          user: response.user,
        });
        showValidationPopup(
          "Dữ liệu người dùng không hợp lệ. Vui lòng thử lại.",
        );
        setLoading(false);
        return;
      }

      console.log("✅ Calling AuthContext.login with:", {
        token: response.token.substring(0, 20) + "...",
        user: response.user,
      });

      // Save to context and localStorage
      login(response.token, response.user);

      // Verify token was saved before redirecting
      const savedToken = localStorage.getItem("token");
      console.log("Token saved verification:", {
        saved: !!savedToken,
        length: savedToken?.length,
        matches: savedToken === response.token.trim(),
      });

      if (!savedToken) {
        console.error("Token was not saved to localStorage!");
        showValidationPopup("Lỗi lưu token. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      // Small delay to ensure localStorage is written (browser may need time)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Redirect based on role
      switch (response.user.role) {
        case "admin":
          navigate("/admin");
          break;
        case "manager":
          navigate("/managerdashboard");
          break;
        case "owner":
          navigate("/building-owner");
          break;
        case "tenant":
          navigate("/");
          break;
        case "accountant":
          navigate("/accountant");
          break;
        default:
          navigate("/");
      }
    } catch (err: any) {
      // Xử lý lỗi
      let errorMessage = "Đăng nhập thất bại";

      if (err.response) {
        errorMessage = err.response.data?.message || "Đăng nhập thất bại";
      } else if (err.request) {
        errorMessage =
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
      } else {
        errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại.";
      }

      showValidationPopup(errorMessage);

      // Focus vào password field
      setTimeout(() => {
        if (passwordRef.current) {
          passwordRef.current.focus();
          passwordRef.current.select();
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        className="w-full flex flex-col justify-center items-center px-6 py-12 bg-background"
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="login-form-container">
          <div className="login-logo-wrapper">
            <img
              src={logoImage}
              alt="HOÀNG NAM APARTMENT"
              className="login-logo"
            />
          </div>

          <h1 className="login-title mb-2">Chào mừng trở lại</h1>
          <p className="login-subtitle mb-8">
            Đăng nhập để quản lý căn hộ của bạn
          </p>

          {view === "login" ? (
            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Validation Popup */}
              {validationPopup.show && (
                <div className="validation-popup">
                  <div className="validation-popup-content">
                    <AlertIcon />
                    <span>{validationPopup.message}</span>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="login-label">
                  Email
                </label>
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
                      if (validationPopup.show)
                        setValidationPopup({ show: false, message: "" });
                    }}
                    autoComplete="email"
                    className="login-input"
                    placeholder="email@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="login-label">
                  Mật khẩu
                </label>
                <div className="login-input-wrapper">
                  <div className="login-input-icon">
                    <LockIcon />
                  </div>
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    onChange={() => {
                      if (validationPopup.show)
                        setValidationPopup({ show: false, message: "" });
                    }}
                    autoComplete="current-password"
                    className="login-input"
                    placeholder="Nhập mật khẩu"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-eye-icon"
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="login-options">
                <label className="login-checkbox-label">
                  <input type="checkbox" className="login-checkbox" />
                  <span>Nhớ mật khẩu</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="login-forgot-link"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={loading} className="login-button">
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              <p className="login-footer"></p>
            </form>
          ) : (
            <div className="login-form">
              <p className="mb-4">
                Chức năng quên mật khẩu đang được phát triển.
              </p>
              <button
                type="button"
                onClick={() => setView("login")}
                className="login-button"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
