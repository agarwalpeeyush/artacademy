package com.artacademy.payment.config;

import com.artacademy.common.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // Actuator & Swagger – publicly accessible
                    .requestMatchers(
                            "/actuator/**",
                            "/v3/api-docs/**",
                            "/swagger-ui/**",
                            "/swagger-ui.html"
                    ).permitAll()

                    // Bill generation – EXAM cohort is PRINCIPAL only; per-enrollment is TEACHER/PRINCIPAL
                    .requestMatchers(HttpMethod.POST, "/fees/generate/exam")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/fees/generate/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Bill edit / share override – PRINCIPAL only
                    .requestMatchers(HttpMethod.PUT, "/fees/bill/**")
                            .hasRole("PRINCIPAL")

                    // Teacher revenue rollups – PRINCIPAL only
                    .requestMatchers(HttpMethod.GET, "/fees/teachers/summary")
                            .hasRole("PRINCIPAL")

                    // Fee catalogue, bills, picker, single-teacher summary – TEACHER or PRINCIPAL
                    .requestMatchers("/fees/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // List all payments (with date filter) – PRINCIPAL only
                    .requestMatchers(HttpMethod.GET, "/payments")
                            .hasRole("PRINCIPAL")

                    // Payments (record, reads, receipt) – TEACHER or PRINCIPAL
                    .requestMatchers("/payments/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/payments")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
