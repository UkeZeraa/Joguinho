package com.ukezeraa.professoria.client;

import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.game.GameTools;
import com.ukezeraa.professoria.game.Session;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;

import java.util.List;

/** Mostra no canto da tela o passo atual do blueprint (tecla J liga/desliga). */
public final class BlueprintHud {
    private static final int WIDTH = 190;

    private BlueprintHud() {
    }

    public static void render(GuiGraphics g, DeltaTracker delta) {
        Minecraft mc = Minecraft.getInstance();
        if (!ProfessorClient.hudVisible() || mc.options.hideGui || mc.player == null || mc.screen != null) return;
        Font font = mc.font;
        String status = Session.status();
        Blueprint bp = Session.state().blueprint;
        int x = 4;
        int y = 4;
        if (!status.isEmpty()) {
            g.drawString(font, Component.literal("✎ Professor: " + status), x, y, 0xFFFFD27F, true);
            y += 11;
        }
        if (bp == null || bp.passos.isEmpty()) return;
        int cur = bp.atual();
        String head = bp.titulo + "  " + bp.feitos() + "/" + bp.passos.size();
        List<FormattedCharSequence> body;
        String progress = "";
        if (cur < 0) {
            body = font.split(Component.literal("Fase completa! Fale com o Professor (K)."), WIDTH);
        } else {
            Blueprint.Step s = bp.passos.get(cur);
            body = font.split(Component.literal((cur + 1) + ". " + s.texto), WIDTH);
            if (!s.itemId.isBlank()) {
                int have = GameTools.inventoryCounts(mc.player).getOrDefault(s.itemId, 0);
                progress = "   " + Math.min(have, s.quantidade) + "/" + s.quantidade;
            }
        }
        int h = 12 + body.size() * 10 + (progress.isEmpty() ? 0 : 10) + 4;
        g.fill(x - 2, y - 2, x + WIDTH + 4, y + h, 0x90000000);
        g.drawString(font, head, x, y, 0xFFFFAA00, false);
        y += 12;
        for (FormattedCharSequence line : body) {
            g.drawString(font, line, x, y, 0xFFFFFFFF, false);
            y += 10;
        }
        if (!progress.isEmpty()) g.drawString(font, progress, x, y, 0xFF7FFF7F, false);
    }
}
