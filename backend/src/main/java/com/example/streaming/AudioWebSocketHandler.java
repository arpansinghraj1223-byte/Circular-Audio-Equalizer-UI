package com.example.streaming;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import reactor.core.publisher.*;
import java.nio.ByteBuffer;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public class AudioWebSocketHandler extends AbstractWebSocketHandler {

    private final ObjectMapper mapper = new ObjectMapper();
    // sessionId -> sink to push transcription strings
    private final ConcurrentHashMap<String, Sinks.Many<String>> sessionSinks = new ConcurrentHashMap<>();
    private final GeminiStreamingService geminiService = new GeminiStreamingService();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
        sessionSinks.put(session.getId(), sink);

        // subscribe sink to forward messages to websocket
        sink.asFlux()
            .map(TextMessage::new)
            .flatMap(msg -> session.send(Mono.just(msg)))
            .subscribe(null, err -> {
                // on error
                System.err.println("Error sending transcript to client: " + err);
            });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        JsonNode node = mapper.readTree(payload);
        String type = node.has("type") ? node.get("type").asText() : "";

        if ("audio".equals(type) && node.has("payload")) {
            String base64 = node.get("payload").asText();

            // forward immediately to Gemini streaming service and subscribe to partials
            String sessionId = session.getId();
            Sinks.Many<String> sink = sessionSinks.get(sessionId);
            if (sink == null) return;

            // Gemini service returns a Flux<String> of partials for each chunk.
            // We forward each partial to the sink.
            geminiService.sendAudioChunk(base64)
                    .subscribe(
                        partial -> sink.tryEmitNext(partial),
                        err -> {
                          System.err.println("Gemini service error: " + err.getMessage());
                          sink.tryEmitNext("[error] " + err.getMessage());
                        }
                    );
        } else if ("control".equals(type)) {
            // handle control messages if any
        } else {
            // unknown message type
            Sinks.Many<String> sink = sessionSinks.get(session.getId());
            if (sink != null) sink.tryEmitNext("[system] unknown message type");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Sinks.Many<String> s = sessionSinks.remove(session.getId());
        if (s != null) s.tryEmitComplete();
    }
}
