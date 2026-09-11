package com.recruitment;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedUser_CannotAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/candidates"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedUser_CannotAccessCandidateEndpoint() throws Exception {
        mockMvc.perform(get("/api/candidate/exams"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "candidate1", authorities = {"ROLE_CANDIDATE"})
    void candidateRole_CannotAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/candidates"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "candidate1", authorities = {"ROLE_CANDIDATE"})
    void candidateRole_CannotAccessAdminResults() throws Exception {
        mockMvc.perform(get("/api/admin/results"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin1", authorities = {"ROLE_ADMIN"})
    void adminRole_CanAccessAdminDashboard() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isOk());
    }

    @Test
    void loginEndpoint_IsPubliclyAccessible() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"nonexistent\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized()); // Returns 401 Bad Credentials from controller, not 403 Forbidden by Security Filter
    }
}
