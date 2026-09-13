package com.artacademy.auth.config;

import com.artacademy.common.security.JwtAuthenticationFilter;
import com.artacademy.common.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationManagers;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    // PRINCIPAL but NOT the bootstrap dummy admin. The bootstrap admin holds PRINCIPAL only so it can
    // create the first real principal (POST /teachers in user-service); every user-management endpoint
    // here is denied to it.
    private static AuthorizationManager<RequestAuthorizationContext> principalNotBootstrap() {
        return AuthorizationManagers.allOf(
                AuthorityAuthorizationManager.hasRole("PRINCIPAL"),
                AuthorizationManagers.not(AuthorityAuthorizationManager.hasRole("BOOTSTRAP")));
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/auth/login", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/actuator/**").permitAll()
                .requestMatchers("/auth/audit-logs").access(principalNotBootstrap())
                .requestMatchers("/auth/users/**").access(principalNotBootstrap())
                .anyRequest().authenticated()
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
