package com.artacademy.common.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms:900000}")
    private long expirationMs;

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    public String generateToken(String username, List<String> roles) {
        return generateToken(username, roles, false, null);
    }

    public String generateToken(String username, List<String> roles, boolean bootstrap) {
        return generateToken(username, roles, bootstrap, null);
    }

    // personId (D5): the stable identity key. Username may change on staff promotion (D3), so services
    // resolve the current user by this claim, not the subject. Null-safe for tokens minted pre-upgrade.
    public String generateToken(String username, List<String> roles, boolean bootstrap, String personId) {
        var builder = Jwts.builder()
                .subject(username)
                .claim("roles", roles)
                .claim("bootstrap", bootstrap)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs));
        if (personId != null) {
            builder.claim("personId", personId);
        }
        return builder.signWith(signingKey()).compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Stable identity key (D5). Null for tokens minted before the personId claim existed.
    public String extractPersonId(String token) {
        return extractClaim(token, c -> c.get("personId", String.class));
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        List<String> roles = extractClaim(token, c -> (List<String>) c.get("roles"));
        return roles == null ? List.of() : roles;
    }

    public boolean isBootstrap(String token) {
        Boolean bootstrap = extractClaim(token, c -> c.get("bootstrap", Boolean.class));
        return Boolean.TRUE.equals(bootstrap);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }
}
