import { MapPin, Shield, Wifi, ParkingCircle } from "lucide-react";
import "./About.css";

// Card Components
function Card({ className = "", ...props }) {
  return <div className={`about-card ${className}`} {...props} />;
}

function CardHeader({ className = "", ...props }) {
  return <div className={`about-card-header ${className}`} {...props} />;
}

function CardTitle({ className = "", ...props }) {
  return <h3 className={`about-card-title ${className}`} {...props} />;
}

function CardContent({ className = "", ...props }) {
  return <div className={`about-card-content ${className}`} {...props} />;
}

function CardDescription({ className = "", ...props }) {
  return <p className={`about-card-description ${className}`} {...props} />;
}

// About Component
export default function About() {
  const amenities = [
    {
      icon: ParkingCircle,
      title: "Nhà Để Xe An Toàn",
      description: "Tầng 1 với hệ thống camera 24/7",
    },
    {
      icon: Wifi,
      title: "Internet Cao Tốc",
      description: "Đường truyền ổn định 100Mbps",
    },
    {
      icon: Shield,
      title: "Bảo Mật Tuyệt Đối",
      description: "Hệ thống kiểm soát ra vào hiện đại",
    },
    {
      icon: MapPin,
      title: "Vị Trí Chiến Lược",
      description: "Gần trung tâm thành phố, tiện di chuyển",
    },
  ];

  return (
    <section className="about-section">
      <div className="about-container">
        {/* Section Title */}
        <div className="about-header">
          <h2 className="about-title">Về Tòa Nhà Hoàng Nam</h2>
          <p className="about-subtitle">
            Tòa nhà căn hộ hiện đại với 5 tầng, tích hợp các tiện ích hàng đầu
            cho cuộc sống chất lượng cao
          </p>
        </div>

        {/* About Content */}
        <div className="about-content">
          <div className="about-features">
            <h3 className="about-features-title">Đặc Điểm Nổi Bật</h3>
            <ul className="about-features-list">
              {[
                "Tầng 1: Nhà để xe + Căn hộ",
                "Tầng 2-4: Căn hộ với view thoáng",
                "Tầng 5: Sân thượng + Căn hộ",
                "Hệ thống điện, nước hiện đại",
                "Internet, truyền hình cáp",
                "Gửi xe an toàn 24/7",
              ].map((item, index) => (
                <li key={index} className="about-feature-item">
                  <span className="about-feature-check">✓</span>
                  <span className="about-feature-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="about-stats">
            <div className="about-stats-content">
              <div className="about-stats-number">5</div>
              <p className="about-stats-label">Tầng</p>
              <p className="about-stats-description">Với hơn 20 căn hộ</p>
            </div>
          </div>
        </div>

        {/* Amenities Grid */}
        <div className="about-amenities">
          {amenities.map((amenity, index) => {
            const Icon = amenity.icon;
            return (
              <Card key={index} className="about-amenity-card">
                <CardHeader className="about-amenity-header">
                  <div className="about-amenity-icon">
                    <Icon className="about-amenity-icon-svg" />
                  </div>
                  <CardTitle className="about-amenity-title">
                    {amenity.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{amenity.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
