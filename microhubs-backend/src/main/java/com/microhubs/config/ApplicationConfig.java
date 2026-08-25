package com.microhubs.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Application-level MVC configuration.
 * <p>
 * CORS is handled centrally by {@link SecurityConfig} via the Spring Security
 * CorsFilter.  Keeping a separate {@code WebMvcConfigurer.addCorsMappings()}
 * alongside the security-level CORS causes conflicts where the MVC-level
 * config (which may lack VS Code webview origins) can override the security
 * config, breaking preflight requests from vscode-webview:// origins.
 */
@Configuration
public class ApplicationConfig implements WebMvcConfigurer {
}
