package com.aiturgan.crypto.model;

import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import com.aiturgan.crypto.model.enums.TradeStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "trades")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String symbol;

    @Column(name = "entry_price")
    private Double entryPrice;

    @Column(name = "exit_price")
    private Double exitPrice;

    private Double quantity;

    @Column(name = "profit_loss")
    private Double profitLoss;

    @Column(name = "profit_loss_percent")
    private Double profitLossPercent;

    @Enumerated(EnumType.STRING)
    private TradeStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "strategy_type")
    private StrategyType strategyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "signal_type")
    private SignalType signalType;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @PrePersist
    protected void onCreate() {
        this.openedAt = LocalDateTime.now();
    }
}
