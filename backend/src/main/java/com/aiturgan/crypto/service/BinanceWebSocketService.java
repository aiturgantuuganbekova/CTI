package com.aiturgan.crypto.service;

import com.aiturgan.crypto.model.Candle;
import com.aiturgan.crypto.model.StrategyConfig;
import com.aiturgan.crypto.repository.StrategyConfigRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class BinanceWebSocketService {

    private static final String BINANCE_WS_BASE_URL = "wss://stream.binance.com:9443/ws/";

    private final SimpMessagingTemplate messagingTemplate;
    private final SignalService signalService;
    private final StrategyConfigRepository strategyConfigRepository;
    private final ObjectMapper objectMapper;
    private final ScheduledExecutorService reconnectScheduler;

    private final Map<String, WebSocketClient> activeConnections = new ConcurrentHashMap<>();

    public BinanceWebSocketService(SimpMessagingTemplate messagingTemplate,
                                   SignalService signalService,
                                   StrategyConfigRepository strategyConfigRepository) {
        this.messagingTemplate = messagingTemplate;
        this.signalService = signalService;
        this.strategyConfigRepository = strategyConfigRepository;
        this.objectMapper = new ObjectMapper();
        this.reconnectScheduler = Executors.newScheduledThreadPool(2);
    }

    /**
     * Starts a WebSocket stream for the given symbol and interval.
     * Connects to Binance kline WebSocket and broadcasts closed candles via STOMP.
     */
    public void startStream(String symbol, String interval) {
        String streamKey = buildStreamKey(symbol, interval);

        if (activeConnections.containsKey(streamKey)) {
            log.warn("Stream already active for: {}", streamKey);
            return;
        }

        String lowerSymbol = symbol.toLowerCase();
        String wsUrl = BINANCE_WS_BASE_URL + lowerSymbol + "@kline_" + interval;

        log.info("Starting Binance WebSocket stream: {}", wsUrl);

        try {
            WebSocketClient client = createWebSocketClient(wsUrl, symbol, interval, streamKey);
            activeConnections.put(streamKey, client);
            client.connect();
        } catch (Exception e) {
            log.error("Failed to start WebSocket stream for {}: {}", streamKey, e.getMessage(), e);
            activeConnections.remove(streamKey);
        }
    }

    /**
     * Stops the WebSocket stream for the given symbol.
     * Closes all interval streams for that symbol.
     */
    public void stopStream(String symbol) {
        String upperSymbol = symbol.toUpperCase();
        List<String> keysToRemove = new ArrayList<>();

        activeConnections.forEach((key, client) -> {
            if (key.startsWith(upperSymbol + "_")) {
                keysToRemove.add(key);
            }
        });

        if (keysToRemove.isEmpty()) {
            log.warn("No active stream found for symbol: {}", upperSymbol);
            return;
        }

        for (String key : keysToRemove) {
            closeConnection(key);
        }
    }

    /**
     * Stops all active WebSocket connections.
     */
    public void stopAll() {
        log.info("Stopping all WebSocket streams. Active count: {}", activeConnections.size());
        List<String> keys = new ArrayList<>(activeConnections.keySet());
        for (String key : keys) {
            closeConnection(key);
        }
    }

    /**
     * Returns a list of currently active stream keys (e.g., "BTCUSDT_1h").
     */
    public List<String> getActiveStreams() {
        return new ArrayList<>(activeConnections.keySet());
    }

    @PreDestroy
    public void cleanup() {
        log.info("Cleaning up Binance WebSocket connections on shutdown");
        stopAll();
        reconnectScheduler.shutdown();
        try {
            if (!reconnectScheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                reconnectScheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            reconnectScheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    private WebSocketClient createWebSocketClient(String wsUrl, String symbol, String interval, String streamKey) {
        URI uri;
        try {
            uri = new URI(wsUrl);
        } catch (Exception e) {
            throw new RuntimeException("Invalid WebSocket URI: " + wsUrl, e);
        }

        return new WebSocketClient(uri) {
            @Override
            public void onOpen(ServerHandshake handshake) {
                log.info("WebSocket connected: {} (status: {})", streamKey, handshake.getHttpStatus());
            }

            @Override
            public void onMessage(String message) {
                handleMessage(message, symbol, interval);
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                log.warn("WebSocket closed for {}: code={}, reason={}, remote={}", streamKey, code, reason, remote);
                scheduleReconnect(symbol, interval, streamKey);
            }

            @Override
            public void onError(Exception ex) {
                log.error("WebSocket error for {}: {}", streamKey, ex.getMessage(), ex);
            }
        };
    }

    private void handleMessage(String message, String symbol, String interval) {
        try {
            JsonNode root = objectMapper.readTree(message);

            String eventType = root.has("e") ? root.get("e").asText() : null;
            if (!"kline".equals(eventType)) {
                return;
            }

            JsonNode kline = root.get("k");
            if (kline == null) {
                return;
            }

            boolean isClosed = kline.get("x").asBoolean();

            Candle candle = Candle.builder()
                    .openTime(kline.get("t").asLong())
                    .open(Double.parseDouble(kline.get("o").asText()))
                    .high(Double.parseDouble(kline.get("h").asText()))
                    .low(Double.parseDouble(kline.get("l").asText()))
                    .close(Double.parseDouble(kline.get("c").asText()))
                    .volume(Double.parseDouble(kline.get("v").asText()))
                    .closeTime(kline.get("T").asLong())
                    .build();

            String upperSymbol = symbol.toUpperCase();

            // Always broadcast the current candle data (including in-progress candles)
            messagingTemplate.convertAndSend("/topic/candles/" + upperSymbol, candle);

            // When a candle is closed, trigger signal generation for active strategies
            if (isClosed) {
                log.info("Closed candle received for {} [{}]: O={} H={} L={} C={} V={}",
                        upperSymbol, interval,
                        candle.getOpen(), candle.getHigh(), candle.getLow(),
                        candle.getClose(), candle.getVolume());

                triggerSignalGeneration(upperSymbol, interval);
            }

        } catch (Exception e) {
            log.error("Error processing WebSocket message: {}", e.getMessage(), e);
        }
    }

    private void triggerSignalGeneration(String symbol, String interval) {
        try {
            List<StrategyConfig> activeConfigs = strategyConfigRepository.findByActiveTrue();

            for (StrategyConfig config : activeConfigs) {
                if (config.getSymbol().equalsIgnoreCase(symbol)
                        && config.getTimeframe().equalsIgnoreCase(interval)
                        && config.getUser() != null) {
                    try {
                        log.info("Triggering signal generation: user={}, symbol={}, strategy={}, timeframe={}",
                                config.getUser().getUsername(), symbol, config.getStrategyType(), interval);
                        signalService.generateSignal(config.getUser(), symbol, config.getStrategyType(), interval);
                    } catch (Exception e) {
                        log.error("Failed to generate signal for strategy config id={}: {}",
                                config.getId(), e.getMessage(), e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error triggering signal generation for {} [{}]: {}", symbol, interval, e.getMessage(), e);
        }
    }

    private void scheduleReconnect(String symbol, String interval, String streamKey) {
        // Only attempt reconnect if the stream was not manually stopped
        if (!activeConnections.containsKey(streamKey)) {
            log.info("Stream {} was manually stopped, skipping reconnect", streamKey);
            return;
        }

        log.info("Scheduling reconnect for {} in 5 seconds", streamKey);
        reconnectScheduler.schedule(() -> {
            // Check again if we should reconnect
            if (activeConnections.containsKey(streamKey)) {
                log.info("Reconnecting WebSocket stream: {}", streamKey);
                activeConnections.remove(streamKey);
                startStream(symbol, interval);
            }
        }, 5, TimeUnit.SECONDS);
    }

    private void closeConnection(String streamKey) {
        WebSocketClient client = activeConnections.remove(streamKey);
        if (client != null) {
            try {
                client.close();
                log.info("Closed WebSocket connection: {}", streamKey);
            } catch (Exception e) {
                log.error("Error closing WebSocket connection {}: {}", streamKey, e.getMessage(), e);
            }
        }
    }

    private String buildStreamKey(String symbol, String interval) {
        return symbol.toUpperCase() + "_" + interval;
    }
}
