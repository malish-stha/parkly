package com.parking.park.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class ParseResult {
        public Double maxPrice;
        public String vehicleType;
        public Double resolvedLat;
        public Double resolvedLng;
        public String aiMessage;
    }

    public ParseResult parseQuery(String query) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.info("Gemini API key is not configured. Falling back to local regex-based NLP parser.");
            return null;
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

            // Prepare prompt
            String prompt = "You are the parsing assistant for Parkly, a parking app in Kathmandu, Nepal.\n" +
                    "Your task is to parse a user's natural language query for parking, extract constraints, and return a clean JSON object.\n\n" +
                    "User query: \"" + query.replace("\"", "\\\"") + "\"\n\n" +
                    "Extract the following keys:\n" +
                    "1. \"maxPrice\": Number. The maximum hourly rate parsed from terms like \"under 100\", \"below 100\", \"max 100\", \"limit 90\". Null if not specified.\n" +
                    "2. \"vehicleType\": String. One of \"EV\", \"SUV\", \"STANDARD\", \"BIKE\". If query mentions EV/charging/electric -> \"EV\"; if SUV/large/truck/jeep -> \"SUV\"; if bike/motorcycle/two-wheeler/scooter/cycle -> \"BIKE\"; if standard/car/normal -> \"STANDARD\". Null if not specified.\n" +
                    "3. \"resolvedLat\": Number. The exact latitude coordinate of the landmark or location mentioned in the query (resolve Kathmandu landmarks/places like Thamel, Durbar Square, Patan Durbar Square, Bhaktapur, Balaju, Teaching Hospital, Civil Mall, Sundhara, Durbar Marg, Chabahil, etc.). Return null if no specific location/landmark was mentioned.\n" +
                    "4. \"resolvedLng\": Number. The exact longitude coordinate of the landmark or location mentioned. Return null if no specific location was mentioned.\n" +
                    "5. \"aiMessage\": String. A professional, friendly, and contextual response to the user summarizing the search query in a single sentence (e.g. \"Finding standard spots under 120 NPR near Civil Mall...\").\n\n" +
                    "Return ONLY a raw JSON object with these keys: \"maxPrice\", \"vehicleType\", \"resolvedLat\", \"resolvedLng\", \"aiMessage\". Do not wrap the JSON output in markdown formatting (like ```json).";

            // Construct payload
            Map<String, Object> part = new HashMap<>();
            part.put("text", prompt);

            Map<String, Object> contentNode = new HashMap<>();
            contentNode.put("parts", List.of(part));

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("response_mime_type", "application/json");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", List.of(contentNode));
            requestBody.put("generation_config", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    String jsonText = candidates.get(0)
                            .path("content")
                            .path("parts")
                            .get(0)
                            .path("text")
                            .asText();

                    JsonNode resultJson = objectMapper.readTree(jsonText.trim());
                    
                    ParseResult result = new ParseResult();
                    if (resultJson.has("maxPrice") && !resultJson.get("maxPrice").isNull()) {
                        result.maxPrice = resultJson.get("maxPrice").asDouble();
                    }
                    if (resultJson.has("vehicleType") && !resultJson.get("vehicleType").isNull()) {
                        result.vehicleType = resultJson.get("vehicleType").asText().toUpperCase();
                    }
                    if (resultJson.has("resolvedLat") && !resultJson.get("resolvedLat").isNull()) {
                        result.resolvedLat = resultJson.get("resolvedLat").asDouble();
                    }
                    if (resultJson.has("resolvedLng") && !resultJson.get("resolvedLng").isNull()) {
                        result.resolvedLng = resultJson.get("resolvedLng").asDouble();
                    }
                    if (resultJson.has("aiMessage") && !resultJson.get("aiMessage").isNull()) {
                        result.aiMessage = resultJson.get("aiMessage").asText();
                    }
                    
                    log.info("Gemini parsed query: price={}, type={}, coords={}/{}, msg={}", 
                            result.maxPrice, result.vehicleType, result.resolvedLat, result.resolvedLng, result.aiMessage);
                    return result;
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse query via Gemini API: " + e.getMessage(), e);
        }

        return null;
    }
}
