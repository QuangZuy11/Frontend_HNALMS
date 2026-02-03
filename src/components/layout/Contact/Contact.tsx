import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./Contact.css";

// Button Component
function Button({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  const classes = [
    "contact-btn",
    `contact-btn-${variant}`,
    `contact-btn-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Comp data-slot="button" className={classes} {...props} />;
}

// Card Components
function Card({ className = "", ...props }) {
  return <div className={`contact-card ${className}`} {...props} />;
}

function CardHeader({ className = "", ...props }) {
  return <div className={`contact-card-header ${className}`} {...props} />;
}

function CardTitle({ className = "", ...props }) {
  return <h3 className={`contact-card-title ${className}`} {...props} />;
}

function CardContent({ className = "", ...props }) {
  return <div className={`contact-card-content ${className}`} {...props} />;
}

function CardDescription({ className = "", ...props }) {
  return <p className={`contact-card-description ${className}`} {...props} />;
}

// Contact Component
export default function Contact() {
  const contactMethods = [
    {
      icon: Phone,
      title: "Gọi Hotline",
      value: "(+84) 869048066",
      action: "tel:+84869048066",
      label: "Gọi Ngay",
    },
    {
      icon: Mail,
      title: "Email",
      value: "toanhahoangnam@gmail.com",
      action: "mailto:toanhahoangnam@gmail.com",
      label: "Gửi Email",
    },
    {
      icon: MapPin,
      title: "Địa Chỉ",
      value: "Thạch Hoà, Thạch Thất, Hà Nội",
      action: "#",
      label: "Xem Map",
    },
    {
      icon: Clock,
      title: "Giờ Làm Việc",
      value: "8:00 - 21:00 (Tất cả các ngày)",
      action: "#",
      label: "Liên Hệ",
    },
  ];

  return (
    <section className="contact-section">
      <div className="contact-container">
        {/* Section Title */}
        <div className="contact-header">
          <h2 className="contact-title">Liên Hệ Với Chúng Tôi</h2>
          <p className="contact-subtitle">
            Đội ngũ quản lý sẵn sàng tư vấn và hỗ trợ bạn 24/7
          </p>
        </div>

        {/* Contact Methods Grid */}
        <div className="contact-methods">
          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            return (
              <Card key={index} className="contact-method-card">
                <CardHeader className="contact-method-header">
                  <div className="contact-method-icon">
                    <Icon className="contact-method-icon-svg" />
                  </div>
                  <CardTitle className="contact-method-title">
                    {method.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="contact-method-content">
                  <CardDescription className="contact-method-value">
                    {method.value}
                  </CardDescription>
                  <a href={method.action} className="contact-method-link">
                    <Button
                      variant="outline"
                      size="sm"
                      className="contact-method-btn"
                    >
                      {method.label}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Google Map */}
        <div className="contact-map">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7449.73798250929!2d105.51640010882275!3d20.997888023201867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345b003d0a102b%3A0xfbbf2cf21873bf89!2sHoang%20Nam%20Apartment!5e0!3m2!1svi!2s!4v1769097529723!5m2!1svi!2s"
            width="100%"
            height="450"
            style={{ border: 0, borderRadius: "0.5rem" }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Vị trí Hoàng Nam Apartment"
          />
        </div>
      </div>
    </section>
  );
}
