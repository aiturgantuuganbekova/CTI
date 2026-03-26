package com.aiturgan.crypto.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StrategyConfigRequest {

    @NotNull
    private String strategyType;

    @NotNull
    @Size(min = 3, max = 10)
    private String symbol;

    private String timeframe = "1h";

    private Double stopLossPercent;

    private Double takeProfitPercent;

    private String params;
}
