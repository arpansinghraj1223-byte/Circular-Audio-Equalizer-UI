package com.example.streaming;

import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;

/**
 * GeminiStreamingService
 *
 * This class contains the integration point with the Gemini / external streaming transcription API.
 *
 * For the assignment:
 * - The method sendAudioChunk(base64) accepts a base64-encoded audio chunk (as produced by frontend).
 * - It returns a Flux<String> which will emit partial transcription updates (strings).
 *
 * In a real integration you should:
 * - translate base64 to bytes (PCM/opus) as required by the speech provider
 * - open a streaming HTTP or gRPC connection to the provider,
 * - forward the chunk directly without local buffer,
 * - read partials from provider and push them downstream.
 *
 * Here we provide a simple simulated implementation and clear TODOs where to implement the real provider.
 */
public class GeminiStreamingService {

    // Simulated streaming: returns a few partials and completes.
    public Flux<String> sendAudioChunk(String base64Audio) {

        // TODO: Replace this simulation with real streaming to Gemini API.
        // Example steps:
        // 1) Decode base64 to bytes: byte[] data = Base64.getDecoder().decode(base64Audio);
        // 2) Send bytes to remote streaming endpoint (eg. open HTTP/2 or websocket to provider).
        // 3) Stream partials (provider -> you) and return those as Flux<String>.

        // For demo, we simulate multiple partials and a final text.
        return Flux.interval(Duration.ofMillis(80))
                .take(3)
                .map(i -> {
                    switch ((int) (long) i) {
                        case 0: return "partial: Hello";
                        case 1: return "partial: Hello world";
                        default: return "final: Hello world (simulated)";
                    }
                })
                .subscribeOn(Schedulers.boundedElastic());
    }
}
