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

                    // Self-service profile updates – owning role only. Must precede the
                    // PRINCIPAL wildcards below, otherwise "/teachers/**" captures "/teachers/me".
                    .requestMatchers(HttpMethod.PUT, "/teachers/me").hasRole("TEACHER")
                    .requestMatchers(HttpMethod.PUT, "/students/me").hasRole("STUDENT")
                    .requestMatchers(HttpMethod.PUT, "/parents/me").hasRole("PARENT")

                    // Mutating teacher endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/teachers/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/teachers/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/teachers/**").hasRole("PRINCIPAL")

                    // Mutating student endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/students/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/students/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/students/**").hasRole("PRINCIPAL")

                    // Mutating parent endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/parents/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/parents/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/parents/**").hasRole("PRINCIPAL")

                    // Login ID availability check – PRINCIPAL only (used at create time)
                    .requestMatchers(HttpMethod.GET, "/users/login-id/available").hasRole("PRINCIPAL")

                    // Read endpoints – PRINCIPAL, TEACHER, STUDENT, or PARENT
                    .requestMatchers(HttpMethod.GET, "/teachers/**")
                            .hasAnyRole("PRINCIPAL", "TEACHER", "STUDENT")
                    .requestMatchers(HttpMethod.GET, "/students/**")
                            .hasAnyRole("PRINCIPAL", "TEACHER", "STUDENT", "PARENT")
                    .requestMatchers(HttpMethod.GET, "/parents/**")
                            .hasAnyRole("PRINCIPAL", "TEACHER", "STUDENT", "PARENT")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
