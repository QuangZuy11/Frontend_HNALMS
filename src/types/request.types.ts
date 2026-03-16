// Request types

export interface RoomType {
  _id?: string;
  typeName: string;
  currentPrice: number;
  personMax?: number;
  description?: string;
}

export interface Floor {
  _id?: string;
  name: string;
}

export interface Room {
  _id: string;
  name: string;
  roomCode?: string;
  status?: string;
  isActive?: boolean;
  floorId?: Floor | null;
  roomTypeId?: RoomType | null;
}

export interface User {
  _id: string;
  username: string;
  fullname?: string | null;
  email: string;
  phoneNumber?: string;
}

export interface Proration {
  oldRoomPrice: number;
  newRoomPrice: number;
  daysRemainingInMonth: number;
  oldRoomRefund: number;
  newRoomCharge: number;
  difference: number;
}

export interface TransferRequest {
  _id: string;
  requestCode?: string;
  tenantId?: User | null;
  contractId?: string;
  currentRoomId?: Room | null;
  targetRoomId?: Room | null;
  newContractId?: string;
  reason?: string;
  transferDate?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
  managerNote?: string;
  rejectReason?: string;
  completedAt?: string | null;
  prorationNote?: string;
  proration?: Proration;
  createdAt: string;
  updatedAt?: string;
}

export interface AvailableRoomsResponse {
  currentContract: {
    _id: string;
    roomId: string;
    tenantId: string;
    status: string;
  };
  availableRooms: Room[];
}

export interface TransferRequestFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransferRequestResponse {
  success: boolean;
  message: string;
  data?: TransferRequest | TransferRequest[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}
