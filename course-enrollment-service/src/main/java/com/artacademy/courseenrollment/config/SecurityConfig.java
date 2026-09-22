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

                    // Mutating timetable endpoints – PRINCIPAL only
                    .requestMatchers(HttpMethod.POST,   "/timetables/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/timetables/**").hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/timetables/**").hasRole("PRINCIPAL")

                    // ---- merged from user-service ----
                    // Self-service profile updates – owning role only. Must precede the wildcards below.
                    .requestMatchers(HttpMethod.PUT, "/teachers/me").hasRole("TEACHER")
                    .requestMatchers(HttpMethod.PUT, "/students/me").hasRole("STUDENT")
                    .requestMatchers(HttpMethod.PUT, "/parents/me").hasRole("PARENT")

                    .requestMatchers(HttpMethod.POST, "/principals").hasRole("ADMIN")

                    .requestMatchers(HttpMethod.POST,   "/teachers").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.POST,   "/teachers/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT,    "/teachers/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/teachers/**").hasAnyRole("ADMIN", "PRINCIPAL")

                    .requestMatchers(HttpMethod.POST,   "/students").hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.PUT,    "/students/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/students/**").hasAnyRole("ADMIN", "PRINCIPAL")

                    .requestMatchers(HttpMethod.POST,   "/parents").hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.PUT,    "/parents/**").hasAnyRole("ADMIN", "PRINCIPAL")
                    .requestMatchers(HttpMethod.DELETE, "/parents/**").hasAnyRole("ADMIN", "PRINCIPAL")

                    .requestMatchers(HttpMethod.GET, "/users/login-id/available")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")
                    .requestMatchers(HttpMethod.GET, "/persons/lookup")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER")

                    .requestMatchers(HttpMethod.GET, "/teachers/**")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT")
                    .requestMatchers(HttpMethod.GET, "/students/**")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT")
                    .requestMatchers(HttpMethod.GET, "/parents/**")
                            .hasAnyRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT")

                    // ---- merged from attendance-service ----
                    .requestMatchers(HttpMethod.POST, "/attendance/teachers/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/attendance/corrections/teachers")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/attendance/corrections/students")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/attendance/corrections/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/attendance/students/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT, "/attendance/students/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/attendance/teachers/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/attendance/students/**")
                            .hasAnyRole("STUDENT", "TEACHER", "PRINCIPAL")

                    // ---- merged from payment-service ----
                    .requestMatchers(HttpMethod.POST, "/fees/generate/exam")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/fees/generate/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.PUT, "/fees/bill/**")
                            .hasRole("PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/fees/teachers/summary")
                            .hasRole("PRINCIPAL")
                    .requestMatchers("/fees/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.GET, "/payments")
                            .hasRole("PRINCIPAL")
                    .requestMatchers("/payments/**")
                            .hasAnyRole("TEACHER", "PRINCIPAL")
                    .requestMatchers(HttpMethod.POST, "/payments")
                            .hasAnyRole("TEACHER", "PRINCIPAL")

                    // Read endpoints – any authenticated user
                    .requestMatchers(HttpMethod.GET, "/courses/**").authenticated()
                    .requestMatchers(HttpMethod.GET, "/classes/**").authenticated()
                    .requestMatchers(HttpMethod.GET, "/enrollments/**").authenticated()
                    .requestMatchers(HttpMethod.GET, "/timetables/**").authenticated()

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
