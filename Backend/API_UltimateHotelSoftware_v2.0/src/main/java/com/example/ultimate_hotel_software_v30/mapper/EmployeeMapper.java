package com.example.ultimate_hotel_software_v30.mapper;

import com.example.ultimate_hotel_software_v30.dto.request.EmployeeDTORequest;
import com.example.ultimate_hotel_software_v30.dto.response.EmployeeDTOResponse;
import com.example.ultimate_hotel_software_v30.model.EmployeeEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "emergencyPhoneNumber", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    EmployeeEntity toEmployeeEntity(EmployeeDTORequest request);

    @Mapping(target = "username", source = "userEntity.username")
    @Mapping(target = "name", source = "userEntity.name")
    @Mapping(target = "surname", source = "userEntity.surname")
    @Mapping(target = "email", source = "userEntity.email")
    // --- NUEVOS CAMPOS DE USUARIO MAPEADOS ---
    @Mapping(target = "dni", source = "userEntity.dni")
    @Mapping(target = "gender", source = "userEntity.gender")
    @Mapping(target = "phoneNumber", source = "userEntity.phoneNumber")
    @Mapping(target = "address", source = "userEntity.address")
    @Mapping(target = "birthDay", source = "userEntity.birthDay")
    EmployeeDTOResponse toEmployeeDTOResponse(EmployeeEntity entity);

}