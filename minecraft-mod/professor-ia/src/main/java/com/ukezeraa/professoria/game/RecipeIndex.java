package com.ukezeraa.professoria.game;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mojang.serialization.JsonOps;
import net.minecraft.core.HolderLookup;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Recipe;
import net.minecraft.world.item.crafting.RecipeHolder;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Indice de todas as receitas do modpack (incluindo maquinas de mods). Cada receita e convertida
 * para JSON pelo codec oficial, o que funciona com qualquer mod: fluidos, quimicos, energia etc.
 * aparecem no JSON mesmo que nao sejam itens.
 */
public final class RecipeIndex {
    private static final Pattern ID = Pattern.compile("[a-z0-9_.-]+:[a-z0-9_/.-]+");

    public record Entry(String id, String type, Set<String> outputs, Set<String> inputs, String json) {
    }

    private final List<Entry> entries;
    private final Object owner;

    private RecipeIndex(List<Entry> entries, Object owner) {
        this.entries = entries;
        this.owner = owner;
    }

    public boolean isFor(Object recipeManager) {
        return owner == recipeManager;
    }

    public List<Entry> entries() {
        return entries;
    }

    public static RecipeIndex build(Object owner, Collection<RecipeHolder<?>> recipes, HolderLookup.Provider registries) {
        var ops = registries.createSerializationContext(JsonOps.INSTANCE);
        List<Entry> out = new ArrayList<>(recipes.size());
        for (RecipeHolder<?> h : recipes) {
            Recipe<?> r = h.value();
            String type = String.valueOf(BuiltInRegistries.RECIPE_TYPE.getKey(r.getType()));
            Set<String> outputs = new LinkedHashSet<>();
            Set<String> inputs = new LinkedHashSet<>();
            String json = "";
            try {
                ItemStack res = r.getResultItem(registries);
                if (res != null && !res.isEmpty()) outputs.add(BuiltInRegistries.ITEM.getKey(res.getItem()).toString());
            } catch (Exception ignored) {
            }
            try {
                r.getIngredients().forEach(ing -> {
                    for (ItemStack s : ing.getItems()) inputs.add(BuiltInRegistries.ITEM.getKey(s.getItem()).toString());
                });
            } catch (Exception ignored) {
            }
            try {
                JsonElement el = Recipe.CODEC.encodeStart(ops, r).result().orElse(null);
                if (el != null) {
                    walk(el, false, outputs, inputs);
                    json = el.toString();
                }
            } catch (Exception ignored) {
            }
            out.add(new Entry(h.id().toString(), type, outputs, inputs, json));
        }
        return new RecipeIndex(List.copyOf(out), owner);
    }

    /** Separa ids que aparecem em chaves de saida (result/output) dos de entrada. */
    private static void walk(JsonElement el, boolean output, Set<String> outputs, Set<String> inputs) {
        if (el.isJsonObject()) {
            JsonObject o = el.getAsJsonObject();
            for (Map.Entry<String, JsonElement> e : o.entrySet()) {
                String k = e.getKey().toLowerCase();
                if (k.equals("type") || k.equals("neoforge:conditions") || k.equals("conditions")) continue;
                boolean out = output || k.contains("result") || k.contains("output") || k.equals("secondary");
                if (k.equals("tag") && e.getValue().isJsonPrimitive()) {
                    (out ? outputs : inputs).add("#" + e.getValue().getAsString());
                    continue;
                }
                walk(e.getValue(), out, outputs, inputs);
            }
        } else if (el.isJsonArray()) {
            for (JsonElement x : el.getAsJsonArray()) walk(x, output, outputs, inputs);
        } else if (el.isJsonPrimitive() && el.getAsJsonPrimitive().isString()) {
            String s = el.getAsString();
            if (ID.matcher(s).matches()) (output ? outputs : inputs).add(s);
        }
    }
}
