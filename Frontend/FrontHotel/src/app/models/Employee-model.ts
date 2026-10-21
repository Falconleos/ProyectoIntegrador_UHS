export type RoleType = 'ADMIN' | 'RECEPCIONIST' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'RELIEF_STAFF' | 'GUEST';
export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | string;

export interface EmployeeDtoResponse {
  id: number;
  emergencyPhoneNumber: string;
  employeeNumber: string;
  hireDate: string;
  shift: ShiftType;
  salary: number;
  username: string;
  name: string;
  surname: string;
  email: string;
}

export interface EmployeeDtoRequest {
  userId: number;
  employeeNumber?: string;
  emergencyPhoneNumber?: string;
  hireDate: string; // Formato 'yyyy-MM-dd' (LocalDate de Java)
  shift: ShiftType;
  salary: number;
}

export interface EmployeeCreateUnifiedDTO {
  // Datos del Usuario
  username: string;
  password?: string;
  name: string;
  surname: string;
  dni: string;
  gender?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  birthDay?: string; // Formato 'yyyy-MM-dd'
  role: RoleType;
  profilePictureFile?: File;
  enabled?: boolean;

  // Datos del Empleado
  employeeNumber?: string;
  emergencyPhoneNumber?: string;
  hireDate?: string; // Formato 'yyyy-MM-dd'
  shift: ShiftType;
  salary: number;
}