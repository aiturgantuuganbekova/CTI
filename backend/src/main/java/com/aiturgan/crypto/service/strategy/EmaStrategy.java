package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class EmaStrategy {

    private static final int SHORT_PERIOD = 9;
    private static final int MEDIUM_PERIOD = 20;
    private static final int LONG_PERIOD = 21;

    public double calculateEma(List<Candle> candles, int period) {
        if (candles == null || candles.size() < period) {
            log.warn("Not enough candles to calculate EMA. Required: {}, Got: {}",
                    period, candles == null ? 0 : candles.size());
            return 0.0;
        }

        // Calculate initial SMA
        double sma = 0.0;
        for (int i = 0; i < period; i++) {
            sma += candles.get(i).getClose();
        }
        sma /= period;

        // Calculate EMA using multiplier
        double multiplier = 2.0 / (period + 1);
        double ema = sma;

        for (int i = period; i < candles.size(); i++) {
            ema = (candles.get(i).getClose() - ema) * multiplier + ema;
        }

        log.debug("EMA({}) calculated: {}", period, ema);
        return ema;
    }

    public SignalType generateSignal(List<Candle> candles) {
        if (candles == null || candles.size() < LONG_PERIOD + 1) {
            log.warn("Not enough candles for EMA signal generation");
            return SignalType.HOLD;
        }

        double currentPrice = candles.get(candles.size() - 1).getClose();
        double emaMedium = calculateEma(candles, MEDIUM_PERIOD);
        double emaShort = calculateEma(candles, SHORT_PERIOD);
        double emaLong = calculateEma(candles, LONG_PERIOD);

        log.debug("EMA values: price={}, EMA({})={}, EMA({})={}, EMA({})={}",
                currentPrice, SHORT_PERIOD, emaShort, MEDIUM_PERIOD, emaMedium, LONG_PERIOD, emaLong);

        // Price > EMA(20) and short EMA(9) > long EMA(21) -> BUY
        if (currentPrice > emaMedium && emaShort > emaLong) {
            log.info("EMA Signal: BUY (price={} > EMA20={}, EMA9={} > EMA21={})",
                    currentPrice, emaMedium, emaShort, emaLong);
            return SignalType.BUY;
        }
        // Price < EMA(20) and short EMA(9) < long EMA(21) -> SELL
        else if (currentPrice < emaMedium && emaShort < emaLong) {
            log.info("EMA Signal: SELL (price={} < EMA20={}, EMA9={} < EMA21={})",
                    currentPrice, emaMedium, emaShort, emaLong);
            return SignalType.SELL;
        } else {
            log.info("EMA Signal: HOLD");
            return SignalType.HOLD;
        }
    }
}
