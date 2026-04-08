package com.mindbot.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class AiChatRequest {
    private List<ChatMessage> messages;
    private String userId;
    private boolean useRag;
    private String imageBase64;

    @Data
    public static class ChatMessage {
        private String role;
        private String content;

        public ChatMessage(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }
}
