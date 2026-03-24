#############################################################################
# S1 File: R Validation Script for DTA Meta-Analysis Pro
#
# Purpose: Independent verification of DTA Pro calculations against R mada
# Reference: DTA Meta-Analysis Pro v4.9.2 PLOS ONE Manuscript
#
# Requirements: R >= 4.0, packages: mada, metafor
#
# Author: [Author Name]
# Date: 2026-01-19
#############################################################################

# Require required packages explicitly for reproducible validation
required_packages <- c("mada", "metafor")
missing_packages <- required_packages[!vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing_packages) > 0) {
  stop(
    sprintf(
      "Missing required packages: %s. Install these packages before running validation.",
      paste(missing_packages, collapse = ", ")
    )
  )
}

library(mada)
library(metafor)

cat("\n")
cat("================================================================\n")
cat("DTA Pro v4.9.2 - R mada Validation Script\n")
cat("================================================================\n\n")

#############################################################################
# VALIDATION DATASET 1: Afzali et al. 2012 (k=10)
# CT Colonography for Colorectal Polyps
#############################################################################

cat("--- Dataset 1: Afzali 2012 (k=10) ---\n\n")

afzali <- data.frame(
  study = c("Baur 2008", "Bode 2006", "Boulton 2009", "Cheng 2010",
            "Graser 2009", "Johnson 2007", "Kim 2007", "Lefere 2007",
            "Macari 2002", "Pickhardt 2011"),
  TP = c(23, 135, 49, 69, 164, 45, 102, 48, 93, 459),
  FP = c(1, 7, 19, 2, 10, 9, 7, 13, 32, 15),
  FN = c(2, 10, 14, 4, 13, 5, 18, 5, 15, 16),
  TN = c(77, 73, 89, 194, 120, 92, 143, 71, 100, 571)
)

cat("Study data:\n")
print(afzali)
cat("\n")

# Run bivariate model using mada
fit_afzali <- reitsma(afzali,
                       formula = cbind(tsens, tfpr) ~ 1,
                       method = "reml")

cat("R mada Results:\n")
cat("---------------\n")
summary(fit_afzali)

# Extract and display key metrics robustly across mada versions
coef_mat <- as.matrix(stats::coef(fit_afzali))
coef_cols <- tolower(colnames(coef_mat))
tsens_col <- which(grepl("tsens", coef_cols))[1]
tfpr_col <- which(grepl("tfpr", coef_cols))[1]
if (is.na(tsens_col)) tsens_col <- 1
if (is.na(tfpr_col)) tfpr_col <- min(2, ncol(coef_mat))
sens_afzali <- as.numeric(coef_mat[1, tsens_col])
spec_afzali <- as.numeric(coef_mat[1, tfpr_col])

# Convert from logit scale
sens_prob <- plogis(sens_afzali)
spec_prob <- plogis(-spec_afzali)  # Note: mada uses FPR, so negate for specificity

cat("\n")
cat("Pooled Estimates (probability scale):\n")
cat(sprintf("  Sensitivity: %.4f\n", sens_prob))
cat(sprintf("  Specificity: %.4f\n", spec_prob))

# Get confidence intervals
ci <- confint(fit_afzali)
cat("\n95% Confidence Intervals:\n")
print(ci)

# Variance components
cat("\nVariance Components:\n")
cat(sprintf("  tau2(sens): %.4f\n", fit_afzali$Psi[1,1]))
cat(sprintf("  tau2(spec): %.4f\n", fit_afzali$Psi[2,2]))
cat(sprintf("  rho: %.4f\n", fit_afzali$Psi[1,2] / sqrt(fit_afzali$Psi[1,1] * fit_afzali$Psi[2,2])))

# DTA Pro expected values for comparison
cat("\n")
cat("DTA Pro v4.9.2 Expected Values:\n")
cat("-------------------------------\n")
cat("  Sensitivity: 0.9101 (95% CI: 0.8675-0.9399)\n")
cat("  Specificity: 0.9263 (95% CI: 0.8702-0.9593)\n")
cat("  tau2(sens): 0.3558\n")
cat("  tau2(spec): 0.8600\n")
cat("  rho: -0.8231\n")

# Validation check
tolerance <- 0.005
dta_sens <- 0.9101
dta_spec <- 0.9263

cat("\n")
cat("Validation Check (tolerance = +/-", tolerance, "):\n")
sens_diff <- abs(sens_prob - dta_sens)
spec_diff <- abs(spec_prob - dta_spec)
cat(sprintf("  Sensitivity difference: %.6f - %s\n", sens_diff,
            ifelse(sens_diff < tolerance, "PASS", "FAIL")))
cat(sprintf("  Specificity difference: %.6f - %s\n", spec_diff,
            ifelse(spec_diff < tolerance, "PASS", "FAIL")))

#############################################################################
# VALIDATION DATASET 2: Glas et al. 2003 (k=9)
# Screening Test Evaluation
#############################################################################

cat("\n\n")
cat("--- Dataset 2: Glas 2003 (k=9) ---\n\n")

glas <- data.frame(
  study = c("Study_1", "Study_2", "Study_3", "Study_4", "Study_5",
            "Study_6", "Study_7", "Study_8", "Study_9"),
  TP = c(47, 21, 29, 17, 36, 41, 38, 24, 30),
  FP = c(3, 8, 6, 4, 7, 5, 9, 6, 4),
  FN = c(8, 12, 7, 9, 11, 6, 10, 8, 5),
  TN = c(42, 59, 58, 70, 46, 48, 43, 62, 61)
)

