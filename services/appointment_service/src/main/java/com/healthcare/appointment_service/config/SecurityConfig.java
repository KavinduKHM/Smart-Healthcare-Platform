package com.healthcare.appointment_service.config;

import com.healthcare.appointment_service.security.AuthServiceAuthenticationFilter;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

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
                    .requestMatchers("/error").permitAll()

                        // Doctor search/availability - make public so patients (and anonymous users) can view listings and slots
                        .requestMatchers(HttpMethod.GET, "/api/appointments/doctors/**")
                        .permitAll()

                        // Booking & patient flows
                        .requestMatchers(HttpMethod.POST, "/api/appointments")
                        .hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/appointments/patient/**")
                        .hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/appointments/**")
                        .hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/appointments/**")
                        .hasAnyRole("PATIENT", "ADMIN")

                        // Doctor flows
                        .requestMatchers(HttpMethod.GET, "/api/appointments/doctor/**")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/appointments/*/status")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/appointments/*/confirm", "/api/appointments/*/complete")
                        .hasAnyRole("DOCTOR", "ADMIN")

                        // Payment confirmation - patient/admin
                        .requestMatchers(HttpMethod.POST, "/api/appointments/*/payment-intent")
                        .hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/appointments/*/confirm-payment")
                        .hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/appointments/*/review")
                        .hasAnyRole("PATIENT", "ADMIN")

                        // Admin analytics
                        .requestMatchers(HttpMethod.GET, "/api/appointments/admin/reviews/analytics")
                        .hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
