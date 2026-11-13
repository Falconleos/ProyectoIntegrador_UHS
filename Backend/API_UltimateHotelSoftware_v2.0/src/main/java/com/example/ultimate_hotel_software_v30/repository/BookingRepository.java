package com.example.ultimate_hotel_software_v30.repository;

import com.example.ultimate_hotel_software_v30.enums.BookingState;
import com.example.ultimate_hotel_software_v30.model.BookingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingEntity,Long> {

    List<BookingEntity> findByActive(Boolean active);
    boolean existsByRoomEntity_Id(Long roomId);
    List<BookingEntity> findByState(BookingState state);
    Optional<BookingEntity> findByQrBooking(String qrBooking);

    @Query("SELECT b FROM BookingEntity b WHERE b.userEntity.username = :username OR b.userBookingEntity.username = :username")
    List<BookingEntity> findByUsername(@Param("username") String username);

    // --- NUEVO: Buscar por estado filtrando además por el usuario actual ---
    @Query("SELECT b FROM BookingEntity b WHERE b.state = :state AND (b.userEntity.username = :username OR b.userBookingEntity.username = :username)")
    List<BookingEntity> findByStateAndUsername(@Param("state") BookingState state, @Param("username") String username);
}