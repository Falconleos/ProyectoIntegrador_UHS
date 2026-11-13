export interface ItemDtoResponse {
  id: number;
  description: string;
  unitPrice: number;
  isService: boolean;
  quantity: number;
}

export interface RoomAttentionDtoRequest {
  bookingId: number;
  itemId: number;
  quantity: number;
}

export interface RoomAttentionDtoResponse {
  id: number;
  bookingId: number;
  itemId: number;
  itemDTOResponse: ItemDtoResponse;
  isService: boolean;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  employeeUsername: string;
  roomNumber?: string; // Opcional por si el back no lo trae
  delivered: boolean;
}