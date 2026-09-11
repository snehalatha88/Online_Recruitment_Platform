package com.recruitment;

import com.recruitment.dto.request.LoginRequest;
import com.recruitment.dto.response.AuthResponse;
import com.recruitment.entity.Role;
import com.recruitment.entity.User;
import com.recruitment.entity.enums.RoleName;
import com.recruitment.entity.enums.UserStatus;
import com.recruitment.repository.CandidateProfileRepository;
import com.recruitment.repository.UserRepository;
import com.recruitment.security.JwtTokenProvider;
import com.recruitment.security.UserPrincipal;
import com.recruitment.service.AuditLogService;
import com.recruitment.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuthService authService;

    private User adminUser;
    private UserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        Role role = Role.builder().id(1L).name(RoleName.ROLE_ADMIN).build();
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .email("admin@recruitment.corp")
                .passwordHash("hashedPass")
                .role(role)
                .status(UserStatus.ACTIVE)
                .build();
        adminPrincipal = UserPrincipal.create(adminUser, null);
    }

    @Test
    void testLoginSuccess() {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("Admin@123")
                .build();

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(adminPrincipal);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(tokenProvider.generateToken(auth)).thenReturn("mock-jwt-token");
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        AuthResponse response = authService.login(request, null);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.getToken());
        assertEquals("admin", response.getUsername());
        assertEquals("ROLE_ADMIN", response.getRole());
    }

    @Test
    void testLoginFailureInvalidCredentials() {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("WrongPassword")
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(request, null));
    }
}
