import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./Header.css";

// Button Component
function Button({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  const classes = ["button", `button-${variant}`, `button-${size}`, className]
    .filter(Boolean)
    .join(" ");

  return <Comp data-slot="button" className={classes} {...props} />;
}

// Header Component
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Trang Chủ", to: "/" },
    { label: "Tầng & Phòng", to: "/rooms" },
    { label: "Tin Tức", to: "/news" },
    { label: "Nội Quy", to: "/rules" },
  ];

  return (
    <header className="header">
      <div className="header-wrapper">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="header-logo">
            <div className="header-logo-icon">
              <span className="header-logo-text">HN</span>
            </div>
            <span className="header-logo-title">Hoàng Nam</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header-nav-desktop">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className="header-nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="header-right">
            <Button variant="default" className="login-btn">
              Đăng Nhập
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="header-mobile-button"
            >
              {isOpen ? (
                <X className="header-icon" />
              ) : (
                <Menu className="header-icon" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="header-nav-mobile">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="header-nav-link"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="default" className="mobile-login">
              Đăng Nhập
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
