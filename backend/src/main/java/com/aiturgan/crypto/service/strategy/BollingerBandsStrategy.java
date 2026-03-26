package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class BollingerBandsStrategy {

    private static final int DEFAULT_PERIOD = 20;
    private static final double NUM_STD_DEV = 2.0;

    public Map<String, Double> calculate(List<Candle> candles, int period) {
        Map<String, Double> result = new HashMap<>();

        if (candles == null || candles.size() < period) {
            log.warn("Not enough candles to calculate Bollinger Bands. Required: {}, Got: {}",
                    period, candles == null ? 0 : candles.size());
            result.put("upper", 0.0);
            result.put("middle", 0.0);
            result.put("lower", 0.0);
            result.put("bandwidth", 0.0);
            return result;
        }

        // Calculate SMA (middle band) using the last 'period' candles
        int startIndex = candles.size() - period;
        double sum = 0.0;
        for (int i = startIndex; i < candles.size(); i++) {
            sum += candles.get(i).getClose();
        }
        double middle = sum / period;

        // Calculate standard deviation
        double varianceSum = 0.0;
        for (int i = startIndex; i < candles.size(); i++) {
            double diff = candles.get(i).getClose() - middle;
            varianceSum += diff * diff;
        }
        double stdDev = Math.sqrt(varianceSum / period);

        double upper = middle + NUM_STD_DEV * stdDev;
        double lower = middle - NUM_STD_DEV * stdDev;
        double bandwidth = (upper - lower) / middle * 100.0;

        result.put("upper", upper);
        result.put("middle", middle);
        result.put("lower", lower);
        result.put("bandwidth", bandwidth);

        log.debug("Bollinger Bands calculated: upper={}, middle={}, lower={}, bandwidth={}",
                upper, middle, lower, bandwidth);
        return result;
    }

    public SignalType generateSignal(List<Candle> candles) {
        if (candles == null || candles.size() < DEFAULT_PERIOD) {
            log.warn("Not enough candles for Bollinger Bands signal generation");
            return SignalType.HOLD;
        }

        Map<String, Double> bands = calculate(candles, DEFAULT_PERIOD);
        double currentPrice = candles.get(candles.size() - 1).getClose();
        double upper = bands.get("upper");
        double lower = bands.get("lower");

        // Price touches or goes below lower band -> BUY (oversold)
        if (currentPrice <= lower) {
            log.info("Bollinger Bands Signal: BUY (price={} <= lower={})", currentPrice, lower);
            return SignalType.BUY;
        }
        // Price touches or goes above upper band -> SELL (overbought)
        else if (currentPrice >= upper) {
            log.info("Bollinger Bands Signal: SELL (price={} >= upper={})", currentPrice, upper);
            return SignalType.SELL;
        } else {
            log.info("Bollinger Bands Signal: HOLD (price={}, lower={}, upper={})",
                    currentPrice, lower, upper);
            return SignalType.HOLD;
        }
    }
}
