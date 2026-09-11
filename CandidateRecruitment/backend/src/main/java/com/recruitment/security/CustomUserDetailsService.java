package com.recruitment.security;

import com.recruitment.entity.CandidateProfile;
import com.recruitment.entity.User;
import com.recruitment.repository.CandidateProfileRepository;
import com.recruitment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        User user = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username or email: " + usernameOrEmail));

        Long candidateProfileId = null;
        if ("ROLE_CANDIDATE".equals(user.getRole().getName().name())) {
            candidateProfileId = candidateProfileRepository.findByUserId(user.getId())
                    .map(CandidateProfile::getId)
                    .orElse(null);
        }

        return UserPrincipal.create(user, candidateProfileId);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        Long candidateProfileId = null;
        if ("ROLE_CANDIDATE".equals(user.getRole().getName().name())) {
            candidateProfileId = candidateProfileRepository.findByUserId(user.getId())
                    .map(CandidateProfile::getId)
                    .orElse(null);
        }

        return UserPrincipal.create(user, candidateProfileId);
    }
}
