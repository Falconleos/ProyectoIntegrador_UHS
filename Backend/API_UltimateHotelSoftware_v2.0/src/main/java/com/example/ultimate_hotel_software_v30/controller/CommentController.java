package com.example.ultimate_hotel_software_v30.controller;

import com.example.ultimate_hotel_software_v30.dto.request.CommentDTORequest;
import com.example.ultimate_hotel_software_v30.dto.response.CommentDTOResponse;
import com.example.ultimate_hotel_software_v30.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.ultimate_hotel_software_v30.model.UserEntity;
import com.example.ultimate_hotel_software_v30.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@RestController
@RequestMapping("/private/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@Tag(name = "GestionComentarios", description = "Endpoints para la gestión de valoraciones y comentarios")
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('GUEST', 'ADMIN', 'ROLE_GUEST', 'ROLE_ADMIN','RECEPCIONIST')")
    @Operation(summary = "Crear un comentario", description = "Permite a un usuario comentar y valorar (1-5).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Comentario creado con éxito"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos")
    })
    public ResponseEntity<CommentDTOResponse> createComment(
            @Valid @RequestBody CommentDTORequest request) {
        CommentDTOResponse response = commentService.createComment(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Listar todos los comentarios (Admin/Receptionist)")
    public ResponseEntity<List<CommentDTOResponse>> getAllComments() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String username = authentication.getName();
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        boolean isAdminOrReceptionist = user.getRoles().stream()
                .anyMatch(r -> r.getRole().name().equalsIgnoreCase("ADMIN") ||
                        r.getRole().name().equalsIgnoreCase("RECEPCIONIST"));

        if (isAdminOrReceptionist) {
            return ResponseEntity.ok(commentService.getAllComments());
        } else {
            return ResponseEntity.ok(commentService.getMyComments());
        }
    }

    @GetMapping("/my-comments")
    @PreAuthorize("hasAnyAuthority('GUEST', 'ROLE_GUEST')")
    @Operation(summary = "Listar los comentarios propios del usuario logueado")
    public ResponseEntity<List<CommentDTOResponse>> getMyComments() {
        return ResponseEntity.ok(commentService.getMyComments());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Eliminar un comentario")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('GUEST', 'ADMIN', 'ROLE_GUEST', 'ROLE_ADMIN')")
    @Operation(summary = "Actualizar un comentario", description = "Permite modificar el contenido o la valoración de un comentario existente (dueño o admin).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Comentario actualizado con éxito"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Comentario no encontrado")
    })
    public ResponseEntity<CommentDTOResponse> updateComment(
            @PathVariable Long id,
            @Valid @RequestBody CommentDTORequest request) {
        CommentDTOResponse response = commentService.updateComment(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/visible")
    @Operation(summary = "Listar comentarios visibles (Público)", description = "Devuelve únicamente los comentarios aprobados por el administrador (showable = true).")
    public ResponseEntity<List<CommentDTOResponse>> getVisibleComments() {
        return ResponseEntity.ok(commentService.getVisibleComments());
    }

    @PatchMapping("/admin/{id}/toggle-visibility")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Cambiar visibilidad de un comentario (Admin)", description = "Permite al administrador alternar el estado 'showable' de un comentario.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Visibilidad actualizada con éxito"),
            @ApiResponse(responseCode = "404", description = "Comentario no encontrado")
    })
    public ResponseEntity<CommentDTOResponse> toggleCommentVisibility(@PathVariable Long id) {
        CommentDTOResponse response = commentService.toggleCommentVisibility(id);
        return ResponseEntity.ok(response);
    }
}