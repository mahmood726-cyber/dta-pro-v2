#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
dataset_path <- if (length(args) >= 1) args[[1]] else "benchmark_sim_datasets.json"
output_path <- if (length(args) >= 2) args[[2]] else "benchmark_mada_reference_r.json"

if (!requireNamespace("jsonlite", quietly = TRUE)) {
  stop("Missing required package: jsonlite")
}

eps <- 1e-12

inv_logit <- function(x) 1 / (1 + exp(-x))

as_studies_df <- function(studies) {
  if (is.data.frame(studies)) {
    return(data.frame(
      tp = as.numeric(studies$tp),
      fp = as.numeric(studies$fp),
      fn = as.numeric(studies$fn),
      tn = as.numeric(studies$tn)
    ))
  }
  data.frame(
    tp = as.numeric(vapply(studies, function(s) s$tp, numeric(1))),
    fp = as.numeric(vapply(studies, function(s) s$fp, numeric(1))),
    fn = as.numeric(vapply(studies, function(s) s$fn, numeric(1))),
    tn = as.numeric(vapply(studies, function(s) s$tn, numeric(1)))
  )
}

fallback_pooled_estimates <- function(studies_df) {
  n <- nrow(studies_df)
  if (n < 1) {
    stop("Need at least one study")
  }

  data <- lapply(seq_len(n), function(i) {
    s <- studies_df[i, ]
    has_zero <- s$tp == 0 || s$fp == 0 || s$fn == 0 || s$tn == 0
    cc <- if (has_zero) 0.5 else 0
    tp <- s$tp + cc
    fp <- s$fp + cc
    fn <- s$fn + cc
    tn <- s$tn + cc
    sens <- tp / (tp + fn)
    spec <- tn / (tn + fp)
    y1 <- log(sens / (1 - sens))
    y2 <- log(spec / (1 - spec))
    v1 <- 1 / tp + 1 / fn
    v2 <- 1 / tn + 1 / fp
    list(y1 = y1, y2 = y2, v1 = v1, v2 = v2)
  })

  y1 <- vapply(data, function(d) d$y1, numeric(1))
  y2 <- vapply(data, function(d) d$y2, numeric(1))
  v1 <- vapply(data, function(d) d$v1, numeric(1))
  v2 <- vapply(data, function(d) d$v2, numeric(1))

  w1 <- 1 / pmax(eps, v1)
  w2 <- 1 / pmax(eps, v2)
  sum_w1 <- sum(w1)
  sum_w2 <- sum(w2)
  mu1_fe <- sum(y1 * w1) / sum_w1
  mu2_fe <- sum(y2 * w2) / sum_w2

  q1 <- sum(w1 * (y1 - mu1_fe)^2)
  q2 <- sum(w2 * (y2 - mu2_fe)^2)
  c1 <- sum_w1 - sum(w1 * w1) / sum_w1
  c2 <- sum_w2 - sum(w2 * w2) / sum_w2
  tau2_1 <- max(0, (q1 - (n - 1)) / max(eps, c1))
  tau2_2 <- max(0, (q2 - (n - 1)) / max(eps, c2))

  w1_re <- 1 / pmax(eps, v1 + tau2_1)
  w2_re <- 1 / pmax(eps, v2 + tau2_2)
  mu1 <- sum(y1 * w1_re) / sum(w1_re)
  mu2 <- sum(y2 * w2_re) / sum(w2_re)
  sens <- inv_logit(mu1)
  spec <- inv_logit(mu2)
  sens <- max(0.001, min(0.999, sens))
  spec <- max(0.001, min(0.999, spec))
  dor <- (sens * spec) / ((1 - sens) * (1 - spec))

  list(
    method = "fallback_univariate_re",
    pooled_sens = sens,
    pooled_spec = spec,
    pooled_dor = dor,
    pooled_log_dor = log(max(eps, dor)),
    tau2_sens = tau2_1,
    tau2_spec = tau2_2
  )
}

