package com.ukezeraa.professoria.client;

import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.game.Session;
import net.minecraft.ChatFormatting;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.List;

/** A tela de conversa com o Professor (tecla K). Esquerda: conversa. Direita: blueprint atual. */
public final class ProfessorScreen extends Screen {
    private static final String[] SUGGESTIONS = {
            "O que eu faco agora?",
            "Monte um plano para minha meta",
            "Como automatizar meus minerios?",
            "Explique o mod principal deste pack"
    };

    private EditBox input;
    private int scroll = 0; // linhas a partir do fim
    private List<FormattedCharSequence> wrapped = List.of();
    private int wrappedFor = -1;
    private int wrappedWidth = -1;
    private int chatX, chatY, chatW, chatH, sideX, sideW;
    private final List<Button> suggestionButtons = new ArrayList<>();

    public ProfessorScreen() {
        super(Component.literal("Professor IA"));
    }

    @Override
    protected void init() {
        int margin = 10;
        boolean side = width >= 420;
        sideW = side ? Math.min(200, width / 3) : 0;
        chatX = margin;
        chatY = 24;
        chatW = width - margin * 2 - (side ? sideW + 8 : 0);
        chatH = height - chatY - 36;
        sideX = chatX + chatW + 8;

        input = new EditBox(font, chatX, height - 28, chatW - 112, 20, Component.literal("Pergunta"));
        input.setMaxLength(2000);
        input.setHint(Component.literal("Pergunte ao Professor...").withStyle(ChatFormatting.DARK_GRAY));
        addRenderableWidget(input);
        addRenderableWidget(Button.builder(Component.literal("Enviar"), b -> send())
                .bounds(chatX + chatW - 108, height - 28, 52, 20).build());
        addRenderableWidget(Button.builder(Component.literal("Parar"), b -> ProfessorClient.agent().cancel())
                .bounds(chatX + chatW - 52, height - 28, 52, 20).build());
        addRenderableWidget(Button.builder(Component.literal("Nova conversa"), b -> {
            ProfessorClient.agent().resetConversation();
            Session.clearLog();
            wrappedFor = -1;
        }).bounds(width - margin - 90, 2, 90, 18).build());

        suggestionButtons.clear();
        int by = chatY + 40;
        for (String s : SUGGESTIONS) {
            Button b = Button.builder(Component.literal(s), btn -> {
                input.setValue(s);
                send();
            }).bounds(chatX + 10, by, Math.min(240, chatW - 20), 20).build();
            suggestionButtons.add(addRenderableWidget(b));
            by += 24;
        }
        setInitialFocus(input);
    }

    private void send() {
        String text = input.getValue().strip();
        if (text.isEmpty()) return;
        input.setValue("");
        scroll = 0;
        ProfessorClient.ask(text, true);
    }

    @Override
    public boolean keyPressed(int key, int scan, int mods) {
        if ((key == GLFW.GLFW_KEY_ENTER || key == GLFW.GLFW_KEY_KP_ENTER) && input.isFocused()) {
            send();
            return true;
        }
        if (key == GLFW.GLFW_KEY_PAGE_UP) {
            scroll += 10;
            return true;
        }
        if (key == GLFW.GLFW_KEY_PAGE_DOWN) {
            scroll = Math.max(0, scroll - 10);
            return true;
        }
        return super.keyPressed(key, scan, mods);
    }

    @Override
    public boolean mouseScrolled(double mx, double my, double sx, double sy) {
        scroll = Math.max(0, scroll + (int) Math.signum(sy) * 3);
        return true;
    }

    @Override
    public boolean isPauseScreen() {
        return false; // o jogo continua rodando (o Professor precisa ver o mundo)
    }

