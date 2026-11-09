package com.ukezeraa.professoria.knowledge;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.UnaryOperator;

/** Converte uma entrada (entry .json) de um livro Patchouli em {@link GuideDoc}. */
public final class PatchouliParser {
    private PatchouliParser() {
    }

    /**
     * @param id        id do documento
     * @param source    origem (ex.: "patchouli:mekanism")
     * @param json      conteudo do arquivo da entrada
     * @param translate resolve chaves de traducao (livros com "i18n": true usam chaves no lugar do texto)
     */
    public static GuideDoc parseEntry(String id, String source, String json, UnaryOperator<String> translate) {
        JsonObject o = JsonParser.parseString(json).getAsJsonObject();
        String title = TextCleaner.patchouli(translate.apply(str(o, "name")));
        String category = str(o, "category");
        int colon = category.indexOf(':');
        if (colon >= 0) category = category.substring(colon + 1);
        Set<String> items = new LinkedHashSet<>();
        addItem(items, str(o, "icon"));

        StringBuilder text = new StringBuilder();
        JsonArray pages = o.has("pages") && o.get("pages").isJsonArray() ? o.getAsJsonArray("pages") : new JsonArray();
        int n = 0;
        for (JsonElement pe : pages) {
            if (!pe.isJsonObject()) continue;
            JsonObject p = pe.getAsJsonObject();
            n++;
            String type = str(p, "type");
            String shortType = type.contains(":") ? type.substring(type.indexOf(':') + 1) : type;
            StringBuilder page = new StringBuilder();
            String pageTitle = str(p, "title");
            if (!pageTitle.isEmpty()) page.append("## ").append(TextCleaner.patchouli(translate.apply(pageTitle))).append('\n');
            for (String key : List.of("recipe", "recipe2")) {
                String r = str(p, key);
                if (!r.isEmpty()) {
                    page.append("[receita ").append(shortType).append(": ").append(r).append("]\n");
                    items.add(r);
                }
            }
            String item = str(p, "item");
            if (!item.isEmpty()) {
                for (String it : item.split(",")) addItem(items, it.trim());
                page.append("[item em destaque: ").append(item).append("]\n");
            }
            String entity = str(p, "entity");
            if (!entity.isEmpty()) page.append("[entidade: ").append(entity).append("]\n");
            if (p.has("multiblock_id")) page.append("[estrutura multibloco: ").append(str(p, "multiblock_id")).append("]\n");
            else if (p.has("multiblock")) page.append("[estrutura multibloco]\n");
            String body = str(p, "text");
            if (!body.isEmpty()) page.append(TextCleaner.patchouli(translate.apply(body))).append('\n');
            if (!page.isEmpty()) {
                text.append("--- pagina ").append(n).append(" ---\n").append(page);
            }
        }
        return new GuideDoc(id, source, title, category, text.toString().strip(), new ArrayList<>(items));
    }

    private static void addItem(Set<String> items, String raw) {
        if (raw == null || raw.isBlank() || !raw.contains(":")) return;
        String id = raw.trim();
        int nbt = id.indexOf('{');
        if (nbt >= 0) id = id.substring(0, nbt);
        int bracket = id.indexOf('[');
        if (bracket >= 0) id = id.substring(0, bracket);
        int hash = id.indexOf('#');
        if (hash >= 0) id = id.substring(0, hash);
        if (id.endsWith(".png")) return;
        items.add(id);
    }

    private static String str(JsonObject o, String key) {
        JsonElement e = o.get(key);
        if (e == null || e.isJsonNull()) return "";
        if (e.isJsonPrimitive()) return e.getAsString();
        if (e.isJsonObject() && e.getAsJsonObject().has("item")) return str(e.getAsJsonObject(), "item");
        return "";
    }
}
