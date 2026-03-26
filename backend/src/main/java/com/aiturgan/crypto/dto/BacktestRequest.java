package com.aiturgan.crypto.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BacktestRequest {

    @NotNull
    private String symbol;

    @NotNull
    private String strategyType;

    @NotNull
    private String timeframe;

    @NotNull
    private String startDate;

    @NotNull
    private String endDate;

    private Double initialBalance = 10000.0;
}
