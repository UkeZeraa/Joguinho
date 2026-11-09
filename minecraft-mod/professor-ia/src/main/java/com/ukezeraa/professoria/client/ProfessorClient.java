package com.ukezeraa.professoria.client;

import com.mojang.blaze3d.platform.InputConstants;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.ukezeraa.professoria.ProfessorConfig;
import com.ukezeraa.professoria.ProfessorIA;
import com.ukezeraa.professoria.agent.AgentListener;
import com.ukezeraa.professoria.agent.ProfessorAgent;
import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.blueprint.BlueprintChecker;
import com.ukezeraa.professoria.game.GameTools;
import com.ukezeraa.professoria.game.KnowledgeLoader;
import com.ukezeraa.professoria.game.Session;
import net.minecraft.ChatFormatting;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.ResourceManagerReloadListener;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.config.ModConfig;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterClientCommandsEvent;
import net.neoforged.neoforge.client.event.RegisterClientReloadListenersEvent;
import net.neoforged.neoforge.client.event.RegisterGuiLayersEvent;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.gui.ConfigurationScreen;
import net.neoforged.neoforge.client.gui.IConfigScreenFactory;
import net.neoforged.neoforge.common.NeoForge;
import org.lwjgl.glfw.GLFW;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Lado cliente do mod: teclas, comandos, HUD, acompanhamento do blueprint e a ligacao com o agente. */
@Mod(value = ProfessorIA.MOD_ID, dist = Dist.CLIENT)
public final class ProfessorClient {
    public static final KeyMapping OPEN_KEY = new KeyMapping("key.professoria.open",
            InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_K, "key.categories.professoria");
    public static final KeyMapping HUD_KEY = new KeyMapping("key.professoria.hud",
            InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_J, "key.categories.professoria");

    private static ProfessorAgent agent;
    private static boolean hudVisible = true;
    private static int tick = 0;
    private static long lastCheckInMs = 0;
    private static Blueprint autoPhaseFor = null;

    public ProfessorClient(IEventBus modBus, ModContainer container) {
        container.registerConfig(ModConfig.Type.CLIENT, ProfessorConfig.SPEC);
        container.registerExtensionPoint(IConfigScreenFactory.class, ConfigurationScreen::new);

        agent = new ProfessorAgent(() -> new ProfessorAgent.Settings(
                ProfessorConfig.API_KEY.get(), ProfessorConfig.MODEL.get(), ProfessorConfig.EFFORT.get(),
                ProfessorConfig.MAX_ROUNDS.get(), ProfessorConfig.FALLBACK.get(),
                ProfessorConfig.MAX_CONTEXT_K_TOKENS.get() * 1000L));
        GameTools.registerAll(agent);
        DevDemo.register();

        modBus.addListener(RegisterKeyMappingsEvent.class, e -> {
            e.register(OPEN_KEY);
            e.register(HUD_KEY);
        });
        modBus.addListener(RegisterGuiLayersEvent.class, e -> e.registerAboveAll(
                ResourceLocation.fromNamespaceAndPath(ProfessorIA.MOD_ID, "blueprint"), BlueprintHud::render));
        modBus.addListener(RegisterClientReloadListenersEvent.class, e -> e.registerReloadListener(
                (ResourceManagerReloadListener) rm -> KnowledgeLoader.rebuild()));

        NeoForge.EVENT_BUS.addListener(ClientTickEvent.Post.class, e -> onTick());
        NeoForge.EVENT_BUS.addListener(RegisterClientCommandsEvent.class, e -> registerCommands(e));
        NeoForge.EVENT_BUS.addListener(ClientPlayerNetworkEvent.LoggingIn.class, e -> {
            Session.open();
            hudVisible = ProfessorConfig.SHOW_HUD.get();
            lastCheckInMs = System.currentTimeMillis();
            autoPhaseFor = null;
            // Em singleplayer, o mundo traz datapacks com mais livros: reindexa.
            if (Minecraft.getInstance().getSingleplayerServer() != null) KnowledgeLoader.rebuild();
        });
        NeoForge.EVENT_BUS.addListener(ClientPlayerNetworkEvent.LoggingOut.class, e -> {
            agent.cancel();
            agent.resetConversation();
            Session.close();
        });
    }

    public static ProfessorAgent agent() {
        return agent;
    }

    public static boolean hudVisible() {
        return hudVisible;
    }

    // ------------------------------------------------------------------ perguntas

