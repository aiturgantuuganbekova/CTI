package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.model.Trade;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
@CrossOrigin
public class TradeController {

    private final TradeService tradeService;

    @GetMapping
    public ResponseEntity<List<Trade>> getUserTrades() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        List<Trade> trades = tradeService.getUserTrades(user.getId());
        return ResponseEntity.ok(trades);
    }

    @GetMapping("/open")
    public ResponseEntity<List<Trade>> getOpenTrades() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        List<Trade> trades = tradeService.getOpenTrades(user.getId());
        return ResponseEntity.ok(trades);
    }

    @PostMapping("/{tradeId}/close")
    public ResponseEntity<Trade> closeTrade(@PathVariable Long tradeId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        Trade trade = tradeService.closeTrade(tradeId, user);
        return ResponseEntity.ok(trade);
    }
}
