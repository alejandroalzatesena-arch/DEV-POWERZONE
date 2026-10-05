package app.powerzone.common;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

public record Actor(UUID id, UUID gymId, String role, boolean superAdmin) {
    public static Actor from(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar.");
        }
        var jwt = token.getToken();
        String gym = jwt.getClaimAsString("gymId");
        return new Actor(UUID.fromString(jwt.getSubject()), gym == null ? null : UUID.fromString(gym),
                jwt.getClaimAsString("role"), Boolean.TRUE.equals(jwt.getClaim("isSuperAdmin")));
    }

    public void require(String... roles) {
        if (superAdmin) return;
        for (String permitted : roles) {
            if (permitted.equals(role)) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para esta operación.");
    }

    public UUID requiredGym() {
        if (gymId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere un gimnasio.");
        return gymId;
    }

    public void requireGym(UUID targetGym) {
        if (!superAdmin && (gymId == null || !gymId.equals(targetGym))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes acceso a este gimnasio.");
        }
    }

    public void requireSelfOrStaff(UUID targetUser) {
        if (!id.equals(targetUser)) require("admin", "trainer", "receptionist");
    }
}
