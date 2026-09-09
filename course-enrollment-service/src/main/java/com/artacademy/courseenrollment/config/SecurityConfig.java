package com.artacademy.courseenrollment.config;

import com.artacademy.common.security.JwtAuthenticationFilter;
import com.artacademy.common.security.JwtUtil;
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

    private final JwtUtil jwtUtil;

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil);
    }

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

                    // Mutating course endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/courses/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/courses/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/courses/**").hasRole("PRINCIPAL")

                    // Mutating class endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/classes/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/classes/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/classes/**").hasRole("PRINCIPAL")

                    // Mutating enrollment endpoints – PRINCIPAL or TEACHER
                    .requestMatchers(HttpMethod.POST,   "/enrollments/**").hasAnyRole("PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.PUT,    "/enrollments/**").hasAnyRole("PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.DELETE, "/enrollments/**").hasAnyRole("PRINCIPAL", "TEACHER")

                    // Read endpoints – any authenticated user
                    .requestMatchers(HttpMethod.GET, "/courses/**").authenticated()
                    .requestMatchers(HttpMethod.GET, "/classes/**").authenticated()
                    .requestMatchers(HttpMethod.GET, "/enrollments/**").authenticated()

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
