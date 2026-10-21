export interface RoomDtoResponse {
  id: number;
  number: string;
  state: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  roomTypeDTOResponse?: {
    id: number;
    name: string;
    capacity: number;
    pricePerNight: number;
  };
  roomTypeName?: string;
  capacity?: number;
  pricePerNight?: number;
  imagesCount?: number;
  images?: any[]; // Permite recibir cualquier formato que mande el backend de forma segura
}

export interface RoomDTORequest {
  number: number;
  roomTypeId: number;
  state?: string;
  images?: File[]; // Este campo permite enviar la lista de imágenes
}