    /** Envia uma pergunta ao Professor (chamar na thread do jogo). */
    public static void ask(String text, boolean showAsStudent) {
        if (text == null || text.isBlank()) return;
        if (agent.isBusy()) {
            notifyPlayer(Component.literal("O Professor ainda esta respondendo. Aguarde um pouco.").withStyle(ChatFormatting.GRAY));
            return;
        }
        if (showAsStudent) Session.log(Session.Kind.ALUNO, text);
        String context = Session.context();
        Minecraft mc = Minecraft.getInstance();
        agent.ask(text, context, new AgentListener() {
            @Override
            public void onText(String t) {
                mc.execute(() -> {
                    Session.log(Session.Kind.PROFESSOR, t);
                    mirror(t);
                });
            }

            @Override
            public void onStatus(String s) {
                mc.execute(() -> {
                    Session.setStatus(s);
                    if (s.startsWith("(") || s.startsWith("Conversa") || s.equals("Cancelado.")) Session.log(Session.Kind.STATUS, s);
                });
            }

            @Override
            public void onError(String m) {
                mc.execute(() -> {
                    Session.log(Session.Kind.ERRO, m);
                    notifyPlayer(Component.literal("[Professor] " + m).withStyle(ChatFormatting.RED));
                });
            }

            @Override
            public void onFinished() {
                mc.execute(() -> Session.setStatus(""));
            }
        });
    }

    private static void mirror(String text) {
        Minecraft mc = Minecraft.getInstance();
        if (!ProfessorConfig.MIRROR_TO_CHAT.get() || mc.screen instanceof ProfessorScreen || mc.player == null) return;
        mc.player.displayClientMessage(Component.literal("[Professor] ").withStyle(ChatFormatting.GOLD)
                .append(Component.literal(Markdown.plain(text)).withStyle(ChatFormatting.WHITE)), false);
        mc.player.displayClientMessage(Component.literal("(aperte " + OPEN_KEY.getTranslatedKeyMessage().getString()
                + " para abrir a conversa)").withStyle(ChatFormatting.DARK_GRAY), false);
    }

