package com.artacademy.courseenrollment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class CourseEnrollmentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CourseEnrollmentServiceApplication.class, args);
    }
}
