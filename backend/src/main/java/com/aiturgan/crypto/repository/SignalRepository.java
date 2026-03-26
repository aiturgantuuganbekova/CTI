package com.aiturgan.crypto.repository;

import com.aiturgan.crypto.model.Signal;
import com.aiturgan.crypto.model.enums.StrategyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SignalRepository extends JpaRepository<Signal, Long> {

    List<Signal> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Signal> findBySymbolAndStrategyTypeOrderByCreatedAtDesc(String symbol, StrategyType strategyType);

    List<Signal> findByUserIdAndCreatedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
}
