import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand Section */}
          <div className="footer-section">
            <h3 className="footer-section-title">Hoàng Nam Building</h3>
            <p className="footer-section-text">
              Tòa nhà căn hộ hiện đại với các tiện ích hàng đầu tại Hòa Lạc
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-section-heading">Liên Kết Nhanh</h4>
            <ul className="footer-list">
              <li>
                <Link to="/" className="footer-link">
                  Trang Chủ
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="footer-link">
                  Tầng & Phòng
                </Link>
              </li>
              <li>
                <Link to="/rules" className="footer-link">
                  Nội Quy
                </Link>
              </li>
             
            </ul>
          </div>

          {/* Contact Info */}
          <div className="footer-section">
            <h4 className="footer-section-heading">Liên Hệ</h4>
            <ul className="footer-list">
              <li className="footer-contact-item">
                <strong>Hotline:</strong> (+84) 869048066
              </li>
              <li className="footer-contact-item">
                <strong>Email:</strong> toanhahoangnam@gmail.com
              </li>
              <li className="footer-contact-item">
                <strong>Địa Chỉ:</strong> Số nhà 56, Cụm 3, Thôn 3, Xã Hòa Lạc, Hà Nội
              </li>
              <li className="footer-contact-item">
                <strong>Giờ Làm:</strong> 24/7 (Tất cả các ngày)
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div className="footer-section">
            <h4 className="footer-section-heading">Kết Nối</h4>
            <ul className="footer-list">
              <li>
                <a
                  href="https://www.facebook.com/nguyen.quang.958297/"
                  className="footer-link"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://zalo.me/0869048066" className="footer-link">
                  Zalo
                </a>
              </li>
              <li>
               
              </li>
            </ul>
          </div>
        </div>

        {/* Divider
        <div className="footer-bottom">
          <p className="footer-copyright">
            © 2024 Hoàng Nam Building Management. Tất cả các quyền được bảo lưu.
          </p>
        </div> */}
      </div>
    </footer>
  );
}
