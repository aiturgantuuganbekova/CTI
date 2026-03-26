package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.dto.ReportResponse;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<List<ReportResponse>> getUserReports() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        List<ReportResponse> reports = reportService.getUserReports(user.getId());
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/strategy/{strategyType}")
    public ResponseEntity<ReportResponse> getReportByStrategy(
            @PathVariable String strategyType,
            @RequestParam String symbol) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();

        StrategyType type = StrategyType.valueOf(strategyType.toUpperCase());
        ReportResponse report = reportService.generateReport(user.getId(), type, symbol);
        return ResponseEntity.ok(report);
    }
}
