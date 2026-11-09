package com.ukezeraa.professoria.blueprint;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Meta + blueprint de um mundo/servidor, salvos em .minecraft/professoria/<mundo>.json. */
public final class WorldState {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

    public String meta = "";
    public Blueprint blueprint = null;
    /** Planos ja concluidos (so os titulos), para o Professor saber o historico. */
    public java.util.List<String> concluidos = new java.util.ArrayList<>();

    public static WorldState load(Path file) {
        try {
            if (Files.exists(file)) {
                WorldState s = GSON.fromJson(Files.readString(file, StandardCharsets.UTF_8), WorldState.class);
                if (s != null) {
                    if (s.meta == null) s.meta = "";
                    if (s.concluidos == null) s.concluidos = new java.util.ArrayList<>();
                    return s;
                }
            }
        } catch (Exception ignored) {
            // arquivo corrompido: comeca do zero
        }
        return new WorldState();
    }

    public void save(Path file) throws IOException {
        Files.createDirectories(file.getParent());
        Files.writeString(file, GSON.toJson(this), StandardCharsets.UTF_8);
    }

    public static String safeFileName(String key) {
        String s = key.replaceAll("[^A-Za-z0-9._-]+", "_");
        return s.isBlank() ? "mundo" : s;
    }
}
