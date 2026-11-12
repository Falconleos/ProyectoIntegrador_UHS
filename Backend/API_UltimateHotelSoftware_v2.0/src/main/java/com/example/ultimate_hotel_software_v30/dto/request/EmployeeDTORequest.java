package com.example.ultimate_hotel_software_v30.dto.request;

import com.example.ultimate_hotel_software_v30.enums.Shift;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.LocalDate;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class EmployeeDTORequest {

    private Long userId;

    // --- CAMPOS DE USUARIO ---
    private String username;
    private String name;
    private String surname;
    private String dni;
    private String gender;
    private String email;
    private String phoneNumber;
    private String address;
    private String birthDay;

    // --- CAMPOS LABORALES ---
    private String employeeNumber;
    private String emergencyPhoneNumber;

    @NotNull(message = "hire date is required")
    private LocalDate hireDate;

    @NotNull(message = "Shift is required")
    private Shift shift;

    @NotNull(message = "Salary is required")
    @Positive(message = "Salary must be a positive number greater than zero")
    private Double salary;
}