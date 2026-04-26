package com.healthcare.telemedicine_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class AuthServiceAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTH_TOKEN_INVALID_ATTR = "authTokenInvalid";

    private static final Logger log = LoggerFactory.getLogger(AuthServiceAuthenticationFilter.class);

    private final RestTemplate restTemplate;
    private final String authServiceUrl;

    public AuthServiceAuthenticationFilter(RestTemplate restTemplate,
                                          @Value("${auth.service.url:${AUTH_SERVICE_URL:http://localhost:8081}}") String authServiceUrl) {
        this.restTemplate = restTemplate;
        this.authServiceUrl = stripTrailingSlash(authServiceUrl);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path != null && (path.startsWith("/ws") || path.startsWith("/actuator"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, authHeader);

            ResponseEntity<AuthValidationResponse> validationResponse = restTemplate.exchange(
                    authServiceUrl + "/api/auth/validate",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    AuthValidationResponse.class
            );

            AuthValidationResponse body = validationResponse.getBody();
            if (validationResponse.getStatusCode().is2xxSuccessful() && body != null) {
                if (!body.isValid()) {
                    request.setAttribute(AUTH_TOKEN_INVALID_ATTR, Boolean.TRUE);
                    filterChain.doFilter(request, response);
                    return;
                }
                var roles = Objects.requireNonNullElse(body.getRoles(), Collections.<String>emptySet());
                var authorities = roles.stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(body.getUsername(), null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (RestClientResponseException ex) {
            log.debug("Token validation failed: status={}, body={}", ex.getRawStatusCode(), ex.getResponseBodyAsString());
            request.setAttribute(AUTH_TOKEN_INVALID_ATTR, Boolean.TRUE);
        } catch (Exception ex) {
            log.warn("Token validation error: {}", ex.getMessage());
            request.setAttribute(AUTH_TOKEN_INVALID_ATTR, Boolean.TRUE);
        }

        filterChain.doFilter(request, response);
    }

    private static String stripTrailingSlash(String url) {
        if (url == null) return "";
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
