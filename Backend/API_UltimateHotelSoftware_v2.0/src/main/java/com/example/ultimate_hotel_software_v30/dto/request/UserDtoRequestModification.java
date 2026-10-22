package com.example.ultimate_hotel_software_v30.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserDtoRequestModification {

    @NotBlank(message = "El nombre de usuario es obligatorio")
    private String username;

    @NotBlank(message = "El nombre es obligatorio")
    private String name;

    @NotBlank(message = "El apellido es obligatorio")
    private String surname;

    @NotBlank(message = "El DNI es obligatorio")
    private String dni;

    private String gender;

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "Debe ser un formato de correo válido")
    private String email;

    private String phoneNumber;

    private String address;

    private String birthDay;
}