"use client";
import { Slot } from "@radix-ui/react-slot";
import "./Room-filters.css";

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

// Card Components
function Card({ className = "", ...props }) {
  return <div className={`card ${className}`} {...props} />;
}

function CardHeader({ className = "", ...props }) {
  return <div className={`card-header ${className}`} {...props} />;
}

function CardTitle({ className = "", ...props }) {
  return <h3 className={`card-title ${className}`} {...props} />;
}

function CardContent({ className = "", ...props }) {
  return <div className={`card-content ${className}`} {...props} />;
}

// Checkbox Component
function Checkbox({ id, checked, onCheckedChange, className = "", ...props }) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={`checkbox ${className}`}
      {...props}
    />
  );
}

// Label Component
function Label({ htmlFor, className = "", ...props }) {
  return (
    <label htmlFor={htmlFor} className={`label ${className}`} {...props} />
  );
}

// Slider Component
function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  className = "",
  ...props
}) {
  return (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      min={min}
      max={max}
      step={step}
      className={`slider ${className}`}
      {...props}
    />
  );
}

// Select Components - Simplified to avoid DOM nesting errors
function Select({ value, onValueChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`select ${className}`}
    >
      {children}
    </select>
  );
}

function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}

// RoomFilters Component
export default function RoomFilters({
  priceRange,
  onPriceRangeChange,
  selectedFloor,
  onFloorChange,
  minArea,
  onMinAreaChange,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  sortBy,
  onSortByChange,
}) {
  const handleResetFilters = () => {
    onPriceRangeChange([3000000, 5000000]);
    onFloorChange(null);
    onMinAreaChange(30);
    onShowAvailableOnlyChange(false);
    onSortByChange("newest");
  };

  return (
    <div className="sticky-filters">
      {/* Price Filter */}
      <Card>
        <CardHeader className="filter-header">
          <CardTitle className="filter-title">Khoảng Giá</CardTitle>
        </CardHeader>
        <CardContent className="filter-content">
          <Slider
            value={[priceRange[0]]}
            onValueChange={(value) =>
              onPriceRangeChange([value[0], priceRange[1]])
            }
            min={3000000}
            max={5000000}
            step={100000}
            className="room-filter-slider"
          />
          <Slider
            value={[priceRange[1]]}
            onValueChange={(value) =>
              onPriceRangeChange([priceRange[0], value[0]])
            }
            min={3000000}
            max={5000000}
            step={100000}
            className="room-filter-slider"
          />
          <div className="price-range-display">
            <span>{(priceRange[0] / 1000000).toFixed(1)}M</span>
            <span>{(priceRange[1] / 1000000).toFixed(1)}M</span>
          </div>
        </CardContent>
      </Card>

      {/* Floor Filter */}
      <Card>
        <CardHeader className="filter-header">
          <CardTitle className="filter-title">Tầng</CardTitle>
        </CardHeader>
        <CardContent className="checkbox-group">
          {[
            { label: "Tất cả tầng", value: null },
            { label: "Tầng 1 (Nhà xe)", value: 1 },
            { label: "Tầng 2", value: 2 },
            { label: "Tầng 3", value: 3 },
            { label: "Tầng 4", value: 4 },
            { label: "Tầng 5 (Sân thượng)", value: 5 },
          ].map((floor) => (
            <div key={floor.value ?? "all"} className="checkbox-item">
              <Checkbox
                id={`floor-${floor.value ?? "all"}`}
                checked={selectedFloor === floor.value}
                onCheckedChange={() => onFloorChange(floor.value)}
              />
              <Label
                htmlFor={`floor-${floor.value ?? "all"}`}
                className="checkbox-label"
              >
                {floor.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Area Filter */}
      <Card>
        <CardHeader className="filter-header">
          <CardTitle className="filter-title">Diện Tích Tối Thiểu</CardTitle>
        </CardHeader>
        <CardContent className="filter-content">
          <Slider
            value={[minArea]}
            onValueChange={(value) => onMinAreaChange(value[0])}
            min={30}
            max={60}
            step={1}
            className="filter-slider"
          />
          <div className="area-value">{minArea}m²</div>
        </CardContent>
      </Card>

      {/* Availability Filter */}
      <Card>
        <CardHeader className="filter-header">
          <CardTitle className="filter-title">Tình Trạng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="checkbox-item">
            <Checkbox
              id="available-only"
              checked={showAvailableOnly}
              onCheckedChange={(checked) => onShowAvailableOnlyChange(checked)}
            />
            <Label htmlFor="available-only" className="checkbox-label">
              Chỉ hiển thị phòng trống
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Sort Filter */}
      <Card>
        <CardHeader className="filter-header">
          <CardTitle className="filter-title">Sắp Xếp</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={sortBy}
            onValueChange={onSortByChange}
            className="filter-select"
          >
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="price-low">Giá: Thấp đến Cao</SelectItem>
            <SelectItem value="price-high">Giá: Cao đến Thấp</SelectItem>
            <SelectItem value="area-large">Diện tích: Lớn đến Bé</SelectItem>
            <SelectItem value="floor-high">Tầng: Cao đến Thấp</SelectItem>
          </Select>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Button
        variant="outline"
        className="reset-button"
        onClick={handleResetFilters}
      >
        Xóa Bộ Lọc
      </Button>
    </div>
  );
}
