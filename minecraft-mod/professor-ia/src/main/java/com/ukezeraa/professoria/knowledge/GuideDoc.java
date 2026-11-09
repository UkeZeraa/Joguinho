package com.ukezeraa.professoria.knowledge;

import java.util.List;

/**
 * Um "documento" de conhecimento: uma entrada de livro Patchouli, uma pagina do guia do AE2,
 * um capitulo do FTB Quests etc.
 *
 * @param id       identificador unico usado pela ferramenta ler_guia
 * @param source   de onde veio (ex.: "patchouli:mekanism", "ftbquests", "guideme:ae2")
 * @param title    titulo da entrada
 * @param category categoria/capitulo (pode ser vazio)
 * @param text     texto limpo (em ingles, normalmente)
 * @param items    ids de itens citados na entrada (receitas, spotlights, tarefas de quest)
 */
public record GuideDoc(String id, String source, String title, String category, String text, List<String> items) {
    public GuideDoc {
        title = title == null ? "" : title;
        category = category == null ? "" : category;
        text = text == null ? "" : text;
        items = items == null ? List.of() : List.copyOf(items);
    }

    /** O namespace (mod) principal do documento, ex.: "mekanism". */
    public String modId() {
        int c = id.indexOf(':');
        String rest = c >= 0 ? id.substring(c + 1) : id;
        int slash = rest.indexOf('/');
        return slash >= 0 ? rest.substring(0, slash) : rest;
    }
}
