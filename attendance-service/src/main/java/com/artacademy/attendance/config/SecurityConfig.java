package com.artacademy.attendance.config;

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

                    // Mark teacher attendance – TEACHER or PRINCIPAL
                    .requestMatchers(HttpMethod.POST, "/attendance/teachers/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Correction workflow – submit (TEACHER/PRINCIPAL), review (PRINCIPAL)
                    .requestMatchers(HttpMethod.PATCH, "/attendance/corrections/*/approve")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PATCH, "/attendance/corrections/*/reject")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/attendance/corrections/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/attendance/corrections/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Mark/update student attendance – TEACHER or PRINCIPAL
                    .requestMatchers(HttpMethod.POST, "/attendance/students/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT, "/attendance/students/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Read teacher attendance – TEACHER (own students) or PRINCIPAL (all)
                    .requestMatchers(HttpMethod.GET, "/attendance/teachers/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Read student attendance – STUDENT (own), TEACHER or PRINCIPAL
                    .requestMatchers(HttpMethod.GET, "/attendance/students/**")
                            .hasAnyRole("STUDENT", "TEACHER", "PRINCIPAL")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
