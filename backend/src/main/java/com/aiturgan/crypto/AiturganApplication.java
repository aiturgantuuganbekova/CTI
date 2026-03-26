package com.aiturgan.crypto;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AiturganApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiturganApplication.class, args);
    }
}
