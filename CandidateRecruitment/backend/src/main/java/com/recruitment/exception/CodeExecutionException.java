package com.recruitment.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class CodeExecutionException extends RuntimeException {
    public CodeExecutionException(String message) {
        super(message);
    }

    public CodeExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
