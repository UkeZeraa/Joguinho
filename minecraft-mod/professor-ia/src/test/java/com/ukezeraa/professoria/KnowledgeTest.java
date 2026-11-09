package com.ukezeraa.professoria;

import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.blueprint.BlueprintChecker;
import com.ukezeraa.professoria.knowledge.GuideDoc;
import com.ukezeraa.professoria.knowledge.KnowledgeBase;
import com.ukezeraa.professoria.knowledge.MarkdownGuideParser;
import com.ukezeraa.professoria.knowledge.PatchouliParser;
import com.ukezeraa.professoria.knowledge.QuestParser;
import com.ukezeraa.professoria.knowledge.Snbt;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class KnowledgeTest {

    @Test
    void snbtParsesFtbStyle() {
        String snbt = """
                {
                	default_hide_dependency_lines: false
                	filename: "getting_started"
                	id: "1A2B3C4D5E6F7A8B"
                	quests: [
                		{
                			id: "0000000000000001"
                			tasks: [{ id: "T1", item: { count: 1, id: "minecraft:crafting_table" }, type: "item" }]
                			x: 0.0d
                		}
                		{
                			dependencies: ["0000000000000001"]
                			id: "0000000000000002"
                			tasks: [{ count: 16L, id: "T2", item: "mekanism:steel_ingot", type: "item" }]
                			nums: [I; 1, 2, 3]
                		}
                	]
                }
                """;
        Map<String, Object> m = Snbt.parseCompound(snbt);
        assertEquals("getting_started", m.get("filename"));
        assertEquals(false, m.get("default_hide_dependency_lines"));
        List<?> quests = (List<?>) m.get("quests");
        assertEquals(2, quests.size());
        Map<?, ?> q2 = (Map<?, ?>) quests.get(1);
        assertEquals(List.of(1L, 2L, 3L), q2.get("nums"));
    }

    @Test
    void questChapterUsesLangFile() {
        String chapter = """
                { id: "CH1" filename: "getting_started" quests: [
                  { id: "Q1" tasks: [{ id: "T1" item: { id: "minecraft:crafting_table", count: 1 } type: "item" }] }
                  { id: "Q2" dependencies: ["Q1"] tasks: [{ id: "T2" item: "mekanism:steel_ingot" count: 16L type: "item" }] }
                ] }
                """;
        String lang = """
                {
                  chapter.CH1.title: "Getting Started"
                  quest.Q1.title: "A Humble Start"
                  quest.Q2.title: "Steel!"
                  quest.Q2.quest_desc: ["Smelt &asteel&r in the Energized Smelter.", "It unlocks better machines."]
                }
                """;
        GuideDoc doc = QuestParser.parseChapter("getting_started.snbt", chapter, QuestParser.parseLang(lang));
        assertEquals("Getting Started", doc.title());
        assertEquals("ftbquests:getting_started", doc.id());
        assertTrue(doc.text().contains("1. A Humble Start"));
        assertTrue(doc.text().contains("Requer: A Humble Start"));
        assertTrue(doc.text().contains("16x mekanism:steel_ingot"));
        assertTrue(doc.text().contains("Smelt steel in the Energized Smelter."), doc.text());
        assertTrue(doc.items().contains("mekanism:steel_ingot"));
    }

    @Test
    void patchouliEntryIsCleaned() {
        String json = """
                {"name": "Digital Miner", "category": "mekanism:machines", "icon": "mekanism:digital_miner",
                 "pages": [
                   {"type": "patchouli:text", "text": "The $(item)Digital Miner$() mines ores in a $(l:base/area)large area$(/l).$(br2)Needs power."},
                   {"type": "patchouli:crafting", "recipe": "mekanism:digital_miner", "text": "Craft it."}
                 ]}
                """;
        GuideDoc d = PatchouliParser.parseEntry("patchouli:mekanism/guide/machines/digital_miner", "patchouli:mekanism", json, s -> s);
        assertEquals("Digital Miner", d.title());
        assertEquals("machines", d.category());
        assertTrue(d.text().contains("The Digital Miner mines ores in a large area."), d.text());
        assertFalse(d.text().contains("$("));
        assertTrue(d.items().contains("mekanism:digital_miner"));
        assertEquals("mekanism", d.modId());
    }

    @Test
    void markdownGuideReadsFrontmatter() {
        String md = """
                ---
                navigation:
                  title: ME Controller
                  parent: ae2:index.md
                item_ids:
                - ae2:controller
                ---

                # The Controller

                The <ItemLink id="ae2:controller" /> routes **channels**. See [cables](cables.md).
                """;
        GuideDoc d = MarkdownGuideParser.parse("guideme:ae2/ae2-mechanics/controller", "guideme:ae2", "ae2-mechanics", md);
        assertEquals("ME Controller", d.title());
        assertTrue(d.items().contains("ae2:controller"));
        assertTrue(d.text().contains("[ae2:controller] routes **channels**. See cables."), d.text());
    }

    @Test
    void searchRanksTitleAndItems() {
        KnowledgeBase kb = new KnowledgeBase(List.of(
                new GuideDoc("patchouli:mekanism/g/digital_miner", "patchouli:mekanism", "Digital Miner", "machines",
                        "Mines ores in a large area. Needs power.", List.of("mekanism:digital_miner")),
                new GuideDoc("patchouli:mekanism/g/steel", "patchouli:mekanism", "Steel", "resources",
                        "Steel is made by infusing iron with carbon in the Metallurgic Infuser.", List.of("mekanism:steel_ingot")),
                new GuideDoc("guideme:ae2/controller", "guideme:ae2", "ME Controller", "network",
                        "The controller routes channels.", List.of("ae2:controller"))));
        assertEquals("Steel", kb.search("how to make steel", null, 3).get(0).doc().title());
        assertEquals("Digital Miner", kb.search("mining ores", null, 3).get(0).doc().title());
        assertEquals("Steel", kb.search("mekanism:steel_ingot", null, 3).get(0).doc().title());
        assertTrue(kb.search("controller", "mekanism", 3).isEmpty());
        assertEquals(1, kb.search("channels", "ae2", 3).size());
    }

    @Test
    void blueprintAutoCompletes() {
        Blueprint bp = new Blueprint();
        Blueprint.Step a = new Blueprint.Step();
        a.texto = "Faca 16 lingotes de aco";
        a.itemId = "mekanism:steel_ingot";
        a.quantidade = 16;
        Blueprint.Step b = new Blueprint.Step();
        b.texto = "Coloque um Digital Miner";
        b.blocoId = "mekanism:digital_miner";
        Blueprint.Step c = new Blueprint.Step();
        c.texto = "Leia sobre energia";
        bp.passos.addAll(List.of(a, b, c));

        assertTrue(BlueprintChecker.update(bp, Map.of("mekanism:steel_ingot", 15), Set.of()).isEmpty());
        assertEquals(List.of(0), BlueprintChecker.update(bp, Map.of("mekanism:steel_ingot", 16), Set.of()));
        assertTrue(BlueprintChecker.needsBlockScan(bp));
        assertEquals(List.of(1), BlueprintChecker.update(bp, Map.of(), Set.of("mekanism:digital_miner")));
        assertEquals(2, bp.atual());
        assertFalse(bp.completo());
        c.feito = true;
        assertTrue(bp.completo());
        assertTrue(bp.resumo().contains("[x] 1. Faca 16 lingotes de aco {item 16x mekanism:steel_ingot}"));
    }
}