cat("Study data:\n")
print(glas)
cat("\n")

# Run bivariate model
fit_glas <- reitsma(glas,
                     formula = cbind(tsens, tfpr) ~ 1,
                     method = "reml")

cat("R mada Results:\n")
cat("---------------\n")
summary(fit_glas)

#############################################################################
# DERIVED MEASURES
#############################################################################

cat("\n\n")
cat("--- Derived Measures (Afzali Dataset) ---\n\n")

# Calculate DOR, PLR, NLR from pooled estimates
sens <- sens_prob
spec <- spec_prob

DOR <- (sens / (1 - sens)) * (spec / (1 - spec))
PLR <- sens / (1 - spec)
NLR <- (1 - sens) / spec

cat("Diagnostic Odds Ratio (DOR):\n")
cat(sprintf("  DOR = %.1f\n", DOR))
cat("  DTA Pro expected: ~127.2\n")

cat("\nLikelihood Ratios:\n")
cat(sprintf("  PLR = %.2f\n", PLR))
cat(sprintf("  NLR = %.4f\n", NLR))

#############################################################################
# HETEROGENEITY
#############################################################################

cat("\n\n")
cat("--- Heterogeneity Statistics ---\n\n")

# I-squared calculation (Higgins & Thompson 2002)
# For DTA, we compute I2 separately for sens and spec

# Study-level estimates
afzali$sens <- afzali$TP / (afzali$TP + afzali$FN)
afzali$spec <- afzali$TN / (afzali$TN + afzali$FP)
afzali$n_pos <- afzali$TP + afzali$FN
afzali$n_neg <- afzali$TN + afzali$FP

# Fixed effect Q statistic for sensitivity
w_sens <- afzali$n_pos  # Weight by sample size
theta_sens <- sum(w_sens * afzali$sens) / sum(w_sens)
Q_sens <- sum(w_sens * (afzali$sens - theta_sens)^2)
df_sens <- nrow(afzali) - 1
I2_sens <- max(0, (Q_sens - df_sens) / Q_sens * 100)

# Fixed effect Q statistic for specificity
w_spec <- afzali$n_neg
theta_spec <- sum(w_spec * afzali$spec) / sum(w_spec)
Q_spec <- sum(w_spec * (afzali$spec - theta_spec)^2)
df_spec <- nrow(afzali) - 1
I2_spec <- max(0, (Q_spec - df_spec) / Q_spec * 100)

cat(sprintf("I-squared (Sensitivity): %.1f%%\n", I2_sens))
cat(sprintf("I-squared (Specificity): %.1f%%\n", I2_spec))
cat("\nInterpretation (Higgins & Thompson 2002):\n")
cat("  <25%: Low heterogeneity\n")
cat("  25-50%: Low-Moderate heterogeneity\n")
cat("  50-75%: Moderate-Substantial heterogeneity\n")
cat("  >75%: Considerable heterogeneity\n")

#############################################################################
# DEEKS' FUNNEL PLOT ASYMMETRY TEST
#############################################################################

cat("\n\n")
cat("--- Deeks' Funnel Plot Asymmetry Test ---\n\n")

# Calculate diagnostic odds ratio for each study
afzali$DOR <- (afzali$TP * afzali$TN) / (afzali$FP * afzali$FN)
afzali$logDOR <- log(afzali$DOR)

# Effective sample size (match JS implementation)
afzali$ESS <- 4 * (afzali$TP + afzali$FN) * (afzali$FP + afzali$TN) /
              (afzali$TP + afzali$FP + afzali$FN + afzali$TN)
afzali$invSqrtESS <- 1 / sqrt(afzali$ESS)

# Deeks' regression
deeks_fit <- lm(logDOR ~ invSqrtESS, data = afzali)
deeks_p <- summary(deeks_fit)$coefficients[2, 4]

cat("Deeks' Test Results:\n")
cat(sprintf("  Slope coefficient: %.4f\n", coef(deeks_fit)[2]))
cat(sprintf("  P-value: %.4f\n", deeks_p))
cat(sprintf("  Interpretation: %s\n",
            ifelse(deeks_p < 0.10, "Potential publication bias (p < 0.10)",
                   "No significant asymmetry (p >= 0.10)")))

#############################################################################
# VALIDATION SUMMARY
#############################################################################

cat("\n\n")
cat("================================================================\n")
cat("VALIDATION SUMMARY\n")
cat("================================================================\n\n")

# Create validation results table
results <- data.frame(
  Metric = c("Sensitivity", "Specificity", "DOR", "tau2(sens)", "tau2(spec)"),
  DTA_Pro = c(0.9101, 0.9263, 127.2, 0.3558, 0.8600),
  R_mada = c(round(sens_prob, 4), round(spec_prob, 4), round(DOR, 1),
             round(fit_afzali$Psi[1,1], 4), round(fit_afzali$Psi[2,2], 4)),
  Tolerance = c(0.005, 0.005, 5.0, 0.01, 0.01)
)

results$Difference <- abs(results$DTA_Pro - results$R_mada)
results$Status <- ifelse(results$Difference <= results$Tolerance, "PASS", "FAIL")

print(results)

cat("\n")
cat("Overall Validation Status: ")
if (all(results$Status == "PASS")) {
  cat("ALL TESTS PASSED\n")
} else {
  cat("SOME TESTS FAILED\n")
}

cat("\n")
cat("================================================================\n")
cat("End of Validation Script\n")
cat("================================================================\n")

#############################################################################
# SESSION INFO
#############################################################################

cat("\n\nSession Information:\n")
cat("--------------------\n")
print(sessionInfo())
