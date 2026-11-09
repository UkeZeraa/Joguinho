package com.ukezeraa.professoria.knowledge;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Indice de busca (BM25) sobre todos os guias encontrados no modpack.
 * Imutavel depois de construido: o carregador cria um novo e troca a referencia.
 */
public final class KnowledgeBase {
    private static final double K1 = 1.2;
    private static final double B = 0.75;
    private static final double TITLE_WEIGHT = 4.0;
    private static final Set<String> STOP = Set.of(
            "the", "a", "an", "of", "to", "and", "or", "in", "on", "is", "it", "for", "with", "you", "your", "can",
            "be", "this", "that", "as", "are", "by", "at", "from", "will", "o", "os", "de", "do", "da",
            "dos", "das", "e", "um", "uma", "para", "com", "no", "na", "em", "que", "como", "eu", "meu", "minha");

    private final Map<String, GuideDoc> docs = new LinkedHashMap<>();
    private final Map<String, Map<String, Double>> postings = new HashMap<>(); // termo -> (doc -> tf ponderado)
    private final Map<String, Double> docLen = new HashMap<>();
    private final double avgLen;

    public KnowledgeBase(Collection<GuideDoc> input) {
        double total = 0;
        for (GuideDoc d : input) {
            if (docs.containsKey(d.id())) continue;
            docs.put(d.id(), d);
            Map<String, Double> tf = new HashMap<>();
            for (String t : tokens(d.title())) tf.merge(t, TITLE_WEIGHT, Double::sum);
            for (String t : tokens(d.category())) tf.merge(t, 1.5, Double::sum);
            for (String t : tokens(d.text())) tf.merge(t, 1.0, Double::sum);
            for (String item : d.items()) {
                for (String t : tokens(item.replace(':', ' ').replace('_', ' '))) tf.merge(t, 2.0, Double::sum);
                tf.merge(item.toLowerCase(Locale.ROOT), 3.0, Double::sum);
            }
            double len = 0;
            for (Map.Entry<String, Double> e : tf.entrySet()) {
                postings.computeIfAbsent(e.getKey(), k -> new HashMap<>()).put(d.id(), e.getValue());
                len += e.getValue();
            }
            docLen.put(d.id(), len);
            total += len;
        }
        avgLen = docs.isEmpty() ? 1 : total / docs.size();
    }

    public static KnowledgeBase empty() {
        return new KnowledgeBase(List.of());
    }

    public int size() {
        return docs.size();
    }

    public GuideDoc get(String id) {
        return docs.get(id);
    }

    public Collection<GuideDoc> all() {
        return docs.values();
    }

    /** Quantidade de documentos por origem, para o comando de status. */
    public Map<String, Integer> countBySource() {
        Map<String, Integer> out = new TreeMap<>();
        for (GuideDoc d : docs.values()) out.merge(d.source(), 1, Integer::sum);
        return out;
    }

    public record Hit(GuideDoc doc, double score, String snippet) {
    }

    /**
     * @param query  texto livre (ingles funciona melhor, os guias sao em ingles) ou id de item
     * @param modId  filtra por mod/namespace (opcional, pode ser null)
     */
    public List<Hit> search(String query, String modId, int limit) {
        List<String> q = new ArrayList<>(new HashSet<>(tokens(query)));
        String raw = query.trim().toLowerCase(Locale.ROOT);
        if (raw.contains(":")) q.add(raw);
        Map<String, Double> scores = new HashMap<>();
        int n = docs.size();
        for (String term : q) {
            Map<String, Double> post = postings.get(term);
            if (post == null) continue;
            double idf = Math.log(1 + (n - post.size() + 0.5) / (post.size() + 0.5));
            for (Map.Entry<String, Double> e : post.entrySet()) {
                double tf = e.getValue();
                double norm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * docLen.get(e.getKey()) / avgLen));
                scores.merge(e.getKey(), idf * norm, Double::sum);
            }
        }
        String mod = modId == null || modId.isBlank() ? null : modId.trim().toLowerCase(Locale.ROOT);
        return scores.entrySet().stream()
                .map(e -> Map.entry(docs.get(e.getKey()), e.getValue()))
                .filter(e -> mod == null || e.getKey().modId().equals(mod) || e.getKey().source().endsWith(mod)
                        || e.getKey().items().stream().anyMatch(i -> i.startsWith(mod + ":")))
                .sorted(Map.Entry.<GuideDoc, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(e -> new Hit(e.getKey(), e.getValue(), snippet(e.getKey().text(), q)))
                .toList();
    }

    static String snippet(String text, List<String> terms) {
        String folded = TextCleaner.fold(text);
        int best = -1;
        for (String t : terms) {
            int idx = folded.indexOf(t);
            if (idx >= 0 && (best < 0 || idx < best)) best = idx;
        }
        int start = Math.max(0, best < 0 ? 0 : best - 80);
        int end = Math.min(text.length(), start + 240);
        String s = text.substring(start, end).replace('\n', ' ');
        return (start > 0 ? "..." : "") + s + (end < text.length() ? "..." : "");
    }

    static List<String> tokens(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) return out;
        for (String t : TextCleaner.fold(text).split("[^a-z0-9]+")) {
            if (t.length() < 2 || STOP.contains(t)) continue;
            out.add(stem(t));
        }
        return out;
    }

    /** Stemming bem simples para ingles (plurais e -ing/-ed), suficiente para a busca. */
    static String stem(String t) {
        if (t.length() > 5 && t.endsWith("ing")) return t.substring(0, t.length() - 3);
        if (t.length() > 4 && t.endsWith("ies")) return t.substring(0, t.length() - 3) + "y";
        if (t.length() > 4 && t.endsWith("ed")) return t.substring(0, t.length() - 2);
        if (t.length() > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.substring(0, t.length() - 1);
        return t;
    }
}
