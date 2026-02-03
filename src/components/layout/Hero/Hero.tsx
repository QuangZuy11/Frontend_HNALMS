"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./Hero.css";
import { Link } from "react-router-dom";
import buildingOverview from "../../../assets/images/Overview.jpg";
import rooftopArea from "../../../assets/images/Tang5.png";
import parkingArea from "../../../assets/images/NhaXe.jpg";

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

// Hero Component
export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: "Căn Hộ Hoàng Nam",
      description: "Một không gian sống gọn gàng, thoải mái và đầy đủ tiện nghi",
      image: buildingOverview,
    },
    {
      id: 2,
      title: "Sân Thượng ",
      description: "",
      image: rooftopArea,
    },
    {
      id: 3,
      title: "Bãi Đỗ Xe Rộng Rãi",
      description: "",
      image: parkingArea,
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="hero-section">
      {/* Slides */}
      <div className="hero-slides-container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero-slide ${index === currentSlide ? "hero-slide-active" : ""}`}
          >
            <div
              className={`hero-slide-content ${typeof slide.image === 'string' && slide.image.startsWith('hero-gradient') ? slide.image : ''}`}
              style={typeof slide.image === 'string' && slide.image.startsWith('hero-gradient') ? {} : {
                backgroundImage: `url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="hero-content-container">
                <div className="hero-text-wrapper">
                  <h2 className="hero-title">{slide.title}</h2>
                  <p className="hero-description">{slide.description}</p>
                  <div className="hero-divider"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="hero-nav-button hero-nav-button-prev"
        aria-label="Previous slide"
      >
        <ChevronLeft className="hero-nav-icon" />
      </button>

      <button
        onClick={nextSlide}
        className="hero-nav-button hero-nav-button-next"
        aria-label="Next slide"
      >
        <ChevronRight className="hero-nav-icon" />
      </button>

      {/* Dots */}
      <div className="hero-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`hero-dot ${index === currentSlide ? "hero-dot-active" : ""}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* CTA Button */}
      <div className="hero-cta">
        <Link to="/rooms">
          <Button size="lg" className="hero-cta-button">
            Xem Các Phòng Trống
          </Button>
        </Link>
      </div>
    </section>
  );
}
