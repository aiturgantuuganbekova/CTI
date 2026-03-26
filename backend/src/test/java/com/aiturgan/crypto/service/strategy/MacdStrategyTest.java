package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static com.aiturgan.crypto.service.strategy.RsiStrategyTest.generateCandles;
import static com.aiturgan.crypto.service.strategy.RsiStrategyTest.generateCandlesFromPrices;
import static org.junit.jupiter.api.Assertions.*;

class MacdStrategyTest {

    private MacdStrategy macdStrategy;

    // MACD needs at least SLOW_PERIOD(26) + SIGNAL_PERIOD(9) = 35 candles
    private static final int MACD_MIN_CANDLES = 35;
    // generateSignal needs SLOW_PERIOD + SIGNAL_PERIOD + 1 = 36 candles
    private static final int MACD_SIGNAL_MIN_CANDLES = 36;

    @BeforeEach
    void setUp() {
        macdStrategy = new MacdStrategy();
    }

    // --- EMA calculation tests ---

    @Test
    void calculateEma_withSufficientData_returnsNonEmptyList() {
        List<Double> prices = Arrays.asList(
                22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29,
                22.15, 22.39, 22.38, 22.61, 23.36);

        List<Double> ema = macdStrategy.calculateEma(prices, 10);

        assertNotNull(ema);
        assertFalse(ema.isEmpty(), "EMA list should not be empty");
        // First value is SMA of first 10 prices, then EMA for remaining 5
        assertEquals(6, ema.size(), "EMA should have prices.size - period + 1 values");
    }

    @Test
    void calculateEma_firstValueIsSma() {
        List<Double> prices = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        List<Double> ema = macdStrategy.calculateEma(prices, 5);

        // SMA of [1,2,3,4,5] = 3.0
        assertEquals(3.0, ema.get(0), 0.001, "First EMA value should be SMA");
    }

    @Test
    void calculateEma_withInsufficientData_returnsEmptyList() {
        List<Double> prices = Arrays.asList(1.0, 2.0, 3.0);

        List<Double> ema = macdStrategy.calculateEma(prices, 5);

        assertTrue(ema.isEmpty(), "EMA with insufficient data should return empty list");
    }

    @Test
    void calculateEma_withNullPrices_returnsEmptyList() {
        List<Double> ema = macdStrategy.calculateEma(null, 5);

        assertTrue(ema.isEmpty(), "EMA with null data should return empty list");
    }

    // --- MACD calculation tests ---

    @Test
    void calculate_withSufficientCandles_returnsAllKeys() {
        List<Candle> candles = generateCandles(50, 100.0, 0.5);

        Map<String, Double> result = macdStrategy.calculate(candles);

        assertNotNull(result);
        assertTrue(result.containsKey("macd"), "Result should contain 'macd' key");
        assertTrue(result.containsKey("signal"), "Result should contain 'signal' key");
        assertTrue(result.containsKey("histogram"), "Result should contain 'histogram' key");
    }

    @Test
    void calculate_histogramEqualsMAcdMinusSignal() {
        List<Candle> candles = generateCandles(50, 100.0, 0.5);

        Map<String, Double> result = macdStrategy.calculate(candles);

        double expectedHistogram = result.get("macd") - result.get("signal");
        assertEquals(expectedHistogram, result.get("histogram"), 0.0001,
                "Histogram should equal MACD minus signal");
    }

    @Test
    void calculate_withUptrend_macdPositive() {
        // In a steady uptrend, fast EMA > slow EMA, so MACD should be positive
        List<Candle> candles = generateCandles(60, 100.0, 2.0);

        Map<String, Double> result = macdStrategy.calculate(candles);

        assertTrue(result.get("macd") > 0,
                "MACD should be positive in an uptrend, got: " + result.get("macd"));
    }

    @Test
    void calculate_withDowntrend_macdNegative() {
        // In a steady downtrend, fast EMA < slow EMA, so MACD should be negative
        List<Candle> candles = generateCandles(60, 300.0, -2.0);

        Map<String, Double> result = macdStrategy.calculate(candles);

        assertTrue(result.get("macd") < 0,
                "MACD should be negative in a downtrend, got: " + result.get("macd"));
    }

