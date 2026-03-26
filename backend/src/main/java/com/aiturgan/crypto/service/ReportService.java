package com.aiturgan.crypto.service;

import com.aiturgan.crypto.dto.ReportResponse;
import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.Trade;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.model.enums.TradeStatus;
import com.aiturgan.crypto.repository.SignalRepository;
import com.aiturgan.crypto.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final SignalRepository signalRepository;
    private final TradeRepository tradeRepository;

    public ReportResponse generateReport(Long userId, StrategyType strategy, String symbol) {
        try {
            log.info("Generating report for userId={}, strategy={}, symbol={}", userId, strategy, symbol);

            // Get signals for this user
            List<Signal> allSignals = signalRepository.findByUserIdOrderByCreatedAtDesc(userId);

            // Filter by strategy and symbol
            List<Signal> filteredSignals = allSignals.stream()
                    .filter(s -> s.getStrategyType() == strategy)
                    .filter(s -> s.getSymbol().equals(symbol))
                    .collect(Collectors.toList());

            int totalSignals = filteredSignals.size();
            int buySignals = (int) filteredSignals.stream()
                    .filter(s -> s.getSignalType() == SignalType.BUY).count();
            int sellSignals = (int) filteredSignals.stream()
                    .filter(s -> s.getSignalType() == SignalType.SELL).count();

            // Get trades for win rate and P/L calculation
            List<Trade> trades = tradeRepository.findByUserIdAndStrategyType(userId, strategy);
            List<Trade> closedTrades = trades.stream()
                    .filter(t -> t.getStatus() == TradeStatus.CLOSED)
                    .filter(t -> t.getSymbol().equals(symbol))
                    .collect(Collectors.toList());

            int winningTrades = (int) closedTrades.stream()
                    .filter(t -> t.getProfitLoss() != null && t.getProfitLoss() > 0).count();

            double winRate = closedTrades.isEmpty() ? 0.0
                    : ((double) winningTrades / closedTrades.size()) * 100.0;

            double totalProfitLoss = closedTrades.stream()
                    .filter(t -> t.getProfitLoss() != null)
                    .mapToDouble(Trade::getProfitLoss)
                    .sum();

            // Calculate ROI based on total entry value
            double totalInvested = closedTrades.stream()
                    .filter(t -> t.getEntryPrice() != null && t.getQuantity() != null)
                    .mapToDouble(t -> t.getEntryPrice() * t.getQuantity())
                    .sum();
            double roi = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100.0 : 0.0;

            // Determine timeframe from signals
            String timeframe = filteredSignals.isEmpty() ? "N/A"
                    : filteredSignals.get(0).getTimeframe() != null
                    ? filteredSignals.get(0).getTimeframe() : "N/A";

            return ReportResponse.builder()
                    .strategyType(strategy.name())
                    .symbol(symbol)
                    .timeframe(timeframe)
                    .totalSignals(totalSignals)
                    .buySignals(buySignals)
                    .sellSignals(sellSignals)
                    .winRate(winRate)
                    .totalProfitLoss(totalProfitLoss)
                    .roi(roi)
                    .generatedAt(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            log.error("Error generating report: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate report", e);
        }
    }

    public List<ReportResponse> getUserReports(Long userId) {
        try {
            log.info("Generating all reports for userId={}", userId);

            List<Signal> allSignals = signalRepository.findByUserIdOrderByCreatedAtDesc(userId);

            // Find unique strategy+symbol combinations
            Map<String, StrategySymbolPair> uniquePairs = new HashMap<>();
            for (Signal signal : allSignals) {
                String key = signal.getStrategyType().name() + "_" + signal.getSymbol();
                if (!uniquePairs.containsKey(key)) {
                    uniquePairs.put(key, new StrategySymbolPair(signal.getStrategyType(), signal.getSymbol()));
                }
            }

            // Generate a report for each combination
            List<ReportResponse> reports = new ArrayList<>();
            for (StrategySymbolPair pair : uniquePairs.values()) {
                try {
                    ReportResponse report = generateReport(userId, pair.strategy, pair.symbol);
                    reports.add(report);
                } catch (Exception e) {
                    log.warn("Failed to generate report for strategy={}, symbol={}: {}",
                            pair.strategy, pair.symbol, e.getMessage());
                }
            }

            log.info("Generated {} reports for userId={}", reports.size(), userId);
            return reports;
        } catch (Exception e) {
            log.error("Error generating user reports: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate user reports", e);
        }
    }

    private static class StrategySymbolPair {
        final StrategyType strategy;
        final String symbol;

        StrategySymbolPair(StrategyType strategy, String symbol) {
            this.strategy = strategy;
            this.symbol = symbol;
        }
    }
}
