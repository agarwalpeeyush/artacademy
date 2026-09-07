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

                    // Generate fees – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST, "/fees/generate")
                            .hasRole("PRINCIPAL")

                    // View defaulters and revenue summary – PRINCIPAL only
                    .requestMatchers(HttpMethod.GET, "/fees/defaulters")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/fees/revenue-summary")
                            .hasRole("PRINCIPAL")

                    // Students can view their own fees and payments
                    .requestMatchers(HttpMethod.GET, "/fees/student/**")
                            .hasAnyRole("STUDENT", "TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/payments/student/**")
                            .hasAnyRole("STUDENT", "TEACHER", "PRINCIPAL")

                    // View fee details – TEACHER or PRINCIPAL
                    .requestMatchers(HttpMethod.GET, "/fees/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Record payments – PRINCIPAL or TEACHER
                    .requestMatchers(HttpMethod.POST, "/payments")
                            .hasAnyRole("PRINCIPAL", "TEACHER")

                    // View payments – TEACHER or PRINCIPAL
                    .requestMatchers(HttpMethod.GET, "/payments/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
