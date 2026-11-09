package com.ukezeraa.professoria.agent;

/** Recebe os eventos do Professor. Chamado na thread do agente (nao na thread do jogo). */
public interface AgentListener {
    /** Texto de resposta do Professor (pode chegar em varias partes, uma por rodada). */
    void onText(String text);

    /** O que o Professor esta fazendo agora (ex.: "Lendo: Digital Miner"). */
    void onStatus(String status);

    void onError(String message);

    void onFinished();
}
