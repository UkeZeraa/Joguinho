package com.ukezeraa.professoria;

import net.neoforged.neoforge.common.ModConfigSpec;

/** Configuracao do cliente (.minecraft/config/professoria-client.toml, ou Mods > Professor IA > Config). */
public final class ProfessorConfig {
    public static final ModConfigSpec SPEC;
    public static final ModConfigSpec.ConfigValue<String> API_KEY;
    public static final ModConfigSpec.ConfigValue<String> MODEL;
    public static final ModConfigSpec.ConfigValue<String> EFFORT;
    public static final ModConfigSpec.IntValue MAX_ROUNDS;
    public static final ModConfigSpec.BooleanValue FALLBACK;
    public static final ModConfigSpec.IntValue MAX_CONTEXT_K_TOKENS;
    public static final ModConfigSpec.BooleanValue AUTO_NEXT_PHASE;
    public static final ModConfigSpec.IntValue CHECKIN_MINUTES;
    public static final ModConfigSpec.BooleanValue MIRROR_TO_CHAT;
    public static final ModConfigSpec.BooleanValue SHOW_HUD;

    static {
        ModConfigSpec.Builder b = new ModConfigSpec.Builder();
        b.push("api");
        API_KEY = b.comment("Sua chave da API da Anthropic (console.anthropic.com). Deixe vazio para usar a",
                        "variavel de ambiente ANTHROPIC_API_KEY. A chave fica salva em texto puro neste arquivo.")
                .define("chave", "");
        MODEL = b.comment("Modelo do Claude. claude-opus-5-5 e o mais inteligente para planejar; claude-sonnet-5-5",
                        "e mais barato; claude-haiku-5-5 e o mais barato de todos.")
                .define("modelo", "claude-opus-5-5");
        EFFORT = b.comment("Esforco de raciocinio: low, medium, high, xhigh ou max. Mais alto = respostas mais",
                        "pensadas, porem mais lentas e caras.")
                .define("esforco", "medium", o -> o instanceof String s
                        && java.util.List.of("low", "medium", "high", "xhigh", "max").contains(s));
        MAX_ROUNDS = b.comment("Maximo de consultas (ferramentas) que o Professor faz por pergunta.")
                .defineInRange("maxConsultas", 25, 1, 100);
        FALLBACK = b.comment("Se o modelo recusar uma pergunta por engano, deixa a API tentar outro modelo.")
                .define("fallbackEmRecusa", true);
        MAX_CONTEXT_K_TOKENS = b.comment("Quando a conversa passar deste tamanho (em milhares de tokens), comeca uma",
                        "conversa nova. A meta e o blueprint nao se perdem.")
                .defineInRange("tamanhoMaxConversaK", 300, 20, 900);
        b.pop();

        b.push("professor");
        AUTO_NEXT_PHASE = b.comment("Quando voce concluir todos os passos do blueprint, o Professor monta a proxima",
                        "fase sozinho (rumo a sua meta), sem voce precisar pedir.")
                .define("proximaFaseAutomatica", true);
        CHECKIN_MINUTES = b.comment("A cada quantos minutos o Professor da uma olhada no seu progresso e manda uma",
                        "dica curta (0 = desligado). Cada visita gasta tokens da API.")
                .defineInRange("visitaMinutos", 0, 0, 240);
        MIRROR_TO_CHAT = b.comment("Mostrar as respostas tambem no chat quando a tela do Professor estiver fechada.")
                .define("espelharNoChat", true);
        SHOW_HUD = b.comment("Mostrar o passo atual do blueprint no canto da tela (tecla J alterna).")
                .define("mostrarHud", true);
        b.pop();
        SPEC = b.build();
    }

    private ProfessorConfig() {
    }
}
