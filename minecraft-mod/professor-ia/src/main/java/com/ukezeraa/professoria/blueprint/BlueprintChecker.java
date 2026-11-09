package com.ukezeraa.professoria.blueprint;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Logica pura que marca passos como concluidos a partir do inventario e dos blocos por perto. */
public final class BlueprintChecker {
    private BlueprintChecker() {
    }

    /**
     * @param inventory contagem de itens no inventario (id -> quantidade)
     * @param nearBlocks ids de blocos encontrados perto do jogador (pode ser vazio)
     * @return indices dos passos que acabaram de ser concluidos
     */
    public static List<Integer> update(Blueprint bp, Map<String, Integer> inventory, Set<String> nearBlocks) {
        List<Integer> done = new ArrayList<>();
        for (int i = 0; i < bp.passos.size(); i++) {
            Blueprint.Step s = bp.passos.get(i);
            if (s.feito || !s.automatico()) continue;
            boolean ok = false;
            if (!s.itemId.isBlank() && inventory.getOrDefault(s.itemId, 0) >= Math.max(1, s.quantidade)) ok = true;
            if (!s.blocoId.isBlank() && nearBlocks.contains(s.blocoId)) ok = true;
            if (ok) {
                s.feito = true;
                done.add(i);
            }
        }
        return done;
    }

    /** O passo atual precisa de varredura de blocos? (evita varrer o mundo sem necessidade) */
    public static boolean needsBlockScan(Blueprint bp) {
        for (Blueprint.Step s : bp.passos) {
            if (!s.feito && !s.blocoId.isBlank()) return true;
        }
        return false;
    }
}
