package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.dto.StrategyConfigRequest;
import com.aiturgan.crypto.model.StrategyConfig;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.repository.StrategyConfigRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/strategies")
@RequiredArgsConstructor
@CrossOrigin
public class StrategyConfigController {

    private final StrategyConfigRepository strategyConfigRepository;

    @GetMapping
    public ResponseEntity<List<StrategyConfig>> getUserStrategies() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        List<StrategyConfig> configs = strategyConfigRepository.findByUserId(user.getId());
        return ResponseEntity.ok(configs);
    }

    @PostMapping
    public ResponseEntity<StrategyConfig> createStrategy(@Valid @RequestBody StrategyConfigRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        StrategyConfig config = StrategyConfig.builder()
                .name(request.getStrategyType() + " - " + request.getSymbol())
                .strategyType(StrategyType.valueOf(request.getStrategyType().toUpperCase()))
                .symbol(request.getSymbol())
                .timeframe(request.getTimeframe())
                .stopLossPercent(request.getStopLossPercent() != null ? request.getStopLossPercent() : 2.0)
                .takeProfitPercent(request.getTakeProfitPercent() != null ? request.getTakeProfitPercent() : 3.0)
                .params(request.getParams())
                .active(false)
                .user(user)
                .build();

        StrategyConfig saved = strategyConfigRepository.save(config);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<StrategyConfig> toggleStrategy(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        StrategyConfig config = strategyConfigRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Strategy config not found with id: " + id));

        if (!config.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        config.setActive(!config.isActive());
        StrategyConfig updated = strategyConfigRepository.save(config);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStrategy(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        StrategyConfig config = strategyConfigRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Strategy config not found with id: " + id));

        if (!config.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        strategyConfigRepository.delete(config);
        return ResponseEntity.noContent().build();
    }
}
