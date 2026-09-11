package com.recruitment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class ProctoringAiService {

    private final RestTemplate restTemplate;
    private final String aiServiceUrl;
    private final String apiKey;

    public ProctoringAiService(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${proctoring.ai.service-url:http://localhost:8000}") String aiServiceUrl,
            @Value("${proctoring.ai.api-key:default-proctoring-secret-key-2026}") String apiKey) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(3000))
                .setReadTimeout(Duration.ofMillis(5000))
                .build();
        this.aiServiceUrl = aiServiceUrl.replaceAll("/+$", "");
        this.apiKey = apiKey;
    }

    /**
     * Checks if the Python AI Proctoring Service is operational.
     */
    public boolean isAiServiceAvailable() {
        try {
            String url = aiServiceUrl + "/api/v1/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode().is2xxSuccessful() && response.getBody() != null;
        } catch (Exception e) {
            log.warn("AI Proctoring Service is unavailable at [{}]: {}", aiServiceUrl, e.getMessage());
            return false;
        }
    }

    /**
     * Obtains health status telemetry from the Python Proctoring Service.
     */
    public Map<String, Object> getAiHealthStatus() {
        Map<String, Object> statusMap = new HashMap<>();
        try {
            String url = aiServiceUrl + "/api/v1/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                statusMap.put("available", true);
                statusMap.put("details", response.getBody());
            } else {
                statusMap.put("available", false);
                statusMap.put("error", "Received HTTP " + response.getStatusCode());
            }
        } catch (Exception e) {
            statusMap.put("available", false);
            statusMap.put("error", e.getMessage());
        }
        return statusMap;
    }
}
