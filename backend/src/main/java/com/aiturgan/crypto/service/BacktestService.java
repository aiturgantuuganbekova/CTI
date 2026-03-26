package com.aiturgan.crypto.service;

import com.aiturgan.crypto.dto.BacktestRequest;
import com.aiturgan.crypto.dto.BacktestResult;
import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BacktestService {

    private final BinanceService binanceService;
    private final StrategyEngine strategyEngine;

    private static final int MIN_WINDOW_SIZE = 50;
    private static final double DEFAULT_STOP_LOSS_PERCENT = 2.0;
    private static final double DEFAULT_TAKE_PROFIT_PERCENT = 3.0;

    public BacktestResult runBacktest(BacktestRequest request) {
        try {
            log.info("Starting backtest: symbol={}, strategy={}, timeframe={}, from={} to={}",
                    request.getSymbol(), request.getStrategyType(), request.getTimeframe(),
                    request.getStartDate(), request.getEndDate());

            // Parse dates to timestamps
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            long startTime = LocalDate.parse(request.getStartDate(), formatter)
                    .atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
            long endTime = LocalDate.parse(request.getEndDate(), formatter)
                    .atTime(23, 59, 59).atZone(ZoneOffset.UTC).toInstant().toEpochMilli();

            StrategyType strategyType = StrategyType.valueOf(request.getStrategyType());

            // Fetch historical candles
            List<Candle> allCandles = binanceService.getKlinesBetween(
                    request.getSymbol(), request.getTimeframe(), startTime, endTime);

            if (allCandles.size() < MIN_WINDOW_SIZE) {
                log.warn("Not enough candles for backtest. Got: {}, Required: {}", allCandles.size(), MIN_WINDOW_SIZE);
                return BacktestResult.builder()
                        .initialBalance(request.getInitialBalance())
                        .finalBalance(request.getInitialBalance())
                        .totalProfitLoss(0)
                        .roiPercent(0)
                        .totalTrades(0)
                        .winningTrades(0)
                        .losingTrades(0)
                        .winRate(0)
                        .maxDrawdown(0)
                        .trades(new ArrayList<>())
                        .build();
            }

            // Simulate trading
            double balance = request.getInitialBalance();
            double peakBalance = balance;
            double maxDrawdown = 0.0;
            List<BacktestResult.TradeDetail> tradeDetails = new ArrayList<>();

            boolean inPosition = false;
            double entryPrice = 0.0;
            String entryTime = "";
            int winCount = 0;
            int lossCount = 0;

            for (int i = MIN_WINDOW_SIZE; i < allCandles.size(); i++) {
                List<Candle> window = allCandles.subList(0, i + 1);
                Candle currentCandle = allCandles.get(i);

                if (inPosition) {
                    // Check stop-loss
                    double lossPercent = ((currentCandle.getClose() - entryPrice) / entryPrice) * 100.0;
                    if (lossPercent <= -DEFAULT_STOP_LOSS_PERCENT) {
                        // Stop-loss triggered
                        double exitPrice = entryPrice * (1 - DEFAULT_STOP_LOSS_PERCENT / 100.0);
                        double profitLoss = exitPrice - entryPrice;
                        double tradeReturn = (profitLoss / entryPrice) * balance;
                        balance += tradeReturn;
                        lossCount++;

                        BacktestResult.TradeDetail detail = new BacktestResult.TradeDetail();
                        detail.setType("STOP_LOSS");
                        detail.setEntryPrice(entryPrice);
                        detail.setExitPrice(exitPrice);
                        detail.setProfitLoss(tradeReturn);
                        detail.setOpenedAt(entryTime);
                        detail.setClosedAt(formatTimestamp(currentCandle.getOpenTime()));
                        tradeDetails.add(detail);

                        inPosition = false;
                        continue;
                    }

                    // Check take-profit
                    if (lossPercent >= DEFAULT_TAKE_PROFIT_PERCENT) {
                        double exitPrice = entryPrice * (1 + DEFAULT_TAKE_PROFIT_PERCENT / 100.0);
                        double profitLoss = exitPrice - entryPrice;
                        double tradeReturn = (profitLoss / entryPrice) * balance;
                        balance += tradeReturn;
                        winCount++;

                        BacktestResult.TradeDetail detail = new BacktestResult.TradeDetail();
                        detail.setType("TAKE_PROFIT");
                        detail.setEntryPrice(entryPrice);
                        detail.setExitPrice(exitPrice);
                        detail.setProfitLoss(tradeReturn);
                        detail.setOpenedAt(entryTime);
                        detail.setClosedAt(formatTimestamp(currentCandle.getOpenTime()));
                        tradeDetails.add(detail);

                        inPosition = false;
                        continue;
                    }

                    // Check for SELL signal
                    SignalType signal = strategyEngine.executeStrategy(strategyType, window);
                    if (signal == SignalType.SELL) {
                        double exitPrice = currentCandle.getClose();
                        double profitLoss = exitPrice - entryPrice;
                        double tradeReturn = (profitLoss / entryPrice) * balance;
                        balance += tradeReturn;

                        if (profitLoss > 0) {
                            winCount++;
                        } else {
                            lossCount++;
                        }

                        BacktestResult.TradeDetail detail = new BacktestResult.TradeDetail();
                        detail.setType("SELL");
                        detail.setEntryPrice(entryPrice);
                        detail.setExitPrice(exitPrice);
                        detail.setProfitLoss(tradeReturn);
                        detail.setOpenedAt(entryTime);
                        detail.setClosedAt(formatTimestamp(currentCandle.getOpenTime()));
                        tradeDetails.add(detail);

                        inPosition = false;
                    }
                } else {
                    // Look for BUY signal
                    SignalType signal = strategyEngine.executeStrategy(strategyType, window);
                    if (signal == SignalType.BUY) {
                        entryPrice = currentCandle.getClose();
                        entryTime = formatTimestamp(currentCandle.getOpenTime());
                        inPosition = true;
                    }
                }

                // Track max drawdown
                if (balance > peakBalance) {
                    peakBalance = balance;
                }
                double drawdown = ((peakBalance - balance) / peakBalance) * 100.0;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }

            // Close any remaining open position at last candle price
            if (inPosition) {
                Candle lastCandle = allCandles.get(allCandles.size() - 1);
                double exitPrice = lastCandle.getClose();
                double profitLoss = exitPrice - entryPrice;
                double tradeReturn = (profitLoss / entryPrice) * balance;
                balance += tradeReturn;

                if (profitLoss > 0) {
                    winCount++;
                } else {
                    lossCount++;
                }

                BacktestResult.TradeDetail detail = new BacktestResult.TradeDetail();
                detail.setType("CLOSE_END");
                detail.setEntryPrice(entryPrice);
                detail.setExitPrice(exitPrice);
                detail.setProfitLoss(tradeReturn);
                detail.setOpenedAt(entryTime);
                detail.setClosedAt(formatTimestamp(lastCandle.getOpenTime()));
                tradeDetails.add(detail);
            }

            int totalTrades = winCount + lossCount;
            double totalProfitLoss = balance - request.getInitialBalance();
            double roiPercent = (totalProfitLoss / request.getInitialBalance()) * 100.0;
            double winRate = totalTrades > 0 ? ((double) winCount / totalTrades) * 100.0 : 0.0;

            log.info("Backtest completed: trades={}, P/L={}, ROI={}%, winRate={}%, maxDrawdown={}%",
                    totalTrades, totalProfitLoss, roiPercent, winRate, maxDrawdown);

            return BacktestResult.builder()
                    .initialBalance(request.getInitialBalance())
                    .finalBalance(balance)
                    .totalProfitLoss(totalProfitLoss)
                    .roiPercent(roiPercent)
                    .totalTrades(totalTrades)
                    .winningTrades(winCount)
                    .losingTrades(lossCount)
                    .winRate(winRate)
                    .maxDrawdown(maxDrawdown)
                    .trades(tradeDetails)
                    .build();
        } catch (Exception e) {
            log.error("Error running backtest: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to run backtest", e);
        }
    }

    private String formatTimestamp(long timestamp) {
        return Instant.ofEpochMilli(timestamp).atZone(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
