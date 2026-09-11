package com.recruitment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CandidateRecruitmentApplication {

    public static void main(String[] args) {
        SpringApplication.run(CandidateRecruitmentApplication.class, args);
    }
}
