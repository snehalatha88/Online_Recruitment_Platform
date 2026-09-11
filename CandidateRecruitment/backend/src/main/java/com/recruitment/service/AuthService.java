package com.recruitment.service;

import com.recruitment.dto.request.LoginRequest;
import com.recruitment.dto.response.AuthResponse;
import com.recruitment.entity.CandidateProfile;
import com.recruitment.entity.User;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.CandidateProfileRepository;
import com.recruitment.repository.UserRepository;
import com.recruitment.security.JwtTokenProvider;
import com.recruitment.security.UserPrincipal;
import com.recruitment.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String fullName = user.getUsername();
        String candidateCode = null;
        Long candidateProfileId = principal.getCandidateProfileId();

        if (candidateProfileId != null) {
            CandidateProfile profile = candidateProfileRepository.findById(candidateProfileId).orElse(null);
            if (profile != null) {
                fullName = profile.getFullName();
                candidateCode = profile.getCandidateId();
            }
        }

        String ipAddress = httpRequest != null ? httpRequest.getRemoteAddr() : "UNKNOWN";
        String userAgent = httpRequest != null ? httpRequest.getHeader("User-Agent") : "UNKNOWN";
        String action = principal.getRole().equals("ROLE_ADMIN") ? "ADMIN_LOGIN" : "CANDIDATE_LOGIN";

        auditLogService.logAction(user.getId(), user.getUsername(), action, ipAddress, userAgent,
                "User successfully logged in with role: " + principal.getRole());

        return AuthResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(fullName)
                .role(principal.getRole())
                .candidateProfileId(candidateProfileId)
                .candidateId(candidateCode)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser() {
        UserPrincipal principal = SecurityUtils.getCurrentUser();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String fullName = user.getUsername();
        String candidateCode = null;
        Long candidateProfileId = principal.getCandidateProfileId();

        if (candidateProfileId != null) {
            CandidateProfile profile = candidateProfileRepository.findById(candidateProfileId).orElse(null);
            if (profile != null) {
                fullName = profile.getFullName();
                candidateCode = profile.getCandidateId();
            }
        }

        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(fullName)
                .role(principal.getRole())
                .candidateProfileId(candidateProfileId)
                .candidateId(candidateCode)
                .build();
    }
}
