package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.repository.UserRepository;
import com.aiturgan.crypto.service.TelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/user")
@CrossOrigin
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final TelegramService telegramService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User principal = (User) auth.getPrincipal();
        return userRepository.findById(principal.getId()).orElse(principal);
    }

    @PutMapping("/telegram")
    public ResponseEntity<?> updateTelegramChatId(@RequestParam String chatId) {
        User user = getCurrentUser();
        user.setTelegramChatId(chatId);
        userRepository.save(user);
        log.info("Telegram chat ID updated for user {}: {}", user.getUsername(), chatId);
        return ResponseEntity.ok(Map.of("message", "Telegram chat ID updated", "chatId", chatId));
    }

    @GetMapping("/telegram")
    public ResponseEntity<?> getTelegramChatId() {
        User user = getCurrentUser();
        return ResponseEntity.ok(Map.of("chatId", user.getTelegramChatId() != null ? user.getTelegramChatId() : ""));
    }

    @PostMapping("/telegram/test")
    public ResponseEntity<?> testTelegram() {
        User user = getCurrentUser();
        if (user.getTelegramChatId() == null || user.getTelegramChatId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Telegram chat ID not set"));
        }

        Signal testSignal = new Signal();
        testSignal.setSymbol("BTCUSDT");
        testSignal.setSignalType(SignalType.BUY);
        testSignal.setStrategyType(StrategyType.RSI);
        testSignal.setPrice(0.0);
        testSignal.setTimeframe("1h");
        testSignal.setConfidence(95.0);
        testSignal.setMessage("This is a test notification from Aiturgan");
        testSignal.setCreatedAt(LocalDateTime.now());

        telegramService.sendSignalNotification(user.getTelegramChatId(), testSignal);
        return ResponseEntity.ok(Map.of("message", "Test notification sent"));
    }
}
