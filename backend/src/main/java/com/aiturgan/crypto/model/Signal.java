package com.aiturgan.crypto.model;

import com.aiturgan.crypto.model.enums.SignalType;
import com.aiturgan.crypto.model.enums.StrategyType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "signals")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Signal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "signal_type")
    private SignalType signalType;

    @Enumerated(EnumType.STRING)
    @Column(name = "strategy_type")
    private StrategyType strategyType;

    private Double price;

    private String timeframe;

    private Double confidence;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
