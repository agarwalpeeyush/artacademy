package com.artacademy.userservice.config;

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

                    // Mutating teacher endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/teachers/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/teachers/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/teachers/**").hasRole("PRINCIPAL")

                    // Mutating student endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/students/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/students/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/students/**").hasRole("PRINCIPAL")

                    // Read endpoints – PRINCIPAL, TEACHER, or STUDENT
                    .requestMatchers(HttpMethod.GET, "/teachers/**")
                            .hasAnyRole("PRINCIPAL", "TEACHER", "STUDENT")
                    .requestMatchers(HttpMethod.GET, "/students/**")
                            .hasAnyRole("PRINCIPAL", "TEACHER", "STUDENT")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
