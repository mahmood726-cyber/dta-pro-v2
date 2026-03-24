# DTA Meta-Analysis Pro v4.9.1 - R Validation Script
# Purpose: Validate JavaScript implementation against R gold standard
# Packages: mada, meta, metafor, PropCIs
# Date: 2026-02-06

# =============================================================================
# SETUP
# =============================================================================

# Require packages explicitly (validated against a fixed dependency set)
required_packages <- c("mada", "meta", "metafor", "PropCIs", "jsonlite")
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
library(meta)
library(metafor)
library(PropCIs)
library(jsonlite)

# Resolve output directory deterministically to the script location when possible
args_all <- commandArgs(trailingOnly = FALSE)
script_arg <- grep("^--file=", args_all, value = TRUE)
script_dir <- if (length(script_arg) > 0) {
  dirname(normalizePath(sub("^--file=", "", script_arg[1]), winslash = "/", mustWork = FALSE))
} else {
  getwd()
}

# =============================================================================
# TEST DATASET 1: mada reference dataset (Glas preferred, Dementia fallback)
# =============================================================================

load_mada_reference_dataset <- function() {
  data_env <- new.env(parent = emptyenv())

  suppressWarnings(data("Glas", package = "mada", envir = data_env))
  if (exists("Glas", envir = data_env, inherits = FALSE)) {
    return(list(
      data = get("Glas", envir = data_env, inherits = FALSE),
      label = "Glas et al. (mada package)"
    ))
  }

  suppressWarnings(data("Dementia", package = "mada", envir = data_env))
  if (exists("Dementia", envir = data_env, inherits = FALSE)) {
    return(list(
      data = get("Dementia", envir = data_env, inherits = FALSE),
      label = "Dementia (mada package fallback)"
    ))
  }

  stop("No compatible mada dataset found (expected Glas or Dementia).")
}

dataset_info <- load_mada_reference_dataset()
glas_data <- dataset_info$data
dataset_label <- dataset_info$label

cat("\n")
cat("=============================================================================\n")
cat("DTA META-ANALYSIS PRO v4.9.1 - R VALIDATION REPORT\n")
cat("=============================================================================\n")
cat("Date:", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), "\n")
cat("R Version:", R.version.string, "\n")
cat("Packages: mada", as.character(packageVersion("mada")), ", metafor", as.character(packageVersion("metafor")), "\n")
cat("=============================================================================\n\n")

# =============================================================================
# TEST 1: BIVARIATE GLMM (Reitsma Model)
# =============================================================================

cat(sprintf("TEST 1: BIVARIATE GLMM (Reitsma Model) - %s\n", dataset_label))
cat("------------------------------------------------------\n")

# Fit bivariate model using mada
fit_reitsma <- reitsma(glas_data)
summary_reitsma <- summary(fit_reitsma)

# Extract pooled estimates robustly across mada versions
coef_mat <- as.matrix(stats::coef(fit_reitsma))
coef_cols <- tolower(colnames(coef_mat))
tsens_col <- which(grepl("tsens", coef_cols))[1]
tfpr_col <- which(grepl("tfpr", coef_cols))[1]
if (is.na(tsens_col)) tsens_col <- 1
if (is.na(tfpr_col)) tfpr_col <- min(2, ncol(coef_mat))
sens_r <- as.numeric(coef_mat[1, tsens_col])
spec_r <- as.numeric(coef_mat[1, tfpr_col])

# Transform from logit to probability scale
sens_prob <- plogis(sens_r)
spec_prob <- plogis(-spec_r)  # Note: mada uses FPR, so spec = 1 - FPR

# Get confidence intervals robustly across mada versions
ci_mat <- as.matrix(confint(fit_reitsma))
ci_rows <- tolower(rownames(ci_mat))
tsens_row <- which(grepl("tsens", ci_rows))[1]
tfpr_row <- which(grepl("tfpr", ci_rows))[1]
if (is.na(tsens_row)) tsens_row <- 1
if (is.na(tfpr_row)) tfpr_row <- min(2, nrow(ci_mat))
ci_cols <- seq_len(min(2, ncol(ci_mat)))
sens_ci <- plogis(as.numeric(ci_mat[tsens_row, ci_cols]))
tfpr_ci <- as.numeric(ci_mat[tfpr_row, ci_cols])
spec_ci <- c(1 - plogis(tfpr_ci[2]), 1 - plogis(tfpr_ci[1]))  # Reverse due to specificity = 1 - FPR

cat(sprintf("Dataset: %s\n", dataset_label))
cat("Number of studies: ", nrow(glas_data), "\n\n")

cat("Pooled Sensitivity:\n")
cat(sprintf("  R (mada):     %.4f [%.4f - %.4f]\n", sens_prob, sens_ci[1], sens_ci[2]))

