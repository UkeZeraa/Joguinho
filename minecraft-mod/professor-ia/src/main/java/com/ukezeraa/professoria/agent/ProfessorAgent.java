package com.ukezeraa.professoria.agent;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.BadRequestException;
import com.anthropic.errors.OverloadedException;
import com.anthropic.errors.PermissionDeniedException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.errors.UnauthorizedException;
import com.anthropic.models.messages.CacheControlEphemeral;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.TextBlockParam;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

/**
 * O "cerebro" do Professor: conversa com o Claude pela API da Anthropic e executa as ferramentas
 * que o modelo pede (loop manual de tool use). Roda numa thread propria para nao travar o jogo.
 */
public final class ProfessorAgent {
    private static final Logger LOG = LoggerFactory.getLogger("ProfessorIA");
    private static final String FALLBACK_BETA = "server-side-fallback-2026-07-01";
    private static final int MAX_TOOL_RESULT_CHARS = 30_000;

    /** Configuracao lida a cada pergunta (o jogador pode mudar no menu de config). */
    public record Settings(String apiKey, String model, String effort, int maxRounds, boolean fallback,
                           long maxContextTokens) {
    }

    private final Map<String, AgentTool> tools = new LinkedHashMap<>();
    private final Supplier<Settings> settings;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "ProfessorIA-Agente");
        t.setDaemon(true);
        return t;
    });
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private final List<MessageParam> history = new ArrayList<>();

    private AnthropicClient client;
    private String clientKey;
    private boolean fallbackRejected = false;
    private long lastInputTokens = 0;
    private long totalInputTokens = 0;
    private long totalOutputTokens = 0;
    private long totalCacheReadTokens = 0;
    private volatile boolean cancelRequested = false;

    public ProfessorAgent(Supplier<Settings> settings) {
        this.settings = settings;
    }

    public void register(AgentTool tool) {
        tools.put(tool.name(), tool);
    }

    public boolean isBusy() {
        return busy.get();
    }

    public void cancel() {
        cancelRequested = true;
    }

    public synchronized void resetConversation() {
        history.clear();
        lastInputTokens = 0;
    }

    public String usageSummary() {
        return "tokens enviados: " + totalInputTokens + " (do cache: " + totalCacheReadTokens + "), recebidos: "
                + totalOutputTokens + ", tamanho da conversa: " + lastInputTokens;
    }

    /**
     * Envia uma mensagem ao Professor. Retorna false se ele ainda estiver respondendo a anterior.
     *
     * @param userText texto do aluno
     * @param context  bloco [Contexto] (meta, blueprint) gerado na hora do envio
     */
    public boolean ask(String userText, String context, AgentListener listener) {
        if (!busy.compareAndSet(false, true)) return false;
        cancelRequested = false;
        executor.submit(() -> {
            try {
                run(userText, context, listener);
            } catch (Throwable t) {
                LOG.error("Erro no Professor IA", t);
                listener.onError(describe(t));
            } finally {
                busy.set(false);
                listener.onFinished();
            }
        });
        return true;
    }

    private synchronized void run(String userText, String context, AgentListener listener) {
        Settings s = settings.get();
        AnthropicClient c = client(s);
        if (c == null) {
            listener.onError("Nenhuma chave da API configurada. Abra Mods > Professor IA > Config e cole sua "
                    + "chave da Anthropic (console.anthropic.com), ou defina a variavel ANTHROPIC_API_KEY.");
            return;
        }
        if (lastInputTokens > s.maxContextTokens()) {
            history.clear();
            listener.onStatus("Conversa muito longa: comecei uma nova (a meta e o blueprint continuam salvos).");
        }

        String content = (context == null || context.isBlank()) ? userText
                : "[Contexto]\n" + context.strip() + "\n[/Contexto]\n\n" + userText;
        int start = history.size();
        history.add(MessageParam.ofUser(content));
        try {
            loop(c, s, start, listener);
        } catch (RuntimeException e) {
            // Volta a conversa para antes desta pergunta: assim um erro de rede nao "quebra" o historico.
            truncate(start);
            throw e;
        }
    }

    private void truncate(int size) {
        while (history.size() > size) history.remove(history.size() - 1);
    }

    private void loop(AnthropicClient c, Settings s, int start, AgentListener listener) {
        for (int round = 0; round < Math.max(1, s.maxRounds()); round++) {
            if (cancelRequested) {
                listener.onStatus("Cancelado.");
                closeDanglingToolUse();
                return;
            }
            listener.onStatus(round == 0 ? "Pensando..." : "Analisando o que encontrei...");
            Message msg = send(c, s);
            history.add(msg.toParam());
            lastInputTokens = msg.usage().inputTokens() + msg.usage().cacheReadInputTokens().orElse(0L)
                    + msg.usage().cacheCreationInputTokens().orElse(0L);
            totalInputTokens += lastInputTokens;
            totalCacheReadTokens += msg.usage().cacheReadInputTokens().orElse(0L);
            totalOutputTokens += msg.usage().outputTokens();

            StringBuilder text = new StringBuilder();
            List<ToolUseBlock> calls = new ArrayList<>();
            for (ContentBlock block : msg.content()) {
                block.text().ifPresent(t -> text.append(t.text()));
                block.toolUse().ifPresent(calls::add);
            }
            if (!text.isEmpty()) listener.onText(text.toString().strip());

            StopReason stop = msg.stopReason().orElse(StopReason.END_TURN);
            if (stop.equals(StopReason.TOOL_USE) && !calls.isEmpty()) {
                List<ContentBlockParam> results = new ArrayList<>();
                for (ToolUseBlock call : calls) results.add(ContentBlockParam.ofToolResult(execute(call, listener)));
                history.add(MessageParam.ofUserOfContentBlockParams(results));
                continue;
            }
            if (stop.equals(StopReason.PAUSE_TURN)) continue;
            if (stop.equals(StopReason.REFUSAL)) {
                String why = msg.stopDetails().flatMap(d -> d.explanation()).orElse("");
                truncate(start);
                listener.onError("O modelo recusou responder essa mensagem." + (why.isBlank() ? "" : " " + why));
                return;
            }
            if (stop.equals(StopReason.MAX_TOKENS)) {
                listener.onStatus("(A resposta ficou longa demais e foi cortada. Peca para continuar.)");
            }
            return;
        }
        closeDanglingToolUse();
        listener.onStatus("(Parei depois de " + s.maxRounds() + " consultas. Pergunte de novo para continuar.)");
    }

    /** Se paramos no meio de um tool_use, responde as chamadas para a conversa continuar valida. */
    private void closeDanglingToolUse() {
        // A ultima mensagem e de tool_result (user) quando paramos entre rodadas: adicionamos uma resposta
        // curta do assistente para manter a alternancia user/assistant.
        if (!history.isEmpty() && history.get(history.size() - 1).isUser()) {
            history.add(MessageParam.ofAssistant("(Consulta interrompida.)"));
        }
    }

    private Message send(AnthropicClient c, Settings s) {
        boolean useFallback = s.fallback() && !fallbackRejected;
        try {
            return c.messages().create(params(s, useFallback));
        } catch (BadRequestException e) {
            String m = e.apiMessage().orElse(e.getMessage());
            if (useFallback && m != null && m.toLowerCase().contains("fallback")) {
                LOG.warn("A API nao aceitou 'fallbacks'; seguindo sem: {}", m);
                fallbackRejected = true;
                return c.messages().create(params(s, false));
            }
            throw e;
        }
    }

    private MessageCreateParams params(Settings s, boolean fallback) {
        MessageCreateParams.Builder b = MessageCreateParams.builder()
                .model(s.model())
                .maxTokens(16000L)
                .systemOfTextBlockParams(List.of(TextBlockParam.builder()
                        .text(Prompts.SYSTEM)
                        .cacheControl(CacheControlEphemeral.builder().build())
                        .build()))
                // cache automatico da conversa (o historico cresce a cada rodada)
                .cacheControl(CacheControlEphemeral.builder().build())
                .outputConfig(OutputConfig.builder().effort(OutputConfig.Effort.of(s.effort())).build())
                .messages(history);
        for (AgentTool t : tools.values()) b.addTool(toSdkTool(t));
        if (fallback) {
            // Se o modelo recusar por engano (classificador de seguranca), a API tenta outro modelo.
            b.putAdditionalHeader("anthropic-beta", FALLBACK_BETA);
            b.putAdditionalBodyProperty("fallbacks", JsonValue.from("default"));
        }
        return b.build();
    }

    private static Tool toSdkTool(AgentTool t) {
        Tool.InputSchema.Properties.Builder props = Tool.InputSchema.Properties.builder();
        for (Map.Entry<String, Object> e : t.properties().entrySet()) {
            props.putAdditionalProperty(e.getKey(), JsonValue.from(e.getValue()));
        }
        return Tool.builder()
                .name(t.name())
                .description(t.description())
                .inputSchema(Tool.InputSchema.builder().properties(props.build()).required(t.required()).build())
                .build();
    }

    private ToolResultBlockParam execute(ToolUseBlock call, AgentListener listener) {
        AgentTool tool = tools.get(call.name());
        ToolResultBlockParam.Builder r = ToolResultBlockParam.builder().toolUseId(call.id());
        if (tool == null) return r.content("Ferramenta desconhecida: " + call.name()).isError(true).build();
        Map<String, Object> input;
        try {
            Map<String, Object> parsed = call._input().convert(new TypeReference<Map<String, Object>>() {
            });
            input = parsed == null ? Map.of() : parsed;
        } catch (Exception e) {
            return r.content("Entrada invalida (JSON): " + e.getMessage()).isError(true).build();
        }
        try {
            listener.onStatus(tool.statusText(input));
            String out = tool.run(input);
            if (out.length() > MAX_TOOL_RESULT_CHARS) {
                out = out.substring(0, MAX_TOOL_RESULT_CHARS) + "\n[... resultado cortado; refine a busca ou use 'parte']";
            }
            return r.content(out).build();
        } catch (Exception e) {
            LOG.warn("Ferramenta {} falhou", call.name(), e);
            return r.content("Erro ao executar " + call.name() + ": " + e.getMessage()).isError(true).build();
        }
    }

    private AnthropicClient client(Settings s) {
        String key = s.apiKey() == null ? "" : s.apiKey().trim();
        if (key.isEmpty()) {
            String env = System.getenv("ANTHROPIC_API_KEY");
            key = env == null ? "" : env.trim();
        }
        if (key.isEmpty()) return null;
        if (client == null || !key.equals(clientKey)) {
            client = AnthropicOkHttpClient.builder()
                    .apiKey(key)
                    .timeout(Duration.ofMinutes(5))
                    .maxRetries(3)
                    .build();
            clientKey = key;
        }
        return client;
    }

    static String describe(Throwable t) {
        if (t instanceof UnauthorizedException) return "Chave da API invalida (401). Confira a chave na config do mod.";
        if (t instanceof PermissionDeniedException) return "Sua chave nao tem permissao para esse modelo (403).";
        if (t instanceof RateLimitException) return "Limite de uso da API atingido (429). Espere um pouco e tente de novo.";
        if (t instanceof OverloadedException) return "A API esta sobrecarregada agora. Tente de novo em instantes.";
        if (t instanceof BadRequestException e) return "Requisicao recusada pela API: " + e.apiMessage().orElse(e.getMessage());
        if (t instanceof AnthropicServiceException e) return "Erro da API (" + e.statusCode() + "): " + e.apiMessage().orElse(e.getMessage());
        if (t instanceof AnthropicIoException) return "Sem conexao com a API da Anthropic. Verifique sua internet.";
        return "Erro inesperado: " + t;
    }
}
