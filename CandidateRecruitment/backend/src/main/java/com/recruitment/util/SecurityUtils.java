package com.recruitment.util;

import com.recruitment.exception.UnauthorizedAccessException;
import com.recruitment.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) authentication.getPrincipal();
        }
        throw new UnauthorizedAccessException("No authenticated user found in security context");
    }

    public static Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    public static String getCurrentUsername() {
        return getCurrentUser().getUsername();
    }

    public static Long getCurrentCandidateProfileId() {
        Long id = getCurrentUser().getCandidateProfileId();
        if (id == null) {
            throw new UnauthorizedAccessException("Current user is not associated with a candidate profile");
        }
        return id;
    }

    public static boolean isAdmin() {
        return getCurrentUser().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