cat("Pooled Specificity:\n")
cat(sprintf("  R (mada):     %.4f [%.4f - %.4f]\n", spec_prob, spec_ci[1], spec_ci[2]))

# Variance components
cat("\nVariance Components:\n")
cat(sprintf("  tau2_sens:    %.4f\n", fit_reitsma$Psi[1,1]))
cat(sprintf("  tau2_spec:    %.4f\n", fit_reitsma$Psi[2,2]))
cat(sprintf("  rho:          %.4f\n", fit_reitsma$Psi[1,2] / sqrt(fit_reitsma$Psi[1,1] * fit_reitsma$Psi[2,2])))

# =============================================================================
# TEST 2: WILSON CONFIDENCE INTERVALS
# =============================================================================

cat("\n\nTEST 2: WILSON SCORE CONFIDENCE INTERVALS\n")
cat("------------------------------------------\n")

# Test cases for Wilson CI
test_wilson <- data.frame(
  x = c(85, 0, 50, 93, 7),
  n = c(93, 50, 100, 93, 10),
  description = c("High proportion", "Zero events", "50% proportion",
                  "All events", "Small sample")
)

cat("Comparison of Wilson CI (alpha=0.05):\n\n")
for (i in 1:nrow(test_wilson)) {
  x <- test_wilson$x[i]
  n <- test_wilson$n[i]

  # R calculation using PropCIs
  wilson_r <- scoreci(x, n, conf.level = 0.95)

  cat(sprintf("Case %d: x=%d, n=%d (%s)\n", i, x, n, test_wilson$description[i]))
  cat(sprintf("  R (PropCIs):  [%.6f - %.6f]\n", wilson_r$conf.int[1], wilson_r$conf.int[2]))
}

# =============================================================================
# TEST 3: CLOPPER-PEARSON EXACT CI
# =============================================================================

cat("\n\nTEST 3: CLOPPER-PEARSON EXACT CONFIDENCE INTERVALS\n")
cat("---------------------------------------------------\n")

for (i in 1:nrow(test_wilson)) {
  x <- test_wilson$x[i]
  n <- test_wilson$n[i]

  # R calculation using binom.test
  cp_r <- binom.test(x, n, conf.level = 0.95)

  cat(sprintf("Case %d: x=%d, n=%d\n", i, x, n))
  cat(sprintf("  R (binom.test): [%.6f - %.6f]\n", cp_r$conf.int[1], cp_r$conf.int[2]))
}

# =============================================================================
# TEST 4: I-SQUARED HETEROGENEITY
# =============================================================================

cat("\n\nTEST 4: I-SQUARED HETEROGENEITY (Fixed-Effects Weights)\n")
cat("--------------------------------------------------------\n")

# For DTA, compute I2 for sensitivity using logit transform.
# Apply Haldane-Anscombe continuity correction to rows containing zero cells.
tp_raw <- glas_data$TP
fp_raw <- glas_data$FP
fn_raw <- glas_data$FN
tn_raw <- glas_data$TN
needs_cc <- tp_raw == 0 | fp_raw == 0 | fn_raw == 0 | tn_raw == 0

tp_cc <- ifelse(needs_cc, tp_raw + 0.5, tp_raw)
fp_cc <- ifelse(needs_cc, fp_raw + 0.5, fp_raw)
fn_cc <- ifelse(needs_cc, fn_raw + 0.5, fn_raw)
tn_cc <- ifelse(needs_cc, tn_raw + 0.5, tn_raw)

if (any(needs_cc)) {
  cat(sprintf("Applied continuity correction to %d study rows with zero cells.\n", sum(needs_cc)))
}

logit_sens <- log(tp_cc / fn_cc)
var_logit_sens <- 1/tp_cc + 1/fn_cc

# Use metafor for I2 calculation
ma_sens <- rma(yi = logit_sens, vi = var_logit_sens, method = "FE")

cat("Sensitivity (logit scale):\n")
cat(sprintf("  Cochran Q:    %.2f (df=%d)\n", ma_sens$QE, ma_sens$k - 1))
cat(sprintf("  I-squared:    %.1f%%\n", ma_sens$I2))
cat(sprintf("  p-value:      %.4f\n", ma_sens$QEp))

# Specificity
logit_spec <- log(tn_cc / fp_cc)
var_logit_spec <- 1/tn_cc + 1/fp_cc

ma_spec <- rma(yi = logit_spec, vi = var_logit_spec, method = "FE")

cat("\nSpecificity (logit scale):\n")
cat(sprintf("  Cochran Q:    %.2f (df=%d)\n", ma_spec$QE, ma_spec$k - 1))
cat(sprintf("  I-squared:    %.1f%%\n", ma_spec$I2))
cat(sprintf("  p-value:      %.4f\n", ma_spec$QEp))

