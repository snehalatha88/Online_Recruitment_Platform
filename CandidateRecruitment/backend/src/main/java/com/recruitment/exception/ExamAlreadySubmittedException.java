package com.recruitment.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ExamAlreadySubmittedException extends RuntimeException {
    public ExamAlreadySubmittedException(String message) {
        super(message);
    }
}
