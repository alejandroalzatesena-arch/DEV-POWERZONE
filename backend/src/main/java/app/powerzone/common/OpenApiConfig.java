package app.powerzone.common;

import io.swagger.v3.core.util.Json;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import java.io.IOException;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

@Configuration
public class OpenApiConfig {
    @Bean OpenAPI apiInfo() {
        return new OpenAPI().info(new Info().title("Power Zone API")
                        .version("2.0.0")
                        .description("API Spring Boot para gestión de gimnasios. Contrato heredado y nuevas rutas de salud, webhook y WebSocket."))
                .components(new io.swagger.v3.oas.models.Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }

    @Bean OpenApiCustomizer preservedContractDocumentation() {
        return generated -> {
            try (var stream = new ClassPathResource("contracts/powerzone-openapi-v1.json").getInputStream()) {
                OpenAPI legacy = Json.mapper().readValue(stream, OpenAPI.class);
                if (legacy.getComponents() != null && legacy.getComponents().getSchemas() != null)
                    legacy.getComponents().getSchemas().forEach(generated.getComponents()::addSchemas);
                generated.getPaths().forEach((path, item) -> {
                    var original = legacy.getPaths().get(path);
                    if (original == null) return;
                    item.readOperationsMap().forEach((method, operation) -> {
                        var documented = original.readOperationsMap().get(method);
                        if (documented == null) return;
                        operation.setSummary(documented.getSummary());
                        operation.setDescription(documented.getDescription());
                        operation.setTags(documented.getTags());
                        operation.setParameters(documented.getParameters());
                        operation.setRequestBody(documented.getRequestBody());
                        operation.setResponses(documented.getResponses());
                    });
                });
            } catch (IOException e) { throw new IllegalStateException("No se pudo cargar el contrato OpenAPI conservado", e); }
        };
    }
}
