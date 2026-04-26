package com.healthcare.telemedicine_service.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class JWTChannelInterceptor implements ChannelInterceptor {

    private final RestTemplate restTemplate;

    @Value("${auth.service.url:${AUTH_SERVICE_URL:http://localhost:8081}}")
    private String authServiceUrl;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    HttpHeaders headers = new HttpHeaders();
                    headers.set(HttpHeaders.AUTHORIZATION, authHeader);

                    ResponseEntity<AuthValidationResponse> validationResponse = restTemplate.exchange(
                            stripTrailingSlash(authServiceUrl) + "/api/auth/validate",
                            HttpMethod.GET,
                            new HttpEntity<>(headers),
                            AuthValidationResponse.class
                    );

                    AuthValidationResponse body = validationResponse.getBody();
                    if (validationResponse.getStatusCode().is2xxSuccessful() && body != null && body.isValid()) {
                        var roles = Objects.requireNonNullElse(body.getRoles(), Collections.<String>emptySet());
                        var authorities = roles.stream()
                                .filter(Objects::nonNull)
                                .map(String::trim)
                                .filter(s -> !s.isBlank())
                                .map(SimpleGrantedAuthority::new)
                                .collect(Collectors.toList());

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(body.getUsername(), null, authorities);
                        accessor.setUser(authentication);
                    } else {
                        log.warn("STOMP connection rejected: Invalid token");
                    }
                } catch (Exception e) {
                    log.error("STOMP authentication error: {}", e.getMessage());
                }
            }
        }
        return message;
    }

    private static String stripTrailingSlash(String url) {
        if (url == null) return "";
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
