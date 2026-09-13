package com.artacademy.userservice.config;

import com.artacademy.common.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationManagers;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // PRINCIPAL but NOT the bootstrap dummy admin. The bootstrap admin holds the PRINCIPAL role but
    // is scoped to creating the first principal only (a POST /teachers carrying additionalRoles
    // PRINCIPAL, body-checked in TeacherController) — every other mutation is denied here.
    private static AuthorizationManager<RequestAuthorizationContext> principalNotBootstrap() {
        return AuthorizationManagers.allOf(
                AuthorityAuthorizationManager.hasRole("PRINCIPAL"),
                AuthorizationManagers.not(AuthorityAuthorizationManager.hasRole("BOOTSTRAP")));
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

                    // Self-service profile updates – owning role only. Must precede the
                    // PRINCIPAL wildcards below, otherwise "/teachers/**" captures "/teachers/me".
                    .requestMatchers(HttpMethod.PUT, "/teachers/me").hasRole("TEACHER")
                    .requestMatchers(HttpMethod.PUT, "/students/me").hasRole("STUDENT")
                    .requestMatchers(HttpMethod.PUT, "/parents/me").hasRole("PARENT")

                    // Teacher creation – PRINCIPAL (incl. the bootstrap admin, which may create the
                    // first principal). The bootstrap-vs-body rule is enforced in TeacherController.
                    .requestMatchers(HttpMethod.POST, "/teachers").hasRole("PRINCIPAL")

                    // All other mutating teacher endpoints – PRINCIPAL, but never the bootstrap admin
                    .requestMatchers(HttpMethod.POST,   "/teachers/**").access(principalNotBootstrap())
                    .requestMatchers(HttpMethod.PUT,    "/teachers/**").access(principalNotBootstrap())
                    .requestMatchers(HttpMethod.DELETE, "/teachers/**").access(principalNotBootstrap())

                    // Mutating student endpoints – PRINCIPAL, but never the bootstrap admin
                    .requestMatchers(HttpMethod.POST,   "/students/**").access(principalNotBootstrap())
                    .requestMatchers(HttpMethod.PUT,    "/students/**").access(principalNotBootstrap())
                    .requestMatchers(HttpMethod.DELETE, "/students/**").access(principalNotBootstrap())

                    // Mutating parent endpoints – PRINCIPAL, but never the bootstrap admin
                    .requestMatchers(HttpMethod.POST,   "/parents/**").access(principalNotBootstrap())
                    .requestMatchers(HttpMethod.PUT,    "/parents/**").access(principalNotBootstrap())
                    .requestMatchers(HttpMethod.DELETE, "/parents/**").access(principalNotBootstrap())

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
