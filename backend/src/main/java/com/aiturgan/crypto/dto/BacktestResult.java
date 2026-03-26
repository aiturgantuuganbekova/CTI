package com.aiturgan.crypto.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BacktestResult {

    private double initialBalance;
    private double finalBalance;
    private double totalProfitLoss;
    private double roiPercent;
    private int totalTrades;
    private int winningTrades;
    private int losingTrades;
    private double winRate;
    private double maxDrawdown;
    private List<TradeDetail> trades;

    @Data
    public static class TradeDetail {
        private String type;
        private double entryPrice;
        private double exitPrice;
        private double profitLoss;
        private String openedAt;
        private String closedAt;
    }
}
