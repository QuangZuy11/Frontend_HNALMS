import { MapPin, Shield, Wifi, ParkingCircle } from "lucide-react";
import "./About.css";
import hoangNamBuilding from "../../../assets/images/Gate2.jpg";

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
      description: "Có khu vực riêng cho xe điện",
    },
    {
      icon: Wifi,
      title: "Internet Tốc Độ Cao",
      description: "Trang bị Wifi riên cho từng phòng",
    },
    {
      icon: Shield,
      title: "An Ninh Đảm Bảo",
      description: "Hệ thống camera giám sát 24/7",
    },
    {
      icon: MapPin,
      title: "Vị Trí ",
      description: "Cách Trường ĐH FPT 3km",
    },
  ];

  return (
    <section className="about-section">
      <div className="about-container">
        {/* Section Title */}
        <div className="about-header">
          <h2 className="about-title">Về Tòa Nhà Hoàng Nam</h2>
          <p className="about-subtitle">
            Tòa nhà căn hộ hiện đại với 5 tầng,đáp ứng đầy đủ nhu cầu sinh hoạt hàng ngày
          </p>
        </div>

        {/* About Content */}
        <div className="about-content">
          <div className="about-features">
            <h3 className="about-features-title">Đặc Điểm Nổi Bật</h3>
            <ul className="about-features-list">
              {[
                "Tầng 1: Nhà để xe + Căn hộ",
                "Tầng 2-4: Căn hộ ",
                "Tầng 5: Sân thượng + Căn hộ",
                "Hệ thống điện, nước minh bạch",
                "Internet tốc độ cao",
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
            <div
              className="about-stats-background"
              style={{
                backgroundImage: `url(${hoangNamBuilding})`,
              }}
            >
              <div className="about-stats-overlay">
                <div className="about-stats-content">
                  <div className="about-stats-number">5</div>
                  <div className="about-stats-text">
                    <p className="about-stats-label">Tầng</p>
                    <p className="about-stats-description">Với 250 căn hộ</p>
                  </div>
                </div>
              </div>
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