fit_reitsma_or_fallback <- function(studies_df, allow_mada = TRUE) {
  fb <- fallback_pooled_estimates(studies_df)

  if (!allow_mada || !requireNamespace("mada", quietly = TRUE)) {
    return(c(
      fb,
      list(
        estimator = "fallback_univariate_re",
        status = "fallback",
        used_mada = FALSE,
        error_message = if (allow_mada) "mada_not_available" else "mada_disabled",
        auc = NA_real_,
        p_auc = NA_real_,
        se_logit_sens = NA_real_,
        se_logit_fpr = NA_real_,
        corr_logit_sens_fpr = NA_real_
      )
    ))
  }

  fit <- try(
    mada::reitsma(
      data = data.frame(TP = studies_df$tp, FN = studies_df$fn, FP = studies_df$fp, TN = studies_df$tn),
      correction = 0.5,
      correction.control = "all",
      method = "reml"
    ),
    silent = TRUE
  )

  if (inherits(fit, "try-error")) {
    return(c(
      fb,
      list(
        estimator = "fallback_univariate_re",
        status = "fallback",
        used_mada = TRUE,
        error_message = as.character(fit),
        auc = NA_real_,
        p_auc = NA_real_,
        se_logit_sens = NA_real_,
        se_logit_fpr = NA_real_,
        corr_logit_sens_fpr = NA_real_
      )
    ))
  }

  coef_mat <- try(stats::coef(fit), silent = TRUE)
  vc <- try(stats::vcov(fit), silent = TRUE)
  sm <- try(summary(fit), silent = TRUE)

  if (inherits(coef_mat, "try-error") || length(coef_mat) < 2) {
    return(c(
      fb,
      list(
        estimator = "fallback_univariate_re",
        status = "fallback",
        used_mada = TRUE,
        error_message = "coef_extraction_failed",
        auc = NA_real_,
        p_auc = NA_real_,
        se_logit_sens = NA_real_,
        se_logit_fpr = NA_real_,
        corr_logit_sens_fpr = NA_real_
      )
    ))
  }

  mu_sens <- as.numeric(coef_mat[1])
  mu_fpr <- as.numeric(coef_mat[2])
  sens <- inv_logit(mu_sens)
  fpr <- inv_logit(mu_fpr)
  spec <- 1 - fpr
  sens <- max(0.001, min(0.999, sens))
  spec <- max(0.001, min(0.999, spec))
  dor <- (sens * spec) / ((1 - sens) * (1 - spec))

  se_logit_sens <- NA_real_
  se_logit_fpr <- NA_real_
  corr <- NA_real_
  if (!inherits(vc, "try-error") && is.matrix(vc) && nrow(vc) >= 2 && ncol(vc) >= 2) {
    var1 <- max(eps, as.numeric(vc[1, 1]))
    var2 <- max(eps, as.numeric(vc[2, 2]))
    cov12 <- as.numeric(vc[1, 2])
    se_logit_sens <- sqrt(var1)
    se_logit_fpr <- sqrt(var2)
    corr <- cov12 / sqrt(var1 * var2)
    corr <- max(-0.999, min(0.999, corr))
  }

  auc <- NA_real_
  p_auc <- NA_real_
  if (!inherits(sm, "try-error") && is.list(sm) && !is.null(sm$AUC)) {
    auc <- as.numeric(sm$AUC$AUC)
    p_auc <- as.numeric(sm$AUC$pAUC)
  }

  if (!is.finite(sens) || !is.finite(spec) || !is.finite(dor)) {
    return(c(
      fb,
      list(
        estimator = "fallback_univariate_re",
        status = "fallback",
        used_mada = TRUE,
        error_message = "non_finite_mada_estimate",
        auc = auc,
        p_auc = p_auc,
        se_logit_sens = se_logit_sens,
        se_logit_fpr = se_logit_fpr,
        corr_logit_sens_fpr = corr
      )
    ))
  }

  list(
    estimator = "mada_reitsma",
    status = "ok",
    used_mada = TRUE,
    error_message = NA_character_,
    pooled_sens = sens,
    pooled_spec = spec,
    pooled_dor = dor,
    pooled_log_dor = log(max(eps, dor)),
    tau2_sens = NA_real_,
    tau2_spec = NA_real_,
    auc = auc,
    p_auc = p_auc,
    se_logit_sens = se_logit_sens,
    se_logit_fpr = se_logit_fpr,
    corr_logit_sens_fpr = corr
  )
}

dataset <- jsonlite::fromJSON(dataset_path, simplifyVector = FALSE)

if (is.null(dataset$datasets) || length(dataset$datasets) == 0) {
  stop("Dataset JSON has no datasets[] entries")
}

replicates <- lapply(dataset$datasets, function(rep) {
  studies_df <- as_studies_df(rep$studies)
  fit <- fit_reitsma_or_fallback(studies_df, allow_mada = TRUE)
  list(
    id = as.character(rep$id),
    scenario = as.character(rep$scenario),
    n_studies = nrow(studies_df),
    estimator = fit$estimator,
    status = fit$status,
    used_mada = isTRUE(fit$used_mada),
    error_message = fit$error_message,
    pooled_sens = as.numeric(fit$pooled_sens),
    pooled_spec = as.numeric(fit$pooled_spec),
    pooled_dor = as.numeric(fit$pooled_dor),
    pooled_log_dor = as.numeric(fit$pooled_log_dor),
    tau2_sens = as.numeric(fit$tau2_sens),
    tau2_spec = as.numeric(fit$tau2_spec),
    auc = as.numeric(fit$auc),
    p_auc = as.numeric(fit$p_auc),
    se_logit_sens = as.numeric(fit$se_logit_sens),
    se_logit_fpr = as.numeric(fit$se_logit_fpr),
    corr_logit_sens_fpr = as.numeric(fit$corr_logit_sens_fpr)
  )
})

estimators <- vapply(replicates, function(r) r$estimator, character(1))
statuses <- vapply(replicates, function(r) r$status, character(1))
count_named <- function(v) as.list(stats::setNames(as.integer(table(v)), names(table(v))))

out <- list(
  generated_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z"),
  dataset_path = normalizePath(dataset_path, winslash = "/", mustWork = FALSE),
  n_replicates = length(replicates),
  estimator_counts = count_named(estimators),
  status_counts = count_named(statuses),
  replicates = replicates
)

jsonlite::write_json(out, output_path, auto_unbox = TRUE, pretty = TRUE, digits = 16, na = "null")
cat(sprintf("Wrote benchmark R reference JSON: %s\n", output_path))
