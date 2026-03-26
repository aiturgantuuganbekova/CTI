package com.aiturgan.crypto.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SignalResponse {

    private Long id;
    private String symbol;
    private String signalType;
    private String strategyType;
    private Double price;
    private String timeframe;
    private Double confidence;
    private String message;
    private LocalDateTime createdAt;
}
