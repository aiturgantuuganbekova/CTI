package com.aiturgan.crypto.service.strategy;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static com.aiturgan.crypto.service.strategy.RsiStrategyTest.generateCandles;
import static com.aiturgan.crypto.service.strategy.RsiStrategyTest.generateCandlesFromPrices;
import static org.junit.jupiter.api.Assertions.*;

class BollingerBandsStrategyTest {

    private BollingerBandsStrategy bbStrategy;

    @BeforeEach
    void setUp() {
        bbStrategy = new BollingerBandsStrategy();
    }

    // --- Calculation tests ---

    @Test
    void calculate_returnsAllExpectedKeys() {
        List<Candle> candles = generateCandles(25, 100.0, 0.5);

        Map<String, Double> result = bbStrategy.calculate(candles, 20);

        assertNotNull(result);
        assertTrue(result.containsKey("upper"), "Result should contain 'upper'");
        assertTrue(result.containsKey("middle"), "Result should contain 'middle'");
        assertTrue(result.containsKey("lower"), "Result should contain 'lower'");
        assertTrue(result.containsKey("bandwidth"), "Result should contain 'bandwidth'");
    }

    @Test
    void calculate_upperAboveMiddleAboveLower() {
        List<Candle> candles = generateCandles(25, 100.0, 0.5);

        Map<String, Double> result = bbStrategy.calculate(candles, 20);

        assertTrue(result.get("upper") > result.get("middle"),
                "Upper band should be above middle band");
        assertTrue(result.get("middle") > result.get("lower"),
                "Middle band should be above lower band");
    }

    @Test
    void calculate_middleBandIsSma() {
        // Create 20 candles with known prices to verify SMA calculation
        double[] prices = new double[20];
        double expectedSum = 0;
        for (int i = 0; i < 20; i++) {
            prices[i] = 100.0 + i;
            expectedSum += prices[i];
        }
        double expectedSma = expectedSum / 20.0;
        List<Candle> candles = generateCandlesFromPrices(prices);

        Map<String, Double> result = bbStrategy.calculate(candles, 20);

        assertEquals(expectedSma, result.get("middle"), 0.001,
                "Middle band should be SMA of last 20 close prices");
    }

    @Test
    void calculate_bandwidthIsCorrect() {
        List<Candle> candles = generateCandles(25, 100.0, 1.0);

        Map<String, Double> result = bbStrategy.calculate(candles, 20);

        double expectedBandwidth = (result.get("upper") - result.get("lower")) / result.get("middle") * 100.0;
        assertEquals(expectedBandwidth, result.get("bandwidth"), 0.001,
                "Bandwidth should equal (upper - lower) / middle * 100");
    }

    @Test
    void calculate_withConstantPrices_bandsConverge() {
        // All prices the same => stdDev = 0, so upper = middle = lower
        double[] prices = new double[20];
        for (int i = 0; i < 20; i++) {
            prices[i] = 100.0;
        }
        List<Candle> candles = generateCandlesFromPrices(prices);

        Map<String, Double> result = bbStrategy.calculate(candles, 20);

        assertEquals(100.0, result.get("middle"), 0.001);
        assertEquals(100.0, result.get("upper"), 0.001, "Upper should equal middle when stdDev=0");
        assertEquals(100.0, result.get("lower"), 0.001, "Lower should equal middle when stdDev=0");
        assertEquals(0.0, result.get("bandwidth"), 0.001, "Bandwidth should be 0 when stdDev=0");
    }

    @Test
    void calculate_withHighVolatility_widerBands() {
        // Low volatility data
        double[] lowVol = new double[20];
        for (int i = 0; i < 20; i++) {
            lowVol[i] = 100.0 + (i % 2 == 0 ? 0.1 : -0.1);
        }
        List<Candle> lowVolCandles = generateCandlesFromPrices(lowVol);
        Map<String, Double> lowVolResult = bbStrategy.calculate(lowVolCandles, 20);

        // High volatility data
        double[] highVol = new double[20];
        for (int i = 0; i < 20; i++) {
            highVol[i] = 100.0 + (i % 2 == 0 ? 10.0 : -10.0);
        }
        List<Candle> highVolCandles = generateCandlesFromPrices(highVol);
        Map<String, Double> highVolResult = bbStrategy.calculate(highVolCandles, 20);

        assertTrue(highVolResult.get("bandwidth") > lowVolResult.get("bandwidth"),
                "Higher volatility should produce wider bands");
    }

    @Test
    void calculate_withInsufficientCandles_returnsZeros() {
        List<Candle> candles = generateCandles(10, 100.0, 1.0);

        Map<String, Double> result = bbStrategy.calculate(candles, 20);

        assertEquals(0.0, result.get("upper"));
        assertEquals(0.0, result.get("middle"));
        assertEquals(0.0, result.get("lower"));
        assertEquals(0.0, result.get("bandwidth"));
    }

    @Test
    void calculate_withNullCandles_returnsZeros() {
        Map<String, Double> result = bbStrategy.calculate(null, 20);

        assertEquals(0.0, result.get("upper"));
        assertEquals(0.0, result.get("middle"));
        assertEquals(0.0, result.get("lower"));
        assertEquals(0.0, result.get("bandwidth"));
    }

    // --- Signal generation tests ---

    @Test
    void generateSignal_priceAtLowerBand_returnsBuy() {
        // Create 20 candles at a stable price, then last candle far below => touches lower band
        double[] prices = new double[21];
        for (int i = 0; i < 20; i++) {
            prices[i] = 100.0 + (i % 2 == 0 ? 1.0 : -1.0);
        }
        // Last price drops well below lower band
        prices[20] = 80.0;
        List<Candle> candles = generateCandlesFromPrices(prices);

        SignalType signal = bbStrategy.generateSignal(candles);

        assertEquals(SignalType.BUY, signal,
                "Price at or below lower band should generate BUY signal");
    }

    @Test
    void generateSignal_priceAtUpperBand_returnsSell() {
        // Create 20 candles at a stable price, then last candle far above => touches upper band
        double[] prices = new double[21];
        for (int i = 0; i < 20; i++) {
            prices[i] = 100.0 + (i % 2 == 0 ? 1.0 : -1.0);
        }
        // Last price spikes well above upper band
        prices[20] = 120.0;
        List<Candle> candles = generateCandlesFromPrices(prices);

        SignalType signal = bbStrategy.generateSignal(candles);

        assertEquals(SignalType.SELL, signal,
                "Price at or above upper band should generate SELL signal");
    }

    @Test
    void generateSignal_priceWithinBands_returnsHold() {
        // All prices stable around the same value => last price within bands
        double[] prices = new double[21];
        for (int i = 0; i < 21; i++) {
            prices[i] = 100.0 + (i % 2 == 0 ? 0.5 : -0.5);
        }
        List<Candle> candles = generateCandlesFromPrices(prices);

        SignalType signal = bbStrategy.generateSignal(candles);

        assertEquals(SignalType.HOLD, signal,
                "Price within bands should generate HOLD signal");
    }

    @Test
    void generateSignal_withInsufficientData_returnsHold() {
        List<Candle> candles = generateCandles(10, 100.0, 1.0);

        SignalType signal = bbStrategy.generateSignal(candles);

        assertEquals(SignalType.HOLD, signal,
                "Insufficient data should produce HOLD signal");
    }

    @Test
    void generateSignal_withNullCandles_returnsHold() {
        SignalType signal = bbStrategy.generateSignal(null);

        assertEquals(SignalType.HOLD, signal,
                "Null candles should produce HOLD signal");
    }
}
