import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import type { LoginResponse } from "../../types/auth.types";

interface LoginFormProps {
  onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = (await authService.login(
        email,
        password,
      )) as LoginResponse;

      // Nếu backend trả token + user thì dùng cho AuthContext
      if (response.token && response.user) {
        const baseUser = {
          id: (response.user.id || response.user.user_id || "").toString(),
          email: response.user.email,
          fullname: response.user.fullname ?? null,
          name: response.user.username ?? undefined,
          role: response.user.role,
        };

        // Đăng nhập + lưu vào context + localStorage
        login(response.token, baseUser);

        // Sau khi đăng nhập, gọi lại /auth/me để luôn lấy thông tin profile mới nhất
        try {
          const profileRes = await authService.getProfile();
          const profile = profileRes.data;
          const freshUser = {
            id: (profile.id || profile.user_id || "").toString(),
            email: profile.email,
            fullname: profile.fullname ?? null,
            name: profile.username ?? baseUser.name,
            role: profile.role,
          };
          login(response.token, freshUser);

          // Redirect dựa vào role
          if (freshUser.role === "manager") {
            window.location.href = "/managerdashboard";
          } else if (freshUser.role === "tenant") {
            window.location.href = "/";
          } else {
            window.location.href = "/homepage";
          }
        } catch (profileErr) {
          console.warn("Could not refresh profile after login", profileErr);
          // Nếu không lấy được profile, redirect dựa vào baseUser role
          if (baseUser.role === "manager") {
            window.location.href = "/managerdashboard";
          } else if (baseUser.role === "tenant") {
            window.location.href = "/";
          } else {
            window.location.href = "/homepage";
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đăng nhập</h1>
        <p className="text-muted-foreground">
          Chào mừng bạn trở lại! Vui lòng đăng nhập vào tài khoản của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Nhập email của bạn"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Nhập mật khẩu của bạn"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm">Ghi nhớ đăng nhập</span>
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-primary hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
