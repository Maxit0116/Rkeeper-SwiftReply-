package com.softreply.keyboard.api;

public class GenerateReplyResponse {
    public String[] suggestions;
    public String strategy;
    public MatchedProfile matchedProfile;

    public static class MatchedProfile {
        public String id;
        public String nickname;
        public String emoji;
        public float confidence;
    }
}
