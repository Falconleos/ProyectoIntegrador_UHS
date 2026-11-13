package com.example.ultimate_hotel_software_v30.controller;

import com.example.ultimate_hotel_software_v30.dto.request.RoomAttentionDTORequest;
import com.example.ultimate_hotel_software_v30.dto.response.RoomAttentionDTOResponse;
import com.example.ultimate_hotel_software_v30.service.RoomAttentionService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/private/room-attentions")
@RequiredArgsConstructor
public class RoomAttentionController {

    private final RoomAttentionService roomAttentionService;

    // --- NUEVO: Obtiene TODAS las atenciones del sistema (Para la vista global de Servicio al Cuarto) ---
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST')")
    public ResponseEntity<List<RoomAttentionDTOResponse>> getAllAttentions() {
        return ResponseEntity.ok(roomAttentionService.getAllAttentions());
    }

    // Permitimos a ADMIN, RECEPCIONIST y GUEST consultar los consumos de una reserva específica
    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST', 'GUEST', 'ROLE_GUEST')")
    public ResponseEntity<List<RoomAttentionDTOResponse>> getAttentionsByBookingId(@PathVariable Long bookingId) {
        return ResponseEntity.ok(roomAttentionService.getAttentionsByBookingId(bookingId));
    }

    // Permitir a Administradores, Recepcionistas y Huéspedes registrar un consumo o servicio
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST', 'GUEST', 'ROLE_GUEST')")
    public ResponseEntity<RoomAttentionDTOResponse> addAttention(@Valid @RequestBody RoomAttentionDTORequest request) {
        RoomAttentionDTOResponse response = roomAttentionService.addAttention(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Solo Administradores y Recepcionistas pueden eliminar cargos
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST')")
    public ResponseEntity<Void> removeAttention(@PathVariable Long id) {
        roomAttentionService.removeAttention(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deliver")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST')")
    @Operation(summary = "Marcar una atención o consumo como entregado")
    public ResponseEntity<RoomAttentionDTOResponse> markAsDelivered(@PathVariable Long id) {
        return ResponseEntity.ok(roomAttentionService.markAsDelivered(id));
    }
}