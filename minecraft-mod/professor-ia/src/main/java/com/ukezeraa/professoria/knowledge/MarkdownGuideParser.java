package com.ukezeraa.professoria.knowledge;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Le paginas Markdown de guias no estilo GuideME (usado pelo guia do Applied Energistics 2). */
public final class MarkdownGuideParser {
    private static final Pattern FRONT = Pattern.compile("\\A---\\s*\\n(.*?)\\n---\\s*\\n", Pattern.DOTALL);
    private static final Pattern TITLE = Pattern.compile("(?m)^\\s*title:\\s*\"?([^\"\\n]+)\"?\\s*$");
    private static final Pattern ITEM_ID = Pattern.compile("id=\"([a-z0-9_.-]+:[a-z0-9_/.-]+)\"");
    private static final Pattern ITEM_IDS_YAML = Pattern.compile("(?m)^\\s*-\\s*([a-z0-9_.-]+:[a-z0-9_/.-]+)\\s*$");
    private static final Pattern H1 = Pattern.compile("(?m)^#\\s+(.+)$");

    private MarkdownGuideParser() {
    }

    public static GuideDoc parse(String id, String source, String category, String md) {
        String title = "";
        Set<String> items = new LinkedHashSet<>();
        String body = md.replace("\r", "");
        Matcher fm = FRONT.matcher(body);
        if (fm.find()) {
            String front = fm.group(1);
            Matcher t = TITLE.matcher(front);
            if (t.find()) title = t.group(1).trim();
            Matcher yi = ITEM_IDS_YAML.matcher(front);
            while (yi.find()) items.add(yi.group(1));
            body = body.substring(fm.end());
        }
        Matcher ids = ITEM_ID.matcher(body);
        while (ids.find()) items.add(ids.group(1));
        if (title.isEmpty()) {
            Matcher h = H1.matcher(body);
            if (h.find()) title = h.group(1).trim();
        }
        if (title.isEmpty()) {
            title = id.substring(id.lastIndexOf('/') + 1).replace(".md", "").replace('_', ' ');
        }
        return new GuideDoc(id, source, title, category, TextCleaner.markdown(body), new ArrayList<>(items));
    }

    public static List<String> extractIds(String text) {
        List<String> out = new ArrayList<>();
        Matcher m = ITEM_ID.matcher(text);
        while (m.find()) out.add(m.group(1));
        return out;
    }
}
