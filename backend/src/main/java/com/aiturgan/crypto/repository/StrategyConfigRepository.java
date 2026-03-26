package com.aiturgan.crypto.repository;

import com.aiturgan.crypto.model.StrategyConfig;
import com.aiturgan.crypto.model.enums.StrategyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StrategyConfigRepository extends JpaRepository<StrategyConfig, Long> {

    List<StrategyConfig> findByUserId(Long userId);

    List<StrategyConfig> findByActiveTrue();

    Optional<StrategyConfig> findByUserIdAndStrategyTypeAndSymbol(Long userId, StrategyType strategyType, String symbol);
}
