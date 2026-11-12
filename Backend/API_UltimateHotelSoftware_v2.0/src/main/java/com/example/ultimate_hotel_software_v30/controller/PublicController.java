package com.example.ultimate_hotel_software_v30.controller;

import com.example.ultimate_hotel_software_v30.dto.response.CommentDTOResponse;
import com.example.ultimate_hotel_software_v30.model.UserEntity;
import com.example.ultimate_hotel_software_v30.repository.UserRepository;
import com.example.ultimate_hotel_software_v30.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@Tag(name = "ControladorPublico", description = "Endpoints públicos generales para la landing page y visitantes")
public class PublicController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    @GetMapping("/comments/visible")
    @Operation(summary = "Listar comentarios visibles", description = "Devuelve únicamente los comentarios aprobados por el administrador (showable = true) para la landing.")
    public ResponseEntity<List<CommentDTOResponse>> getVisibleComments() {
        return ResponseEntity.ok(commentService.getVisibleComments());
    }

    @GetMapping("/users/username/{username}/profile-picture")
    @Operation(summary = "Obtener foto de perfil por username", description = "Permite obtener la imagen binaria de perfil de cualquier usuario mediante su username de forma pública.")
    public ResponseEntity<byte[]> getProfilePictureByUsername(@PathVariable String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

        if (user.getProfilePicture() == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(user.getProfilePicture());
    }
}