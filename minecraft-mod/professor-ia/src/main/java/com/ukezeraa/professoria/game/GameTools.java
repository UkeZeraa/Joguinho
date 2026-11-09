package com.ukezeraa.professoria.game;

import com.ukezeraa.professoria.agent.AgentTool;
import com.ukezeraa.professoria.agent.ProfessorAgent;
import com.ukezeraa.professoria.agent.SimpleTool;
import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.knowledge.GuideDoc;
import com.ukezeraa.professoria.knowledge.KnowledgeBase;
import com.ukezeraa.professoria.knowledge.TextCleaner;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.fml.ModList;
import net.neoforged.neoforgespi.language.IModInfo;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/** As ferramentas que o Professor usa para enxergar o jogo, os guias e as receitas. */
public final class GameTools {
    private static final int PAGE_CHARS = 12_000;
    /** Blocos naturais que nao interessam ao olhar a base do jogador. */
    private static final Set<String> BORING = Set.of(
            "minecraft:air", "minecraft:cave_air", "minecraft:void_air", "minecraft:stone", "minecraft:dirt",
            "minecraft:grass_block", "minecraft:deepslate", "minecraft:water", "minecraft:lava", "minecraft:sand",
            "minecraft:gravel", "minecraft:andesite", "minecraft:diorite", "minecraft:granite", "minecraft:tuff",
            "minecraft:short_grass", "minecraft:tall_grass", "minecraft:netherrack", "minecraft:end_stone",
            "minecraft:sandstone", "minecraft:bedrock", "minecraft:snow", "minecraft:clay", "minecraft:fern",
            "minecraft:calcite", "minecraft:red_sand", "minecraft:terracotta", "minecraft:seagrass",
            "minecraft:kelp", "minecraft:kelp_plant", "minecraft:tall_seagrass", "minecraft:coarse_dirt",
            "minecraft:podzol", "minecraft:mycelium", "minecraft:ice", "minecraft:packed_ice", "minecraft:snow_block",
            "minecraft:moss_block", "minecraft:rooted_dirt", "minecraft:mud", "minecraft:dripstone_block",
            "minecraft:smooth_basalt", "minecraft:basalt", "minecraft:blackstone", "minecraft:soul_sand",
            "minecraft:soul_soil", "minecraft:magma_block", "minecraft:large_fern", "minecraft:vine");

    private static volatile RecipeIndex recipeIndex = null;
    private static volatile List<String[]> itemNames = null;

    private GameTools() {
    }

    public static void registerAll(ProfessorAgent agent) {
        for (AgentTool t : all()) agent.register(t);
    }

    /** Executa na thread do jogo e espera o resultado (as ferramentas rodam na thread do agente). */
    static <T> T onMain(Supplier<T> s) throws Exception {
        return Minecraft.getInstance().submit(s).get(30, TimeUnit.SECONDS);
    }

