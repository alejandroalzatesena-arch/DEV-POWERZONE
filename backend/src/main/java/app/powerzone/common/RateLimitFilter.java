package app.powerzone.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Per-user (or anonymous IP) fixed-window limiter, matching the previous API limit. */
public class RateLimitFilter extends OncePerRequestFilter {
    private record Window(long startsAt, int count) {}
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int limit;
    private final long seconds;
    public RateLimitFilter(int limit, long seconds) { this.limit = limit; this.seconds = seconds; }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path.startsWith("/api/docs") || path.startsWith("/api/swagger-ui") || path.startsWith("/actuator")) {
            chain.doFilter(request, response); return;
        }
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String key = auth != null && auth.isAuthenticated() ? "user:" + auth.getName()
                : "ip:" + request.getRemoteAddr();
        long now = Instant.now().getEpochSecond();
        Window updated = windows.compute(key, (ignored, old) -> old == null || now - old.startsAt() >= seconds
                ? new Window(now, 1) : new Window(old.startsAt(), old.count() + 1));
        if (updated.count() > limit) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(Math.max(1, seconds - (now - updated.startsAt()))));
            response.setContentType("application/json");
            response.getWriter().write("{\"statusCode\":429,\"message\":\"Demasiadas solicitudes.\"}");
            return;
        }
        if (windows.size() > 10000) windows.entrySet().removeIf(e -> now - e.getValue().startsAt() >= seconds);
        chain.doFilter(request, response);
    }
}
