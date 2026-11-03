export interface RoomDtoResponse {
  id: number;
  number: number;
  state: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'|'CLEANING';
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

export type RoomUpdateDTORequest =
  Pick<RoomDTORequest, 'number' | 'roomTypeId'>;