    static List<AgentTool> all() {
        List<AgentTool> list = new ArrayList<>();

        list.add(new SimpleTool("estado_jogador",
                "Mostra o estado atual do aluno: inventario completo (ids e quantidades), armadura, item na mao, "
                        + "vida, fome, nivel de XP, modo de jogo, dimensao, bioma, coordenadas e dia do mundo.",
                Map.of(), List.of(), in -> "Olhando seu inventario...", in -> onMain(GameTools::playerState)));

        list.add(new SimpleTool("listar_mods",
                "Lista os mods instalados no modpack (id, nome e versao). Use 'filtro' para procurar por parte do nome.",
                Map.of("filtro", AgentTool.prop("string", "Parte do id ou nome do mod (opcional)")),
                List.of(), in -> "Vendo os mods instalados...", in -> listMods(AgentTool.str(in, "filtro", ""))));

        list.add(new SimpleTool("buscar_guias",
                "Busca nos guias dos mods instalados (livros Patchouli, guia do AE2/GuideME e capitulos do FTB Quests). "
                        + "Os guias sao em ingles: busque com termos em ingles (ex.: 'digital miner', 'steel', "
                        + "'ore processing') ou com o id de um item (ex.: 'mekanism:steel_ingot'). Devolve ids para ler_guia.",
                Map.of("consulta", AgentTool.prop("string", "Termos de busca em ingles ou id de item"),
                        "mod", AgentTool.prop("string", "Filtrar por id do mod, ex.: 'mekanism' (opcional)"),
                        "limite", AgentTool.prop("integer", "Quantos resultados (padrao 8, max 20)")),
                List.of("consulta"),
                in -> "Procurando nos guias: " + AgentTool.str(in, "consulta", ""),
                in -> searchGuides(AgentTool.str(in, "consulta", ""), AgentTool.str(in, "mod", ""),
                        AgentTool.integer(in, "limite", 8, 1, 20))));

        list.add(new SimpleTool("listar_guias",
                "Lista o sumario (titulos e ids) dos guias de um mod, agrupados por categoria. Bom para conhecer a "
                        + "estrutura de um livro ou a ordem dos capitulos de quests (use mod='ftbquests').",
                Map.of("mod", AgentTool.prop("string", "Id do mod (ex.: 'mekanism', 'ae2', 'ftbquests')")),
                List.of("mod"), in -> "Abrindo o sumario: " + AgentTool.str(in, "mod", ""),
                in -> listGuides(AgentTool.str(in, "mod", ""))));

        list.add(new SimpleTool("ler_guia",
                "Le o texto completo de uma entrada de guia pelo id (obtido em buscar_guias ou listar_guias). "
                        + "Textos longos vem em partes: use 'parte' para continuar.",
                Map.of("id", AgentTool.prop("string", "Id da entrada"),
                        "parte", AgentTool.prop("integer", "Parte a ler, comecando em 1 (padrao 1)")),
                List.of("id"), in -> "Lendo o guia: " + titleOf(AgentTool.str(in, "id", "")),
                in -> readGuide(AgentTool.str(in, "id", ""), AgentTool.integer(in, "parte", 1, 1, 999))));

        list.add(new SimpleTool("buscar_itens",
                "Procura itens/blocos registrados no jogo pelo nome (no idioma do jogo) ou pelo id. Use para descobrir "
                        + "o id exato de um item antes de buscar receitas ou montar um blueprint.",
                Map.of("consulta", AgentTool.prop("string", "Nome ou parte do id, ex.: 'steel ingot', 'osmium'"),
                        "limite", AgentTool.prop("integer", "Quantos resultados (padrao 25, max 60)")),
                List.of("consulta"), in -> "Procurando o item: " + AgentTool.str(in, "consulta", ""),
                in -> searchItems(AgentTool.str(in, "consulta", ""), AgentTool.integer(in, "limite", 25, 1, 60))));

        list.add(new SimpleTool("receitas_de",
                "Mostra como fazer um item: todas as receitas do modpack que produzem esse id (bancada, fornalhas e "
                        + "maquinas de mods), com tipo da receita/maquina, entradas e o JSON da receita.",
                Map.of("item_id", AgentTool.prop("string", "Id do item, ex.: 'mekanism:steel_ingot'"),
                        "limite", AgentTool.prop("integer", "Maximo de receitas (padrao 8, max 25)")),
                List.of("item_id"), in -> "Vendo a receita de " + AgentTool.str(in, "item_id", ""),
                in -> recipes(AgentTool.str(in, "item_id", ""), true, AgentTool.integer(in, "limite", 8, 1, 25))));

        list.add(new SimpleTool("usos_de",
                "Mostra para que serve um item: receitas do modpack que usam esse id (ou uma tag dele) como entrada.",
                Map.of("item_id", AgentTool.prop("string", "Id do item"),
                        "limite", AgentTool.prop("integer", "Maximo de receitas (padrao 10, max 30)")),
                List.of("item_id"), in -> "Vendo os usos de " + AgentTool.str(in, "item_id", ""),
                in -> recipes(AgentTool.str(in, "item_id", ""), false, AgentTool.integer(in, "limite", 10, 1, 30))));

        list.add(new SimpleTool("blocos_proximos",
                "Conta os blocos perto do aluno (maquinas, cabos, baus, blocos de mods) para entender o que ele ja "
                        + "construiu na base. Ignora blocos naturais comuns.",
                Map.of("raio", AgentTool.prop("integer", "Raio em blocos (padrao 12, max 24)")),
                List.of(), in -> "Olhando sua base...",
                in -> onMain(() -> nearbyBlocks(AgentTool.integer(in, "raio", 12, 2, 24)))));

        Map<String, Object> stepSchema = new LinkedHashMap<>();
        stepSchema.put("type", "object");
        stepSchema.put("properties", Map.of(
                "texto", AgentTool.prop("string", "O que fazer, curto e concreto (portugues)"),
                "porque", AgentTool.prop("string", "Por que esse passo importa / o que destrava (curto)"),
                "item_id", AgentTool.prop("string", "Se o passo e conseguir um item: id exato do registro"),
                "quantidade", AgentTool.prop("integer", "Quantidade do item necessaria (padrao 1)"),
                "bloco_id", AgentTool.prop("string", "Se o passo e construir/colocar uma maquina: id do bloco")));
        stepSchema.put("required", List.of("texto"));
        list.add(new SimpleTool("definir_blueprint",
                "Salva o plano passo a passo (blueprint) do aluno, substituindo o anterior. Ele aparece na tela do "
                        + "aluno e cada passo com item_id/bloco_id e marcado sozinho quando o aluno consegue.",
                Map.of("titulo", AgentTool.prop("string", "Nome da fase, ex.: 'Fase 1: Aco e energia'"),
                        "passos", Map.of("type", "array", "description", "Passos em ordem", "items", stepSchema)),
                List.of("titulo", "passos"), in -> "Escrevendo o blueprint...",
                in -> onMain(() -> defineBlueprint(in))));

        list.add(new SimpleTool("marcar_passo",
                "Marca (ou desmarca) um passo do blueprint ativo como concluido, quando o aluno disser que fez.",
                Map.of("numero", AgentTool.prop("integer", "Numero do passo (comeca em 1)"),
                        "feito", AgentTool.prop("boolean", "true para concluido (padrao), false para desmarcar")),
                List.of("numero"), in -> "Atualizando o blueprint...",
                in -> onMain(() -> markStep(AgentTool.integer(in, "numero", 0, 0, 999),
                        !"false".equals(AgentTool.str(in, "feito", "true"))))));
        return list;
    }

