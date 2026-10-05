package app.powerzone.realtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final RealtimeHub hub;
    private final String origins;
    public WebSocketConfig(RealtimeHub hub, @Value("${powerzone.cors-origins}") String origins) {
        this.hub = hub; this.origins = origins;
    }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        var handshake = new DefaultHandshakeHandler();
        handshake.setSupportedProtocols("pz");
        registry.addHandler(hub, "/api/ws")
                .addInterceptors(hub)
                .setHandshakeHandler(handshake)
                .setAllowedOrigins(origins.split(","));
    }
}
