package com.mindbot.api.controller;

import com.mindbot.api.dto.AiChatRequest;
import com.mindbot.api.dto.ChatRequest;
import com.mindbot.api.dto.ChatResponse;
import com.mindbot.api.entity.Chat;
import com.mindbot.api.entity.Message;
import com.mindbot.api.entity.User;
import com.mindbot.api.repository.ChatRepository;
import com.mindbot.api.repository.MessageRepository;
import com.mindbot.api.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;

    @Value("${ai.service.base-url:http://127.0.0.1:8000}")
    private String aiServiceBaseUrl;

    public ChatController(RestTemplate restTemplate, UserRepository userRepository, ChatRepository chatRepository,
            MessageRepository messageRepository) {
        this.restTemplate = restTemplate;
        this.userRepository = userRepository;
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
    }

    @GetMapping("/users/{userId}/chats")
    public ResponseEntity<?> getUserChats(@PathVariable String userId) {
        return ResponseEntity.ok(chatRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @GetMapping("/chats/{chatId}/messages")
    public ResponseEntity<?> getChatMessages(@PathVariable String chatId) {
        return ResponseEntity.ok(messageRepository.findByChatIdOrderByTimestampAsc(chatId));
    }

    @PostMapping("/users/{userId}/chats")
    public ResponseEntity<?> chat(@PathVariable String userId, @RequestBody ChatRequest request) {
        try {
            log.info("Forwarding chat request for user={}, chat={}", userId, request.getChatId());

            // 1. Ensure User exists
            User user = userRepository.findById(userId).orElseGet(() -> {
                User u = new User();
                u.setId(userId);
                return userRepository.save(u);
            });

            // 2. Resolve Chat or Create new
            Chat chat;
            if (request.getChatId() != null && !request.getChatId().isEmpty()) {
                chat = chatRepository.findById(request.getChatId()).orElseGet(() -> {
                    Chat c = new Chat();
                    c.setId(request.getChatId());
                    c.setUser(user);
                    c.setTitle(request.getMessage().length() > 30 ? request.getMessage().substring(0, 30) + "..." : request.getMessage());
                    c.setCreatedAt(System.currentTimeMillis());
                    return chatRepository.save(c);
                });
            } else {
                chat = new Chat();
                chat.setId(UUID.randomUUID().toString());
                chat.setUser(user);
                chat.setTitle(request.getMessage().length() > 30 ? request.getMessage().substring(0, 30) + "..." : request.getMessage());
                chat.setCreatedAt(System.currentTimeMillis());
                chat = chatRepository.save(chat);
            }

            // 3. Save User message
            Message userMessage = new Message();
            userMessage.setChat(chat);
            userMessage.setRole("user");
            userMessage.setContent(request.getMessage());
            userMessage.setTimestamp(System.currentTimeMillis());
            messageRepository.save(userMessage);

            // 4. Fetch full history for AI
            List<Message> history = messageRepository.findByChatIdOrderByTimestampAsc(chat.getId());

            // 5. Send to AI
            AiChatRequest aiReq = new AiChatRequest();
            aiReq.setUserId(userId);
            aiReq.setUseRag(request.isUseRag());
            aiReq.setImageBase64(request.getImageBase64());
            aiReq.setMessages(history.stream()
                    .map(m -> new AiChatRequest.ChatMessage(m.getRole(), m.getContent()))
                    .collect(Collectors.toList()));

            ChatResponse aiResponse = restTemplate.postForObject(
                    aiServiceBaseUrl + "/chat", aiReq, ChatResponse.class
            );

            // 6. Save AI Response message
            if (aiResponse != null && aiResponse.getReply() != null) {
                Message aiMessage = new Message();
                aiMessage.setChat(chat);
                aiMessage.setRole("assistant");
                aiMessage.setContent(aiResponse.getReply());
                aiMessage.setTimestamp(System.currentTimeMillis());
                messageRepository.save(aiMessage);
            }

            // Return custom response with chatId so UI can update URL route dynamically
            return ResponseEntity.ok(Map.of(
                    "chatId", chat.getId(),
                    "reply", aiResponse != null ? aiResponse.getReply() : "Error",
                    "tool_steps", aiResponse != null && aiResponse.getTool_steps() != null ? aiResponse.getTool_steps() : List.of()
            ));

        } catch (Exception e) {
            log.error("Error processing chat: {}", e.getMessage(), e);
            return ResponseEntity.status(503).body(Map.of("reply", "MindBot service is currently unavailable. Please try again later."));
        }
    }
}
