export interface Room {
  _id: string;
  roomCode: string;
  title: string;
  floor: number;
  floorLabel: string;
  status: "Trống" | "Đã thuê" | "Bảo trì";
  description?: string;
  price: number;
  priceLabel: string;
  area: number;
  capacity: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomListParams {
  status?: string;
  floor?: string;
  priceRange?: string;
}
