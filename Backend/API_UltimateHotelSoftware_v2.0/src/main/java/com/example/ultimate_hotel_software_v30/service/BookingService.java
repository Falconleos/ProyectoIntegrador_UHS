package com.example.ultimate_hotel_software_v30.service;

import com.example.ultimate_hotel_software_v30.dto.request.BookingCancellationDTORequest;
import com.example.ultimate_hotel_software_v30.dto.request.BookingDTORequest;
import com.example.ultimate_hotel_software_v30.dto.request.PaymentDTORequest;
import com.example.ultimate_hotel_software_v30.dto.response.BookingCancellationDTOResponse;
import com.example.ultimate_hotel_software_v30.dto.response.BookingDTOResponse;
import com.example.ultimate_hotel_software_v30.dto.response.PaymentDTOResponse;
import com.example.ultimate_hotel_software_v30.dto.response.RoomDTOResponse;
import com.example.ultimate_hotel_software_v30.enums.BookingState;
import com.example.ultimate_hotel_software_v30.model.BookingEntity;
import com.example.ultimate_hotel_software_v30.model.RoomEntity;

import java.time.LocalDate;
import java.util.List;

public interface BookingService {
    BookingEntity findEntityById(Long id);

    BookingDTOResponse findById(Long id);

    List<BookingDTOResponse> getBookings(Boolean active);

    // --- Obtener las reservas del usuario autenticado ---
    List<BookingDTOResponse> getMyBookings();

    BookingDTOResponse createBooking(BookingDTORequest request);

    BookingCancellationDTOResponse cancelBooking(BookingCancellationDTORequest request);

    void update(BookingEntity booking);

    BookingDTOResponse confirmBooking(Long id);

    List<RoomEntity> getAvailableRoomsEntities(LocalDate checkIn, LocalDate checkOut, Integer guestCount);

    List<RoomDTOResponse> getAvailableRooms(LocalDate checkIn, LocalDate checkOut, Integer guestCount);

    List<BookingDTOResponse> getCheckInsOfToday();

    List<BookingDTOResponse> getBookingsToConfirmInDays(Integer days);

    void processNoShowBookings();

    boolean existsByRoomId(Long roomId);

    List<BookingDTOResponse> getBookingsByState(BookingState state);

    // --- NUEVO: Filtrar por estado considerando el rol del usuario actual (Admin/Recepcionist vs Guest) ---
    List<BookingDTOResponse> getBookingsByStateForCurrentUser(BookingState state);

    BookingDTOResponse checkInBooking(Long bookingId, String dni);

    BookingDTOResponse assignUserToBooking(Long bookingId, Long userId);

    BookingCancellationDTOResponse interruptStay(BookingCancellationDTORequest request);

    // --- MÉTODOS PARA PAGOS / SEÑAS ---
    List<PaymentDTOResponse> getPaymentsByBookingId(Long bookingId);

    PaymentDTOResponse addPaymentToBooking(PaymentDTORequest request);

    BookingDTOResponse checkInByQr(String qrBooking);
}