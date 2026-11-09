package com.ukezeraa.professoria.agent;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.core.ObjectMappers;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Tool;

import java.util.List;
import java.util.Map;

/** Monta um cliente e uma requisicao completa (sem enviar) para provar que o SDK carregou. */
public final class SelfTest {
    private SelfTest() {
    }

    public static String run() throws Exception {
        AnthropicClient c = AnthropicOkHttpClient.builder().apiKey("teste").build();
        MessageCreateParams p = MessageCreateParams.builder()
                .model("claude-opus-5-5")
                .maxTokens(16L)
                .addTool(Tool.builder().name("t").description("d")
                        .inputSchema(Tool.InputSchema.builder().properties(Tool.InputSchema.Properties.builder()
                                .putAdditionalProperty("x", JsonValue.from(Map.of("type", "string"))).build())
                                .required(List.of("x")).build())
                        .build())
                .addUserMessage("oi")
                .build();
        String json = ObjectMappers.jsonMapper().writeValueAsString(p._body());
        c.close();
        return "OK (" + json.length() + " bytes de JSON)";
    }
}
