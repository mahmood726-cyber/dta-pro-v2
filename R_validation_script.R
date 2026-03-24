# ============================================================================
# DTA Pro v4.9 - R Validation Script
# ============================================================================
# Purpose: Validate DTA Pro results against R mada package
# PLOS ONE Reviewer Request: Comprehensive validation for publication
# Date: 2026-01-19
# R Version: 4.5.2
# mada Version: 0.5.12+
# ============================================================================

library(mada)

cat("=================================================================\n")
cat("DTA Pro v4.9 - R Validation Results\n")
cat("Validating against R mada package\n")
cat("=================================================================\n\n")

# ============================================================================
# TEST DATASET 1: Afzali (2012) - 10 studies
# Reference: CT colonography for colorectal polyps
# ============================================================================
afzali <- data.frame(
  study = c("Baur 2008", "Bode 2006", "Boulton 2009", "Cheng 2010",
            "Graser 2009", "Johnson 2007", "Kim 2007", "Lefere 2007",
            "Macari 2002", "Pickhardt 2011"),
  TP = c(23, 135, 49, 69, 164, 45, 102, 48, 93, 459),
  FP = c(1, 7, 19, 2, 10, 9, 7, 13, 32, 15),
  FN = c(2, 10, 14, 4, 13, 5, 18, 5, 15, 16),
  TN = c(77, 73, 89, 194, 120, 92, 143, 71, 100, 571)
)

cat("=== TEST 1: Afzali Dataset (k=10) ===\n")
cat("Reference: CT colonography for colorectal polyps\n\n")

fit1 <- reitsma(afzali[,c("TP","FP","FN","TN")])

# Extract parameters
mu_sens <- fit1$coefficients[1]
mu_fpr <- fit1$coefficients[2]
sens <- plogis(mu_sens)
spec <- 1 - plogis(mu_fpr)

cat("R mada Bivariate Model Results:\n")
cat(sprintf("  mu (logit sens): %.4f\n", mu_sens))
cat(sprintf("  mu (logit fpr): %.4f\n", mu_fpr))
cat(sprintf("  Pooled Sensitivity: %.4f\n", sens))
cat(sprintf("  Pooled Specificity: %.4f\n", spec))

# Heterogeneity
cat(sprintf("\nHeterogeneity:\n"))
cat(sprintf("  tau^2 (logit sens): %.4f\n", fit1$Psi[1,1]))
cat(sprintf("  tau^2 (logit spec): %.4f\n", fit1$Psi[2,2]))
rho <- fit1$Psi[1,2] / sqrt(fit1$Psi[1,1] * fit1$Psi[2,2])
cat(sprintf("  Correlation (rho): %.4f\n", rho))

# Model fit
cat(sprintf("\nModel Fit:\n"))
cat(sprintf("  Log-likelihood: %.2f\n", fit1$logLik))
cat(sprintf("  AIC: %.2f\n", AIC(fit1)))
cat(sprintf("  BIC: %.2f\n", BIC(fit1)))

# Derived measures
cat(sprintf("\nDerived Measures:\n"))
dor <- (sens * spec) / ((1-sens) * (1-spec))
plr <- sens / (1 - spec)
nlr <- (1 - sens) / spec
cat(sprintf("  DOR: %.2f\n", dor))
cat(sprintf("  LR+: %.2f\n", plr))
cat(sprintf("  LR-: %.3f\n", nlr))

# Confidence intervals
vcov_mat <- vcov(fit1)
se_sens <- sqrt(vcov_mat[1,1])
se_fpr <- sqrt(vcov_mat[2,2])
sens_ci <- c(plogis(mu_sens - 1.96 * se_sens), plogis(mu_sens + 1.96 * se_sens))
spec_ci <- c(1 - plogis(mu_fpr + 1.96 * se_fpr), 1 - plogis(mu_fpr - 1.96 * se_fpr))
cat(sprintf("\nConfidence Intervals (Wald):\n"))
cat(sprintf("  Sensitivity 95%% CI: [%.4f, %.4f]\n", sens_ci[1], sens_ci[2]))
cat(sprintf("  Specificity 95%% CI: [%.4f, %.4f]\n", spec_ci[1], spec_ci[2]))

# ============================================================================
# TEST DATASET 2: Small sample (k=3)
# ============================================================================
cat("\n=== TEST 2: Small Sample Dataset (k=3) ===\n")
cat("Testing HKSJ correction behavior\n\n")

small_k <- data.frame(
  TP = c(50, 60, 45),
  FP = c(10, 5, 8),
  FN = c(5, 10, 12),
  TN = c(100, 95, 110)
)

