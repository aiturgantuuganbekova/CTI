package com.aiturgan.crypto.repository;

import com.aiturgan.crypto.model.Trade;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.model.enums.TradeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    List<Trade> findByUserIdOrderByOpenedAtDesc(Long userId);

    List<Trade> findByUserIdAndStatus(Long userId, TradeStatus status);

    List<Trade> findByUserIdAndStrategyType(Long userId, StrategyType strategyType);

    List<Trade> findByStatus(TradeStatus status);
}
