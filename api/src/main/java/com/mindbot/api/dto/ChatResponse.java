package com.mindbot.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatResponse {
    private String reply;
    private List<ToolStep> tool_steps;

    @Data
    public static class ToolStep {
        private String tool;
        private String input;
        private String output;
    }
}
