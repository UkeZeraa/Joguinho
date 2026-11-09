package com.ukezeraa.professoria.client;

import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;

import java.util.ArrayList;
import java.util.List;

/** Converte o Markdown simples das respostas em texto formatado do Minecraft. */
public final class Markdown {
    private Markdown() {
    }

    /** Uma linha logica (antes da quebra pela largura da tela). */
    public static List<Component> lines(String text, ChatFormatting base) {
        List<Component> out = new ArrayList<>();
        for (String raw : text.replace("\r", "").split("\n", -1)) {
            String line = raw.stripTrailing();
            if (line.isBlank()) {
                out.add(Component.empty());
                continue;
            }
            if (line.matches("^#{1,6}\\s+.*")) {
                String h = line.replaceFirst("^#{1,6}\\s+", "");
                out.add(inline(h, ChatFormatting.YELLOW).withStyle(ChatFormatting.BOLD));
                continue;
            }
            if (line.matches("^\\s*([-*])\\s+.*")) line = line.replaceFirst("([-*])\\s+", "• ");
            if (line.matches("^-{3,}$")) {
                out.add(Component.literal("────────").withStyle(ChatFormatting.DARK_GRAY));
                continue;
            }
            out.add(inline(line, base));
        }
        return out;
    }

    /** Aplica **negrito** e `codigo` dentro de uma linha. */
    static MutableComponent inline(String line, ChatFormatting base) {
        MutableComponent c = Component.empty();
        int i = 0;
        boolean bold = false;
        boolean code = false;
        StringBuilder buf = new StringBuilder();
        while (i < line.length()) {
            if (line.startsWith("**", i)) {
                flush(c, buf, base, bold, code);
                bold = !bold;
                i += 2;
            } else if (line.charAt(i) == '`') {
                flush(c, buf, base, bold, code);
                code = !code;
                i++;
            } else {
                buf.append(line.charAt(i++));
            }
        }
        flush(c, buf, base, bold, code);
        return c;
    }

    private static void flush(MutableComponent c, StringBuilder buf, ChatFormatting base, boolean bold, boolean code) {
        if (buf.isEmpty()) return;
        MutableComponent part = Component.literal(buf.toString()).withStyle(code ? ChatFormatting.AQUA : base);
        if (bold) part = part.withStyle(ChatFormatting.BOLD, ChatFormatting.WHITE);
        c.append(part);
        buf.setLength(0);
    }

    /** Versao sem marcacao, para o chat. */
    public static String plain(String text) {
        return text.replace("**", "").replace("`", "").replaceAll("(?m)^#{1,6}\\s+", "");
    }
}
