package com.aiturgan.crypto.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotNull
    @Size(min = 3, max = 50)
    private String username;

    @NotNull
    @Email
    private String email;

    @NotNull
    @Size(min = 6)
    private String password;
}
