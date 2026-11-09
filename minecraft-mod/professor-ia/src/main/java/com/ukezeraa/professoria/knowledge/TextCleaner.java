package com.ukezeraa.professoria.knowledge;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Limpa os codigos de formatacao dos livros (Patchouli, Markdown, cores do Minecraft). */
public final class TextCleaner {
    private static final Pattern PATCHOULI_LINK = Pattern.compile("\\$\\(l:[^)]*\\)(.*?)\\$\\(/l\\)");
    private static final Pattern PATCHOULI_BR = Pattern.compile("\\$\\((br|br2|li|li2|li3)\\)");
    private static final Pattern PATCHOULI_CODE = Pattern.compile("\\$\\([^)]*\\)");
    private static final Pattern MC_COLOR = Pattern.compile("[§&][0-9a-fk-orA-FK-OR]");
    private static final Pattern MD_IMAGE = Pattern.compile("!\\[([^]]*)]\\([^)]*\\)");
    private static final Pattern MD_LINK = Pattern.compile("\\[([^]]*)]\\([^)]*\\)");
    private static final Pattern HTML_TAG = Pattern.compile("</?[A-Za-z][^>]*>");
    private static final Pattern MANY_BLANK = Pattern.compile("\\n{3,}");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private TextCleaner() {
    }

    public static String patchouli(String raw) {
        if (raw == null) return "";
        String t = PATCHOULI_LINK.matcher(raw).replaceAll("$1");
        t = PATCHOULI_BR.matcher(t).replaceAll("\n");
        t = PATCHOULI_CODE.matcher(t).replaceAll("");
        return common(t);
    }

    public static String markdown(String raw) {
        if (raw == null) return "";
        String t = MD_IMAGE.matcher(raw).replaceAll("");
        t = MD_LINK.matcher(t).replaceAll("$1");
        // Tags MDX do GuideME, ex.: <ItemImage id="..."/>, <RecipeFor id="ae2:controller" />
        t = t.replaceAll("<(?:ItemImage|ItemLink|RecipeFor|Recipe|BlockImage)[^>]*id=\"([^\"]+)\"[^>]*/?>", "[$1]");
        t = HTML_TAG.matcher(t).replaceAll("");
        return common(t);
    }

    public static String common(String t) {
        t = MC_COLOR.matcher(t).replaceAll("");
        t = t.replace("\r", "");
        t = MANY_BLANK.matcher(t).replaceAll("\n\n");
        return t.strip();
    }

    /** Minusculas sem acentos, usado na busca. */
    public static String fold(String t) {
        String n = Normalizer.normalize(t, Normalizer.Form.NFD);
        return DIACRITICS.matcher(n).replaceAll("").toLowerCase(Locale.ROOT);
    }
}
