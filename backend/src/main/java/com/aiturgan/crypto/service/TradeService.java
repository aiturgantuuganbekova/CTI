package com.aiturgan.crypto.service;

import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.Trade;
import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.TradeStatus;
import com.aiturgan.crypto.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;
    private final BinanceService binanceService;

    public Trade openTrade(User user, Signal signal, double quantity) {
        try {
            Trade trade = Trade.builder()
                    .symbol(signal.getSymbol())
                    .entryPrice(signal.getPrice())
                    .quantity(quantity)
                    .status(TradeStatus.OPEN)
                    .strategyType(signal.getStrategyType())
                    .signalType(signal.getSignalType())
                    .user(user)
                    .build();

            trade = tradeRepository.save(trade);
            log.info("Trade opened: id={}, symbol={}, entryPrice={}, quantity={}",
                    trade.getId(), trade.getSymbol(), trade.getEntryPrice(), trade.getQuantity());

            return trade;
        } catch (Exception e) {
            log.error("Error opening trade: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to open trade", e);
        }
    }

    public Trade closeTrade(Long tradeId, User user) {
        try {
            Trade trade = tradeRepository.findById(tradeId)
                    .orElseThrow(() -> new RuntimeException("Trade not found: " + tradeId));

            if (!trade.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Trade does not belong to user: " + user.getUsername());
            }

            if (trade.getStatus() != TradeStatus.OPEN) {
                throw new RuntimeException("Trade is not open: " + tradeId);
            }

            // Get current price from Binance
            double currentPrice = binanceService.getCurrentPrice(trade.getSymbol());

            // Calculate profit/loss
            double profitLoss = (currentPrice - trade.getEntryPrice()) * trade.getQuantity();
            double profitLossPercent = ((currentPrice - trade.getEntryPrice()) / trade.getEntryPrice()) * 100.0;

            // For SELL signals, profit is inverted (short position)
            if (trade.getSignalType() == com.aiturgan.crypto.model.enums.SignalType.SELL) {
                profitLoss = -profitLoss;
                profitLossPercent = -profitLossPercent;
            }

            trade.setExitPrice(currentPrice);
            trade.setProfitLoss(profitLoss);
            trade.setProfitLossPercent(profitLossPercent);
            trade.setStatus(TradeStatus.CLOSED);
            trade.setClosedAt(LocalDateTime.now());

            trade = tradeRepository.save(trade);
            log.info("Trade closed: id={}, exitPrice={}, P/L={}, P/L%={}",
                    trade.getId(), currentPrice, profitLoss, profitLossPercent);

            return trade;
        } catch (Exception e) {
            log.error("Error closing trade: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to close trade", e);
        }
    }

    public List<Trade> getUserTrades(Long userId) {
        return tradeRepository.findByUserIdOrderByOpenedAtDesc(userId);
    }

    public List<Trade> getOpenTrades(Long userId) {
        return tradeRepository.findByUserIdAndStatus(userId, TradeStatus.OPEN);
    }
}