    // ---------------------------------------------------------------- jogador

    private static String playerState() {
        Minecraft mc = Minecraft.getInstance();
        LocalPlayer p = mc.player;
        if (p == null || mc.level == null) return "O aluno nao esta em um mundo agora.";
        StringBuilder b = new StringBuilder();
        BlockPos pos = p.blockPosition();
        b.append("Jogador: ").append(p.getName().getString()).append('\n');
        b.append("Dimensao: ").append(mc.level.dimension().location()).append(" | Bioma: ")
                .append(mc.level.getBiome(pos).getRegisteredName()).append('\n');
        b.append("Posicao: ").append(pos.getX()).append(' ').append(pos.getY()).append(' ').append(pos.getZ()).append('\n');
        b.append("Vida: ").append(Math.round(p.getHealth())).append('/').append(Math.round(p.getMaxHealth()))
                .append(" | Fome: ").append(p.getFoodData().getFoodLevel()).append("/20 | Nivel XP: ")
                .append(p.experienceLevel).append('\n');
        if (mc.gameMode != null) b.append("Modo de jogo: ").append(mc.gameMode.getPlayerMode().getName()).append('\n');
        b.append("Dia do mundo: ").append(mc.level.getDayTime() / 24000L + 1).append('\n');
        b.append("Na mao: ").append(describe(p.getMainHandItem())).append(" | Mao secundaria: ")
                .append(describe(p.getOffhandItem())).append('\n');
        b.append("Armadura: ");
        List<String> armor = new ArrayList<>();
        for (ItemStack s : p.getInventory().armor) if (!s.isEmpty()) armor.add(describe(s));
        b.append(armor.isEmpty() ? "nenhuma" : String.join(", ", armor)).append('\n');
        b.append("Inventario:\n");
        Map<String, Integer> counts = new TreeMap<>();
        Map<String, String> names = new HashMap<>();
        for (ItemStack s : p.getInventory().items) {
            if (s.isEmpty()) continue;
            String id = BuiltInRegistries.ITEM.getKey(s.getItem()).toString();
            counts.merge(id, s.getCount(), Integer::sum);
            names.putIfAbsent(id, s.getHoverName().getString());
        }
        if (counts.isEmpty()) b.append("  (vazio)\n");
        counts.forEach((id, n) -> b.append("  ").append(n).append("x ").append(names.get(id)).append(" (").append(id).append(")\n"));
        return b.toString();
    }

