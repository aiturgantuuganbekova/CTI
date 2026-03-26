package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class RsiStrategy {

    private static final int DEFAULT_PERIOD = 14;
    private static final double OVERSOLD_THRESHOLD = 30.0;
    private static final double OVERBOUGHT_THRESHOLD = 70.0;

    public double calculate(List<Candle> candles, int period) {
        if (candles == null || candles.size() < period + 1) {
            log.warn("Not enough candles to calculate RSI. Required: {}, Got: {}",
                    period + 1, candles == null ? 0 : candles.size());
            return 50.0; // neutral default
        }

        double avgGain = 0.0;
        double avgLoss = 0.0;

        // Calculate initial average gain and loss over the first 'period' changes
        for (int i = 1; i <= period; i++) {
            double change = candles.get(i).getClose() - candles.get(i - 1).getClose();
            if (change > 0) {
                avgGain += change;
            } else {
                avgLoss += Math.abs(change);
            }
        }

        avgGain /= period;
        avgLoss /= period;

        // Smooth using Wilder's smoothing method for remaining candles
        for (int i = period + 1; i < candles.size(); i++) {
            double change = candles.get(i).getClose() - candles.get(i - 1).getClose();
            if (change > 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
            }
        }

        if (avgLoss == 0) {
            return 100.0;
        }

        double rs = avgGain / avgLoss;
        double rsi = 100.0 - (100.0 / (1.0 + rs));

        log.debug("RSI calculated: {} (avgGain={}, avgLoss={}, RS={})", rsi, avgGain, avgLoss, rs);
        return rsi;
    }

    public SignalType generateSignal(List<Candle> candles) {
        double rsi = calculate(candles, DEFAULT_PERIOD);

        if (rsi < OVERSOLD_THRESHOLD) {
            log.info("RSI Signal: BUY (RSI={})", rsi);
            return SignalType.BUY;
        } else if (rsi > OVERBOUGHT_THRESHOLD) {
            log.info("RSI Signal: SELL (RSI={})", rsi);
            return SignalType.SELL;
        } else {
            log.info("RSI Signal: HOLD (RSI={})", rsi);
            return SignalType.HOLD;
        }
    }
}
