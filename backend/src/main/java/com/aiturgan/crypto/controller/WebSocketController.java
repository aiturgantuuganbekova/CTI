package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.service.BinanceWebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ws")
@RequiredArgsConstructor
public class WebSocketController {

    private final BinanceWebSocketService binanceWebSocketService;

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startStream(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1h") String interval) {
        log.info("Starting WebSocket stream: symbol={}, interval={}", symbol, interval);
        binanceWebSocketService.startStream(symbol.toUpperCase(), interval);
        return ResponseEntity.ok(Map.of(
                "status", "started",
                "symbol", symbol.toUpperCase(),
                "interval", interval
        ));
    }

    @PostMapping("/stop")
    public ResponseEntity<Map<String, String>> stopStream(@RequestParam String symbol) {
        log.info("Stopping WebSocket stream: symbol={}", symbol);
        binanceWebSocketService.stopStream(symbol.toUpperCase());
        return ResponseEntity.ok(Map.of(
                "status", "stopped",
                "symbol", symbol.toUpperCase()
        ));
    }

    @GetMapping("/active")
    public ResponseEntity<List<String>> getActiveStreams() {
        List<String> activeStreams = binanceWebSocketService.getActiveStreams();
        return ResponseEntity.ok(activeStreams);
    }
}