    /** Contagem do inventario (id -> quantidade). Chamar na thread do jogo. */
    public static Map<String, Integer> inventoryCounts(LocalPlayer p) {
        Map<String, Integer> counts = new HashMap<>();
        for (List<ItemStack> part : List.of(p.getInventory().items, p.getInventory().armor, p.getInventory().offhand)) {
            for (ItemStack s : part) {
                if (!s.isEmpty()) counts.merge(BuiltInRegistries.ITEM.getKey(s.getItem()).toString(), s.getCount(), Integer::sum);
            }
        }
        return counts;
    }

    private static String describe(ItemStack s) {
        if (s.isEmpty()) return "nada";
        return (s.getCount() > 1 ? s.getCount() + "x " : "") + s.getHoverName().getString() + " ("
                + BuiltInRegistries.ITEM.getKey(s.getItem()) + ")";
    }

    // ---------------------------------------------------------------- mods

    private static String listMods(String filter) {
        String f = TextCleaner.fold(filter.trim());
        List<IModInfo> mods = ModList.get().getMods().stream()
                .filter(m -> f.isEmpty() || TextCleaner.fold(m.getModId() + " " + m.getDisplayName()).contains(f))
                .sorted(Comparator.comparing(IModInfo::getModId))
                .toList();
        StringBuilder b = new StringBuilder();
        b.append(mods.size()).append(" mods").append(f.isEmpty() ? "" : " com '" + filter + "'").append(":\n");
        for (IModInfo m : mods) {
            b.append(m.getModId()).append(" | ").append(m.getDisplayName()).append(" | ").append(m.getVersion()).append('\n');
        }
        return b.toString();
    }

    // ---------------------------------------------------------------- guias

    private static String searchGuides(String query, String mod, int limit) {
        KnowledgeBase kb = KnowledgeLoader.awaitReady();
        if (kb.size() == 0) return "Nenhum guia encontrado no modpack (nenhum livro Patchouli, guia GuideME ou FTB Quests).";
        List<KnowledgeBase.Hit> hits = kb.search(query, mod, limit);
        if (hits.isEmpty()) return "Nada encontrado para '" + query + "'. Tente outros termos em ingles ou sem filtro de mod.";
        StringBuilder b = new StringBuilder();
        for (KnowledgeBase.Hit h : hits) {
            GuideDoc d = h.doc();
            b.append("- id: ").append(d.id()).append("\n  titulo: ").append(d.title());
            if (!d.category().isEmpty()) b.append(" | categoria: ").append(d.category());
            b.append(" | ").append(d.text().length()).append(" caracteres\n  trecho: ").append(h.snippet()).append('\n');
        }
        return b.toString();
    }

    private static String listGuides(String mod) {
        KnowledgeBase kb = KnowledgeLoader.awaitReady();
        String m = mod.trim().toLowerCase();
        Map<String, List<GuideDoc>> byCat = new TreeMap<>();
        for (GuideDoc d : kb.all()) {
            boolean match = m.equals("ftbquests") ? d.source().equals("ftbquests") : d.modId().equals(m) || d.source().endsWith(":" + m);
            if (match) byCat.computeIfAbsent(d.category().isEmpty() ? "(sem categoria)" : d.category(), k -> new ArrayList<>()).add(d);
        }
        if (byCat.isEmpty()) {
            return "Nenhum guia para '" + mod + "'. Fontes disponiveis: " + kb.countBySource();
        }
        StringBuilder b = new StringBuilder();
        int total = 0;
        for (Map.Entry<String, List<GuideDoc>> e : byCat.entrySet()) {
            b.append("# ").append(e.getKey()).append('\n');
            for (GuideDoc d : e.getValue()) {
                if (total++ > 400) {
                    b.append("... (lista cortada; use buscar_guias)\n");
                    return b.toString();
                }
                b.append("- ").append(d.title()).append("  [").append(d.id()).append("]\n");
            }
        }
        return b.toString();
    }

