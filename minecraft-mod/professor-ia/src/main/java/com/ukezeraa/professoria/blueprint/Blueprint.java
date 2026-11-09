package com.ukezeraa.professoria.blueprint;

import java.util.ArrayList;
import java.util.List;

/**
 * Plano passo a passo montado pelo Professor. Cada passo pode ter uma condicao automatica:
 * ter um item no inventario (itemId + quantidade) ou ter um bloco colocado perto (blockId).
 * Passos sem condicao sao marcados pelo jogador (/blueprint ok) ou pelo Professor.
 */
public final class Blueprint {
    public String titulo = "";
    public String objetivo = "";
    public List<Step> passos = new ArrayList<>();

    public static final class Step {
        public String texto = "";
        public String porque = "";
        public String itemId = "";
        public int quantidade = 1;
        public String blocoId = "";
        public boolean feito = false;

        public boolean automatico() {
            return !itemId.isBlank() || !blocoId.isBlank();
        }
    }

    /** Indice do primeiro passo nao concluido, ou -1 se tudo estiver feito. */
    public int atual() {
        for (int i = 0; i < passos.size(); i++) {
            if (!passos.get(i).feito) return i;
        }
        return -1;
    }

    public int feitos() {
        int n = 0;
        for (Step s : passos) if (s.feito) n++;
        return n;
    }

    public boolean completo() {
        return !passos.isEmpty() && atual() < 0;
    }

    /** Resumo em texto (vai junto com cada pergunta para o Professor saber em que ponto o jogador esta). */
    public String resumo() {
        StringBuilder b = new StringBuilder();
        b.append("Blueprint \"").append(titulo).append("\" (").append(feitos()).append('/').append(passos.size())
                .append(" passos feitos)\n");
        for (int i = 0; i < passos.size(); i++) {
            Step s = passos.get(i);
            b.append(s.feito ? "[x] " : "[ ] ").append(i + 1).append(". ").append(s.texto);
            if (!s.itemId.isBlank()) b.append(" {item ").append(s.quantidade).append("x ").append(s.itemId).append('}');
            if (!s.blocoId.isBlank()) b.append(" {bloco ").append(s.blocoId).append('}');
            b.append('\n');
        }
        return b.toString().strip();
    }
}
