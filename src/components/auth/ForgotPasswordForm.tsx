import { useState } from "react";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      // TODO: Implement forgot password API call
      // await authService.forgotPassword(email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage("Email khôi phục mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quên mật khẩu</h1>
        <p className="text-muted-foreground">
          Nhập email của bạn và chúng tôi sẽ gửi link khôi phục mật khẩu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes("lỗi") 
              ? "bg-destructive/10 text-destructive" 
              : "bg-green-100 text-green-800"
          }`}>
            {message}
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex-1 py-2 px-4 border border-border rounded-md hover:bg-secondary"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang gửi..." : "Gửi email"}
          </button>
        </div>
      </form>
    </div>
  );
}
