package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class MacdStrategy {

    private static final int FAST_PERIOD = 12;
    private static final int SLOW_PERIOD = 26;
    private static final int SIGNAL_PERIOD = 9;

    public List<Double> calculateEma(List<Double> prices, int period) {
        List<Double> emaValues = new ArrayList<>();

        if (prices == null || prices.size() < period) {
            return emaValues;
        }

        // Calculate initial SMA as the first EMA value
        double sma = 0.0;
        for (int i = 0; i < period; i++) {
            sma += prices.get(i);
        }
        sma /= period;
        emaValues.add(sma);

        // Calculate EMA using multiplier
        double multiplier = 2.0 / (period + 1);
        for (int i = period; i < prices.size(); i++) {
            double ema = (prices.get(i) - emaValues.get(emaValues.size() - 1)) * multiplier
                    + emaValues.get(emaValues.size() - 1);
            emaValues.add(ema);
        }

        return emaValues;
    }

    public Map<String, Double> calculate(List<Candle> candles) {
        Map<String, Double> result = new HashMap<>();

        if (candles == null || candles.size() < SLOW_PERIOD + SIGNAL_PERIOD) {
            log.warn("Not enough candles to calculate MACD. Required: {}, Got: {}",
                    SLOW_PERIOD + SIGNAL_PERIOD, candles == null ? 0 : candles.size());
            result.put("macd", 0.0);
            result.put("signal", 0.0);
            result.put("histogram", 0.0);
            return result;
        }

        List<Double> closePrices = candles.stream()
                .map(Candle::getClose)
                .collect(Collectors.toList());

        List<Double> fastEma = calculateEma(closePrices, FAST_PERIOD);
        List<Double> slowEma = calculateEma(closePrices, SLOW_PERIOD);

        // MACD line = Fast EMA - Slow EMA
        // Align the two EMA lists: fastEma starts at index FAST_PERIOD-1, slowEma at SLOW_PERIOD-1
        // So we need to offset fastEma by (SLOW_PERIOD - FAST_PERIOD)
        int offset = SLOW_PERIOD - FAST_PERIOD;
        List<Double> macdLine = new ArrayList<>();
        for (int i = 0; i < slowEma.size(); i++) {
            macdLine.add(fastEma.get(i + offset) - slowEma.get(i));
        }

        // Signal line = EMA(9) of MACD line
        List<Double> signalLine = calculateEma(macdLine, SIGNAL_PERIOD);

        if (signalLine.isEmpty()) {
            result.put("macd", 0.0);
            result.put("signal", 0.0);
            result.put("histogram", 0.0);
            return result;
        }

        double latestMacd = macdLine.get(macdLine.size() - 1);
        double latestSignal = signalLine.get(signalLine.size() - 1);
        double histogram = latestMacd - latestSignal;

        result.put("macd", latestMacd);
        result.put("signal", latestSignal);
        result.put("histogram", histogram);

        log.debug("MACD calculated: macd={}, signal={}, histogram={}", latestMacd, latestSignal, histogram);
        return result;
    }

    public SignalType generateSignal(List<Candle> candles) {
        if (candles == null || candles.size() < SLOW_PERIOD + SIGNAL_PERIOD + 1) {
            log.warn("Not enough candles for MACD signal generation");
            return SignalType.HOLD;
        }

        // Calculate MACD for current and previous candle set to detect crossover
        Map<String, Double> current = calculate(candles);
        Map<String, Double> previous = calculate(candles.subList(0, candles.size() - 1));

        double currentMacd = current.get("macd");
        double currentSignal = current.get("signal");
        double previousMacd = previous.get("macd");
        double previousSignal = previous.get("signal");

        // MACD crosses above signal line -> BUY
        if (previousMacd <= previousSignal && currentMacd > currentSignal) {
            log.info("MACD Signal: BUY (MACD crossed above signal line)");
            return SignalType.BUY;
        }
        // MACD crosses below signal line -> SELL
        else if (previousMacd >= previousSignal && currentMacd < currentSignal) {
            log.info("MACD Signal: SELL (MACD crossed below signal line)");
            return SignalType.SELL;
        } else {
            log.info("MACD Signal: HOLD (no crossover detected)");
            return SignalType.HOLD;
        }
    }
}