fit2 <- tryCatch({
  suppressWarnings(reitsma(small_k))
}, error = function(e) {
  cat(sprintf("Error: %s\n", e$message))
  NULL
})

if (!is.null(fit2)) {
  sens2 <- plogis(fit2$coefficients[1])
  spec2 <- 1 - plogis(fit2$coefficients[2])
  cat(sprintf("  Pooled Sensitivity: %.4f\n", sens2))
  cat(sprintf("  Pooled Specificity: %.4f\n", spec2))
  cat(sprintf("  tau^2 (sens): %.4f\n", fit2$Psi[1,1]))
  cat(sprintf("  tau^2 (spec): %.4f\n", fit2$Psi[2,2]))
}

# ============================================================================
# TEST DATASET 3: Dataset with zero cells
# ============================================================================
cat("\n=== TEST 3: Zero Cells Dataset (k=4) ===\n")
cat("Testing continuity correction (0.5 added)\n\n")

zero_cells <- data.frame(
  TP = c(30, 0, 25, 40),
  FP = c(5, 3, 0, 8),
  FN = c(10, 8, 5, 0),
  TN = c(55, 89, 70, 52)
)

fit3 <- tryCatch({
  suppressWarnings(reitsma(zero_cells, correction = 0.5, correction.control = "all"))
}, error = function(e) {
  cat(sprintf("Error: %s\n", e$message))
  NULL
})

if (!is.null(fit3)) {
  sens3 <- plogis(fit3$coefficients[1])
  spec3 <- 1 - plogis(fit3$coefficients[2])
  cat(sprintf("  Pooled Sensitivity: %.4f\n", sens3))
  cat(sprintf("  Pooled Specificity: %.4f\n", spec3))
}

# ============================================================================
# TEST DATASET 4: High heterogeneity
# ============================================================================
cat("\n=== TEST 4: High Heterogeneity Dataset (k=6) ===\n\n")

high_het <- data.frame(
  TP = c(90, 20, 80, 50, 95, 30),
  FP = c(5, 30, 10, 25, 3, 40),
  FN = c(10, 80, 20, 50, 5, 70),
  TN = c(95, 70, 90, 75, 97, 60)
)

fit4 <- reitsma(high_het)
sens4 <- plogis(fit4$coefficients[1])
spec4 <- 1 - plogis(fit4$coefficients[2])
cat(sprintf("  Pooled Sensitivity: %.4f\n", sens4))
cat(sprintf("  Pooled Specificity: %.4f\n", spec4))
cat(sprintf("  tau^2 (sens): %.4f\n", fit4$Psi[1,1]))
cat(sprintf("  tau^2 (spec): %.4f\n", fit4$Psi[2,2]))

# ============================================================================
# VALIDATION SUMMARY
# ============================================================================
cat("\n=================================================================\n")
cat("VALIDATION TOLERANCE CRITERIA (PLOS ONE Reviewer 1)\n")
cat("=================================================================\n")
cat("  Pooled sens/spec: +/- 0.005\n")
cat("  Confidence intervals: +/- 0.02\n")
cat("  tau^2: +/- 0.05\n")
cat("  DOR: +/- 5% relative\n")
cat("\n")

cat("=================================================================\n")
cat("REFERENCE VALUES FOR DTA PRO VALIDATION\n")
cat("=================================================================\n\n")

cat("Afzali Dataset (k=10):\n")
cat(sprintf("  Sensitivity: %.4f [%.4f, %.4f]\n", sens, sens_ci[1], sens_ci[2]))
cat(sprintf("  Specificity: %.4f [%.4f, %.4f]\n", spec, spec_ci[1], spec_ci[2]))
cat(sprintf("  DOR: %.2f\n", dor))
cat(sprintf("  LR+: %.2f | LR-: %.3f\n", plr, nlr))
cat(sprintf("  tau^2_sens: %.4f | tau^2_spec: %.4f\n", fit1$Psi[1,1], fit1$Psi[2,2]))
cat(sprintf("  Correlation: %.4f\n", rho))
cat(sprintf("  AIC: %.2f | BIC: %.2f\n", AIC(fit1), BIC(fit1)))

cat("\n=================================================================\n")
cat("To validate DTA Pro:\n")
cat("1. Load Afzali dataset in DTA Pro\n")
cat("2. Run bivariate GLMM analysis\n")
cat("3. Compare results with values above\n")
cat("4. All values should be within tolerance criteria\n")
cat("=================================================================\n")
