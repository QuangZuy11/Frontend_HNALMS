"use client";
import { useState, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import { roomService } from "../../../../services/roomService";
import "./Room-filters.css";

// Interfaces
interface Floor {
  _id: string;
  name: string;
}

interface RoomType {
  _id: string;
  typeName: string;
  price?: number;
  currentPrice?: number;
}

interface RoomFiltersProps {
  selectedFloors: string[];
  onFloorsChange: (floors: string[]) => void;
  selectedRoomTypes: string[];
  onRoomTypesChange: (roomTypes: string[]) => void;
  selectedStatus: string[];
  onStatusChange: (status: string[]) => void;
  onResetFilters: () => void;
}

// Helper to format price short (e.g. 5000000 -> 5tr)
const formatPriceShort = (price?: number) => {
  if (!price) return "";
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1).replace(/\.0$/, "")}tr`;
  }
  return `${(price / 1000).toFixed(0)}k`;
};

// ... (Button, Card components unchanged) ...

// ... (Inside the component, update the Room Type mapping) ...

// Button Component
function Button({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  // Changed base class from "button" to "rf-button"
  const classes = [
    "rf-button",
    `rf-button-${variant}`,
    `rf-button-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Comp data-slot="button" className={classes} {...props} />;
}

// Card Components
function Card({ className = "", ...props }) {
  // Changed "card" to "rf-card"
  return <div className={`rf-card ${className}`} {...props} />;
}

function CardHeader({ className = "", ...props }) {
  // Changed "card-header" to "rf-card-header"
  return <div className={`rf-card-header ${className}`} {...props} />;
}

function CardTitle({ className = "", ...props }) {
  // Changed "card-title" to "rf-card-title"
  return <h3 className={`rf-card-title ${className}`} {...props} />;
}

function CardContent({ className = "", ...props }) {
  // Changed "card-content" to "rf-card-content"
  return <div className={`rf-card-content ${className}`} {...props} />;
}

// Checkbox Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Checkbox({
  id,
  checked,
  onCheckedChange,
  className = "",
  ...props
}: any) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      // Changed "checkbox" to "rf-checkbox"
      className={`rf-checkbox ${className}`}
      {...props}
    />
  );
}

// Radio Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Radio({
  id,
  checked,
  onCheckedChange,
  name,
  className = "",
  ...props
}: any) {
  return (
    <input
      type="radio"
      id={id}
      name={name}
      checked={checked}
      onChange={() => {}} // Required for controlled component
      onClick={() => onCheckedChange?.(!checked)} // Allow toggle on click
      className={`rf-radio ${className}`}
      {...props}
    />
  );
}

// Label Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Label({ htmlFor, className = "", ...props }: any) {
  return (
    // Changed "label" to "rf-label"
    <label htmlFor={htmlFor} className={`rf-label ${className}`} {...props} />
  );
}

