package com.ukezeraa.professoria;

import net.neoforged.fml.common.Mod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Classe principal (carrega nos dois lados). O mod e so do cliente: toda a logica fica em
 * {@link com.ukezeraa.professoria.client.ProfessorClient}. No servidor ele nao faz nada,
 * entao nao e preciso instalar no servidor.
 */
@Mod(ProfessorIA.MOD_ID)
public final class ProfessorIA {
    public static final String MOD_ID = "professoria";
    public static final Logger LOG = LoggerFactory.getLogger("ProfessorIA");

    public ProfessorIA() {
        // Diagnostico opcional: -Dprofessoria.selftest=true confere se o SDK embutido carrega
        // (Kotlin, Jackson, OkHttp) sem fazer nenhuma chamada de rede.
        if (Boolean.getBoolean("professoria.selftest")) {
            try {
                LOG.info("Professor IA selftest: {}", com.ukezeraa.professoria.agent.SelfTest.run());
            } catch (Throwable t) {
                LOG.error("Professor IA selftest FALHOU", t);
            }
        }
    }
}
