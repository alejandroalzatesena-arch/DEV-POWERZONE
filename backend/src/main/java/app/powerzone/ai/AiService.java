package app.powerzone.ai;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import app.powerzone.common.TableStore;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiService {
    private final RestClient client;
    private final TableStore db;

    public AiService(TableStore db, @Value("${powerzone.ai.url}") String url,
            @Value("${powerzone.ai.key}") String key) {
        this.db = db;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); factory.setReadTimeout(10000);
        this.client = RestClient.builder().baseUrl(url).requestFactory(factory)
                .defaultHeader("X-AI-Key", key).build();
    }
    public Map<String, String> health() {
        try { return client.get().uri("/health").retrieve().body(new org.springframework.core.ParameterizedTypeReference<>() {}); }
        catch (RuntimeException ex) { return Map.of("status", "unavailable"); }
    }
    public Map<String, Object> chat(Actor actor, String sessionId, String message) {
        if (message == null || message.isBlank() || message.length() > 2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El mensaje debe tener entre 1 y 2000 caracteres.");
        var context = context(actor, actor.id());
        try {
            return call("/chat", Map.of("session_id", sessionId, "message", message, "context", context));
        } catch (RuntimeException ex) {
            return Map.of("reply", "El asistente no está disponible. Puedes consultar clases, membresías y pagos en la aplicación.");
        }
    }
    public Map<String, Object> routine(Actor actor, Map<String, Object> body) {
        actor.require("admin", "trainer");
        UUID userId = AuthService.uuid(AuthService.required(body, "userId"));
        db.read("users", userId, actor, "gymId");
        return call("/routines/generate", Map.of("user_id", userId.toString(),
                "objective", body.getOrDefault("objective", "general_fitness"),
                "days_per_week", body.getOrDefault("daysPerWeek", 3),
                "difficulty", body.getOrDefault("difficulty", 3)));
    }
    public Map<String, Object> recommendation(Actor actor, UUID userId, String type) {
        actor.requireSelfOrStaff(userId);
        db.read("users", userId, actor, "gymId");
        try {
            return call("/recommendations/" + type, Map.of("user_id", userId.toString(),
                    "context", context(actor, userId)));
        } catch (RuntimeException ex) {
            return Map.of("recommendation", "Consulta con tu entrenador para obtener una recomendación personalizada.",
                    "tips", List.of());
        }
    }
    private Map<String, Object> context(Actor actor, UUID userId) {
        var user = db.read("users", userId, actor, "gymId");
        var context = new LinkedHashMap<String, Object>();
        context.put("role", user.get("role"));
        context.put("gymId", user.get("gymId"));
        var membership = db.findOne("user_memberships", Map.of("userId", userId, "status", "active"), actor, "gymId");
        if (membership != null) context.put("membership", Map.of("status", membership.get("status"),
                "endDate", membership.get("endDate")));
        var profile = db.findOne("user_profiles", Map.of("userId", userId), null, null);
        if (profile != null) {
            for (String field : List.of("goal", "activityLevel", "heightCm", "weightKg"))
                if (profile.get(field) != null) context.put(field, profile.get(field));
        }
        context.put("routines", db.search("routines", Map.of("assigneeId", userId), actor, "gymId", "createdAt", "DESC", 1, 3)
                .stream().map(r -> Map.of("title", r.get("title"), "objective", r.get("objective"))).toList());
        return context;
    }
    @SuppressWarnings("unchecked")
    private Map<String, Object> call(String path, Object body) {
        try {
            Map<String, Object> response = client.post().uri(path).body(body).retrieve().body(Map.class);
            if (response == null) throw new IllegalStateException("Empty AI response");
            return response;
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Servicio de IA no disponible.", ex);
        }
    }
}
