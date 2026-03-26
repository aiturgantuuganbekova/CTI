package com.aiturgan.crypto.service;

import com.aiturgan.crypto.dto.AuthRequest;
import com.aiturgan.crypto.dto.AuthResponse;
import com.aiturgan.crypto.dto.RegisterRequest;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.Role;
import com.aiturgan.crypto.repository.UserRepository;
import com.aiturgan.crypto.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new RuntimeException("Username is already taken: " + req.getUsername());
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email is already in use: " + req.getEmail());
        }

        // First registered user becomes ADMIN, all others are USER
        Role assignedRole = userRepository.count() == 0 ? Role.ROLE_ADMIN : Role.ROLE_USER;

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(assignedRole)
                .build();

        userRepository.save(user);
        log.info("User registered successfully: {}", user.getUsername());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
        );

        String token = jwtTokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }

    public AuthResponse login(AuthRequest req) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
            );

            String token = jwtTokenProvider.generateToken(authentication);

            User user = userRepository.findByUsername(req.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + req.getUsername()));

            log.info("User logged in successfully: {}", req.getUsername());

            return AuthResponse.builder()
                    .token(token)
                    .username(user.getUsername())
                    .role(user.getRole().name())
                    .build();
        } catch (Exception e) {
            log.error("Login failed for user {}: {}", req.getUsername(), e.getMessage());
            throw new RuntimeException("Invalid username or password");
        }
    }
}
