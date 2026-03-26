package com.aiturgan.crypto.service;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.service.strategy.BollingerBandsStrategy;
import com.aiturgan.crypto.service.strategy.EmaStrategy;
import com.aiturgan.crypto.service.strategy.MacdStrategy;
import com.aiturgan.crypto.service.strategy.RsiStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StrategyEngine {

    private final RsiStrategy rsiStrategy;
    private final MacdStrategy macdStrategy;
    private final EmaStrategy emaStrategy;
    private final BollingerBandsStrategy bollingerBandsStrategy;

    public SignalType executeStrategy(StrategyType type, List<Candle> candles) {
        log.info("Executing strategy: {}", type);

        try {
            switch (type) {
                case RSI:
                    return rsiStrategy.generateSignal(candles);
                case MACD:
                    return macdStrategy.generateSignal(candles);
                case EMA:
                    return emaStrategy.generateSignal(candles);
                case BOLLINGER_BANDS:
                    return bollingerBandsStrategy.generateSignal(candles);
                case COMBINED:
                    return executeCombinedStrategy(candles);
                default:
                    log.warn("Unknown strategy type: {}", type);
                    return SignalType.HOLD;
            }
        } catch (Exception e) {
            log.error("Error executing strategy {}: {}", type, e.getMessage());
            return SignalType.HOLD;
        }
    }

    private SignalType executeCombinedStrategy(List<Candle> candles) {
        SignalType rsiSignal = rsiStrategy.generateSignal(candles);
        SignalType macdSignal = macdStrategy.generateSignal(candles);
        SignalType emaSignal = emaStrategy.generateSignal(candles);
        SignalType bbSignal = bollingerBandsStrategy.generateSignal(candles);

        int buyCount = 0;
        int sellCount = 0;

        SignalType[] signals = {rsiSignal, macdSignal, emaSignal, bbSignal};
        for (SignalType signal : signals) {
            if (signal == SignalType.BUY) buyCount++;
            else if (signal == SignalType.SELL) sellCount++;
        }

        log.info("Combined strategy votes: BUY={}, SELL={}, HOLD={}",
                buyCount, sellCount, 4 - buyCount - sellCount);

        // Majority voting
        if (buyCount > sellCount && buyCount >= 2) {
            return SignalType.BUY;
        } else if (sellCount > buyCount && sellCount >= 2) {
            return SignalType.SELL;
        } else {
            return SignalType.HOLD;
        }
    }

    public Map<String, Object> getIndicatorValues(StrategyType type, List<Candle> candles) {
        Map<String, Object> indicators = new HashMap<>();

        try {
            switch (type) {
                case RSI:
                    indicators.put("rsi", rsiStrategy.calculate(candles, 14));
                    break;
                case MACD:
                    indicators.putAll(macdStrategy.calculate(candles));
                    break;
                case EMA:
                    indicators.put("ema9", emaStrategy.calculateEma(candles, 9));
                    indicators.put("ema20", emaStrategy.calculateEma(candles, 20));
                    indicators.put("ema21", emaStrategy.calculateEma(candles, 21));
                    break;
                case BOLLINGER_BANDS:
                    indicators.putAll(bollingerBandsStrategy.calculate(candles, 20));
                    break;
                case COMBINED:
                    indicators.put("rsi", rsiStrategy.calculate(candles, 14));
                    indicators.putAll(macdStrategy.calculate(candles));
                    indicators.put("ema9", emaStrategy.calculateEma(candles, 9));
                    indicators.put("ema20", emaStrategy.calculateEma(candles, 20));
                    indicators.put("ema21", emaStrategy.calculateEma(candles, 21));
                    indicators.putAll(bollingerBandsStrategy.calculate(candles, 20));
                    break;
            }
        } catch (Exception e) {
            log.error("Error calculating indicator values for {}: {}", type, e.getMessage());
        }

        return indicators;
    }
}
