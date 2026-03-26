package com.aiturgan.crypto.controller;

import com.aiturgan.crypto.model.User;
import com.aiturgan.crypto.model.enums.Role;
import com.aiturgan.crypto.repository.SignalRepository;
import com.aiturgan.crypto.repository.StrategyConfigRepository;
import com.aiturgan.crypto.repository.TradeRepository;
import com.aiturgan.crypto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final SignalRepository signalRepository;
    private final TradeRepository tradeRepository;
    private final StrategyConfigRepository strategyConfigRepository;

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(this::mapUserWithoutPassword)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable Long id, @RequestParam String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));

        try {
            Role newRole = Role.valueOf(role);
            user.setRole(newRole);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Role updated successfully",
                    "userId", id,
                    "newRole", newRole.name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + role));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalSignals", signalRepository.count());
        stats.put("totalTrades", tradeRepository.count());
        stats.put("activeStrategies", strategyConfigRepository.findByActiveTrue().size());
        return ResponseEntity.ok(stats);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully", "userId", id));
    }

    private Map<String, Object> mapUserWithoutPassword(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("role", user.getRole().name());
        map.put("telegramChatId", user.getTelegramChatId());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }
}
