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

                    // Self-service profile updates – owning role only. Must precede the wildcards
                    // below, otherwise "/teachers/**" captures "/teachers/me".
                    .requestMatchers(HttpMethod.PUT, "/teachers/me").hasRole("TEACHER")
                    .requestMatchers(HttpMethod.PUT, "/students/me").hasRole("STUDENT")
                    .requestMatchers(HttpMethod.PUT, "/parents/me").hasRole("PARENT")

                    // Principal creation (A.6 / D8) – ADMIN only. A Principal is a teacher Person plus the
                    // elevated PRINCIPAL role; the standing seeded ADMIN provisions them.
                    .requestMatchers(HttpMethod.POST, "/principals").hasRole("ADMIN")

                    // Teacher creation – PRINCIPAL (or ADMIN, who sits above). Other teacher mutations
                    // are PRINCIPAL/ADMIN.
                    .requestMatchers(HttpMethod.POST,   "/teachers").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.POST,   "/teachers/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/teachers/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/teachers/**").hasAnyRole("ADMIN", "PRINCIPAL")

                    // Student creation – PRINCIPAL or TEACHER (A.6); other student mutations PRINCIPAL/ADMIN.
                    .requestMatchers(HttpMethod.POST,   "/students").hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.PUT,    "/students/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/students/**").hasAnyRole("ADMIN", "PRINCIPAL")

                    // Parent creation – PRINCIPAL or TEACHER (A.6); other parent mutations PRINCIPAL/ADMIN.
                    .requestMatchers(HttpMethod.POST,   "/parents").hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.PUT,    "/parents/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/parents/**").hasAnyRole("ADMIN", "PRINCIPAL")

                    // Login ID availability check – used at create time by the provisioning tiers.
                    .requestMatchers(HttpMethod.GET, "/users/login-id/available")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")

                    // Phone lookup for confirm-and-link (OQ1) – the provisioning tiers.
                    .requestMatchers(HttpMethod.GET, "/persons/lookup")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")

                    // Read endpoints – any authenticated staff/family role.
                    .requestMatchers(HttpMethod.GET, "/teachers/**")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT")
                    .requestMatchers(HttpMethod.GET, "/students/**")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT")
                    .requestMatchers(HttpMethod.GET, "/parents/**")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
