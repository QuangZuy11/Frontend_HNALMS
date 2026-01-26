"use client";
import Link from "next/link";
import { MapPin, Home, Users, DoorOpen } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import "./RoomCard.css";

// Button Component
function Button({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  disabled = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  const classes = ["button", `button-${variant}`, `button-${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <Comp
      data-slot="button"
      className={classes}
      disabled={disabled}
      {...props}
    />
  );
}

// Card Components
function Card({ className = "", ...props }) {
  return <div className={`card ${className}`} {...props} />;
}

function CardHeader({ className = "", ...props }) {
  return <div className={`card-header ${className}`} {...props} />;
}

function CardContent({ className = "", ...props }) {
  return <div className={`card-content ${className}`} {...props} />;
}

// Badge Component
function Badge({ className = "", variant = "default", ...props }) {
  return <span className={`badge badge-${variant} ${className}`} {...props} />;
}

// RoomCard Component
export default function RoomCard({ room }) {
  const statusLabel = room.status === "available" ? "Trống" : "Đã Thuê";
  const statusColor =
    room.status === "available"
      ? "room-card-status-available"
      : "room-card-status-booked";

  return (
    <Card className="room-card">
      {/* Image */}
      <div className="room-card-image">
        <div className="room-card-image-content">
          <span className="room-card-image-text">{room.name}</span>
        </div>
        <Badge className={`room-card-status ${statusColor}`}>
          {statusLabel}
        </Badge>
      </div>

      {/* Content */}
      <CardHeader className="room-card-header">
        <div className="room-card-header-content">
          <div>
            <h3 className="room-card-title">{room.name}</h3>
            <p className="room-card-floor">
              <MapPin className="room-card-floor-icon" />
              Tầng {room.floor}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="room-card-body">
        {/* Room Info */}
        <p className="room-card-description">{room.description}</p>

        {/* Specs */}
        <div className="room-card-specs">
          <div className="room-card-spec">
            <Home className="room-card-spec-icon" />
            <span className="room-card-spec-value">{room.area}m²</span>
          </div>
          <div className="room-card-spec">
            <Users className="room-card-spec-icon" />
            <span className="room-card-spec-value">
              {room.maxOccupants} người
            </span>
          </div>
          <div className="room-card-spec">
            <DoorOpen className="room-card-spec-icon" />
            <span className="room-card-spec-value">
              {room.amenities.length}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="room-card-price-section">
          <div className="room-card-price">
            {(room.price / 1000000).toFixed(1)}M
          </div>
          <p className="room-card-price-unit">/tháng</p>
        </div>

        {/* Amenities */}
        <div className="room-card-amenities">
          {room.amenities.slice(0, 3).map((amenity, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="room-card-amenity"
            >
              {amenity}
            </Badge>
          ))}
          {room.amenities.length > 3 && (
            <Badge variant="outline" className="room-card-amenity">
              +{room.amenities.length - 3}
            </Badge>
          )}
        </div>

        {/* CTA Button */}
        <Link href={`/rooms/${room.id}`} className="room-card-link">
          <Button
            variant="default"
            size="sm"
            className="room-card-button"
            disabled={room.status === "booked"}
          >
            Xem Chi Tiết
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
