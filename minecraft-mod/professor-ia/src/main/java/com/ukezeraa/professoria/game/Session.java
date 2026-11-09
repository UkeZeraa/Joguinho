package com.ukezeraa.professoria.game;

import com.ukezeraa.professoria.ProfessorIA;
import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.blueprint.WorldState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ServerData;
import net.neoforged.fml.loading.FMLPaths;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Estado do Professor no mundo atual: meta, blueprint e historico da conversa exibido na tela.
 * Alterado sempre na thread do jogo.
 */
public final class Session {
    public enum Kind { ALUNO, PROFESSOR, STATUS, ERRO, SISTEMA }

    public record Line(Kind kind, String text) {
    }

    private static WorldState state = new WorldState();
    private static Path file = null;
    private static final List<Line> LOG = new ArrayList<>();
    private static volatile String status = "";

    private Session() {
    }

    public static WorldState state() {
        return state;
    }

    public static void open() {
        Minecraft mc = Minecraft.getInstance();
        String key;
        if (mc.getSingleplayerServer() != null) {
            key = "sp_" + mc.getSingleplayerServer().getWorldData().getLevelName();
        } else {
            ServerData sd = mc.getCurrentServer();
            key = "mp_" + (sd != null ? sd.ip : "desconhecido");
        }
        file = FMLPaths.GAMEDIR.get().resolve("professoria").resolve(WorldState.safeFileName(key) + ".json");
        state = WorldState.load(file);
        synchronized (LOG) {
            LOG.clear();
        }
    }

    public static void close() {
        save();
        file = null;
        state = new WorldState();
    }

    public static void save() {
        if (file == null) return;
        try {
            state.save(file);
        } catch (Exception e) {
            ProfessorIA.LOG.warn("Nao consegui salvar {}", file, e);
        }
    }

    public static void setGoal(String goal) {
        state.meta = goal == null ? "" : goal.strip();
        save();
    }

    public static void setBlueprint(Blueprint bp) {
        Blueprint old = state.blueprint;
        if (old != null && old.completo() && !old.titulo.isBlank()) state.concluidos.add(old.titulo);
        state.blueprint = bp;
        save();
    }

    /** Bloco [Contexto] enviado junto com cada mensagem ao Professor. */
    public static String context() {
        StringBuilder b = new StringBuilder();
        b.append("Meta do aluno: ").append(state.meta.isBlank() ? "(nenhuma definida; o aluno pode usar /meta)" : state.meta).append('\n');
        if (state.blueprint != null) b.append(state.blueprint.resumo()).append('\n');
        else b.append("Blueprint ativo: nenhum\n");
        if (!state.concluidos.isEmpty()) {
            List<String> last = state.concluidos.subList(Math.max(0, state.concluidos.size() - 8), state.concluidos.size());
            b.append("Fases ja concluidas: ").append(String.join("; ", last)).append('\n');
        }
        return b.toString();
    }

    public static void log(Kind kind, String text) {
        synchronized (LOG) {
            LOG.add(new Line(kind, text));
            if (LOG.size() > 300) LOG.remove(0);
        }
    }

    public static List<Line> lines() {
        synchronized (LOG) {
            return List.copyOf(LOG);
        }
    }

    public static void clearLog() {
        synchronized (LOG) {
            LOG.clear();
        }
    }

    public static String status() {
        return status;
    }

    public static void setStatus(String s) {
        status = s == null ? "" : s;
    }
}
