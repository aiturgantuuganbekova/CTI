package com.aiturgan.crypto.model;

import com.aiturgan.crypto.model.enums.StrategyType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "strategy_configs")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StrategyConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "strategy_type")
    private StrategyType strategyType;

    @Builder.Default
    private String symbol = "BTCUSDT";

    @Builder.Default
    private String timeframe = "1h";

    @Builder.Default
    private boolean active = false;

    @Builder.Default
    @Column(name = "stop_loss_percent")
    private Double stopLossPercent = 2.0;

    @Builder.Default
    @Column(name = "take_profit_percent")
    private Double takeProfitPercent = 3.0;

    @Column(columnDefinition = "TEXT")
    private String params;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
