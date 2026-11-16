package com.example.ultimate_hotel_software_v30.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "Datos requeridos para actualizar la contraseña de un usuario por ID sin requerir la actual")
public class UpdatePasswordByAdminDTORequest {

    @Schema(
            description = "La nueva contraseña que se le asignará al usuario",
            example = "NewPassword123",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotBlank(message = "new password is necessary")
    @Size(min = 1, message = "La contraseña debe tener al menos 1 carácter")
    private String newPassword;
}