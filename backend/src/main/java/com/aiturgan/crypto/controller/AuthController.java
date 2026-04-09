package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.dto.AuthRequest;
import com.aiturgan.crypto.dto.AuthResponse;
import com.aiturgan.crypto.dto.RegisterRequest;
import com.aiturgan.crypto.service.AuthService;
import com.aiturgan.crypto.service.GoogleAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleAuth(@RequestBody Map<String, String> request) {
        String idToken = request.get("credential");
        AuthResponse response = googleAuthService.authenticateWithGoogle(idToken);
        return ResponseEntity.ok(response);
    }
}