    private static String titleOf(String id) {
        GuideDoc d = KnowledgeLoader.get().get(id);
        return d == null ? id : d.title();
    }

    private static String readGuide(String id, int part) {
        KnowledgeBase kb = KnowledgeLoader.awaitReady();
        GuideDoc d = kb.get(id);
        if (d == null) return "Entrada nao encontrada: " + id + ". Use buscar_guias para obter um id valido.";
        String text = d.text();
        int parts = Math.max(1, (text.length() + PAGE_CHARS - 1) / PAGE_CHARS);
        int p = Math.min(part, parts);
        String chunk = text.substring((p - 1) * PAGE_CHARS, Math.min(text.length(), p * PAGE_CHARS));
        StringBuilder b = new StringBuilder();
        b.append("Titulo: ").append(d.title()).append("\nFonte: ").append(d.source());
        if (!d.category().isEmpty()) b.append(" | Categoria: ").append(d.category());
        b.append("\nParte ").append(p).append(" de ").append(parts).append('\n');
        if (!d.items().isEmpty()) {
            b.append("Itens citados: ").append(String.join(", ", d.items().subList(0, Math.min(40, d.items().size())))).append('\n');
        }
        b.append("---\n").append(chunk);
        return b.toString();
    }

    // ---------------------------------------------------------------- itens

    private static List<String[]> itemNames() throws Exception {
        List<String[]> cached = itemNames;
        if (cached != null) return cached;
        cached = onMain(() -> {
            List<String[]> l = new ArrayList<>();
            for (Item item : BuiltInRegistries.ITEM) {
                String id = BuiltInRegistries.ITEM.getKey(item).toString();
                String name;
                try {
                    name = new ItemStack(item).getHoverName().getString();
                } catch (Exception e) {
                    name = id;
                }
                l.add(new String[]{id, name, TextCleaner.fold(id.replace('_', ' ') + " " + name)});
            }
            return l;
        });
        itemNames = cached;
        return cached;
    }

    private static String searchItems(String query, int limit) throws Exception {
        String[] terms = TextCleaner.fold(query.trim()).split("[\\s_]+");
        List<String[]> found = itemNames().stream()
                .filter(n -> Arrays.stream(terms).allMatch(t -> n[2].contains(t)))
                .sorted(Comparator.comparingInt((String[] n) -> n[0].length()))
                .limit(limit)
                .toList();
        if (found.isEmpty()) return "Nenhum item com '" + query + "'. Tente o nome em ingles ou parte do id.";
        return found.stream().map(n -> n[0] + " | " + n[1]).collect(Collectors.joining("\n"));
    }

    private static String nameOf(String id) {
        if (id.startsWith("#")) return id;
        try {
            ResourceLocation rl = ResourceLocation.parse(id);
            return BuiltInRegistries.ITEM.getOptional(rl)
                    .map(i -> new ItemStack(i).getHoverName().getString() + " (" + id + ")").orElse(id);
        } catch (Exception e) {
            return id;
        }
    }

    // ---------------------------------------------------------------- receitas

    private static RecipeIndex recipeIndex() throws Exception {
        Minecraft mc = Minecraft.getInstance();
        Object[] data = onMain(() -> mc.level == null ? null
                : new Object[]{mc.level.getRecipeManager(), mc.level.getRecipeManager().getRecipes(), mc.level.registryAccess()});
        if (data == null) throw new IllegalStateException("O aluno nao esta em um mundo agora.");
        RecipeIndex idx = recipeIndex;
        if (idx == null || !idx.isFor(data[0])) {
            @SuppressWarnings("unchecked")
            var recipes = (java.util.Collection<net.minecraft.world.item.crafting.RecipeHolder<?>>) data[1];
            idx = RecipeIndex.build(data[0], List.copyOf(recipes), (net.minecraft.core.HolderLookup.Provider) data[2]);
            recipeIndex = idx;
        }
        return idx;
    }

