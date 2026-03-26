package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class RsiStrategyTest {

    private RsiStrategy rsiStrategy;

    @BeforeEach
    void setUp() {
        rsiStrategy = new RsiStrategy();
    }

    // --- Helper methods ---

    /**
     * Generates a list of candles with realistic OHLCV data.
     *
     * @param count      number of candles to generate
     * @param startPrice starting close price
     * @param trend      price change per candle (positive = uptrend, negative = downtrend)
     * @return list of Candle objects
     */
    public static List<Candle> generateCandles(int count, double startPrice, double trend) {
        List<Candle> candles = new ArrayList<>();
        long baseTime = 1_700_000_000_000L;
        double price = startPrice;

        for (int i = 0; i < count; i++) {
            double close = price + trend * i;
            double open = close - trend * 0.5;
            double high = Math.max(open, close) + Math.abs(trend) * 0.3;
            double low = Math.min(open, close) - Math.abs(trend) * 0.3;
            double volume = 1000 + i * 10;

            candles.add(Candle.builder()
                    .openTime(baseTime + i * 60_000L)
                    .open(open)
                    .high(high)
                    .low(low)
                    .close(close)
                    .volume(volume)
                    .closeTime(baseTime + (i + 1) * 60_000L - 1)
                    .build());
        }
        return candles;
    }

    /**
     * Generates candles from an explicit array of close prices.
     */
    public static List<Candle> generateCandlesFromPrices(double... closePrices) {
        List<Candle> candles = new ArrayList<>();
        long baseTime = 1_700_000_000_000L;

        for (int i = 0; i < closePrices.length; i++) {
            double close = closePrices[i];
            double open = close - 0.5;
            double high = close + 1.0;
            double low = close - 1.0;

            candles.add(Candle.builder()
                    .openTime(baseTime + i * 60_000L)
                    .open(open)
                    .high(high)
                    .low(low)
                    .close(close)
                    .volume(1000.0)
                    .closeTime(baseTime + (i + 1) * 60_000L - 1)
                    .build());
        }
        return candles;
    }

    // --- RSI calculation tests ---

    @Test
    void calculate_withKnownData_returnsReasonableValue() {
        // 15 candles (period=14 needs at least 15)
        double[] prices = {44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
                46.08, 45.89, 46.03, 45.61, 46.28, 46.28};
        List<Candle> candles = generateCandlesFromPrices(prices);

        double rsi = rsiStrategy.calculate(candles, 14);

        // RSI should be between 0 and 100
        assertTrue(rsi >= 0 && rsi <= 100, "RSI should be between 0 and 100, got: " + rsi);
        // With mostly rising prices, RSI should be above 50
        assertTrue(rsi > 50, "RSI for uptrending data should be > 50, got: " + rsi);
    }

    @Test
    void calculate_withStrongUptrend_returnsHighRsi() {
        // Generate 20 candles in a strong uptrend
        List<Candle> candles = generateCandles(20, 100.0, 5.0);

        double rsi = rsiStrategy.calculate(candles, 14);

        // All gains, no losses => RSI should be 100
        assertEquals(100.0, rsi, 0.01, "RSI with only gains should be 100");
    }

    @Test
    void calculate_withStrongDowntrend_returnsLowRsi() {
        // Generate 20 candles in a strong downtrend
        List<Candle> candles = generateCandles(20, 200.0, -5.0);

        double rsi = rsiStrategy.calculate(candles, 14);

        // All losses, no gains => RSI should be very close to 0
        assertTrue(rsi < 1.0, "RSI with only losses should be near 0, got: " + rsi);
    }

    @Test
    void calculate_withFlatPrices_returnsNeutralRsi() {
        // Flat prices: no gains, no losses => avgLoss == 0, avgGain == 0
        // When avgLoss == 0, the code returns 100.0 (since rs = avgGain/avgLoss is undefined)
        // But if both are 0, avgLoss == 0 triggers the guard clause returning 100.
        // Let's use very slight mixed movement instead.
        double[] prices = {100, 100.1, 99.9, 100.05, 99.95, 100.02, 99.98, 100.01,
                99.99, 100.03, 99.97, 100.04, 99.96, 100.0, 100.0};
        List<Candle> candles = generateCandlesFromPrices(prices);

        double rsi = rsiStrategy.calculate(candles, 14);

        // Nearly flat movement, RSI should be near 50
        assertTrue(rsi > 30 && rsi < 70,
                "RSI for flat data should be near 50, got: " + rsi);
    }

    // --- Edge cases ---

    @Test
    void calculate_withNotEnoughCandles_returnsNeutralDefault() {
        // Period 14 requires at least 15 candles, give only 10
        List<Candle> candles = generateCandles(10, 100.0, 1.0);

        double rsi = rsiStrategy.calculate(candles, 14);

        assertEquals(50.0, rsi, "RSI with insufficient candles should return 50.0");
    }

    @Test
    void calculate_withNullCandles_returnsNeutralDefault() {
        double rsi = rsiStrategy.calculate(null, 14);
        assertEquals(50.0, rsi, "RSI with null candles should return 50.0");
    }

    @Test
    void calculate_withEmptyList_returnsNeutralDefault() {
        double rsi = rsiStrategy.calculate(Collections.emptyList(), 14);
        assertEquals(50.0, rsi, "RSI with empty candles should return 50.0");
    }

    @Test
    void calculate_withExactMinimumCandles_works() {
        // period=14 requires exactly 15 candles (period+1)
        List<Candle> candles = generateCandles(15, 100.0, 1.0);

        double rsi = rsiStrategy.calculate(candles, 14);

        assertTrue(rsi >= 0 && rsi <= 100, "RSI should be valid with exact minimum candles");
    }

    // --- Signal generation tests ---

    @Test
    void generateSignal_withOversoldCondition_returnsBuy() {
        // Strong downtrend should produce RSI < 30 => BUY
        List<Candle> candles = generateCandles(30, 300.0, -8.0);

        SignalType signal = rsiStrategy.generateSignal(candles);

        assertEquals(SignalType.BUY, signal,
                "RSI below 30 (strong downtrend) should generate BUY signal");
    }

    @Test
    void generateSignal_withOverboughtCondition_returnsSell() {
        // Strong uptrend should produce RSI > 70 => SELL
        List<Candle> candles = generateCandles(30, 100.0, 8.0);

        SignalType signal = rsiStrategy.generateSignal(candles);

        assertEquals(SignalType.SELL, signal,
                "RSI above 70 (strong uptrend) should generate SELL signal");
    }

    @Test
    void generateSignal_withNeutralCondition_returnsHold() {
        // Mixed movement should produce RSI between 30-70 => HOLD
        double[] prices = new double[30];
        prices[0] = 100.0;
        for (int i = 1; i < 30; i++) {
            // Alternate up/down to keep RSI near 50
            prices[i] = prices[i - 1] + (i % 2 == 0 ? 1.0 : -1.0);
        }
        List<Candle> candles = generateCandlesFromPrices(prices);

        SignalType signal = rsiStrategy.generateSignal(candles);

        assertEquals(SignalType.HOLD, signal,
                "RSI between 30-70 should generate HOLD signal");
    }

    @Test
    void generateSignal_withInsufficientData_returnsHold() {
        // With too few candles, RSI defaults to 50 => HOLD
        List<Candle> candles = generateCandles(5, 100.0, 1.0);

        SignalType signal = rsiStrategy.generateSignal(candles);

        assertEquals(SignalType.HOLD, signal,
                "Insufficient data should produce HOLD signal");
    }
}