# =============================================================================
# TEST 5: DEEKS FUNNEL PLOT ASYMMETRY TEST
# =============================================================================

cat("\n\nTEST 5: DEEKS FUNNEL PLOT ASYMMETRY TEST\n")
cat("-----------------------------------------\n")

# Calculate logDOR and ESS
tp <- tp_cc
fp <- fp_cc
fn <- fn_cc
tn <- tn_cc

logDOR <- log((tp * tn) / (fp * fn))
# Match JS implementation: ESS = 4 * diseased * healthy / total
ESS <- 4 * (tp + fn) * (fp + tn) / (tp + fp + fn + tn)

# Deeks regression: logDOR ~ 1/sqrt(ESS)
inv_sqrt_ESS <- 1 / sqrt(ESS)
valid_deeks <- is.finite(logDOR) & is.finite(inv_sqrt_ESS)

deeks_model <- NULL
deeks_summary <- NULL
deeks_slope <- NA_real_
deeks_p_value <- NA_real_

cat("Regression of logDOR on 1/sqrt(ESS):\n")
if (sum(valid_deeks) < 3) {
  cat("  Not estimable: fewer than 3 finite study points.\n")
} else {
  deeks_model <- lm(logDOR[valid_deeks] ~ inv_sqrt_ESS[valid_deeks])
  deeks_summary <- summary(deeks_model)
  deeks_slope <- as.numeric(coef(deeks_model)[2])
  deeks_p_value <- as.numeric(deeks_summary$coefficients[2, 4])

  cat(sprintf("  Intercept:    %.4f (SE: %.4f)\n",
              coef(deeks_model)[1], deeks_summary$coefficients[1, 2]))
  cat(sprintf("  Slope:        %.4f (SE: %.4f)\n",
              deeks_slope, deeks_summary$coefficients[2, 2]))
  cat(sprintf("  t-statistic:  %.3f\n", deeks_summary$coefficients[2, 3]))
  cat(sprintf("  p-value:      %.4f\n", deeks_p_value))
  cat(sprintf("  Significant (p<0.10): %s\n",
              ifelse(deeks_p_value < 0.10, "YES", "NO")))
}

# =============================================================================
# TEST 6: DIAGNOSTIC ODDS RATIO AND LIKELIHOOD RATIOS
# =============================================================================

cat("\n\nTEST 6: POOLED DOR AND LIKELIHOOD RATIOS\n")
cat("-----------------------------------------\n")

# From the Reitsma model
sens <- sens_prob
spec <- spec_prob

plr <- sens / (1 - spec)
nlr <- (1 - sens) / spec
dor <- (sens * spec) / ((1 - sens) * (1 - spec))

cat(sprintf("Pooled Positive LR:  %.2f\n", plr))
cat(sprintf("Pooled Negative LR:  %.3f\n", nlr))
cat(sprintf("Pooled DOR:          %.1f\n", dor))

# =============================================================================
# TEST 7: HSROC MODEL PARAMETERS
# =============================================================================

cat("\n\nTEST 7: HSROC MODEL (Moses-Littenberg Approach)\n")
cat("------------------------------------------------\n")

# D = logit(sens) + logit(spec) = log(DOR)
# S = logit(sens) - logit(spec) = threshold parameter

D <- logit_sens + logit_spec
S <- logit_sens - logit_spec
var_D <- var_logit_sens + var_logit_spec
var_S <- var_logit_sens + var_logit_spec

# Random effects for D (Lambda = accuracy)
ma_D <- rma(yi = D, vi = var_D, method = "DL")
# Random effects for S (Theta = threshold)
ma_S <- rma(yi = S, vi = var_S, method = "DL")

cat("DerSimonian-Laird estimates:\n")
cat(sprintf("  Lambda (log-DOR):   %.4f (SE: %.4f)\n", ma_D$beta, ma_D$se))
cat(sprintf("  Theta (threshold):  %.4f (SE: %.4f)\n", ma_S$beta, ma_S$se))
cat(sprintf("  sigma2_alpha:       %.4f\n", ma_D$tau2))
cat(sprintf("  sigma2_theta:       %.4f\n", ma_S$tau2))

# =============================================================================
# TEST 8: HKSJ CORRECTION
# =============================================================================

cat("\n\nTEST 8: HARTUNG-KNAPP-SIDIK-JONKMAN CORRECTION\n")
cat("-----------------------------------------------\n")

# Fit with HKSJ adjustment
ma_D_hksj <- rma(yi = D, vi = var_D, method = "DL", test = "knha")

cat("DL without HKSJ:\n")
cat(sprintf("  CI (z-based):  [%.4f - %.4f]\n",
            ma_D$ci.lb, ma_D$ci.ub))

cat("\nDL with HKSJ:\n")
cat(sprintf("  CI (t-based):  [%.4f - %.4f]\n",
            ma_D_hksj$ci.lb, ma_D_hksj$ci.ub))
