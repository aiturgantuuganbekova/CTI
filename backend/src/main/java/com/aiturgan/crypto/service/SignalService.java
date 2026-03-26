package com.aiturgan.crypto.service;

import com.aiturgan.crypto.dto.SignalResponse;
import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.repository.SignalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignalService {

    private final SignalRepository signalRepository;
    private final BinanceService binanceService;
    private final StrategyEngine strategyEngine;
    private final TelegramService telegramService;

    public SignalResponse generateSignal(User user, String symbol, StrategyType strategy, String timeframe) {
        try {
            log.info("Generating signal for user={}, symbol={}, strategy={}, timeframe={}",
                    user.getUsername(), symbol, strategy, timeframe);

            // Fetch candles from Binance
            List<Candle> candles = binanceService.getKlines(symbol, timeframe, 100);

            // Run strategy
            SignalType signalType = strategyEngine.executeStrategy(strategy, candles);
            double currentPrice = candles.get(candles.size() - 1).getClose();

            // Get indicator values for the message
            Map<String, Object> indicators = strategyEngine.getIndicatorValues(strategy, candles);

            // Build message
            String message = String.format("Strategy: %s | Signal: %s | Indicators: %s",
                    strategy, signalType, indicators);

            // Calculate confidence based on indicator strength
            double confidence = calculateConfidence(strategy, candles, signalType);

            // Create and save Signal entity
            Signal signal = Signal.builder()
                    .symbol(symbol)
                    .signalType(signalType)
                    .strategyType(strategy)
                    .price(currentPrice)
                    .timeframe(timeframe)
                    .confidence(confidence)
                    .message(message)
                    .user(user)
                    .build();

            signal = signalRepository.save(signal);
            log.info("Signal saved: id={}, type={}, symbol={}", signal.getId(), signalType, symbol);

            // Send Telegram notification if signal is not HOLD
            if (signalType != SignalType.HOLD && user.getTelegramChatId() != null) {
                telegramService.sendSignalNotification(user.getTelegramChatId(), signal);
            }

            return mapToSignalResponse(signal);
        } catch (Exception e) {
            log.error("Error generating signal: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate signal", e);
        }
    }

    public List<SignalResponse> getUserSignals(Long userId) {
        List<Signal> signals = signalRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return signals.stream()
                .map(this::mapToSignalResponse)
                .collect(Collectors.toList());
    }

    public List<SignalResponse> getSignalsByStrategy(String symbol, StrategyType strategy) {
        List<Signal> signals = signalRepository.findBySymbolAndStrategyTypeOrderByCreatedAtDesc(symbol, strategy);
        return signals.stream()
                .map(this::mapToSignalResponse)
                .collect(Collectors.toList());
    }

    private double calculateConfidence(StrategyType strategy, List<Candle> candles, SignalType signalType) {
        if (signalType == SignalType.HOLD) {
            return 0.0;
        }

        try {
            Map<String, Object> indicators = strategyEngine.getIndicatorValues(strategy, candles);

            switch (strategy) {
                case RSI:
                    double rsi = (double) indicators.getOrDefault("rsi", 50.0);
                    // Further from 50 = higher confidence
                    return Math.min(100.0, Math.abs(rsi - 50.0) * 2.0);
                case MACD:
                    double histogram = (double) indicators.getOrDefault("histogram", 0.0);
                    return Math.min(100.0, Math.abs(histogram) * 10.0);
                case BOLLINGER_BANDS:
                    double bandwidth = (double) indicators.getOrDefault("bandwidth", 0.0);
                    return Math.min(100.0, bandwidth * 5.0);
                case COMBINED:
                    return 75.0; // Combined strategies have inherently higher confidence
                default:
                    return 50.0;
            }
        } catch (Exception e) {
            log.warn("Error calculating confidence: {}", e.getMessage());
            return 50.0;
        }
    }

    private SignalResponse mapToSignalResponse(Signal signal) {
        return SignalResponse.builder()
                .id(signal.getId())
                .symbol(signal.getSymbol())
                .signalType(signal.getSignalType().name())
                .strategyType(signal.getStrategyType().name())
                .price(signal.getPrice())
                .timeframe(signal.getTimeframe())
                .confidence(signal.getConfidence())
                .message(signal.getMessage())
                .createdAt(signal.getCreatedAt())
                .build();
    }
}
