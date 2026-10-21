import{BookingDtoResponse} from './Booking-model'
import{UserDtoResponse}from'./User-model'
import{EmployeeDtoResponse}from'./Employee-model'

export type CheckInState = 'CURRENTLY_ACTIVE' | 'COMPLETED' | 'INTERRUPTED' | string;

export interface CheckInDtoResponse {
  id: number;
  booking?: BookingDtoResponse;
  user?: UserDtoResponse;
  employee?: EmployeeDtoResponse;
  checkInState: CheckInState;
  total: number;
  paid: boolean;
  active: boolean;
}