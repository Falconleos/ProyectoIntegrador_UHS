package com.example.ultimate_hotel_software_v30.service.serviceImpl;

import com.example.ultimate_hotel_software_v30.dto.response.BookingCancellationDTOResponse;
import com.example.ultimate_hotel_software_v30.exceptions.InvalidIdException;
import com.example.ultimate_hotel_software_v30.mapper.BookingCancellationMapper;
import com.example.ultimate_hotel_software_v30.model.BookingCancellationEntity;
import com.example.ultimate_hotel_software_v30.repository.BookingCancellationRepository;
import com.example.ultimate_hotel_software_v30.service.BookingCancellationService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingCancellationServiceImpl implements BookingCancellationService {

    private final BookingCancellationRepository repository;
    private final BookingCancellationMapper mapper;

    // 1. Búsqueda por ID
    // 1.1. Devuelve entidad
    @Override
    @Transactional(readOnly = true)
    public BookingCancellationEntity findEntityById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new InvalidIdException("Invalid cancellation ID: " + id));
    }

    // 1.2. Devuelve DTOResponse
    @Override
    @Transactional(readOnly = true)
    public BookingCancellationDTOResponse findById(Long id) {
        return mapper.toBookingCancellationDTOResponse(findEntityById(id));
    }

    // 2. Listar cancelaciones
    // 2.1. Listar historial completo de cancelaciones
    @Override
    @Transactional(readOnly = true)
    public List<BookingCancellationDTOResponse> getCancellationHistory() {
        List<BookingCancellationEntity> cancellations = repository.findAll();
        return cancellations.stream()
                .map(mapper::toBookingCancellationDTOResponse)
                .toList();
    }

    // 2.2. Listar cancelaciones filtrando por el apellido del huésped principal
    @Override
    @Transactional(readOnly = true)
    public List<BookingCancellationDTOResponse> findByGuestLastName(String lastName) {
        List<BookingCancellationEntity> cancellations = repository.findAll();
        return cancellations.stream()
                .filter(c -> c.getBooking().getGuestLastName().toLowerCase().contains(lastName.toLowerCase()))
                .map(mapper::toBookingCancellationDTOResponse)
                .toList();
    }

    // 3. Crear registro de cancelación física
    @Override
    @Transactional
    public BookingCancellationEntity create(BookingCancellationEntity cancellation) {
        System.out.println("[CANCELLATION SERVICE DEBUG] --------------------------------");
        System.out.println("[CANCELLATION SERVICE DEBUG] Iniciando create().");
        System.out.println("[CANCELLATION SERVICE DEBUG] cancellation.getId() = " + cancellation.getId());

        if (cancellation.getBooking() != null) {
            System.out.println("[CANCELLATION SERVICE DEBUG] cancellation.getBooking().getId() = " + cancellation.getBooking().getId());
        } else {
            System.out.println("[CANCELLATION SERVICE DEBUG] ¡ADVERTENCIA! cancellation.getBooking() es NULL.");
        }

        if (cancellation.getBooking() != null && cancellation.getBooking().getId() != null) {
            Long bookingId = cancellation.getBooking().getId();

            if (repository.existsByBookingId(bookingId)) {
                System.out.println("[CANCELLATION SERVICE DEBUG] Validación fallida: ya existe cancelación para bookingId: " + bookingId);
                throw new IllegalStateException("La reserva con ID " + bookingId + " ya se encuentra cancelada.");
            }
        }

        cancellation.setCancellationDate(LocalDateTime.now());

        try {
            BookingCancellationEntity saved = repository.save(cancellation);
            System.out.println("[CANCELLATION SERVICE DEBUG] ¡Guardado exitoso! ID de cancelación guardado: " + saved.getId());
            return saved;
        } catch (DataIntegrityViolationException e) {
            Long bookingId = cancellation.getBooking() != null ? cancellation.getBooking().getId() : null;
            System.err.println("[CANCELLATION SERVICE ERROR] DataIntegrityViolationException al intentar guardar la cancelación para bookingId: " + bookingId);
            e.printStackTrace();
            throw new IllegalStateException("Ya existe un registro físico de cancelación para la reserva con ID " + bookingId + ".");
        }
    }

    // 4. Depurar historial de cancelaciones de más de un mes de antigüedad
    @Override
    @Transactional
    public void purgeCancellationHistory() {
        LocalDateTime oneMonthAgo = LocalDateTime.now().minusMonths(1);

        List<BookingCancellationEntity> oldCancellations = repository.findAll().stream()
                .filter(c -> c.getCancellationDate().isBefore(oneMonthAgo))
                .toList();

        repository.deleteAllInBatch(oldCancellations);
    }

}