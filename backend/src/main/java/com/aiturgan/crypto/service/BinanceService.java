package com.aiturgan.crypto.service;

import com.aiturgan.crypto.model.Candle;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class BinanceService {

    private static final String BASE_URL = "https://api.binance.com/api/v3";
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public BinanceService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public List<Candle> getKlines(String symbol, String interval, int limit) {
        try {
            String url = String.format("%s/klines?symbol=%s&interval=%s&limit=%d",
                    BASE_URL, symbol, interval, limit);

            log.info("Fetching klines from Binance: symbol={}, interval={}, limit={}", symbol, interval, limit);
            String response = restTemplate.getForObject(url, String.class);

            return parseKlines(response);
        } catch (Exception e) {
            log.error("Error fetching klines from Binance: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch klines from Binance", e);
        }
    }

    public double getCurrentPrice(String symbol) {
        try {
            String url = String.format("%s/ticker/price?symbol=%s", BASE_URL, symbol);

            log.info("Fetching current price from Binance: symbol={}", symbol);
            String response = restTemplate.getForObject(url, String.class);

            JsonNode jsonNode = objectMapper.readTree(response);
            double price = Double.parseDouble(jsonNode.get("price").asText());

            log.info("Current price for {}: {}", symbol, price);
            return price;
        } catch (Exception e) {
            log.error("Error fetching current price from Binance: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch current price from Binance", e);
        }
    }

    public List<Candle> getKlinesBetween(String symbol, String interval, long startTime, long endTime) {
        try {
            String url = String.format("%s/klines?symbol=%s&interval=%s&startTime=%d&endTime=%d&limit=1000",
                    BASE_URL, symbol, interval, startTime, endTime);

            log.info("Fetching klines from Binance: symbol={}, interval={}, startTime={}, endTime={}",
                    symbol, interval, startTime, endTime);
            String response = restTemplate.getForObject(url, String.class);

            List<Candle> allCandles = new ArrayList<>(parseKlines(response));

            // Binance returns max 1000 candles per request, paginate if needed
            while (allCandles.size() > 0) {
                long lastCloseTime = allCandles.get(allCandles.size() - 1).getCloseTime();
                if (lastCloseTime >= endTime) {
                    break;
                }

                String nextUrl = String.format("%s/klines?symbol=%s&interval=%s&startTime=%d&endTime=%d&limit=1000",
                        BASE_URL, symbol, interval, lastCloseTime + 1, endTime);
                String nextResponse = restTemplate.getForObject(nextUrl, String.class);
                List<Candle> nextCandles = parseKlines(nextResponse);

                if (nextCandles.isEmpty()) {
                    break;
                }

                allCandles.addAll(nextCandles);
            }

            log.info("Fetched {} candles total for {} between {} and {}", allCandles.size(), symbol, startTime, endTime);
            return allCandles;
        } catch (Exception e) {
            log.error("Error fetching klines between dates from Binance: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch historical klines from Binance", e);
        }
    }

    private List<Candle> parseKlines(String response) {
        List<Candle> candles = new ArrayList<>();
        try {
            JsonNode arrayNode = objectMapper.readTree(response);
            for (JsonNode node : arrayNode) {
                Candle candle = Candle.builder()
                        .openTime(node.get(0).asLong())
                        .open(Double.parseDouble(node.get(1).asText()))
                        .high(Double.parseDouble(node.get(2).asText()))
                        .low(Double.parseDouble(node.get(3).asText()))
                        .close(Double.parseDouble(node.get(4).asText()))
                        .volume(Double.parseDouble(node.get(5).asText()))
                        .closeTime(node.get(6).asLong())
                        .build();
                candles.add(candle);
            }
        } catch (Exception e) {
            log.error("Error parsing klines response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse Binance klines response", e);
        }
        return candles;
    }
}
