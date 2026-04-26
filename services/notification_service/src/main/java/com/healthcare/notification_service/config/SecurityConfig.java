package com.healthcare.notification_service.config;

import com.healthcare.notification_service.security.AuthServiceAuthenticationFilter;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(2))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   AuthServiceAuthenticationFilter authFilter) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            String header = request.getHeader(HttpHeaders.AUTHORIZATION);
                            boolean hasBearer = header != null && header.startsWith("Bearer ");
                            boolean invalidToken = Boolean.TRUE.equals(request.getAttribute(AuthServiceAuthenticationFilter.AUTH_TOKEN_INVALID_ATTR));
                            response.setStatus((hasBearer && !invalidToken) ? HttpStatus.FORBIDDEN.value() : HttpStatus.UNAUTHORIZED.value());
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                response.setStatus(HttpStatus.FORBIDDEN.value()))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**").permitAll()

                        // Lightweight public health/info endpoints
                        .requestMatchers(HttpMethod.GET,
                                "/api/notifications/health",
                                "/api/notifications/")
                        .permitAll()

                        // Admin diagnostics
                        .requestMatchers(HttpMethod.GET, "/api/notifications/failed")
                        .hasRole("ADMIN")

                        // User notifications (any authenticated user)
                        .requestMatchers(HttpMethod.GET, "/api/notifications/user/**")
                        .hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        // Internal notification trigger (token forwarded from caller)
                        .requestMatchers(HttpMethod.POST, "/api/notifications/appointment")
                        .hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
