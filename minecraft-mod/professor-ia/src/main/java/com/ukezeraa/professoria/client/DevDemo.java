package com.ukezeraa.professoria.client;

import com.ukezeraa.professoria.blueprint.Blueprint;
import com.ukezeraa.professoria.game.Session;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.TitleScreen;
import net.neoforged.neoforge.client.event.ScreenEvent;
import net.neoforged.neoforge.common.NeoForge;

/**
 * Modo demonstracao para desenvolvimento (-Dprofessoria.demo=true): ao chegar no menu principal,
 * abre a tela do Professor com uma conversa e um blueprint de exemplo. Nao faz chamadas a API.
 */
final class DevDemo {
    private static boolean shown = false;

    private DevDemo() {
    }

    static void register() {
        if (!Boolean.getBoolean("professoria.demo")) return;
        NeoForge.EVENT_BUS.addListener(ScreenEvent.Opening.class, e -> {
            if (shown || !(e.getNewScreen() instanceof TitleScreen)) return;
            shown = true;
            fill();
            Minecraft.getInstance().tell(() -> Minecraft.getInstance().setScreen(new ProfessorScreen()));
        });
    }

    private static void fill() {
        Session.setGoal("Montar um sistema de ME (AE2) com autocrafting");
        Blueprint bp = new Blueprint();
        bp.titulo = "Fase 1: Base de AE2";
        String[][] steps = {
                {"Ache um meteorito e pegue as Inscriber Presses", "Sem as prensas nao da para fazer processadores", "", "0"},
                {"Faca 16 Certus Quartz", "Material base de quase tudo no AE2", "ae2:certus_quartz_crystal", "16"},
                {"Construa um Inscriber", "Maquina que fabrica os processadores", "", "0"},
                {"Faca 4 Logic Processors", "Necessarios para o ME Controller e drives", "ae2:logic_processor", "4"},
                {"Coloque o ME Controller", "Centro da rede: da canais para os cabos", "", "0"},
        };
        for (String[] s : steps) {
            Blueprint.Step st = new Blueprint.Step();
            st.texto = s[0];
            st.porque = s[1];
            st.itemId = s[2];
            st.quantidade = Integer.parseInt(s[3]);
            bp.passos.add(st);
        }
        bp.passos.get(0).feito = true;
        Session.setBlueprint(bp);
        Session.log(Session.Kind.ALUNO, "Como eu comeco no Applied Energistics?");
        Session.log(Session.Kind.PROFESSOR, """
                Boa escolha! Li o guia do AE2 (ae2guide) e montei a **Fase 1** no seu blueprint.

                **Proximo passo:** juntar Certus Quartz. Ele aparece em geodos no subsolo, parecidos com os de ametista.

                - Use uma picareta de ferro ou melhor
                - Quebre os **Budding Certus** so se tiver Silk Touch; sem isso eles viram quartzo comum
                - Dica de eficiencia: coloque **Growth Accelerators** em volta dos budding para farmar sem parar

                Quando tiver 16, o passo 2 sera marcado sozinho.""");
        Session.log(Session.Kind.STATUS, "(exemplo de demonstracao: nenhuma chamada a API foi feita)");
    }
}
