package com.recruitment.dto.response;

import com.recruitment.entity.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateResponse {

    private Long id;
    private Long userId;
    private String candidateId;
    private String employeeId;
    private String fullName;
    private LocalDate dob;
    private String aadharNumber;
    private String phone;
    private String gender;
    private String department;
    private String designation;
    private String panNumber;
    private String email;
    private String username;
    private UserStatus status;
    private Instant createdAt;
}
