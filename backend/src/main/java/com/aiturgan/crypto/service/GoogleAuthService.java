package com.aiturgan.crypto.service;

import com.aiturgan.crypto.dto.AuthResponse;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.Role;
import com.aiturgan.crypto.repository.UserRepository;
import com.aiturgan.crypto.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.UUID;

@Slf4j
@Service
public class GoogleAuthService {

    @Value("${app.google.client-id}")
    private String clientId;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public AuthResponse authenticateWithGoogle(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(clientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new RuntimeException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> {
                        String baseUsername = name != null
                                ? name.replaceAll("\\s+", "").toLowerCase()
                                : email.split("@")[0];
                        String username = baseUsername;
                        int counter = 1;
                        while (userRepository.existsByUsername(username)) {
                            username = baseUsername + counter++;
                        }

                        User newUser = User.builder()
                                .email(email)
                                .username(username)
                                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                                .role(userRepository.count() == 0 ? Role.ROLE_ADMIN : Role.ROLE_USER)
                                .build();
                        return userRepository.save(newUser);
                    });

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    user, null, user.getAuthorities());
            String token = jwtTokenProvider.generateToken(auth);

            return AuthResponse.builder()
                    .token(token)
                    .username(user.getUsername())
                    .role(user.getRole().name())
                    .build();

        } catch (Exception e) {
            log.error("Google authentication failed: {}", e.getMessage());
            throw new RuntimeException("Google authentication failed: " + e.getMessage(), e);
        }
    }
}
