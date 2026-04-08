package com.mindbot.api.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users/{userId}/voice")
public class VoiceController {

    private final RestTemplate restTemplate;

    @Value("${ai.service.base-url:http://127.0.0.1:8000}")
    private String aiServiceBaseUrl;

    public VoiceController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Accepts a voice recording from the client, proxies it to the Python
     * AI Service for Whisper transcription, and returns the transcript.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> transcribeVoice(
            @PathVariable String userId,
            @RequestParam("audio") MultipartFile audio) {
        try {
            if (audio.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Audio file is empty."));
            }

            String filename = audio.getOriginalFilename() != null
                    ? audio.getOriginalFilename()
                    : "audio.webm";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource fileResource = new ByteArrayResource(audio.getBytes()) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentDispositionFormData("file", filename);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new HttpEntity<>(fileResource, fileHeaders));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Object> response = restTemplate.exchange(
                    aiServiceBaseUrl + "/voice/transcribe",
                    HttpMethod.POST,
                    requestEntity,
                    Object.class
            );

            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Transcription failed: " + e.getMessage()));
        }
    }
}
