package com.ukezeraa.professoria.agent;

import java.util.List;
import java.util.Map;

/** Uma ferramenta que o Professor (Claude) pode chamar para olhar o jogo ou os guias. */
public interface AgentTool {
    String name();

    String description();

    /** Propriedades do JSON Schema de entrada (nome -> schema). */
    Map<String, Object> properties();

    List<String> required();

    /** Texto curto mostrado na tela enquanto a ferramenta roda, ex.: "Lendo guias...". */
    String statusText(Map<String, Object> input);

    /** Executa e devolve o resultado em texto. Pode lancar excecao: vira um erro para o modelo. */
    String run(Map<String, Object> input) throws Exception;

    // Utilitarios para ler a entrada com seguranca
    static String str(Map<String, Object> in, String key, String def) {
        Object v = in.get(key);
        return v == null ? def : String.valueOf(v);
    }

    static int integer(Map<String, Object> in, String key, int def, int min, int max) {
        Object v = in.get(key);
        int n = def;
        if (v instanceof Number num) n = num.intValue();
        else if (v instanceof String s) {
            try {
                n = Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return Math.max(min, Math.min(max, n));
    }

    static Map<String, Object> prop(String type, String description) {
        return Map.of("type", type, "description", description);
    }
}
