package com.healthcare.doctor_service.config;

import com.healthcare.doctor_service.security.AuthServiceAuthenticationFilter;
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

                        // Admin-only doctor verification
                        .requestMatchers(HttpMethod.GET, "/api/doctors/pending")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,
                                "/api/doctors/*/verify",
                                "/api/doctors/*/suspend",
                                "/api/doctors/*/reject")
                        .hasRole("ADMIN")

                        // Patient-facing discovery endpoints
                        .requestMatchers(HttpMethod.GET,
                                "/api/doctors/search",
                                "/api/doctors/verified",
                                "/api/doctors/specialty/**",
                                "/api/doctors/*",
                                "/api/doctors/*/availability",
                                "/api/doctors/*/availability/slots",
                                "/api/doctors/*/check-availability")
                        .hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        // Appointment-service integration endpoints (token forwarded from caller)
                        .requestMatchers(HttpMethod.POST, "/api/doctors/*/book-slot")
                        .hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        // Doctor-only profile & operations
                        .requestMatchers(HttpMethod.POST, "/api/doctors/register")
                        .permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/doctors/*/profile")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/doctors/*/availability")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/doctors/*/availability/*")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/doctors/*/prescriptions")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.GET,
                                "/api/doctors/*/prescriptions",
                                "/api/doctors/prescriptions/*")
                        .hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.POST,
                                "/api/doctors/video/sessions",
                                "/api/doctors/video/sessions/join",
                                "/api/doctors/video/sessions/end")
                        .hasAnyRole("DOCTOR", "ADMIN")

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
