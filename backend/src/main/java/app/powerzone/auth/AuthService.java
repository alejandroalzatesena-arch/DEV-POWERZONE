package app.powerzone.auth;

import app.powerzone.common.Actor;
import app.powerzone.common.SecurityConfig;
import app.powerzone.common.TableStore;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Service
public class AuthService {
    private final TableStore db;
    private final PasswordEncoder passwords;
    private final JwtEncoder accessEncoder;
    private final JwtEncoder refreshEncoder;
    private final JwtDecoder refreshDecoder;
    private final long accessSeconds;
    private final long refreshSeconds;
    private final Map<String, FailureWindow> failures = new ConcurrentHashMap<>();

    private record FailureWindow(int count, Instant since) {}

    public AuthService(TableStore db, PasswordEncoder passwords, JwtEncoder accessEncoder,
            @Value("${powerzone.jwt.refresh-secret}") String refreshSecret,
            @Value("${powerzone.jwt.access-seconds}") long accessSeconds,
            @Value("${powerzone.jwt.refresh-seconds}") long refreshSeconds) {
        this.db = db;
        this.passwords = passwords;
        this.accessEncoder = accessEncoder;
        SecretKey key = SecurityConfig.key(refreshSecret);
        this.refreshEncoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.refreshDecoder = NimbusJwtDecoder.withSecretKey(key).build();
        this.accessSeconds = accessSeconds;
        this.refreshSeconds = refreshSeconds;
    }

    @Transactional
    public Map<String, Object> register(Map<String, Object> input) {
        String email = required(input, "email").toLowerCase();
        if (db.findOne("users", Map.of("email", email), null, null) != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una cuenta con ese email.");
        UUID gymId = uuid(required(input, "gymId"));
        Map<String, Object> gym = db.read("gyms", gymId, null, null);
        if (!Boolean.TRUE.equals(gym.get("isActive")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El gimnasio está inactivo.");
        var user = db.insert("users", Map.of("email", email, "password", passwords.encode(required(input, "password")),
                "firstName", required(input, "firstName"), "lastName", required(input, "lastName"),
                "phone", input.getOrDefault("phone", ""), "role", "client", "gymId", gymId));
        db.insert("user_profiles", Map.of("userId", user.get("id"), "activityLevel", "moderate",
                "goal", "general_fitness"));
        return Map.of("user", publicUser(user), "tokens", issue(user));
    }

    @Transactional
    public Map<String, Object> login(Map<String, Object> input) {
        String email = required(input, "email").toLowerCase();
        FailureWindow window = failures.get(email);
        if (window != null && window.count() >= 5 && window.since().isAfter(Instant.now().minus(15, ChronoUnit.MINUTES)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Demasiados intentos fallidos. Intenta más tarde.");
        var user = db.findOne("users", Map.of("email", email), null, null);
        if (user == null || !passwords.matches(required(input, "password"), String.valueOf(user.get("password")))
                || !Boolean.TRUE.equals(user.get("isActive"))) {
            failures.compute(email, (key, old) -> old == null || old.since().isBefore(Instant.now().minus(15, ChronoUnit.MINUTES))
                    ? new FailureWindow(1, Instant.now()) : new FailureWindow(old.count() + 1, old.since()));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas.");
        }
        failures.remove(email);
        db.execute("UPDATE users SET last_login_at=now() WHERE id=:id", Map.of("id", uuid(user.get("id"))));
        return Map.of("user", publicUser(user), "tokens", issue(user));
    }

    @Transactional
    public Map<String, Object> refresh(String token) {
        Jwt jwt = decodeRefresh(token);
        UUID tokenId = uuid(jwt.getClaimAsString("tokenId"));
        UUID userId = uuid(jwt.getSubject());
        var stored = db.readOrNull("refresh_tokens", tokenId);
        if (stored == null || stored.get("revokedAt") != null || !userId.toString().equals(stored.get("userId"))
                || !hash(token).equals(stored.get("tokenHash")))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido o revocado.");
        int revoked = db.execute("UPDATE refresh_tokens SET revoked_at=now() " +
                "WHERE id=:id AND revoked_at IS NULL", Map.of("id", tokenId));
        if (revoked != 1) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token ya utilizado.");
        var user = db.read("users", userId, null, null);
        return issue(user);
    }

    @Transactional
    public void logout(String token) {
        try {
            Jwt jwt = decodeRefresh(token);
            db.execute("UPDATE refresh_tokens SET revoked_at=now() WHERE id=:id AND user_id=:userId",
                    Map.of("id", uuid(jwt.getClaimAsString("tokenId")), "userId", uuid(jwt.getSubject())));
        } catch (RuntimeException ignored) {
            // Logout is idempotent for expired or already revoked sessions.
        }
    }

    @Transactional
    public void changePassword(Actor actor, String current, String replacement) {
        var user = db.read("users", actor.id(), null, null);
        if (!passwords.matches(current, String.valueOf(user.get("password"))))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La contraseña actual es incorrecta.");
        if (replacement == null || replacement.length() < 8)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña requiere al menos 8 caracteres.");
        db.execute("UPDATE users SET password=:password,updated_at=now() WHERE id=:id",
                Map.of("password", passwords.encode(replacement), "id", actor.id()));
        db.execute("UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=:id AND revoked_at IS NULL",
                Map.of("id", actor.id()));
    }

    public Map<String, Object> me(Actor actor) { return publicUser(db.read("users", actor.id(), null, null)); }

    private Map<String, Object> issue(Map<String, Object> user) {
        Instant now = Instant.now();
        var claimsBuilder = JwtClaimsSet.builder().issuedAt(now).expiresAt(now.plusSeconds(accessSeconds))
                .subject(String.valueOf(user.get("id"))).claim("email", user.get("email"))
                .claim("role", user.get("role"))
                .claim("isSuperAdmin", user.get("isSuperAdmin"));
        if (user.get("gymId") != null) claimsBuilder.claim("gymId", user.get("gymId"));
        var claims = claimsBuilder.build();
        String access = accessEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        UUID tokenId = UUID.randomUUID();
        var refreshClaims = JwtClaimsSet.builder().issuedAt(now).expiresAt(now.plusSeconds(refreshSeconds))
                .subject(String.valueOf(user.get("id"))).claim("tokenId", tokenId.toString())
                .claim("type", "refresh").build();
        String refresh = refreshEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                refreshClaims)).getTokenValue();
        db.insert("refresh_tokens", Map.of("id", tokenId, "userId", user.get("id"), "tokenHash", hash(refresh),
                "expiresAt", java.sql.Timestamp.from(now.plusSeconds(refreshSeconds))));
        return Map.of("accessToken", access, "refreshToken", refresh, "expiresIn", accessSeconds);
    }

    private Jwt decodeRefresh(String token) {
        try {
            Jwt jwt = refreshDecoder.decode(token);
            if (!"refresh".equals(jwt.getClaimAsString("type"))) throw new IllegalArgumentException();
            return jwt;
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido o expirado.");
        }
    }

    public static Map<String, Object> publicUser(Map<String, Object> user) {
        var result = new LinkedHashMap<>(user);
        result.remove("password");
        result.remove("deletedAt");
        return result;
    }

    public static String required(Map<String, Object> input, String key) {
        Object value = input.get(key);
        if (value == null || value.toString().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta el campo " + key + ".");
        return value.toString();
    }

    public static UUID uuid(Object value) {
        try { return UUID.fromString(String.valueOf(value)); }
        catch (RuntimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UUID inválido."); }
    }

    private static String hash(String input) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
