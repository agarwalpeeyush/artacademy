package com.artacademy.notification.config;

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

                    // Send notification – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST, "/notifications/send")
                            .hasRole("PRINCIPAL")

                    // Announcements – broadcast allowed for PRINCIPAL/TEACHER (service enforces
                    // teacher permission); history + permission management PRINCIPAL only.
                    .requestMatchers(HttpMethod.POST, "/notifications/announcements")
                            .hasAnyRole("PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.GET, "/notifications/announcements")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/notifications/announcements/permissions")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT, "/notifications/announcements/permissions/**")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/notifications/announcements/permissions/**")
                            .authenticated()

                    // Read tracking – any authenticated user
                    .requestMatchers(HttpMethod.PUT, "/notifications/**")
                            .authenticated()

                    // View notifications – any authenticated user
                    .requestMatchers(HttpMethod.GET, "/notifications/**")
                            .authenticated()

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