cat(sprintf("  df:            %d\n", ma_D_hksj$k - 1))

# =============================================================================
# TEST 9: AUC CALCULATION
# =============================================================================

cat("\n\nTEST 9: AREA UNDER SROC CURVE\n")
cat("-----------------------------\n")

# AUC approximation from DOR: AUC = 1 / (1 + exp(-Lambda/sqrt(2)))
Lambda <- as.numeric(ma_D$beta)
auc_approx <- 1 / (1 + exp(-Lambda / sqrt(2)))

cat(sprintf("AUC (from Lambda): %.4f\n", auc_approx))
cat("Note: This is the Moses-Littenberg approximation\n")

# =============================================================================
# SUMMARY TABLE FOR APP EMBEDDING
# =============================================================================

cat("\n\n")
cat("=============================================================================\n")
cat("VALIDATION SUMMARY - EXPECTED VALUES FOR DTA PRO\n")
cat("=============================================================================\n\n")

validation_results <- list(
  dataset = dataset_label,
  n_studies = nrow(glas_data),
  bivariate_glmm = list(
    sensitivity = round(sens_prob, 4),
    sensitivity_ci = round(sens_ci, 4),
    specificity = round(spec_prob, 4),
    specificity_ci = round(spec_ci, 4),
    tau2_sens = round(fit_reitsma$Psi[1,1], 4),
    tau2_spec = round(fit_reitsma$Psi[2,2], 4),
    rho = round(fit_reitsma$Psi[1,2] / sqrt(fit_reitsma$Psi[1,1] * fit_reitsma$Psi[2,2]), 4)
  ),
  heterogeneity = list(
    Q_sens = round(ma_sens$QE, 2),
    I2_sens = round(ma_sens$I2, 1),
    Q_spec = round(ma_spec$QE, 2),
    I2_spec = round(ma_spec$I2, 1)
  ),
  likelihood_ratios = list(
    PLR = round(plr, 2),
    NLR = round(nlr, 3),
    DOR = round(dor, 1)
  ),
  hsroc = list(
    Lambda = round(as.numeric(ma_D$beta), 4),
    Theta = round(as.numeric(ma_S$beta), 4),
    sigma2_alpha = round(ma_D$tau2, 4),
    sigma2_theta = round(ma_S$tau2, 4)
  ),
  auc = round(auc_approx, 4),
  deeks_test = list(
    slope = if (is.finite(deeks_slope)) round(deeks_slope, 4) else NA_real_,
    p_value = if (is.finite(deeks_p_value)) round(deeks_p_value, 4) else NA_real_
  )
)

# Print as formatted table
cat("Parameter                    R Value          Tolerance\n")
cat("---------------------------------------------------------\n")
cat(sprintf("Sensitivity                  %.4f            ±0.005\n", sens_prob))
cat(sprintf("Specificity                  %.4f            ±0.005\n", spec_prob))
cat(sprintf("Sensitivity CI Lower         %.4f            ±0.02\n", sens_ci[1]))
cat(sprintf("Sensitivity CI Upper         %.4f            ±0.02\n", sens_ci[2]))
cat(sprintf("Specificity CI Lower         %.4f            ±0.02\n", spec_ci[1]))
cat(sprintf("Specificity CI Upper         %.4f            ±0.02\n", spec_ci[2]))
cat(sprintf("tau2 (Sensitivity)           %.4f            ±0.05\n", fit_reitsma$Psi[1,1]))
cat(sprintf("tau2 (Specificity)           %.4f            ±0.05\n", fit_reitsma$Psi[2,2]))
cat(sprintf("Correlation (rho)            %.4f            ±0.1\n",
            fit_reitsma$Psi[1,2] / sqrt(fit_reitsma$Psi[1,1] * fit_reitsma$Psi[2,2])))
cat(sprintf("I2 (Sensitivity)             %.1f%%            ±5%%\n", ma_sens$I2))
cat(sprintf("I2 (Specificity)             %.1f%%            ±5%%\n", ma_spec$I2))
cat(sprintf("Positive LR                  %.2f             ±0.5\n", plr))
cat(sprintf("Negative LR                  %.3f            ±0.02\n", nlr))
cat(sprintf("DOR                          %.1f             ±5\n", dor))
cat(sprintf("AUC                          %.4f            ±0.02\n", auc_approx))
cat("---------------------------------------------------------\n")

# Export as JSON for app consumption
json_output <- toJSON(validation_results, pretty = TRUE, auto_unbox = TRUE)
output_json_path <- file.path(script_dir, "validation_reference.json")
writeLines(json_output, output_json_path)
cat("\nJSON reference data written to:", output_json_path, "\n")

cat("\n=============================================================================\n")
cat("VALIDATION COMPLETE\n")
cat("=============================================================================\n")