    private static String recipes(String itemId, boolean producing, int limit) throws Exception {
        String id = itemId.trim().toLowerCase();
        if (!id.contains(":")) id = "minecraft:" + id;
        RecipeIndex idx = recipeIndex();
        final String target = id;
        List<String> tags = new ArrayList<>();
        if (!producing) {
            tags = onMain(() -> {
                List<String> t = new ArrayList<>();
                BuiltInRegistries.ITEM.getOptional(ResourceLocation.parse(target)).ifPresent(item ->
                        item.builtInRegistryHolder().tags().forEach(tag -> t.add("#" + tag.location())));
                return t;
            });
        }
        final List<String> itemTags = tags;
        List<RecipeIndex.Entry> found = idx.entries().stream()
                .filter(e -> producing ? e.outputs().contains(target)
                        : e.inputs().contains(target) || itemTags.stream().anyMatch(e.inputs()::contains))
                .toList();
        if (found.isEmpty()) {
            return (producing ? "Nenhuma receita produz " : "Nenhuma receita usa ") + target
                    + ". Pode ser drop de mob, minerio do mundo, loot, ou o id esta errado (confira com buscar_itens).";
        }
        String name = onMain(() -> nameOf(target));
        StringBuilder b = new StringBuilder();
        b.append(found.size()).append(producing ? " receita(s) para " : " receita(s) que usam ").append(name).append(":\n");
        int shown = 0;
        for (RecipeIndex.Entry e : found) {
            if (shown++ >= limit) {
                b.append("... e mais ").append(found.size() - limit).append(" (aumente 'limite' para ver)\n");
                break;
            }
            b.append("\n[").append(e.type()).append("] ").append(e.id()).append('\n');
            List<String> outs = new ArrayList<>(e.outputs());
            List<String> ins = new ArrayList<>(e.inputs());
            String outNames = onMain(() -> outs.stream().map(GameTools::nameOf).collect(Collectors.joining(", ")));
            String inNames = onMain(() -> ins.stream().limit(15).map(GameTools::nameOf).collect(Collectors.joining(", ")));
            b.append("  saida: ").append(outNames.isEmpty() ? "?" : outNames).append('\n');
            b.append("  entradas: ").append(inNames.isEmpty() ? "?" : inNames).append('\n');
            if (!e.json().isEmpty()) {
                String json = e.json().length() > 900 ? e.json().substring(0, 900) + "..." : e.json();
                b.append("  json: ").append(json).append('\n');
            }
        }
        return b.toString();
    }

    // ---------------------------------------------------------------- base

