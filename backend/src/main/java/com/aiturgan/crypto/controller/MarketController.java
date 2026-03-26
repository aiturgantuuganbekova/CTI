package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.service.BinanceService;
import com.aiturgan.crypto.service.StrategyEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
@CrossOrigin
public class MarketController {

    private final BinanceService binanceService;
    private final StrategyEngine strategyEngine;

    @GetMapping("/price/{symbol}")
    public ResponseEntity<Map<String, Object>> getCurrentPrice(@PathVariable String symbol) {
        double price = binanceService.getCurrentPrice(symbol);

        Map<String, Object> response = new HashMap<>();
        response.put("symbol", symbol);
        response.put("price", price);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/klines/{symbol}")
    public ResponseEntity<List<Candle>> getKlines(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1h") String interval,
            @RequestParam(defaultValue = "100") int limit) {

        List<Candle> candles = binanceService.getKlines(symbol, interval, limit);
        return ResponseEntity.ok(candles);
    }

    @GetMapping("/indicators/{symbol}")
    public ResponseEntity<Map<String, Object>> getIndicators(
            @PathVariable String symbol,
            @RequestParam String strategyType,
            @RequestParam(defaultValue = "1h") String interval) {

        StrategyType type = StrategyType.valueOf(strategyType.toUpperCase());
        List<Candle> candles = binanceService.getKlines(symbol, interval, 100);
        Map<String, Object> indicators = strategyEngine.getIndicatorValues(type, candles);

        return ResponseEntity.ok(indicators);
    }
}
