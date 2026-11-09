package com.ukezeraa.professoria.game;

import com.ukezeraa.professoria.ProfessorIA;
import com.ukezeraa.professoria.knowledge.GuideDoc;
import com.ukezeraa.professoria.knowledge.KnowledgeBase;
import com.ukezeraa.professoria.knowledge.MarkdownGuideParser;
import com.ukezeraa.professoria.knowledge.PatchouliParser;
import com.ukezeraa.professoria.knowledge.QuestParser;
import net.minecraft.client.Minecraft;
import net.minecraft.locale.Language;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.Resource;
import net.minecraft.server.packs.resources.ResourceManager;
import net.neoforged.fml.loading.FMLPaths;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.UnaryOperator;
import java.util.stream.Stream;

/**
 * Encontra e le os guias de todos os mods instalados:
 * - livros Patchouli (assets/&lt;mod&gt;/patchouli_books/... e, em singleplayer, data/...)
 * - guias Markdown no estilo GuideME (ex.: assets/ae2/ae2guide/*.md)
 * - quests do FTB Quests (config/ftbquests/quests)
 */
public final class KnowledgeLoader {
    private static final AtomicReference<KnowledgeBase> BASE = new AtomicReference<>(KnowledgeBase.empty());
    private static volatile CompletableFuture<KnowledgeBase> building = null;
    private static final List<String> MARKDOWN_ROOTS = List.of("ae2guide", "guides", "guide", "guidebook", "manual");

    private KnowledgeLoader() {
    }

    public static KnowledgeBase get() {
        return BASE.get();
    }

    public static boolean isBuilding() {
        CompletableFuture<KnowledgeBase> f = building;
        return f != null && !f.isDone();
    }

    /** Espera o indice ficar pronto (usado pelas ferramentas). */
    public static KnowledgeBase awaitReady() {
        CompletableFuture<KnowledgeBase> f = building;
        if (f != null) {
            try {
                return f.join();
            } catch (Exception e) {
                return BASE.get();
            }
        }
        return BASE.get();
    }

    /** Reconstroi o indice em segundo plano. */
    public static synchronized CompletableFuture<KnowledgeBase> rebuild() {
        Minecraft mc = Minecraft.getInstance();
        ResourceManager client = mc.getResourceManager();
        ResourceManager server = mc.getSingleplayerServer() != null ? mc.getSingleplayerServer().getResourceManager() : null;
        Path gameDir = FMLPaths.GAMEDIR.get();
        building = CompletableFuture.supplyAsync(() -> {
            long t0 = System.currentTimeMillis();
            List<GuideDoc> docs = new ArrayList<>();
            UnaryOperator<String> tr = KnowledgeLoader::translate;
            loadPatchouli(client, docs, tr);
            if (server != null) loadPatchouli(server, docs, tr);
            for (String root : MARKDOWN_ROOTS) loadMarkdown(client, root, docs);
            loadQuests(gameDir.resolve("config/ftbquests/quests"), docs);
            KnowledgeBase kb = new KnowledgeBase(docs);
            BASE.set(kb);
            ProfessorIA.LOG.info("Professor IA: {} documentos indexados em {} ms {}", kb.size(),
                    System.currentTimeMillis() - t0, kb.countBySource());
            return kb;
        });
        return building;
    }

    private static String translate(String s) {
        if (s == null || s.isEmpty() || s.contains(" ") || !s.contains(".")) return s;
        return Language.getInstance().getOrDefault(s);
    }

    private static void loadPatchouli(ResourceManager rm, List<GuideDoc> out, UnaryOperator<String> tr) {
        Map<ResourceLocation, Resource> found;
        try {
            found = rm.listResources("patchouli_books", rl -> rl.getPath().endsWith(".json")
                    && rl.getPath().contains("/en_us/entries/"));
        } catch (Exception e) {
            ProfessorIA.LOG.warn("Falha ao listar livros Patchouli", e);
            return;
        }
        for (Map.Entry<ResourceLocation, Resource> e : found.entrySet()) {
            ResourceLocation rl = e.getKey();
            // patchouli_books/<livro>/en_us/entries/<categoria>/<entrada>.json
            String path = rl.getPath();
            String book = path.split("/")[1];
            String entry = path.substring(path.indexOf("/entries/") + 9, path.length() - 5);
            String id = "patchouli:" + rl.getNamespace() + "/" + book + "/" + entry;
            try {
                GuideDoc doc = PatchouliParser.parseEntry(id, "patchouli:" + rl.getNamespace(), read(e.getValue()), tr);
                if (doc.category().isEmpty()) {
                    int slash = entry.lastIndexOf('/');
                    doc = new GuideDoc(doc.id(), doc.source(), doc.title(), slash > 0 ? entry.substring(0, slash) : book,
                            doc.text(), doc.items());
                }
                out.add(doc);
            } catch (Exception ex) {
                ProfessorIA.LOG.debug("Entrada Patchouli ignorada: {} ({})", rl, ex.toString());
            }
        }
    }

    private static void loadMarkdown(ResourceManager rm, String root, List<GuideDoc> out) {
        Map<ResourceLocation, Resource> found;
        try {
            found = rm.listResources(root, rl -> rl.getPath().endsWith(".md"));
        } catch (Exception e) {
            return;
        }
        for (Map.Entry<ResourceLocation, Resource> e : found.entrySet()) {
            ResourceLocation rl = e.getKey();
            String path = rl.getPath();
            // Ignora traducoes do guia (_pt_br/...), mantendo a versao original em ingles
            if (path.matches(".*/_[a-z]{2}_[a-z]{2}/.*")) continue;
            String rel = path.substring(root.length() + 1);
            int slash = rel.lastIndexOf('/');
            String category = slash > 0 ? rel.substring(0, slash) : root;
            String id = "guideme:" + rl.getNamespace() + "/" + rel.replace(".md", "");
            try {
                out.add(MarkdownGuideParser.parse(id, "guideme:" + rl.getNamespace(), category, read(e.getValue())));
            } catch (Exception ex) {
                ProfessorIA.LOG.debug("Pagina de guia ignorada: {} ({})", rl, ex.toString());
            }
        }
    }

    private static void loadQuests(Path questsDir, List<GuideDoc> out) {
        Path chapters = questsDir.resolve("chapters");
        if (!Files.isDirectory(chapters)) return;
        Map<String, String> lang = Map.of();
        Path langFile = questsDir.resolve("lang/en_us.snbt");
        try {
            if (Files.exists(langFile)) lang = QuestParser.parseLang(Files.readString(langFile, StandardCharsets.UTF_8));
        } catch (Exception e) {
            ProfessorIA.LOG.warn("Falha ao ler {}", langFile, e);
        }
        try (Stream<Path> files = Files.list(chapters)) {
            for (Path f : (Iterable<Path>) files.filter(p -> p.toString().endsWith(".snbt")).sorted()::iterator) {
                try {
                    out.add(QuestParser.parseChapter(f.getFileName().toString(),
                            Files.readString(f, StandardCharsets.UTF_8), lang));
                } catch (Exception ex) {
                    ProfessorIA.LOG.debug("Capitulo de quest ignorado: {} ({})", f, ex.toString());
                }
            }
        } catch (IOException e) {
            ProfessorIA.LOG.warn("Falha ao listar quests em {}", chapters, e);
        }
    }

    private static String read(Resource r) throws IOException {
        try (BufferedReader reader = r.openAsReader()) {
            StringBuilder b = new StringBuilder();
            char[] buf = new char[8192];
            int n;
            while ((n = reader.read(buf)) > 0) b.append(buf, 0, n);
            return b.toString();
        }
    }
}