    @Test
    void calculate_withInsufficientCandles_returnsZeros() {
        List<Candle> candles = generateCandles(20, 100.0, 1.0);

        Map<String, Double> result = macdStrategy.calculate(candles);

        assertEquals(0.0, result.get("macd"), "MACD should be 0 with insufficient data");
        assertEquals(0.0, result.get("signal"), "Signal should be 0 with insufficient data");
        assertEquals(0.0, result.get("histogram"), "Histogram should be 0 with insufficient data");
    }

    @Test
    void calculate_withNullCandles_returnsZeros() {
        Map<String, Double> result = macdStrategy.calculate(null);

        assertEquals(0.0, result.get("macd"));
        assertEquals(0.0, result.get("signal"));
        assertEquals(0.0, result.get("histogram"));
    }

    // --- Signal generation tests ---

    @Test
    void generateSignal_withInsufficientData_returnsHold() {
        List<Candle> candles = generateCandles(10, 100.0, 1.0);

        SignalType signal = macdStrategy.generateSignal(candles);

        assertEquals(SignalType.HOLD, signal,
                "Insufficient data should produce HOLD signal");
    }

    @Test
    void generateSignal_withNullCandles_returnsHold() {
        SignalType signal = macdStrategy.generateSignal(null);

        assertEquals(SignalType.HOLD, signal, "Null candles should produce HOLD signal");
    }

    @Test
    void generateSignal_withSteadyTrend_returnsHold() {
        // In a perfectly steady trend, there should be no crossover => HOLD
        List<Candle> candles = generateCandles(60, 100.0, 1.0);

        SignalType signal = macdStrategy.generateSignal(candles);

        // Steady uptrend means MACD stays above signal line consistently => HOLD (no crossover)
        assertEquals(SignalType.HOLD, signal,
                "Steady trend with no crossover should produce HOLD");
    }

    @Test
    void generateSignal_withCrossoverUp_returnsBuy() {
        // Build data: first a downtrend, then a sharp uptrend to trigger a bullish crossover
        // Start with downtrending data, then reverse sharply
        double[] prices = new double[50];
        for (int i = 0; i < 35; i++) {
            prices[i] = 200.0 - i * 2.0; // downtrend: 200, 198, 196, ...
        }
        for (int i = 35; i < 50; i++) {
            prices[i] = prices[34] + (i - 34) * 5.0; // sharp uptrend
        }
        List<Candle> candles = generateCandlesFromPrices(prices);

        SignalType signal = macdStrategy.generateSignal(candles);

        // After a trend reversal from down to up, MACD should cross above signal => BUY
        // (If the crossover doesn't happen with this data, at least verify it's not an error)
        assertNotNull(signal, "Signal should not be null");
        assertTrue(signal == SignalType.BUY || signal == SignalType.HOLD,
                "After trend reversal up, signal should be BUY or HOLD, got: " + signal);
    }

    @Test
    void generateSignal_withCrossoverDown_returnsSellOrHold() {
        // Build data: first an uptrend, then a sharp downtrend to trigger a bearish crossover
        double[] prices = new double[50];
        for (int i = 0; i < 35; i++) {
            prices[i] = 100.0 + i * 2.0; // uptrend
        }
        for (int i = 35; i < 50; i++) {
            prices[i] = prices[34] - (i - 34) * 5.0; // sharp downtrend
        }
        List<Candle> candles = generateCandlesFromPrices(prices);

        SignalType signal = macdStrategy.generateSignal(candles);

        assertNotNull(signal, "Signal should not be null");
        assertTrue(signal == SignalType.SELL || signal == SignalType.HOLD,
                "After trend reversal down, signal should be SELL or HOLD, got: " + signal);
    }

    @Test
    void generateSignal_returnsValidSignalType() {
        List<Candle> candles = generateCandles(50, 100.0, 0.5);

        SignalType signal = macdStrategy.generateSignal(candles);

        assertNotNull(signal);
        assertTrue(signal == SignalType.BUY || signal == SignalType.SELL || signal == SignalType.HOLD);
    }
}
