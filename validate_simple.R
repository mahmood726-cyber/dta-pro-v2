# DTA Pro v4.9 - R Validation Script
library(mada)

cat("=================================================================\n")
cat("DTA Pro v4.9 - R Validation Results\n")
cat("Validating against R mada package\n")
cat("=================================================================\n\n")

# Afzali dataset (CT colonography for colorectal polyps)
afzali <- data.frame(
  TP = c(23, 135, 49, 69, 164, 45, 102, 48, 93, 459),
  FP = c(1, 7, 19, 2, 10, 9, 7, 13, 32, 15),
  FN = c(2, 10, 14, 4, 13, 5, 18, 5, 15, 16),
  TN = c(77, 73, 89, 194, 120, 92, 143, 71, 100, 571)
)

cat("=== TEST 1: Afzali Dataset (k=10) ===\n\n")

fit <- reitsma(afzali)

# Extract mu parameters (logit scale)
mu_sens <- fit$coefficients[1]  # mu for logit(sensitivity)
mu_fpr <- fit$coefficients[2]   # mu for logit(fpr)

# Transform to probability scale
sens <- plogis(mu_sens)
fpr <- plogis(mu_fpr)
spec <- 1 - fpr

cat("R mada Bivariate Model Results:\n")
cat(sprintf("  mu (logit sens): %.4f\n", mu_sens))
cat(sprintf("  mu (logit fpr): %.4f\n", mu_fpr))
cat(sprintf("  Pooled Sensitivity: %.4f\n", sens))
cat(sprintf("  Pooled Specificity: %.4f\n", spec))

# Heterogeneity
cat(sprintf("\nHeterogeneity:\n"))
cat(sprintf("  tau^2 (logit sens): %.4f\n", fit$Psi[1,1]))
cat(sprintf("  tau^2 (logit spec): %.4f\n", fit$Psi[2,2]))

rho <- fit$Psi[1,2] / sqrt(fit$Psi[1,1] * fit$Psi[2,2])
cat(sprintf("  Correlation (rho): %.4f\n", rho))

# Model fit
cat(sprintf("\nModel Fit:\n"))
cat(sprintf("  Log-likelihood: %.2f\n", fit$logLik))
cat(sprintf("  AIC: %.2f\n", AIC(fit)))
cat(sprintf("  BIC: %.2f\n", BIC(fit)))

# DOR calculation
cat(sprintf("\nDerived Measures:\n"))
dor <- (sens * spec) / ((1-sens) * (1-spec))
plr <- sens / (1 - spec)
nlr <- (1 - sens) / spec
cat(sprintf("  DOR: %.2f\n", dor))
cat(sprintf("  LR+: %.2f\n", plr))
cat(sprintf("  LR-: %.3f\n", nlr))

# Confidence intervals via vcov
cat(sprintf("\nConfidence Intervals (Wald):\n"))
vcov_mat <- vcov(fit)
se_sens <- sqrt(vcov_mat[1,1])
se_fpr <- sqrt(vcov_mat[2,2])

sens_ci_lo <- plogis(mu_sens - 1.96 * se_sens)
sens_ci_hi <- plogis(mu_sens + 1.96 * se_sens)
spec_ci_lo <- 1 - plogis(mu_fpr + 1.96 * se_fpr)
spec_ci_hi <- 1 - plogis(mu_fpr - 1.96 * se_fpr)

cat(sprintf("  Sensitivity 95%% CI: [%.4f, %.4f]\n", sens_ci_lo, sens_ci_hi))
cat(sprintf("  Specificity 95%% CI: [%.4f, %.4f]\n", spec_ci_lo, spec_ci_hi))

cat("\n=== TEST 2: Small Dataset (k=3) ===\n\n")

small <- data.frame(
  TP = c(50, 60, 45),
  FP = c(10, 5, 8),
  FN = c(5, 10, 12),
  TN = c(100, 95, 110)
)

fit2 <- tryCatch({
  reitsma(small)
}, warning = function(w) {
  cat(sprintf("Warning: %s\n", w$message))
  suppressWarnings(reitsma(small))
}, error = function(e) {
  cat(sprintf("Error: %s\n", e$message))
  NULL
})

if (!is.null(fit2)) {
  sens2 <- plogis(fit2$coefficients[1])
  spec2 <- 1 - plogis(fit2$coefficients[2])
  cat(sprintf("  Pooled Sensitivity: %.4f\n", sens2))
  cat(sprintf("  Pooled Specificity: %.4f\n", spec2))
}

cat("\n=================================================================\n")
cat("VALIDATION TOLERANCE CRITERIA (per PLOS ONE Reviewer 1):\n")
cat("=================================================================\n")
cat("  Pooled sens/spec: +/- 0.005\n")
cat("  Confidence intervals: +/- 0.02\n")
cat("  tau^2: +/- 0.05\n")
cat("  DOR: +/- 5% relative\n")
cat("\n")
cat("Compare these R values with DTA Pro output.\n")
cat("If differences are within tolerance, validation PASSES.\n")
cat("=================================================================\n")
