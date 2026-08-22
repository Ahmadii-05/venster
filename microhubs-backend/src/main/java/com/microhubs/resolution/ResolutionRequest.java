package com.microhubs.resolution;

import jakarta.validation.constraints.NotBlank;

public class ResolutionRequest {

    @NotBlank(message = "Final solution is required")
    private String finalSolution;

    public String getFinalSolution() { return finalSolution; }
    public void setFinalSolution(String finalSolution) { this.finalSolution = finalSolution; }
}
