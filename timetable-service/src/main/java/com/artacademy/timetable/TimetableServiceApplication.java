package com.artacademy.timetable;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class TimetableServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TimetableServiceApplication.class, args);
    }
}
