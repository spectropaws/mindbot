package com.mindbot.api.controller;

import com.mindbot.api.entity.KnowledgeBaseDocument;
import com.mindbot.api.entity.User;
import com.mindbot.api.repository.KnowledgeBaseDocumentRepository;
import com.mindbot.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@RestController
@RequestMapping("/api/users/{userId}/documents")
public class DocumentController {

    private final RestTemplate restTemplate;
    private final KnowledgeBaseDocumentRepository documentRepository;
    private final UserRepository userRepository;

    @Value("${ai.service.base-url:http://127.0.0.1:8000}")
    private String aiServiceBaseUrl;

    public DocumentController(RestTemplate restTemplate, KnowledgeBaseDocumentRepository documentRepository,
            UserRepository userRepository) {
        this.restTemplate = restTemplate;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getUserDocuments(@PathVariable String userId) {
        return ResponseEntity.ok(documentRepository.findByUserIdOrderByUploadedAtDesc(userId));
    }

    @PostMapping
    public ResponseEntity<?> uploadDocument(@PathVariable String userId, @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty."));
            }

            String filename = file.getOriginalFilename();
            if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Only PDF files are supported."));
            }

            User user = userRepository.findById(userId).orElseGet(() -> {
                User u = new User();
                u.setId(userId);
                return userRepository.save(u);
            });

            // Forward as multipart to Python RAG endpoint
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new HttpEntity<>(fileResource, buildFileHeaders(filename)));
            // ✅ Add userId as a form parameter to match FastAPI Form("default")
            body.add("userId", userId);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Object> response = restTemplate.exchange(
                    aiServiceBaseUrl + "/rag/upload", // ✅ Correct URL matching Python @router.post("/rag/upload")
                    HttpMethod.POST,
                    requestEntity,
                    Object.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                KnowledgeBaseDocument doc = new KnowledgeBaseDocument();
                doc.setUser(user);
                doc.setFilename(filename);
                doc.setUploadedAt(System.currentTimeMillis());
                documentRepository.save(doc);
            }

            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<?> clearKnowledgeBase(@PathVariable String userId) {
        try {
            documentRepository.deleteByUserId(userId);
            restTemplate.delete(aiServiceBaseUrl + "/rag/users/" + userId + "/documents");
            return ResponseEntity.ok(Map.of("success", true, "message", "Knowledge Base cleared."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private HttpHeaders buildFileHeaders(String filename) {
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.APPLICATION_PDF);
        fileHeaders.setContentDispositionFormData("file", filename);
        return fileHeaders;
    }
}
