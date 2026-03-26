package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.dto.BacktestRequest;
import com.aiturgan.crypto.dto.BacktestResult;
import com.aiturgan.crypto.service.BacktestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/backtest")
@RequiredArgsConstructor
@CrossOrigin
public class BacktestController {

    private final BacktestService backtestService;

    @PostMapping("/run")
    public ResponseEntity<BacktestResult> runBacktest(@Valid @RequestBody BacktestRequest request) {
        BacktestResult result = backtestService.runBacktest(request);
        return ResponseEntity.ok(result);
    }
}
