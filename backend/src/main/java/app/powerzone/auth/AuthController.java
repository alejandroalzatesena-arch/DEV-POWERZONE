package app.powerzone.auth;

import app.powerzone.common.Actor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/register")
    @Operation(summary = "Registrar cliente")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(body));
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión")
    public Map<String, Object> login(@RequestBody Map<String, Object> body) { return auth.login(body); }

    @PostMapping("/refresh")
    @Operation(summary = "Rotar tokens")
    public Map<String, Object> refresh(@RequestBody Map<String, Object> body) {
        return auth.refresh(AuthService.required(body, "refreshToken"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Cerrar sesión")
    public ResponseEntity<Void> logout(@RequestBody Map<String, Object> body) {
        auth.logout(AuthService.required(body, "refreshToken"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Usuario actual")
    public Map<String, Object> me(Authentication authentication) { return auth.me(Actor.from(authentication)); }

    @PostMapping("/change-password")
    @Operation(summary = "Cambiar contraseña")
    public Map<String, String> changePassword(@RequestBody Map<String, Object> body, Authentication authentication) {
        auth.changePassword(Actor.from(authentication), AuthService.required(body, "currentPassword"),
                AuthService.required(body, "newPassword"));
        return Map.of("message", "Contraseña actualizada correctamente.");
    }
}
