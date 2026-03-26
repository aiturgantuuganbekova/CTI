package com.aiturgan.crypto.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReportResponse {

    private String strategyType;
    private String symbol;
    private String timeframe;
    private int totalSignals;
    private int buySignals;
    private int sellSignals;
    private double winRate;
    private double totalProfitLoss;
    private double roi;
    private LocalDateTime generatedAt;
}
