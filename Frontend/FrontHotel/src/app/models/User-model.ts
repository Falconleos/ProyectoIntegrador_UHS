export type RoleType = 'ADMIN' | 'RECEPCIONIST' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'RELIEF_STAFF' | 'GUEST';

export interface UserDtoResponse {
  id: number;
  username: string;
  name: string;
  surname: string;
  dni: string;
  gender?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  birthDay: string; 
  createAt?: string;
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
  enabled?: boolean;
  profilePicture?: string;
  role:RoleType
}

export interface UserDtoRequest {
  username: string;
  password?: string;
  name: string;
  surname: string;
  dni: string;
  gender?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  birthDay: string; 
}

export interface UserDtoRequestCreation {
  username: string;
  password?: string;
  name: string;
  surname: string;
  dni: string;
  gender?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  birthDay?: string; 
  role: RoleType;   
  profilePictureFile?: File; 
  enabled?: boolean; 
}