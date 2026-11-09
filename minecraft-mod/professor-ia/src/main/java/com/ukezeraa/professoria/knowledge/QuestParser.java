package com.ukezeraa.professoria.knowledge;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Le os capitulos do FTB Quests (config/ftbquests/quests/chapters/*.snbt) e transforma cada
 * capitulo num {@link GuideDoc} com as quests em ordem, itens pedidos e dependencias.
 * Suporta o formato novo (textos em lang/en_us.snbt) e o antigo (textos dentro do capitulo).
 */
public final class QuestParser {
    private QuestParser() {
    }

    /** Carrega o arquivo de traducao do FTB Quests (chave -> texto). */
    public static Map<String, String> parseLang(String snbt) {
        Map<String, String> out = new HashMap<>();
        for (Map.Entry<String, Object> e : Snbt.parseCompound(snbt).entrySet()) {
            Object v = e.getValue();
            if (v instanceof String s) {
                out.put(e.getKey(), s);
            } else if (v instanceof List<?> l) {
                StringBuilder b = new StringBuilder();
                for (Object o : l) {
                    if (o instanceof String s) b.append(s).append('\n');
                }
                out.put(e.getKey(), b.toString().strip());
            }
        }
        return out;
    }

    public static GuideDoc parseChapter(String fileName, String snbt, Map<String, String> lang) {
        Map<String, Object> ch = Snbt.parseCompound(snbt);
        String chapterId = str(ch.get("id"));
        String chapterTitle = first(str(ch.get("title")), lang.get("chapter." + chapterId + ".title"),
                str(ch.get("filename")), fileName);

        List<Map<String, Object>> quests = maps(ch.get("quests"));
        Map<String, String> titlesById = new HashMap<>();
        List<String[]> rendered = new ArrayList<>();
        Set<String> chapterItems = new LinkedHashSet<>();

        for (Map<String, Object> q : quests) {
            String qid = str(q.get("id"));
            List<String> taskItems = new ArrayList<>();
            for (Map<String, Object> task : maps(q.get("tasks"))) {
                String type = str(task.get("type"));
                String item = itemId(task.get("item"));
                long count = num(task.get("count"), 1);
                if (!item.isEmpty()) {
                    taskItems.add((count > 1 ? count + "x " : "") + item);
                    chapterItems.add(item);
                } else if (!type.isEmpty() && !type.equals("checkmark")) {
                    String extra = first(str(task.get("dimension")), str(task.get("entity")),
                            str(task.get("structure")), str(task.get("advancement")), str(task.get("stat")), "");
                    taskItems.add(type + (extra.isEmpty() ? "" : " " + extra));
                }
            }
            String title = first(str(q.get("title")), lang.get("quest." + qid + ".title"),
                    taskItems.isEmpty() ? "" : taskItems.get(0), "(quest sem titulo)");
            titlesById.put(qid, title);
            String subtitle = first(str(q.get("subtitle")), lang.get("quest." + qid + ".quest_subtitle"), "");
            String desc = first(listText(q.get("description")), lang.get("quest." + qid + ".quest_desc"), "");
            List<String> deps = new ArrayList<>();
            for (Object d : list(q.get("dependencies"))) deps.add(str(d));

            StringBuilder b = new StringBuilder();
            if (!subtitle.isEmpty()) b.append("  ").append(TextCleaner.common(subtitle)).append('\n');
            if (!taskItems.isEmpty()) b.append("  Tarefas: ").append(String.join(", ", taskItems)).append('\n');
            if (!desc.isEmpty()) b.append("  ").append(TextCleaner.common(desc).replace("\n", "\n  ")).append('\n');
            rendered.add(new String[]{qid, title, b.toString(), String.join(",", deps)});
        }

        StringBuilder text = new StringBuilder();
        int n = 0;
        for (String[] r : rendered) {
            n++;
            text.append(n).append(". ").append(TextCleaner.common(r[1])).append('\n');
            if (!r[3].isEmpty()) {
                List<String> depTitles = new ArrayList<>();
                for (String d : r[3].split(",")) depTitles.add(titlesById.getOrDefault(d, d));
                text.append("  Requer: ").append(String.join("; ", depTitles)).append('\n');
            }
            text.append(r[2]);
        }
        String id = "ftbquests:" + fileName.replace(".snbt", "");
        return new GuideDoc(id, "ftbquests", TextCleaner.common(chapterTitle), "FTB Quests",
                text.toString().strip(), new ArrayList<>(chapterItems));
    }

    private static String itemId(Object o) {
        if (o instanceof String s) return s.contains(":") ? s : "";
        if (o instanceof Map<?, ?> m) return itemId(m.get("id"));
        return "";
    }

    private static String listText(Object o) {
        if (o instanceof String s) return s;
        StringBuilder b = new StringBuilder();
        for (Object x : list(o)) {
            if (x instanceof String s) b.append(s).append('\n');
        }
        return b.toString().strip();
    }

    private static String first(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    private static String str(Object o) {
        return o == null ? "" : o instanceof String s ? s : String.valueOf(o);
    }

    private static long num(Object o, long def) {
        return o instanceof Number n ? n.longValue() : def;
    }

    private static List<?> list(Object o) {
        return o instanceof List<?> l ? l : List.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> maps(Object o) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object x : list(o)) {
            if (x instanceof Map<?, ?> m) out.add((Map<String, Object>) m);
        }
        return out;
    }
}
