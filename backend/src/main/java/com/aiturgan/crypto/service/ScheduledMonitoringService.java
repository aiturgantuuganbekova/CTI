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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

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

    @Value("${app.monitoring.enabled:false}")
    private boolean monitoringEnabled;

    @Scheduled(fixedDelayString = "${app.monitoring.interval:60000}")
    public void monitorActiveStrategies() {
        if (!monitoringEnabled) {
            return;
        }

        log.info("Starting scheduled monitoring of active strategies...");

        try {
            List<StrategyConfig> activeConfigs = strategyConfigRepository.findByActiveTrue();
            log.info("Found {} active strategy configs", activeConfigs.size());

            for (StrategyConfig config : activeConfigs) {
                try {
                    processStrategyConfig(config);
                } catch (Exception e) {
                    log.error("Error processing strategy config id={}: {}", config.getId(), e.getMessage(), e);
                }
            }

            // Check open trades for stop-loss / take-profit
            checkOpenTrades();

        } catch (Exception e) {
            log.error("Error during scheduled monitoring: {}", e.getMessage(), e);
        }

        log.info("Scheduled monitoring cycle completed.");
    }

    private void processStrategyConfig(StrategyConfig config) {
        User user = config.getUser();
        String symbol = config.getSymbol();
        String timeframe = config.getTimeframe();

        log.debug("Processing strategy config: id={}, strategy={}, symbol={}, timeframe={}",
                config.getId(), config.getStrategyType(), symbol, timeframe);

        // Fetch candles from Binance
        List<Candle> candles = binanceService.getKlines(symbol, timeframe, 100);

        // Run strategy
        SignalType signalType = strategyEngine.executeStrategy(config.getStrategyType(), candles);

        if (signalType == SignalType.BUY || signalType == SignalType.SELL) {
            double currentPrice = candles.get(candles.size() - 1).getClose();

            // Save signal
            Signal signal = Signal.builder()
                    .symbol(symbol)
                    .signalType(signalType)
                    .strategyType(config.getStrategyType())
                    .price(currentPrice)
                    .timeframe(timeframe)
                    .confidence(75.0)
                    .message(String.format("[Auto] Strategy: %s | Signal: %s | Price: %.2f",
                            config.getStrategyType(), signalType, currentPrice))
                    .user(user)
                    .build();

            signal = signalRepository.save(signal);
            log.info("Auto signal saved: id={}, type={}, symbol={}, price={}",
                    signal.getId(), signalType, symbol, currentPrice);

            // Open virtual trade
            Trade trade = Trade.builder()
                    .symbol(symbol)
                    .entryPrice(currentPrice)
                    .quantity(1.0)
                    .status(TradeStatus.OPEN)
                    .strategyType(config.getStrategyType())
                    .signalType(signalType)
                    .user(user)
                    .build();

            trade = tradeRepository.save(trade);
            log.info("Auto trade opened: id={}, symbol={}, entryPrice={}", trade.getId(), symbol, currentPrice);

            // Send Telegram notification if user has chatId
            if (user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank()) {
                telegramService.sendSignalNotification(user.getTelegramChatId(), signal);
            }
        }
    }

    private void checkOpenTrades() {
        List<Trade> openTrades = tradeRepository.findByStatus(TradeStatus.OPEN);
        log.debug("Checking {} open trades for stop-loss/take-profit", openTrades.size());

        for (Trade trade : openTrades) {
            try {
                checkTradeStopLossTakeProfit(trade);
            } catch (Exception e) {
                log.error("Error checking trade id={}: {}", trade.getId(), e.getMessage(), e);
            }
        }
    }

    private void checkTradeStopLossTakeProfit(Trade trade) {
        double currentPrice = binanceService.getCurrentPrice(trade.getSymbol());
        double entryPrice = trade.getEntryPrice();

        // Find the strategy config for stop-loss/take-profit percentages
        Double stopLossPercent = 2.0;
        Double takeProfitPercent = 3.0;

        // Try to get config-specific values
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

            // For SELL signals, profit is inverted (short position)
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
            log.info("Trade auto-closed [{}]: id={}, entryPrice={}, exitPrice={}, P/L={}, P/L%={}",
                    reason, trade.getId(), entryPrice, currentPrice, profitLoss, profitLossPercent);

            // Send Telegram notification
            if (user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank()) {
                String message = String.format("[%s] Trade closed: %s | Entry: %.2f | Exit: %.2f | P/L: %.2f (%.2f%%)",
                        reason, trade.getSymbol(), entryPrice, currentPrice, profitLoss, profitLossPercent);
                telegramService.sendMessage(user.getTelegramChatId(), message);
            }
        }
    }
}
