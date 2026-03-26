package com.aiturgan.crypto.service;

import com.aiturgan.crypto.model.Signal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class TelegramService {

    private static final String TELEGRAM_API_URL = "https://api.telegram.org/bot%s/sendMessage";

    @Value("${app.telegram.bot-token:}")
    private String botToken;

    @Value("${app.telegram.enabled:false}")
    private boolean enabled;

    private final RestTemplate restTemplate;

    public TelegramService() {
        this.restTemplate = new RestTemplate();
    }

    public void sendSignalNotification(String chatId, Signal signal) {
        if (!enabled) {
            log.info("Telegram notifications are disabled. Skipping notification for signal: {} {} {}",
                    signal.getSignalType(), signal.getSymbol(), signal.getStrategyType());
            return;
        }

        if (chatId == null || chatId.isBlank()) {
            log.warn("Telegram chat ID is null or empty. Cannot send notification.");
            return;
        }

        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is not configured. Cannot send notification.");
            return;
        }

        try {
            String message = formatSignalMessage(signal);
            String url = String.format(TELEGRAM_API_URL, botToken);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("chat_id", chatId);
            requestBody.put("text", message);
            requestBody.put("parse_mode", "HTML");

            restTemplate.postForObject(url, requestBody, String.class);

            log.info("Telegram notification sent successfully to chatId: {}", chatId);
        } catch (Exception e) {
            log.error("Failed to send Telegram notification to chatId {}: {}", chatId, e.getMessage());
        }
    }

    public void sendMessage(String chatId, String message) {
        if (!enabled) {
            log.info("Telegram notifications are disabled. Skipping message.");
            return;
        }

        if (chatId == null || chatId.isBlank()) {
            log.warn("Telegram chat ID is null or empty. Cannot send message.");
            return;
        }

        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is not configured. Cannot send message.");
            return;
        }

        try {
            String url = String.format(TELEGRAM_API_URL, botToken);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("chat_id", chatId);
            requestBody.put("text", message);
            requestBody.put("parse_mode", "HTML");

            restTemplate.postForObject(url, requestBody, String.class);

            log.info("Telegram message sent successfully to chatId: {}", chatId);
        } catch (Exception e) {
            log.error("Failed to send Telegram message to chatId {}: {}", chatId, e.getMessage());
        }
    }

    private String formatSignalMessage(Signal signal) {
        String emoji;
        switch (signal.getSignalType()) {
            case BUY:
                emoji = "BUY";
                break;
            case SELL:
                emoji = "SELL";
                break;
            default:
                emoji = "HOLD";
        }

        return String.format(
                "<b>Trading Signal [%s]</b>\n\n" +
                        "Symbol: <b>%s</b>\n" +
                        "Strategy: %s\n" +
                        "Price: %.2f\n" +
                        "Timeframe: %s\n" +
                        "Confidence: %.1f%%\n" +
                        "Time: %s\n\n" +
                        "%s",
                emoji,
                signal.getSymbol(),
                signal.getStrategyType(),
                signal.getPrice() != null ? signal.getPrice() : 0.0,
                signal.getTimeframe() != null ? signal.getTimeframe() : "N/A",
                signal.getConfidence() != null ? signal.getConfidence() : 0.0,
                signal.getCreatedAt() != null ? signal.getCreatedAt().toString() : "N/A",
                signal.getMessage() != null ? signal.getMessage() : ""
        );
    }
}
