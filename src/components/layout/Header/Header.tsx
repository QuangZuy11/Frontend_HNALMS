import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./Header.css";
import Logo from "../../../assets/images/Logo.png";

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

// Header Component - Dành cho Guest (chưa đăng nhập)
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Trang Chủ", to: "/" },
    { label: "Tầng & Phòng", to: "/rooms" },
    { label: "Nội Quy", to: "/rules" },
  ];

  return (
    <header className="header">
      <div className="header-wrapper">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="header-logo">
            <img
              src={Logo}
              alt="Hoàng Nam Apartment"
              className="header-logo-img"
            />
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
            {/* Chỉ hiển thị nút Đăng Nhập - không hiển thị profile */}
            <Link to="/login">
              <Button variant="default" className="login-btn">
                Đăng Nhập
              </Button>
            </Link>

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
            {/* Chỉ hiển thị nút Đăng Nhập */}
            <Link to="/login" onClick={() => setIsOpen(false)}>
              <Button variant="default" className="mobile-login">
                Đăng Nhập
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
