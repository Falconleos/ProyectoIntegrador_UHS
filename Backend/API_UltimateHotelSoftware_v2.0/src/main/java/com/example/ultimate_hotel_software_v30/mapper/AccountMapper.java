package com.example.ultimate_hotel_software_v30.mapper;

import com.example.ultimate_hotel_software_v30.dto.response.AccountDTOResponse;
import com.example.ultimate_hotel_software_v30.model.AccountEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {PaymentMapper.class})
public interface AccountMapper {

    @Mapping(target = "bookingId", source = "bookingEntity.id")
    @Mapping(target = "checkInDate", source = "bookingEntity.checkIn")
    @Mapping(target = "checkOutDate", source = "bookingEntity.checkOut")
    @Mapping(target = "roomNumber", source = "bookingEntity.roomEntity.number")
    @Mapping(target = "user.name", expression = "java(accountEntity.getBookingEntity() != null && accountEntity.getBookingEntity().getUserEntity() != null ? accountEntity.getBookingEntity().getUserEntity().getName() : (accountEntity.getBookingEntity() != null ? accountEntity.getBookingEntity().getGuestFirstName() : null))")
    @Mapping(target = "user.surname", expression = "java(accountEntity.getBookingEntity() != null && accountEntity.getBookingEntity().getUserEntity() != null ? accountEntity.getBookingEntity().getUserEntity().getSurname() : (accountEntity.getBookingEntity() != null ? accountEntity.getBookingEntity().getGuestLastName() : null))")
    @Mapping(target = "user.dni", expression = "java(accountEntity.getBookingEntity() != null && accountEntity.getBookingEntity().getUserEntity() != null ? accountEntity.getBookingEntity().getUserEntity().getDni() : null)")
    @Mapping(target = "state", expression = "java(accountEntity.getState() != null ? accountEntity.getState().name() : null)")
    AccountDTOResponse toAccountDTOResponse(AccountEntity accountEntity);

}