    private static String nearbyBlocks(int radius) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return "O aluno nao esta em um mundo agora.";
        Map<String, int[]> counts = new HashMap<>(); // id -> [quantidade, temBlockEntity]
        BlockPos c = mc.player.blockPosition();
        BlockPos.MutableBlockPos m = new BlockPos.MutableBlockPos();
        for (int x = -radius; x <= radius; x++) {
            for (int y = -radius; y <= radius; y++) {
                for (int z = -radius; z <= radius; z++) {
                    m.set(c.getX() + x, c.getY() + y, c.getZ() + z);
                    if (!mc.level.isLoaded(m)) continue;
                    BlockState st = mc.level.getBlockState(m);
                    if (st.isAir()) continue;
                    String id = BuiltInRegistries.BLOCK.getKey(st.getBlock()).toString();
                    if (BORING.contains(id) || id.endsWith("_ore") || id.endsWith("_leaves") || id.endsWith("_log")) continue;
                    int[] v = counts.computeIfAbsent(id, k -> new int[2]);
                    v[0]++;
                    if (st.hasBlockEntity()) v[1] = 1;
                }
            }
        }
        if (counts.isEmpty()) return "Nada construido num raio de " + radius + " blocos (so terreno natural).";
        StringBuilder b = new StringBuilder("Blocos num raio de " + radius + " (B = maquina/bloco com inventario ou logica):\n");
        counts.entrySet().stream()
                // primeiro maquinas, depois blocos de mods, depois o resto; dentro de cada grupo, os mais comuns
                .sorted(Comparator.comparingInt((Map.Entry<String, int[]> e) -> e.getValue()[1] == 1 ? 0 : 1)
                        .thenComparingInt(e -> e.getKey().startsWith("minecraft:") ? 1 : 0)
                        .thenComparingInt(e -> -e.getValue()[0]))
                .limit(80)
                .forEach(e -> b.append(e.getValue()[1] == 1 ? "B " : "  ").append(e.getValue()[0]).append("x ")
                        .append(e.getKey()).append('\n'));
        return b.toString();
    }

    /** Ids de blocos perto do jogador (para conferir passos com bloco_id). Chamar na thread do jogo. */
    public static Set<String> blockIdsNear(int radius, Set<String> wanted) {
        Minecraft mc = Minecraft.getInstance();
        Set<String> found = new java.util.HashSet<>();
        if (mc.player == null || mc.level == null || wanted.isEmpty()) return found;
        BlockPos c = mc.player.blockPosition();
        BlockPos.MutableBlockPos m = new BlockPos.MutableBlockPos();
        for (int x = -radius; x <= radius; x++) {
            for (int y = -radius; y <= radius; y++) {
                for (int z = -radius; z <= radius; z++) {
                    m.set(c.getX() + x, c.getY() + y, c.getZ() + z);
                    BlockState st = mc.level.getBlockState(m);
                    if (st.isAir()) continue;
                    String id = BuiltInRegistries.BLOCK.getKey(st.getBlock()).toString();
                    if (wanted.contains(id)) found.add(id);
                }
            }
        }
        return found;
    }

    // ---------------------------------------------------------------- blueprint

    private static String defineBlueprint(Map<String, Object> in) {
        Blueprint bp = new Blueprint();
        bp.titulo = AgentTool.str(in, "titulo", "Plano");
        bp.objetivo = Session.state().meta;
        Object raw = in.get("passos");
        if (!(raw instanceof List<?> steps) || steps.isEmpty()) return "Erro: 'passos' precisa ser uma lista com pelo menos 1 passo.";
        List<String> warnings = new ArrayList<>();
        for (Object o : steps) {
            if (!(o instanceof Map<?, ?> mm)) continue;
            @SuppressWarnings("unchecked")
            Map<String, Object> sm = (Map<String, Object>) mm;
            Blueprint.Step s = new Blueprint.Step();
            s.texto = AgentTool.str(sm, "texto", "");
            s.porque = AgentTool.str(sm, "porque", "");
            s.itemId = AgentTool.str(sm, "item_id", "").trim();
            s.quantidade = AgentTool.integer(sm, "quantidade", 1, 1, 100000);
            s.blocoId = AgentTool.str(sm, "bloco_id", "").trim();
            if (!s.itemId.isEmpty() && !exists(true, s.itemId)) {
                warnings.add("item '" + s.itemId + "' nao existe (passo \"" + s.texto + "\"): condicao removida");
                s.itemId = "";
            }
            if (!s.blocoId.isEmpty() && !exists(false, s.blocoId)) {
                warnings.add("bloco '" + s.blocoId + "' nao existe (passo \"" + s.texto + "\"): condicao removida");
                s.blocoId = "";
            }
            bp.passos.add(s);
        }
        Session.setBlueprint(bp);
        return "Blueprint salvo com " + bp.passos.size() + " passos. O aluno ja ve na tela."
                + (warnings.isEmpty() ? "" : "\nAvisos:\n- " + String.join("\n- ", warnings)
                + "\nUse buscar_itens para achar o id certo e chame definir_blueprint de novo se quiser a marcacao automatica.");
    }

    private static boolean exists(boolean item, String id) {
        try {
            ResourceLocation rl = ResourceLocation.parse(id);
            return item ? BuiltInRegistries.ITEM.containsKey(rl) : BuiltInRegistries.BLOCK.containsKey(rl);
        } catch (Exception e) {
            return false;
        }
    }

    private static String markStep(int number, boolean done) {
        Blueprint bp = Session.state().blueprint;
        if (bp == null) return "Nao ha blueprint ativo.";
        if (number < 1 || number > bp.passos.size()) return "Passo invalido. O blueprint tem " + bp.passos.size() + " passos.";
        bp.passos.get(number - 1).feito = done;
        Session.save();
        return "Passo " + number + (done ? " marcado como concluido." : " desmarcado.") + "\n" + bp.resumo();
    }
}
