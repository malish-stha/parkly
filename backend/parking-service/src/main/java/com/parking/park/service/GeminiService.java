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
        public Double minPrice;
        public String vehicleType;
        public Double resolvedLat;
        public Double resolvedLng;
        public String aiMessage;
        public Boolean isSearch;
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
                    "2. \"minPrice\": Number. The minimum hourly rate parsed from terms like \"over 100\", \"above 100\", \"min 100\", \"more than 80\". Null if not specified.\n" +
                    "3. \"vehicleType\": String. One of \"EV\", \"SUV\", \"STANDARD\", \"BIKE\". If query mentions EV/charging/electric -> \"EV\"; if SUV/large/truck/jeep -> \"SUV\"; if bike/motorcycle/two-wheeler/scooter/cycle -> \"BIKE\"; if standard/car/normal -> \"STANDARD\". Null if not specified. Note: Do not extract a type if it is mentioned in a negative or exclusionary context (e.g. \"not EV\", \"no bikes\", \"except SUV\").\n" +
                    "4. \"resolvedLat\": Number. The exact latitude coordinate of the landmark or location mentioned in the query. Use this landmark library for resolution:\n" +
                    "   - Thamel: 27.7150\n" +
                    "   - Durbar Square (Kathmandu): 27.7042\n" +
                    "   - Durbar Marg: 27.7123\n" +
                    "   - Civil Mall / Sundhara / Dharahara: 27.7000\n" +
                    "   - New Road / Kathmandu Mall: 27.7020\n" +
                    "   - New Baneshwor: 27.6915\n" +
                    "   - Jawalakhel: 27.6740\n" +
                    "   - Pulchowk: 27.6775\n" +
                    "   - Kupondole: 27.6865\n" +
                    "   - Lagankhel: 27.6685\n" +
                    "   - Bouddha: 27.7215\n" +
                    "   - Gaushala / Pashupati: 27.7104\n" +
                    "   - Maharajgunj: 27.7375\n" +
                    "   - Kalimati: 27.6980\n" +
                    "   - Swayambhu: 27.7150\n" +
                    "   - Chabahil: 27.7190\n" +
                    "   - Putalisadak: 27.7035\n" +
                    "   - Tinkune: 27.6850\n" +
                    "   - Naxal: 27.7135\n" +
                    "   - Kirtipur: 27.6795\n" +
                    "   - Balaju: 27.7320\n" +
                    "   - Tripureshwor: 27.6945\n" +
                    "   - Kamaladi: 27.7085\n" +
                    "   - Lazimpat: 27.7230\n" +
                    "   If the query specifies a relative location like \"near me\", \"closest\", \"nearby\", \"around here\", or \"here\" without naming a specific place above, return null. Return null if no location is mentioned.\n" +
                    "5. \"resolvedLng\": Number. The exact longitude coordinate matching the resolved landmark. Use the library above (e.g. Thamel: 85.3102, Durbar Square: 85.3065, Durbar Marg: 85.3168, Civil Mall: 85.3120, New Road: 85.3115, New Baneshwor: 85.3340, Jawalakhel: 85.3125, Pulchowk: 85.3155, Kupondole: 85.3160, Lagankhel: 85.3200, Bouddha: 85.3620, Gaushala: 85.3486, Maharajgunj: 85.3325, Kalimati: 85.2970, Swayambhu: 85.2900, Chabahil: 85.3480, Putalisadak: 85.3210, Tinkune: 85.3490, Naxal: 85.3285, Kirtipur: 85.2770, Balaju: 85.3020, Tripureshwor: 85.3110, Kamaladi: 85.3205, Lazimpat: 85.3180). Return null if resolvedLat is null.\n" +
                    "6. \"aiMessage\": String. A contextual response to the user. If isSearch is true, summarize the search in a single sentence (e.g. \"Finding standard spots under 120 NPR near Civil Mall...\"). If isSearch is false, return a friendly, localized greeting response starting with \"Namaste!\" that welcomes the user, briefly introduces Parkly's search capabilities, and prompts them to ask a parking search query.\n" +
                    "7. \"isSearch\": Boolean. Set to true if the query is a request to search/find parking spaces or spots (e.g., \"find parking near Thamel\", \"show bike spaces\", \"any spots under 80?\"). Set to false if the user is just saying hello, asking who you are, or doing general conversational chit-chat (e.g., \"who are you?\", \"hello\", \"how are you?\").\n\n" +
                    "Return ONLY a raw JSON object with these keys: \"maxPrice\", \"minPrice\", \"vehicleType\", \"resolvedLat\", \"resolvedLng\", \"aiMessage\", \"isSearch\". Do not wrap the JSON output in markdown formatting (like ```json).";

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
                    
                    JsonNode maxPriceNode = resultJson.has("maxPrice") ? resultJson.get("maxPrice") : resultJson.get("max_price");
                    if (maxPriceNode != null && !maxPriceNode.isNull()) {
                        result.maxPrice = maxPriceNode.asDouble();
                    }

                    JsonNode minPriceNode = resultJson.has("minPrice") ? resultJson.get("minPrice") : resultJson.get("min_price");
                    if (minPriceNode != null && !minPriceNode.isNull()) {
                        result.minPrice = minPriceNode.asDouble();
                    }

                    JsonNode vehicleTypeNode = resultJson.has("vehicleType") ? resultJson.get("vehicleType") : resultJson.get("vehicle_type");
                    if (vehicleTypeNode != null && !vehicleTypeNode.isNull()) {
                        result.vehicleType = vehicleTypeNode.asText().toUpperCase();
                    }

                    JsonNode resolvedLatNode = resultJson.has("resolvedLat") ? resultJson.get("resolvedLat") : resultJson.get("resolved_lat");
                    if (resolvedLatNode != null && !resolvedLatNode.isNull()) {
                        result.resolvedLat = resolvedLatNode.asDouble();
                    }

                    JsonNode resolvedLngNode = resultJson.has("resolvedLng") ? resultJson.get("resolvedLng") : resultJson.get("resolved_lng");
                    if (resolvedLngNode != null && !resolvedLngNode.isNull()) {
                        result.resolvedLng = resolvedLngNode.asDouble();
                    }

                    JsonNode aiMessageNode = resultJson.has("aiMessage") ? resultJson.get("aiMessage") : resultJson.get("ai_message");
                    if (aiMessageNode != null && !aiMessageNode.isNull()) {
                        result.aiMessage = aiMessageNode.asText();
                    }

                    JsonNode isSearchNode = resultJson.has("isSearch") ? resultJson.get("isSearch") : resultJson.get("is_search");
                    if (isSearchNode != null && !isSearchNode.isNull()) {
                        result.isSearch = isSearchNode.asBoolean();
                    } else {
                        result.isSearch = true;
                    }
                    
                    log.info("Gemini parsed query: priceMin={}, priceMax={}, type={}, coords={}/{}, msg={}, isSearch={}", 
                            result.minPrice, result.maxPrice, result.vehicleType, result.resolvedLat, result.resolvedLng, result.aiMessage, result.isSearch);
                    return result;
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse query via Gemini API: " + e.getMessage(), e);
        }

        return null;
    }
}
