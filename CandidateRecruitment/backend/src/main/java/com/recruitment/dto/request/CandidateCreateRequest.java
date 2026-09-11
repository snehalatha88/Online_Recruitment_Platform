package com.recruitment.dto.request;

import com.recruitment.entity.enums.UserStatus;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateCreateRequest {

    @NotBlank(message = "Candidate ID is required")
    @Size(min = 3, max = 50, message = "Candidate ID must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Candidate ID must contain only alphanumeric characters, hyphens, and underscores")
    private String candidateId;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters")
    @Pattern(regexp = "^[a-zA-Z\\s.'-]+$", message = "Full name can only contain letters, spaces, dots, and hyphens")
    private String fullName;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be a past date")
    private LocalDate dob;

    @NotBlank(message = "Institute is required")
    @Size(min = 2, max = 100, message = "Institute must be between 2 and 100 characters")
    private String department;

    @NotBlank(message = "Aadhar number is required")
    @Pattern(regexp = "^[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}$|^[0-9]{12}$", message = "Aadhar number must be a valid 12-digit numeric number (e.g. 1234 5678 9012 or 123456789012)")
    private String aadharNumber;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^(\\+91[\\-\\s]?)?[0-9]{10}$|^[0-9]{10}$", message = "Phone number must be a valid 10-digit numeric mobile number without letters (e.g. 9876543210 or +91 9876543210)")
    private String phone;

    @NotBlank(message = "Gender is required")
    @Pattern(regexp = "^(?i)(MALE|FEMALE|OTHER)$", message = "Gender must be Male, Female, or Other")
    private String gender;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Username must contain only alphanumeric characters, dots, underscores, and hyphens")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 4, max = 100, message = "Password must be at least 4 characters")
    private String password;

    @NotBlank(message = "Role / Designation is required")
    @Size(min = 2, max = 100, message = "Role / Designation must be between 2 and 100 characters")
    private String designation;

    @Pattern(regexp = "^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "PAN Number must be a valid 10-character PAN format (e.g. ABCDE1234F)")
    private String panNumber;

    @Pattern(regexp = "^$|^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", message = "Please provide a valid email address")
    private String email;

    @Size(max = 50, message = "Employee ID must not exceed 50 characters")
    private String employeeId;

    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;
}