    private List<FormattedCharSequence> wrap() {
        List<Session.Line> lines = Session.lines();
        int key = lines.size() * 31 + (lines.isEmpty() ? 0 : lines.get(lines.size() - 1).text().length());
        if (key == wrappedFor && chatW == wrappedWidth) return wrapped;
        List<FormattedCharSequence> out = new ArrayList<>();
        int w = chatW - 12;
        for (Session.Line l : lines) {
            switch (l.kind()) {
                case ALUNO -> {
                    out.add(Component.literal("Voce:").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD).getVisualOrderText());
                    for (var c : Markdown.lines(l.text(), ChatFormatting.GRAY)) out.addAll(font.split(c, w));
                }
                case PROFESSOR -> {
                    out.add(Component.literal("Professor:").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD).getVisualOrderText());
                    for (var c : Markdown.lines(l.text(), ChatFormatting.WHITE)) out.addAll(font.split(c, w));
                }
                case ERRO -> out.addAll(font.split(Component.literal("⚠ " + l.text()).withStyle(ChatFormatting.RED), w));
                case STATUS, SISTEMA -> out.addAll(font.split(Component.literal(l.text())
                        .withStyle(ChatFormatting.DARK_GRAY, ChatFormatting.ITALIC), w));
            }
            out.add(FormattedCharSequence.EMPTY);
        }
        wrapped = out;
        wrappedFor = key;
        wrappedWidth = chatW;
        return out;
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        boolean empty = Session.lines().isEmpty();
        for (Button b : suggestionButtons) b.visible = empty;
        super.render(g, mx, my, pt);

        g.fill(chatX - 2, chatY - 2, chatX + chatW + 2, chatY + chatH + 2, 0xB0101018);
        g.drawString(font, Component.literal("Professor IA").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), chatX, 8, 0xFFFFFF);
        String meta = Session.state().meta;
        int metaX = chatX + font.width("Professor IA") + 14;
        int metaW = width - 10 - 90 - 8 - metaX; // ate o botao "Nova conversa"
        String metaText = meta.isBlank() ? "Sem meta (use /meta)" : "Meta: " + meta;
        if (font.width(metaText) > metaW) metaText = font.plainSubstrByWidth(metaText, metaW - font.width("...")) + "...";
        g.drawString(font, metaText, metaX, 8, 0xFFAAAAAA, false);

        if (empty) {
            g.drawString(font, "Ola! Eu leio os guias dos seus mods e te ensino o caminho.", chatX + 10, chatY + 10, 0xFFDDDDDD, false);
            g.drawString(font, "Defina uma meta com /meta ou pergunte algo:", chatX + 10, chatY + 24, 0xFFAAAAAA, false);
        } else {
            List<FormattedCharSequence> lines = wrap();
            int visible = (chatH - 14) / 10;
            int maxScroll = Math.max(0, lines.size() - visible);
            scroll = Math.min(scroll, maxScroll);
            int end = lines.size() - scroll;
            int start = Math.max(0, end - visible);
            g.enableScissor(chatX, chatY, chatX + chatW, chatY + chatH);
            int y = chatY + 4;
            for (int i = start; i < end; i++) {
                g.drawString(font, lines.get(i), chatX + 4, y, 0xFFFFFFFF, false);
                y += 10;
            }
            g.disableScissor();
            if (scroll > 0) g.drawString(font, "↓ mais (role)", chatX + chatW - 70, chatY + chatH - 10, 0xFF888888, false);
        }
        String status = Session.status();
        if (!status.isEmpty()) {
            String dots = ".".repeat((int) (System.currentTimeMillis() / 400 % 4));
            g.drawString(font, "✎ " + status + dots, chatX + 4, chatY + chatH - 10, 0xFFFFD27F, true);
        }
        if (sideW > 0) renderBlueprint(g);
    }

    private void renderBlueprint(GuiGraphics g) {
        int x = sideX;
        int y = chatY;
        g.fill(x - 2, y - 2, x + sideW + 2, chatY + chatH + 2, 0xB0181810);
        Blueprint bp = Session.state().blueprint;
        if (bp == null || bp.passos.isEmpty()) {
            for (var l : font.split(Component.literal("Nenhum blueprint ainda. Peca um plano ao Professor!")
                    .withStyle(ChatFormatting.GRAY), sideW - 6)) {
                g.drawString(font, l, x + 3, y + 3, 0xFFFFFFFF, false);
                y += 10;
            }
            return;
        }
        y += 3;
        for (var l : font.split(Component.literal(bp.titulo).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), sideW - 6)) {
            g.drawString(font, l, x + 3, y, 0xFFFFFFFF, false);
            y += 10;
        }
        g.drawString(font, bp.feitos() + "/" + bp.passos.size() + " passos", x + 3, y, 0xFFAAAAAA, false);
        y += 13;
        int cur = bp.atual();
        for (int i = 0; i < bp.passos.size() && y < chatY + chatH - 10; i++) {
            Blueprint.Step s = bp.passos.get(i);
            ChatFormatting color = s.feito ? ChatFormatting.DARK_GREEN : i == cur ? ChatFormatting.YELLOW : ChatFormatting.WHITE;
            String mark = s.feito ? "✔ " : i == cur ? "➜ " : "  ";
            for (var l : font.split(Component.literal(mark + (i + 1) + ". " + s.texto).withStyle(color), sideW - 6)) {
                g.drawString(font, l, x + 3, y, 0xFFFFFFFF, false);
                y += 10;
            }
            if (i == cur && !s.porque.isBlank()) {
                for (var l : font.split(Component.literal(s.porque).withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC), sideW - 12)) {
                    g.drawString(font, l, x + 9, y, 0xFFFFFFFF, false);
                    y += 10;
                }
            }
            y += 2;
        }
    }
}
