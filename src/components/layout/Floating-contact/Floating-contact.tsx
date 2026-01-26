import { useState } from "react";
import { MessageCircle, Phone, X, Clock } from "lucide-react";
import "./Floating-contact.css";

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="floating-button"
        aria-label="Toggle contact menu"
      >
        {isOpen ? (
          <X className="floating-button-icon" />
        ) : (
          <MessageCircle className="floating-button-icon" />
        )}
      </button>

      {/* Contact Menu */}
      {isOpen && (
        <div className="floating-menu">
          {/* Header */}
          <div className="floating-menu-header">
            <h3 className="floating-menu-title">Liên Hệ Với Chúng Tôi</h3>
            <p className="floating-menu-subtitle">Sẵn sàng giúp đỡ bạn 24/7</p>
          </div>

          {/* Contact Options */}
          <div className="floating-menu-content">
            {/* Working Hours */}
            <div className="floating-menu-hours">
              <Clock className="floating-menu-hours-icon" />
              <div>
                <p className="floating-menu-hours-title">Giờ Làm Việc</p>
                <p className="floating-menu-hours-time">
                  8:00 - 21:00 (Mỗi ngày)
                </p>
              </div>
            </div>

            {/* Zalo Chat */}
            <a
              href="https://zalo.me/0869048066"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="floating-menu-option"
            >
              <MessageCircle className="floating-menu-option-icon floating-menu-option-icon-zalo" />
              <div className="floating-menu-option-text">
                <p className="floating-menu-option-title">Chat Zalo</p>
                <p className="floating-menu-option-detail">@hoangnambuilding</p>
              </div>
              <span className="floating-menu-option-badge floating-menu-option-badge-zalo">
                Mở
              </span>
            </a>

            {/* Phone Call */}
            <a
              href="tel:+842812345678"
              onClick={() => setIsOpen(false)}
              className="floating-menu-option"
            >
              <Phone className="floating-menu-option-icon floating-menu-option-icon-phone" />
              <div className="floating-menu-option-text">
                <p className="floating-menu-option-title">Gọi Ngay</p>
                <p className="floating-menu-option-detail">(028) 1234 5678</p>
              </div>
              <span className="floating-menu-option-badge floating-menu-option-badge-phone">
                Gọi
              </span>
            </a>

            {/* Divider */}
            <div className="floating-menu-divider" />

            {/* Quick Message */}
            <div className="floating-menu-faq">
              <p className="floating-menu-faq-title">Hay Hỏi Về:</p>
              <ul className="floating-menu-faq-list">
                <li>• Tìm phòng trống</li>
                <li>• Đặt cọc phòng</li>
                <li>• Ký hợp đồng thuê</li>
                <li>• Các câu hỏi khác</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="floating-menu-footer">
            Phản hồi nhanh chóng trong giờ làm việc
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="floating-backdrop" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
