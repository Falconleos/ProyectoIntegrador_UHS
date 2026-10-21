export type BookingState = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'CONCLUDED' 
  | 'NO_SHOW' 
  | 'CANCELLED' 
  | 'INTERRUPTED' 
  | string;


export interface BookingDtoRequest {
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestFirstName: string;  
  guestLastName: string;  
  guestPhone: string;      
  userId?: number | null; 
  observation?: string;
  roomId: number;
  totalPrice: number;   
}

export interface BookingDtoResponse {
  id: number;
  checkIn: string;        
  checkOut: string;       
  guestCount: number;
  state: BookingState;
  guestFirstName: string;
  guestLastName: string;
  guestPhone: string;
  
  name?: string;
  surname?: string;
  username?: string;

  qrBooking?: string;
  observation?: string;

  userBookingUsername?: string;
  userCheckInUsername?: string;

  roomNumber: number; 
  totalPrice: number;
  createdAt: string;       
}

export interface BookingCancellationDtoRequest {
  bookingId: number; 
  reason?: string;
  issueCreditNote?: boolean; 
}

export interface BookingCancellationDtoResponse {
  id: number;
  bookingId: number;
  nombreApellido: string;
  employeeUsername: string;
  cancellationDate: string;
  reason: string;
}