package com.ukezeraa.professoria.agent;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** Implementacao de {@link AgentTool} com lambdas. */
public record SimpleTool(String name, String description, Map<String, Object> properties, List<String> required,
                         Function<Map<String, Object>, String> status, ToolBody body) implements AgentTool {

    @FunctionalInterface
    public interface ToolBody {
        String run(Map<String, Object> input) throws Exception;
    }

    @Override
    public String statusText(Map<String, Object> input) {
        return status.apply(input);
    }

    @Override
    public String run(Map<String, Object> input) throws Exception {
        return body.run(input);
    }
}
