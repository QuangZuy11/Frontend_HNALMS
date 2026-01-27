import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User as UserIcon, ChevronDown } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./Header.css";
import Logo from "../../../assets/images/Logo.png";

// Import useAuth hook
import { useAuth } from "../../../context/AuthContext";

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName = user?.fullname || user?.email || "User";

  const navItems = [
    { label: "Trang Chủ", to: "/" },
    { label: "Tầng & Phòng", to: "/rooms" },
    { label: "Tin Tức", to: "/news" },
    { label: "Nội Quy", to: "/rules" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsOpen(false);
    setIsUserMenuOpen(false);
  };

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
            {isAuthenticated && user ? (
              <div className="header-user-wrap">
                <button
                  type="button"
                  className="header-user-trigger"
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="header-user-avatar">
                    <UserIcon className="header-user-avatar-icon" />
                  </span>
                  <span className="header-user-name">
                    {user.fullname || user.email || "User"}
                    {displayName}
                  </span>
                  <span className="header-user-caret">
                    <ChevronDown size={16} />
                  </span>
                </button>
                {isUserMenuOpen && (
                  <div className="header-user-menu">
                    <Link
                      to="/profile"
                      className="header-user-menu-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Xem profile
                    </Link>
                    <button
                      type="button"
                      className="header-user-menu-item"
                      onClick={handleLogout}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="default" className="login-btn">
                  Đăng Nhập
                </Button>
              </Link>
            )}

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
            {isAuthenticated && user ? (
              <div className="mobile-user">
                <div className="mobile-user-name">
                  {user.fullname || user.email || "User"}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="mobile-profile-link"
                >
                  <Button variant="default" className="mobile-profile">
                    Xem profile
                  </Button>
                </Link>
                <Button
                  variant="default"
                  className="mobile-logout"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="mobile-login">
                  Đăng Nhập
                </Button>
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