// RoomFilters Component
export default function RoomFilters({
  selectedFloors,
  onFloorsChange,
  selectedRoomTypes,
  onRoomTypesChange,
  selectedStatus,
  onStatusChange,
  onResetFilters,
}: RoomFiltersProps) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  const fetchFiltersData = async () => {
    try {
      const [floorsData, roomTypesData, roomsData] = await Promise.all([
        roomService.getFloors(),
        roomService.getRoomTypes(),
        roomService.getRooms(), // Fetch rooms to get prices
      ]);
      setFloors(floorsData.data || []);

      const rawRoomTypes = roomTypesData.data || [];
      const rooms = roomsData.data || [];

      // Map prices to room types based on actual room data or room type definition
      const roomTypesWithPrice = rawRoomTypes.map((rt: any) => {
        // First try to use currentPrice from room type
        if (
          rt.currentPrice !== undefined &&
          rt.currentPrice !== null &&
          rt.currentPrice > 0
        ) {
          return {
            ...rt,
            price: rt.currentPrice,
          };
        }

        // Then try price field
        if (rt.price !== undefined && rt.price !== null && rt.price > 0) {
          return rt;
        }

        // Fallback: Find a room of this type to get the price
        const matchingRoom = rooms.find(
          (r: any) =>
            r.roomType?._id === rt._id ||
            r.roomTypeId?._id === rt._id ||
            r.roomTypeId === rt._id,
        );
        return {
          ...rt,
          price: matchingRoom?.price || matchingRoom?.currentPrice || 0,
        };
      });

      // Sort by type name ascending (Loại 1 -> Loại 2 ...)
      roomTypesWithPrice.sort((a: any, b: any) =>
        a.typeName.localeCompare(b.typeName, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      console.log("Room types with price:", roomTypesWithPrice);
      setRoomTypes(roomTypesWithPrice);
    } catch (error) {
      console.error("Error fetching filters data:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchFiltersData();
  }, []);

  const handleFloorToggle = (floorId: string) => {
    // Single selection mode - floor always has a value (default to first floor)
    if (floorId === "all") {
      // Reset to first floor instead of empty
      if (floors.length > 0) {
        onFloorsChange([floors[0]._id]);
      }
    } else {
      if (selectedFloors.includes(floorId)) {
        // If clicking the selected floor, go back to first floor (Tầng 1)
        if (floors.length > 0) {
          onFloorsChange([floors[0]._id]);
        }
      } else {
        onFloorsChange([floorId]); // Select only this one
      }
    }
  };

  const handleRoomTypeToggle = (roomTypeId: string) => {
    // Single selection mode logic
    if (selectedRoomTypes.includes(roomTypeId)) {
      // If clicking the currently selected one, deselect it (optional, allows 0 selection)
      onRoomTypesChange([]);
    } else {
      // Select strictly one
      onRoomTypesChange([roomTypeId]);
    }
  };

  const handleStatusToggle = (status: string) => {
    if (status === "all") {
      onStatusChange([]);
    } else {
      if (selectedStatus.includes(status)) {
        onStatusChange(selectedStatus.filter((s: string) => s !== status));
      } else {
        onStatusChange([...selectedStatus, status]);
      }
    }
  };

  return (
    <div className="rf-sticky-container">
      <Card>
        <CardHeader className="rf-filter-header">
          <CardTitle className="rf-filter-title">TẦNG</CardTitle>
        </CardHeader>
        <CardContent className="rf-checkbox-group">
          {floors.map((floor) => (
            <div key={floor._id} className="rf-checkbox-item">
              <Radio
                id={`floor-${floor._id}`}
                name="floorGroup"
                checked={selectedFloors.includes(floor._id)}
                onCheckedChange={() => handleFloorToggle(floor._id)}
              />
              <Label
                htmlFor={`floor-${floor._id}`}
                className="rf-checkbox-label"
              >
                {floor.name}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="rf-filter-header">
          <CardTitle className="rf-filter-title">LOẠI PHÒNG</CardTitle>
        </CardHeader>
        <CardContent className="rf-checkbox-group">
          {roomTypes.map((roomType) => (
            <div key={roomType._id} className="rf-checkbox-item">
              <Radio
                id={`roomtype-${roomType._id}`}
                name="roomTypeGroup"
                checked={selectedRoomTypes.includes(roomType._id)}
                onCheckedChange={() => handleRoomTypeToggle(roomType._id)}
              />
              <Label
                htmlFor={`roomtype-${roomType._id}`}
                className="rf-checkbox-label"
              >
                {roomType.typeName}{" "}
                <span style={{ opacity: 1, fontWeight: 500 }}>
                  {roomType.price
                    ? `(${formatPriceShort(roomType.price)})`
                    : ""}
                </span>
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="rf-filter-header">
          <CardTitle className="rf-filter-title">TÌNH TRẠNG</CardTitle>
        </CardHeader>
        <CardContent className="rf-checkbox-group">
          <div className="rf-checkbox-item">
            <Checkbox
              id="status-available"
              checked={selectedStatus.includes("Available")}
              onCheckedChange={() => handleStatusToggle("Available")}
            />
            <Label htmlFor="status-available" className="rf-checkbox-label">
              Phòng trống
            </Label>
          </div>
          <div className="rf-checkbox-item">
            <Checkbox
              id="status-occupied"
              checked={selectedStatus.includes("Occupied")}
              onCheckedChange={() => handleStatusToggle("Occupied")}
            />
            <Label htmlFor="status-occupied" className="rf-checkbox-label">
              Đang thuê
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="rf-reset-button"
        onClick={onResetFilters}
      >
        Xóa Bộ Lọc
      </Button>
    </div>
  );
}
