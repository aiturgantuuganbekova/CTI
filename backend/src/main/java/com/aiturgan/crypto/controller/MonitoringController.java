package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.service.ScheduledMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/monitoring")
@CrossOrigin
@RequiredArgsConstructor
public class MonitoringController {

    private final ScheduledMonitoringService monitoringService;

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of(
                "running", monitoringService.isRunning(),
                "intervalMs", monitoringService.getIntervalMs(),
                "intervalSeconds", monitoringService.getIntervalMs() / 1000
        ));
    }

    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestParam(defaultValue = "60000") long intervalMs) {
        if (intervalMs < 5000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Interval must be at least 5000ms (5 seconds)"));
        }
        monitoringService.startMonitoring(intervalMs);
        return ResponseEntity.ok(Map.of(
                "message", "Monitoring started",
                "intervalMs", intervalMs,
                "intervalSeconds", intervalMs / 1000
        ));
    }

    @PostMapping("/stop")
    public ResponseEntity<?> stop() {
        monitoringService.stopMonitoring();
        return ResponseEntity.ok(Map.of("message", "Monitoring stopped"));
    }

    @PutMapping("/interval")
    public ResponseEntity<?> updateInterval(@RequestParam long intervalMs) {
        if (intervalMs < 5000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Interval must be at least 5000ms (5 seconds)"));
        }
        monitoringService.startMonitoring(intervalMs);
        return ResponseEntity.ok(Map.of(
                "message", "Interval updated",
                "intervalMs", intervalMs,
                "intervalSeconds", intervalMs / 1000
        ));
    }
}
