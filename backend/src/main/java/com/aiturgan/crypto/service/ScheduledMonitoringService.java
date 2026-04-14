package com.aiturgan.crypto.service;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.StrategyConfig;
import com.aiturgan.crypto.model.Trade;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.TradeStatus;
import com.aiturgan.crypto.repository.SignalRepository;
import com.aiturgan.crypto.repository.StrategyConfigRepository;
import com.aiturgan.crypto.repository.TradeRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledMonitoringService {

    private final StrategyConfigRepository strategyConfigRepository;
    private final SignalRepository signalRepository;
    private final TradeRepository tradeRepository;
    private final BinanceService binanceService;
    private final StrategyEngine strategyEngine;
    private final TelegramService telegramService;

    @Value("${app.monitoring.enabled:true}")
    private boolean monitoringEnabled;

    @Value("${app.monitoring.interval:60000}")
    private long intervalMs;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> currentTask;

    @PostConstruct
    public void init() {
        if (monitoringEnabled) {
            startMonitoring(intervalMs);
        }
    }

    @PreDestroy
    public void destroy() {
        scheduler.shutdownNow();
    }

    public synchronized void startMonitoring(long newIntervalMs) {
        if (currentTask != null) {
            currentTask.cancel(false);
        }
        this.intervalMs = newIntervalMs;
        this.monitoringEnabled = true;
        currentTask = scheduler.scheduleWithFixedDelay(this::monitorActiveStrategies, 5000, newIntervalMs, TimeUnit.MILLISECONDS);
        log.info("Monitoring started with interval: {}ms ({}s)", newIntervalMs, newIntervalMs / 1000);
    }

    public synchronized void stopMonitoring() {
        if (currentTask != null) {
            currentTask.cancel(false);
            currentTask = null;
        }
        this.monitoringEnabled = false;
        log.info("Monitoring stopped");
    }

    public long getIntervalMs() {
        return intervalMs;
    }

    public boolean isRunning() {
        return monitoringEnabled && currentTask != null && !currentTask.isCancelled();
    }

    private void monitorActiveStrategies() {
        log.info("Starting scheduled monitoring cycle...");
        try {
            List<StrategyConfig> activeConfigs = strategyConfigRepository.findByActiveTrue();
            log.info("Found {} active strategy configs", activeConfigs.size());

            for (StrategyConfig config : activeConfigs) {
                try {
                    processStrategyConfig(config);
                } catch (Exception e) {
                    log.error("Error processing strategy config id={}: {}", config.getId(), e.getMessage());
                }
            }

            checkOpenTrades();
        } catch (Exception e) {
            log.error("Error during scheduled monitoring: {}", e.getMessage());
        }
        log.info("Scheduled monitoring cycle completed.");
    }

    private void processStrategyConfig(StrategyConfig config) {
        User user = config.getUser();
        String symbol = config.getSymbol();
        String timeframe = config.getTimeframe();

        log.debug("Processing: strategy={}, symbol={}, timeframe={}", config.getStrategyType(), symbol, timeframe);

        List<Candle> candles = binanceService.getKlines(symbol, timeframe, 100);
        SignalType signalType = strategyEngine.executeStrategy(config.getStrategyType(), candles);
        double currentPrice = candles.get(candles.size() - 1).getClose();

        // Save signal for ALL types
        Signal signal = Signal.builder()
                .symbol(symbol)
                .signalType(signalType)
                .strategyType(config.getStrategyType())
                .price(currentPrice)
                .timeframe(timeframe)
                .confidence(75.0)
                .message(String.format("[Auto] %s | %s | $%.2f | %s",
                        config.getStrategyType(), signalType, currentPrice, timeframe))
                .user(user)
                .build();

        signal = signalRepository.save(signal);
        log.info("Signal: {} {} ${} ({})", signalType, symbol, currentPrice, config.getStrategyType());

        // Open virtual trade only for BUY/SELL
        if (signalType == SignalType.BUY || signalType == SignalType.SELL) {
            Trade trade = Trade.builder()
                    .symbol(symbol)
                    .entryPrice(currentPrice)
                    .quantity(1.0)
                    .status(TradeStatus.OPEN)
                    .strategyType(config.getStrategyType())
                    .signalType(signalType)
                    .user(user)
                    .build();
            tradeRepository.save(trade);
            log.info("Trade opened: {} {} @ ${}", signalType, symbol, currentPrice);
        }

        // Send Telegram for ALL signals
        if (user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank()) {
            telegramService.sendSignalNotification(user.getTelegramChatId(), signal);
        }
    }

    private void checkOpenTrades() {
        List<Trade> openTrades = tradeRepository.findByStatus(TradeStatus.OPEN);
        for (Trade trade : openTrades) {
            try {
                checkTradeStopLossTakeProfit(trade);
            } catch (Exception e) {
                log.error("Error checking trade id={}: {}", trade.getId(), e.getMessage());
            }
        }
    }

    private void checkTradeStopLossTakeProfit(Trade trade) {
        double currentPrice = binanceService.getCurrentPrice(trade.getSymbol());
        double entryPrice = trade.getEntryPrice();

        Double stopLossPercent = 2.0;
        Double takeProfitPercent = 3.0;

        User user = trade.getUser();
        List<StrategyConfig> configs = strategyConfigRepository.findByUserId(user.getId());
        for (StrategyConfig config : configs) {
            if (config.getStrategyType() == trade.getStrategyType()
                    && config.getSymbol().equals(trade.getSymbol())
                    && config.isActive()) {
                stopLossPercent = config.getStopLossPercent();
                takeProfitPercent = config.getTakeProfitPercent();
                break;
            }
        }

        double stopLossPrice = entryPrice * (1.0 - stopLossPercent / 100.0);
        double takeProfitPrice = entryPrice * (1.0 + takeProfitPercent / 100.0);

        boolean shouldClose = false;
        String reason = "";

        if (currentPrice <= stopLossPrice) {
            shouldClose = true;
            reason = "STOP_LOSS";
        } else if (currentPrice >= takeProfitPrice) {
            shouldClose = true;
            reason = "TAKE_PROFIT";
        }

        if (shouldClose) {
            double profitLoss = (currentPrice - entryPrice) * trade.getQuantity();
            double profitLossPercent = ((currentPrice - entryPrice) / entryPrice) * 100.0;

            if (trade.getSignalType() == SignalType.SELL) {
                profitLoss = -profitLoss;
                profitLossPercent = -profitLossPercent;
            }

            trade.setExitPrice(currentPrice);
            trade.setProfitLoss(profitLoss);
            trade.setProfitLossPercent(profitLossPercent);
            trade.setStatus(TradeStatus.CLOSED);
            trade.setClosedAt(LocalDateTime.now());
            tradeRepository.save(trade);

            log.info("Trade closed [{}]: {} P/L=${}", reason, trade.getSymbol(), profitLoss);

            if (user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank()) {
                String message = String.format("[%s] %s closed | Entry: $%.2f | Exit: $%.2f | P/L: $%.2f (%.2f%%)",
                        reason, trade.getSymbol(), entryPrice, currentPrice, profitLoss, profitLossPercent);
                telegramService.sendMessage(user.getTelegramChatId(), message);
            }
        }
    }
}
