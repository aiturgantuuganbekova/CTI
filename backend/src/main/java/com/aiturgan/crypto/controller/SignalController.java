package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.dto.SignalResponse;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.service.SignalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/signals")
@RequiredArgsConstructor
@CrossOrigin
public class SignalController {

    private final SignalService signalService;

    @PostMapping("/generate")
    public ResponseEntity<SignalResponse> generateSignal(
            @RequestParam String symbol,
            @RequestParam String strategyType,
            @RequestParam String timeframe) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        StrategyType type = StrategyType.valueOf(strategyType.toUpperCase());
        SignalResponse response = signalService.generateSignal(user, symbol, type, timeframe);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<SignalResponse>> getUserSignals() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        List<SignalResponse> signals = signalService.getUserSignals(user.getId());
        return ResponseEntity.ok(signals);
    }

    @GetMapping("/strategy/{strategyType}")
    public ResponseEntity<List<SignalResponse>> getSignalsByStrategy(
            @PathVariable String strategyType,
            @RequestParam String symbol) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        StrategyType type = StrategyType.valueOf(strategyType.toUpperCase());
        List<SignalResponse> signals = signalService.getSignalsByStrategy(symbol, type);
        return ResponseEntity.ok(signals);
    }
}
