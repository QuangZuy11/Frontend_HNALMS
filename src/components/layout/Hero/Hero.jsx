"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./Hero.css";

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
      title: "Tổng Quan Tòa Nhà",
      description: "Khám phá vẻ đẹp kiến trúc hiện đại",
      image: "hero-gradient-1",
    },
    {
      id: 2,
      title: "Tiện Nghi Đẳng Cấp",
      description: "Nhà để xe, Sân thượng, Phòng Gym...",
      image: "hero-gradient-2",
    },
    {
      id: 3,
      title: "Căn Hộ Hiện Đại",
      description: "Không gian sống thoải mái và tiện nghi",
      image: "hero-gradient-3",
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
            <div className={`hero-slide-content ${slide.image}`}>
              <h2 className="hero-title">{slide.title}</h2>
              <p className="hero-description">{slide.description}</p>
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
        <Button size="lg" className="hero-cta-button">
          Xem Các Phòng Trống
        </Button>
      </div>
    </section>
  );
}
