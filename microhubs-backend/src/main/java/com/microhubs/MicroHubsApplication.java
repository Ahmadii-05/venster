package com.microhubs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class MicroHubsApplication {

    public static void main(String[] args) {
        SpringApplication.run(MicroHubsApplication.class, args);
    }
}
