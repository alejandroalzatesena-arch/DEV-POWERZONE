package app.powerzone.realtime;

import app.powerzone.auth.AuthService;
import app.powerzone.common.Actor;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class RealtimeHub extends TextWebSocketHandler implements HandshakeInterceptor {
    private final JwtDecoder jwtDecoder;
    private final ObjectMapper json;
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    public RealtimeHub(JwtDecoder jwtDecoder, ObjectMapper json) { this.jwtDecoder = jwtDecoder; this.json = json; }
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            org.springframework.web.socket.WebSocketHandler handler, Map<String, Object> attributes) {
        try {
            String protocol = request.getHeaders().getFirst("Sec-WebSocket-Protocol");
            if (protocol == null) throw new IllegalArgumentException();
            String jwtProtocol = java.util.Arrays.stream(protocol.split(","))
                    .map(String::trim).filter(v -> v.startsWith("jwt.")).findFirst().orElseThrow();
            var jwt = jwtDecoder.decode(jwtProtocol.substring(4));
            String gym = jwt.getClaimAsString("gymId");
            var actor = new Actor(UUID.fromString(jwt.getSubject()), gym == null ? null : UUID.fromString(gym),
                    jwt.getClaimAsString("role"), Boolean.TRUE.equals(jwt.getClaim("isSuperAdmin")));
            MultiValueMap<String, String> query = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
            String topic = query.getFirst("topic");
            if ("notifications".equals(topic)) attributes.put("room", "user:" + actor.id());
            else if ("occupancy".equals(topic)) {
                UUID gymId = UUID.fromString(query.getFirst("gymId"));
                actor.requireGym(gymId);
                attributes.put("room", "gym:" + gymId);
            } else throw new IllegalArgumentException();
            return true;
        } catch (RuntimeException e) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED); return false;
        }
    }
    @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
            org.springframework.web.socket.WebSocketHandler handler, Exception exception) {}
    @Override public void afterConnectionEstablished(WebSocketSession session) {
        String room = (String) session.getAttributes().get("room");
        rooms.computeIfAbsent(room, key -> ConcurrentHashMap.newKeySet()).add(session);
    }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String room = (String) session.getAttributes().get("room");
        var members = rooms.get(room);
        if (members != null) members.remove(session);
    }
    public void publishUser(UUID userId, Object data) { publish("user:" + userId, "notification", data); }
    public void publishGym(UUID gymId, Object data) { publish("gym:" + gymId, "occupancy", data); }
    private void publish(String room, String event, Object data) {
        Runnable action = () -> {
            try {
                String payload = json.writeValueAsString(Map.of("event", event, "data", data));
                for (var session : rooms.getOrDefault(room, Set.of())) {
                    try { if (session.isOpen()) synchronized (session) { session.sendMessage(new TextMessage(payload)); } }
                    catch (IOException ignored) { /* closed client */ }
                }
            } catch (IOException e) { throw new IllegalStateException(e); }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { action.run(); }
            });
        else action.run();
    }
}
