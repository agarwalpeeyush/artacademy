package com.artacademy.auth.service;

import com.artacademy.auth.domain.PasswordResetToken;
import com.artacademy.auth.domain.User;
import com.artacademy.auth.repository.PasswordResetTokenRepository;
import com.artacademy.auth.repository.UserRepository;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.NotificationRequestEvent;
import com.artacademy.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final long EXPIRY_HOURS = 1;

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public void initiateReset(String email) {
        // Always return silently for unknown emails to avoid enumeration
        userRepository.findByEmail(email).ifPresent(user -> {
            tokenRepository.deleteByUser(user);

            String rawToken = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(rawToken)
                    .expiryDate(Instant.now().plusSeconds(EXPIRY_HOURS * 3600))
                    .build();
            tokenRepository.save(resetToken);

            NotificationRequestEvent event = NotificationRequestEvent.builder()
                    .recipientEmail(email)
                    .subject("Art Academy — Password Reset")
                    .body("Use this token to reset your password: " + rawToken
                            + "\n\nThis link expires in " + EXPIRY_HOURS + " hour(s).")
                    .channel("EMAIL")
                    .occurredAt(Instant.now())
                    .build();
            kafkaTemplate.send(KafkaTopics.NOTIFICATION_REQUEST, event);
        });
    }

    public String resolveUsername(String rawToken) {
        return tokenRepository.findByToken(rawToken)
                .map(t -> t.getUser().getUsername())
                .orElse("unknown");
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetToken token = tokenRepository.findByToken(rawToken)
                .orElseThrow(() -> ApiException.badRequest("Invalid or expired token"));

        if (token.isUsed()) {
            throw ApiException.badRequest("Token has already been used");
        }
        if (token.getExpiryDate().isBefore(Instant.now())) {
            throw ApiException.badRequest("Token has expired");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);
    }
}
