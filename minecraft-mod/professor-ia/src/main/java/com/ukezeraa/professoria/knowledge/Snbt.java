package com.ukezeraa.professoria.knowledge;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Leitor tolerante de SNBT (o formato de texto usado pelo FTB Quests).
 * Devolve Map (compound), List (lista/array), String, Double/Long ou Boolean.
 * Aceita virgulas opcionais, chaves sem aspas (com pontos) e arrays tipados [I; ...].
 */
public final class Snbt {
    private final String s;
    private int i;

    private Snbt(String s) {
        this.s = s;
    }

    public static Object parse(String text) {
        Snbt p = new Snbt(text);
        p.skip();
        Object v = p.value();
        return v;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseCompound(String text) {
        Object v = parse(text);
        return v instanceof Map ? (Map<String, Object>) v : Map.of();
    }

    private void skip() {
        while (i < s.length()) {
            char c = s.charAt(i);
            if (Character.isWhitespace(c) || c == ',') {
                i++;
            } else if (c == '/' && i + 1 < s.length() && s.charAt(i + 1) == '/') {
                while (i < s.length() && s.charAt(i) != '\n') i++;
            } else {
                break;
            }
        }
    }

    private Object value() {
        if (i >= s.length()) return null;
        char c = s.charAt(i);
        if (c == '{') return compound();
        if (c == '[') return list();
        if (c == '"' || c == '\'') return quoted();
        return scalar(bare());
    }

    private Map<String, Object> compound() {
        Map<String, Object> map = new LinkedHashMap<>();
        i++; // {
        while (true) {
            skip();
            if (i >= s.length()) return map;
            if (s.charAt(i) == '}') {
                i++;
                return map;
            }
            String key = (s.charAt(i) == '"' || s.charAt(i) == '\'') ? quoted() : bareKey();
            skip();
            if (i < s.length() && s.charAt(i) == ':') i++;
            skip();
            map.put(key, value());
        }
    }

    private List<Object> list() {
        List<Object> out = new ArrayList<>();
        i++; // [
        // array tipado: [I; 1, 2] / [B; ...] / [L; ...]
        int save = i;
        skip();
        if (i + 1 < s.length() && "BIL".indexOf(s.charAt(i)) >= 0 && s.charAt(i + 1) == ';') {
            i += 2;
        } else {
            i = save;
        }
        while (true) {
            skip();
            if (i >= s.length()) return out;
            if (s.charAt(i) == ']') {
                i++;
                return out;
            }
            out.add(value());
        }
    }

    private String quoted() {
        char q = s.charAt(i++);
        StringBuilder b = new StringBuilder();
        while (i < s.length()) {
            char c = s.charAt(i++);
            if (c == '\\' && i < s.length()) {
                char n = s.charAt(i++);
                switch (n) {
                    case 'n' -> b.append('\n');
                    case 't' -> b.append('\t');
                    default -> b.append(n);
                }
            } else if (c == q) {
                break;
            } else {
                b.append(c);
            }
        }
        return b.toString();
    }

    private String bareKey() {
        int start = i;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == ':' || Character.isWhitespace(c) || c == '}' || c == ',') break;
            i++;
        }
        return s.substring(start, i);
    }

    private String bare() {
        int start = i;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (Character.isWhitespace(c) || c == ',' || c == '}' || c == ']') break;
            i++;
        }
        if (start == i) i++; // evita laco infinito em caractere inesperado
        return s.substring(start, Math.min(i, s.length()));
    }

    private static Object scalar(String t) {
        if (t.equals("true")) return Boolean.TRUE;
        if (t.equals("false")) return Boolean.FALSE;
        String num = t;
        if (!num.isEmpty() && "bBsSlLfFdD".indexOf(num.charAt(num.length() - 1)) >= 0) {
            num = num.substring(0, num.length() - 1);
        }
        try {
            if (num.matches("-?\\d+")) return Long.parseLong(num);
            if (num.matches("-?\\d*\\.\\d+([eE]-?\\d+)?|-?\\d+[eE]-?\\d+")) return Double.parseDouble(num);
        } catch (NumberFormatException ignored) {
        }
        return t;
    }
}
