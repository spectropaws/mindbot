package com.mindbot.api.dto;

import lombok.Data;

@Data
public class ChatRequest {
    private String chatId;
    private String message;
    private boolean useRag = true;
    private String imageBase64;
}
