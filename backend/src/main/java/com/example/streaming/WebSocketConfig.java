package com.example.streaming;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

  private final AudioWebSocketHandler handler = new AudioWebSocketHandler();

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    // allow any origin for demo; tighten in prod
    registry.addHandler(handler, "/ws-audio").setAllowedOrigins("*");
  }
}
