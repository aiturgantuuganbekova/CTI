package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.repository.UserRepository;
import com.aiturgan.crypto.service.TelegramService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final TelegramService telegramService;

    @PutMapping("/telegram")
    public ResponseEntity<?> updateTelegramChatId(@RequestParam String chatId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        user.setTelegramChatId(chatId);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Telegram chat ID updated", "chatId", chatId));
    }

    @GetMapping("/telegram")
    public ResponseEntity<?> getTelegramChatId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(Map.of("chatId", user.getTelegramChatId() != null ? user.getTelegramChatId() : ""));
    }

    @PostMapping("/telegram/test")
    public ResponseEntity<?> testTelegram() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
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