    static void notifyPlayer(Component c) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null) mc.player.displayClientMessage(c, false);
    }

    // ------------------------------------------------------------------ tick

    private static void onTick() {
        Minecraft mc = Minecraft.getInstance();
        while (OPEN_KEY.consumeClick()) {
            if (mc.player != null) mc.setScreen(new ProfessorScreen());
        }
        while (HUD_KEY.consumeClick()) hudVisible = !hudVisible;
        if (mc.player == null || mc.level == null) return;

        if (++tick % 20 == 0) checkBlueprint(mc);

        int minutes = ProfessorConfig.CHECKIN_MINUTES.get();
        if (minutes > 0 && !agent.isBusy() && !Session.state().meta.isBlank()
                && System.currentTimeMillis() - lastCheckInMs > minutes * 60_000L) {
            lastCheckInMs = System.currentTimeMillis();
            Session.log(Session.Kind.SISTEMA, "Visita do Professor (automatica)");
            ask("Visita automatica: olhe meu estado atual (inventario e base) e me de UMA dica curta e pratica "
                    + "para avancar na minha meta agora. Se eu estiver travado em algum passo, explique como resolver.", false);
        }
    }

    private static void checkBlueprint(Minecraft mc) {
        Blueprint bp = Session.state().blueprint;
        if (bp == null || bp.passos.isEmpty()) return;
        Set<String> near = Set.of();
        if (tick % 100 == 0 && BlueprintChecker.needsBlockScan(bp)) {
            Set<String> wanted = new HashSet<>();
            for (Blueprint.Step s : bp.passos) if (!s.feito && !s.blocoId.isBlank()) wanted.add(s.blocoId);
            near = GameTools.blockIdsNear(10, wanted);
        }
        boolean wasComplete = bp.completo();
        Map<String, Integer> inv = GameTools.inventoryCounts(mc.player);
        List<Integer> done = BlueprintChecker.update(bp, inv, near);
        if (done.isEmpty()) return;
        Session.save();
        for (int i : done) {
            notifyPlayer(Component.literal("✔ Passo " + (i + 1) + " concluido: ").withStyle(ChatFormatting.GREEN)
                    .append(Component.literal(bp.passos.get(i).texto).withStyle(ChatFormatting.WHITE)));
        }
        int next = bp.atual();
        if (next >= 0) {
            notifyPlayer(Component.literal("➜ Proximo: ").withStyle(ChatFormatting.YELLOW)
                    .append(Component.literal(bp.passos.get(next).texto).withStyle(ChatFormatting.WHITE)));
        } else if (!wasComplete) {
            phaseCompleted(bp);
        }
    }

    private static void phaseCompleted(Blueprint bp) {
        notifyPlayer(Component.literal("★ Blueprint \"" + bp.titulo + "\" completo!").withStyle(ChatFormatting.GOLD));
        if (ProfessorConfig.AUTO_NEXT_PHASE.get() && !Session.state().meta.isBlank() && autoPhaseFor != bp) {
            autoPhaseFor = bp;
            Session.log(Session.Kind.SISTEMA, "Fase concluida! O Professor esta montando a proxima.");
            ask("Conclui todos os passos do blueprint \"" + bp.titulo + "\". Confira meu estado e monte a "
                    + "PROXIMA fase rumo a minha meta com definir_blueprint. Explique em poucas linhas o que muda "
                    + "nessa fase.", false);
        }
    }

    static void resetAutoPhase() {
        autoPhaseFor = null;
    }

    // ------------------------------------------------------------------ comandos

    private static void registerCommands(RegisterClientCommandsEvent e) {
        var d = e.getDispatcher();
        d.register(Commands.literal("meta")
                .executes(c -> {
                    String m = Session.state().meta;
                    reply(c.getSource(), m.isBlank() ? "Nenhuma meta. Use /meta <o que voce quer conseguir>" : "Meta atual: " + m);
                    return 1;
                })
                .then(Commands.literal("limpar").executes(c -> {
                    Session.setGoal("");
                    reply(c.getSource(), "Meta apagada.");
                    return 1;
                }))
                .then(Commands.argument("texto", StringArgumentType.greedyString()).executes(c -> {
                    String goal = StringArgumentType.getString(c, "texto");
                    Session.setGoal(goal);
                    resetAutoPhase();
                    reply(c.getSource(), "Meta definida: " + goal + ". O Professor vai montar o plano...");
                    ask("Minha nova meta e: " + goal + ". Veja meu estado, os mods e os guias e monte o blueprint da "
                            + "primeira fase com definir_blueprint. Depois me explique o plano em poucas linhas.", true);
                    return 1;
                })));

        d.register(Commands.literal("professor")
                .executes(c -> {
                    Minecraft.getInstance().execute(() -> Minecraft.getInstance().setScreen(new ProfessorScreen()));
                    return 1;
                })
                .then(Commands.literal("novo").executes(c -> {
                    agent.resetConversation();
                    Session.clearLog();
                    reply(c.getSource(), "Conversa nova. A meta e o blueprint continuam salvos.");
                    return 1;
                }))
                .then(Commands.literal("parar").executes(c -> {
                    agent.cancel();
                    reply(c.getSource(), "Pedindo para o Professor parar...");
                    return 1;
                }))
                .then(Commands.literal("reindexar").executes(c -> {
                    reply(c.getSource(), "Relendo os guias do modpack...");
                    KnowledgeLoader.rebuild().thenAccept(kb -> Minecraft.getInstance().execute(() ->
                            reply(c.getSource(), kb.size() + " entradas de guia indexadas: " + kb.countBySource())));
                    return 1;
                }))
                .then(Commands.literal("status").executes(c -> {
                    var kb = KnowledgeLoader.get();
                    reply(c.getSource(), "Modelo: " + ProfessorConfig.MODEL.get() + " (esforco " + ProfessorConfig.EFFORT.get()
                            + ") | Guias: " + kb.size() + (KnowledgeLoader.isBuilding() ? " (indexando...)" : "")
                            + " " + kb.countBySource() + " | " + agent.usageSummary());
                    return 1;
                }))
                .then(Commands.argument("pergunta", StringArgumentType.greedyString()).executes(c -> {
                    ask(StringArgumentType.getString(c, "pergunta"), true);
                    reply(c.getSource(), "Pergunta enviada. Aperte " + OPEN_KEY.getTranslatedKeyMessage().getString()
                            + " para ver a conversa.");
                    return 1;
                })));

        d.register(Commands.literal("blueprint")
                .executes(c -> {
                    Blueprint bp = Session.state().blueprint;
                    reply(c.getSource(), bp == null ? "Nenhum blueprint. Use /meta ou pergunte ao Professor." : bp.resumo());
                    return 1;
                })
                .then(Commands.literal("ok").executes(c -> markCurrent(c.getSource(), -1))
                        .then(Commands.argument("passo", IntegerArgumentType.integer(1)).executes(c ->
                                markCurrent(c.getSource(), IntegerArgumentType.getInteger(c, "passo")))))
                .then(Commands.literal("limpar").executes(c -> {
                    Session.setBlueprint(null);
                    reply(c.getSource(), "Blueprint apagado.");
                    return 1;
                })));
    }

    private static int markCurrent(CommandSourceStack src, int number) {
        Blueprint bp = Session.state().blueprint;
        if (bp == null) {
            reply(src, "Nenhum blueprint ativo.");
            return 0;
        }
        int idx = number > 0 ? number - 1 : bp.atual();
        if (idx < 0 || idx >= bp.passos.size()) {
            reply(src, "Passo invalido.");
            return 0;
        }
        bp.passos.get(idx).feito = true;
        Session.save();
        reply(src, "✔ Passo " + (idx + 1) + " marcado: " + bp.passos.get(idx).texto);
        if (bp.completo()) phaseCompleted(bp);
        return 1;
    }

    private static void reply(CommandSourceStack src, String msg) {
        notifyPlayer(Component.literal("[Professor] ").withStyle(ChatFormatting.GOLD)
                .append(Component.literal(msg).withStyle(ChatFormatting.WHITE)));
    }
}
