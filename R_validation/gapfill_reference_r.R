#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
dataset_path <- if (length(args) >= 1) args[[1]] else "gapfill_comparator_dataset.json"
output_path <- if (length(args) >= 2) args[[2]] else "gapfill_reference_r.json"

if (!requireNamespace("jsonlite", quietly = TRUE)) {
  stop("Missing required package: jsonlite")
}

eps <- 1e-12

inv_logit <- function(x) 1 / (1 + exp(-x))

as_df_studies <- function(x) {
  if (is.data.frame(x)) {
    return(data.frame(
      tp = as.numeric(x$tp),
      fp = as.numeric(x$fp),
      fn = as.numeric(x$fn),
      tn = as.numeric(x$tn)
    ))
  }
  data.frame(
    tp = as.numeric(vapply(x, function(r) r$tp, numeric(1))),
    fp = as.numeric(vapply(x, function(r) r$fp, numeric(1))),
    fn = as.numeric(vapply(x, function(r) r$fn, numeric(1))),
    tn = as.numeric(vapply(x, function(r) r$tn, numeric(1)))
  )
}

calculate_pooled_estimates <- function(studies_df, conf_level = 0.95) {
  n <- nrow(studies_df)
  if (n < 1) stop("No studies provided")

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
  sum_w1_re <- sum(w1_re)
  sum_w2_re <- sum(w2_re)
  mu1 <- sum(y1 * w1_re) / sum_w1_re
  mu2 <- sum(y2 * w2_re) / sum_w2_re

  pooled_sens <- inv_logit(mu1)
  pooled_spec <- inv_logit(mu2)
  se_mu1 <- 1 / sqrt(sum_w1_re)
  se_mu2 <- 1 / sqrt(sum_w2_re)

  alpha <- 1 - conf_level
  crit <- if (n >= 30) {
    stats::qnorm(1 - alpha / 2)
  } else {
    stats::qt(1 - alpha / 2, df = max(1, n - 2))
  }

  sens_ci <- c(inv_logit(mu1 - crit * se_mu1), inv_logit(mu1 + crit * se_mu1))
  spec_ci <- c(inv_logit(mu2 - crit * se_mu2), inv_logit(mu2 + crit * se_mu2))

  sens_clamp <- max(0.001, min(0.999, pooled_sens))
  spec_clamp <- max(0.001, min(0.999, pooled_spec))
  plr <- sens_clamp / (1 - spec_clamp)
  nlr <- (1 - sens_clamp) / spec_clamp
  dor <- (sens_clamp * spec_clamp) / ((1 - sens_clamp) * (1 - spec_clamp))

  q_sens <- q1
  q_spec <- q2
  i2_sens <- if (q_sens > 0) max(0, (q_sens - (n - 1)) / q_sens * 100) else 0
  i2_spec <- if (q_spec > 0) max(0, (q_spec - (n - 1)) / q_spec * 100) else 0
  p_q_sens <- if (n > 1) 1 - stats::pchisq(q_sens, df = n - 1) else NaN
  p_q_spec <- if (n > 1) 1 - stats::pchisq(q_spec, df = n - 1) else NaN

  rho <- NA_real_
  if (n > 2) {
    resids_sens <- (y1 - mu1_fe) * sqrt(w1)
    resids_spec <- (y2 - mu2_fe) * sqrt(w2)
    cov_rs <- sum((resids_sens - mean(resids_sens)) * (resids_spec - mean(resids_spec)))
    var_rs <- sum((resids_sens - mean(resids_sens))^2)
    var_rp <- sum((resids_spec - mean(resids_spec))^2)
    if (var_rs > 0 && var_rp > 0) {
      rho <- cov_rs / sqrt(var_rs * var_rp)
      rho <- max(-0.99, min(0.99, rho))
    }
  }

  list(
    pooled_sens = pooled_sens,
    pooled_spec = pooled_spec,
    sens_ci = sens_ci,
    spec_ci = spec_ci,
    plr = plr,
    nlr = nlr,
    dor = dor,
    tau2_sens = tau2_1,
    tau2_spec = tau2_2,
    rho = rho,
    heterogeneity = list(
      q_sens = q_sens,
      q_spec = q_spec,
      i2_sens = i2_sens,
      i2_spec = i2_spec,
      p_q_sens = p_q_sens,
      p_q_spec = p_q_spec
    ),
    n_studies = n
  )
}

get_comparison_conclusion <- function(rd_sens, rd_spec, p_sens, p_spec) {
  alpha <- 0.05
  conclusions <- c()
  if (p_sens < alpha) {
    conclusions <- c(conclusions, if (rd_sens > 0) "Test 1 has significantly HIGHER sensitivity" else "Test 2 has significantly HIGHER sensitivity")
  } else {
    conclusions <- c(conclusions, "No significant difference in sensitivity")
  }
  if (p_spec < alpha) {
    conclusions <- c(conclusions, if (rd_spec > 0) "Test 1 has significantly HIGHER specificity" else "Test 2 has significantly HIGHER specificity")
  } else {
    conclusions <- c(conclusions, "No significant difference in specificity")
  }
  paste(conclusions, collapse = ". ")
}

run_comparative_dta <- function(test1_df, test2_df, conf_level = 0.95) {
  if (nrow(test1_df) != nrow(test2_df)) stop("Tests must have same number of paired studies")
  n <- nrow(test1_df)
  if (n < 2) stop("At least 2 paired studies required")

  pooled1 <- calculate_pooled_estimates(test1_df, conf_level = conf_level)
  pooled2 <- calculate_pooled_estimates(test2_df, conf_level = conf_level)

  sens_diffs <- numeric(n)
  spec_diffs <- numeric(n)
  for (i in seq_len(n)) {
    s1 <- test1_df[i, ]
    s2 <- test2_df[i, ]
    sens1 <- (s1$tp + 0.5) / (s1$tp + s1$fn + 1)
    sens2 <- (s2$tp + 0.5) / (s2$tp + s2$fn + 1)
    spec1 <- (s1$tn + 0.5) / (s1$tn + s1$fp + 1)
    spec2 <- (s2$tn + 0.5) / (s2$tn + s2$fp + 1)
    sens_diffs[i] <- log(sens1 / (1 - sens1)) - log(sens2 / (1 - sens2))
    spec_diffs[i] <- log(spec1 / (1 - spec1)) - log(spec2 / (1 - spec2))
  }

  mean_sens_diff <- mean(sens_diffs)
  mean_spec_diff <- mean(spec_diffs)
  var_sens_diff <- stats::var(sens_diffs)
  var_spec_diff <- stats::var(spec_diffs)
  se_sens_diff <- sqrt(var_sens_diff / n)
  se_spec_diff <- sqrt(var_spec_diff / n)
  z_sens <- if (se_sens_diff > 0) mean_sens_diff / se_sens_diff else 0
  z_spec <- if (se_spec_diff > 0) mean_spec_diff / se_spec_diff else 0
  p_sens <- 2 * (1 - stats::pnorm(abs(z_sens)))
  p_spec <- 2 * (1 - stats::pnorm(abs(z_spec)))

  rd_sens <- pooled1$pooled_sens - pooled2$pooled_sens
  rd_spec <- pooled1$pooled_spec - pooled2$pooled_spec
  z_crit <- stats::qnorm(1 - (1 - conf_level) / 2)
  avg_sens <- (pooled1$pooled_sens + pooled2$pooled_sens) / 2
  avg_spec <- (pooled1$pooled_spec + pooled2$pooled_spec) / 2
  se_sens_prob <- se_sens_diff * avg_sens * (1 - avg_sens)
  se_spec_prob <- se_spec_diff * avg_spec * (1 - avg_spec)

  list(
    pooled = list(
      test1 = list(sens = pooled1$pooled_sens, spec = pooled1$pooled_spec),
      test2 = list(sens = pooled2$pooled_sens, spec = pooled2$pooled_spec)
    ),
    comparison = list(
      sensitivity_difference = rd_sens,
      sensitivity_ci = c(rd_sens - z_crit * se_sens_prob, rd_sens + z_crit * se_sens_prob),
      sensitivity_p_value = p_sens,
      specificity_difference = rd_spec,
      specificity_ci = c(rd_spec - z_crit * se_spec_prob, rd_spec + z_crit * se_spec_prob),
      specificity_p_value = p_spec,
      conclusion = get_comparison_conclusion(rd_sens, rd_spec, p_sens, p_spec)
    )
  )
}

generate_threshold_recommendation <- function(result, prevalence) {
  recs <- c()
  if (prevalence > 0.3) {
    recs <- c(recs, "High prevalence setting: prioritize sensitivity to avoid missed diagnoses")
    if (result$youden$sens < 0.9) {
      recs <- c(recs, "Consider rule-out strategy with higher sensitivity threshold")
    }
  }
  if (prevalence < 0.1) {
    recs <- c(recs, "Low prevalence setting: prioritize specificity to reduce false positives")
    if (result$youden$spec < 0.9) {
      recs <- c(recs, "Consider two-stage testing with confirmatory test")
    }
  }
  if (result$youden$j > 0.7) {
    recs <- c(recs, "High Youden index suggests good overall diagnostic performance")
  } else if (result$youden$j < 0.5) {
    recs <- c(recs, "Low Youden index suggests limited diagnostic utility")
  }
  recs
}

run_threshold_optimization <- function(studies_df, options) {
  prevalence <- ifelse(is.null(options$prevalence), 0.1, as.numeric(options$prevalence))
  cost_fn <- ifelse(is.null(options$cost_fn), 1.0, as.numeric(options$cost_fn))
  cost_fp <- ifelse(is.null(options$cost_fp), 0.5, as.numeric(options$cost_fp))
  target_sens <- ifelse(is.null(options$target_sens), NA_real_, as.numeric(options$target_sens))
  target_spec <- ifelse(is.null(options$target_spec), NA_real_, as.numeric(options$target_spec))

  pooled <- calculate_pooled_estimates(studies_df)
  sens <- pooled$pooled_sens
  spec <- pooled$pooled_spec

  out <- list(
    youden = list(
      sens = sens,
      spec = spec,
      j = sens + spec - 1
    ),
    closest_to_ideal = list(
      sens = sens,
      spec = spec,
      distance = sqrt((1 - sens)^2 + (1 - spec)^2)
    ),
    min_cost = list(
      sens = sens,
      spec = spec,
      expected_cost = (1 - sens) * prevalence * cost_fn + (1 - spec) * (1 - prevalence) * cost_fp,
      prevalence = prevalence
    )
  )

  if (is.finite(target_sens) || is.finite(target_spec)) {
    meets <- (!is.finite(target_sens) || sens >= target_sens) &&
      (!is.finite(target_spec) || spec >= target_spec)
    out$constrained_optimal <- list(
      sens = sens,
      spec = spec,
      meets_constraints = meets,
      target_sens = target_sens,
      target_spec = target_spec
    )
  }
  out$recommendation <- as.list(generate_threshold_recommendation(out, prevalence))
  out
}

run_network_meta_dta <- function(tests_df) {
  n_tests <- nrow(tests_df)
  if (n_tests < 2) stop("Need at least 2 tests for network analysis")

  dor <- (tests_df$sens * tests_df$spec) / ((1 - tests_df$sens) * (1 - tests_df$spec))
  ranking <- data.frame(
    test = tests_df$name,
    dor = dor,
    stringsAsFactors = FALSE
  )
  ranking <- ranking[order(-ranking$dor), ]
  ranking$rank <- seq_len(nrow(ranking))
  ranking$sucra <- (n_tests - ranking$rank) / (n_tests - 1)

  pairs <- utils::combn(seq_len(n_tests), 2, simplify = FALSE)
  pairwise <- lapply(pairs, function(idx) {
    i <- idx[1]
    j <- idx[2]
    dor_i <- dor[i]
    dor_j <- dor[j]
    data.frame(
      comparison = paste0(tests_df$name[i], " vs ", tests_df$name[j]),
      r_dor = dor_i / dor_j,
      log_r_dor = log(dor_i / dor_j),
      favors = ifelse(dor_i > dor_j, tests_df$name[i], tests_df$name[j]),
      stringsAsFactors = FALSE
    )
  })

  list(
    n_tests = n_tests,
    relative_dors = do.call(rbind, pairwise),
    rankings = ranking,
    best_test = ranking$test[1]
  )
}

run_ipd_two_stage <- function(study_counts_df) {
  n_patients <- sum(study_counts_df$tp + study_counts_df$fp + study_counts_df$fn + study_counts_df$tn)
  n_studies <- nrow(study_counts_df)

  tp_total <- sum(study_counts_df$tp)
  fp_total <- sum(study_counts_df$fp)
  fn_total <- sum(study_counts_df$fn)
  tn_total <- sum(study_counts_df$tn)
  one_stage <- list(
    sensitivity = tp_total / (tp_total + fn_total),
    specificity = tn_total / (tn_total + fp_total)
  )

  pooled <- calculate_pooled_estimates(study_counts_df[, c("tp", "fp", "fn", "tn")])
  list(
    n_patients = n_patients,
    n_studies = n_studies,
    one_stage = one_stage,
    two_stage = list(
      sensitivity = pooled$pooled_sens,
      specificity = pooled$pooled_spec,
      dor = pooled$dor
    ),
    heterogeneity = pooled$heterogeneity
  )
}

dataset <- jsonlite::fromJSON(dataset_path, simplifyVector = TRUE)

comp_a <- as_df_studies(dataset$comparative$test_a)
comp_b <- as_df_studies(dataset$comparative$test_b)
threshold_studies <- as_df_studies(dataset$threshold$studies)
network_tests <- data.frame(
  name = as.character(dataset$network$tests$name),
  sens = as.numeric(dataset$network$tests$sens),
  spec = as.numeric(dataset$network$tests$spec),
  stringsAsFactors = FALSE
)
ipd_counts <- data.frame(
  study = as.character(dataset$ipd$study_counts$study),
  tp = as.numeric(dataset$ipd$study_counts$tp),
  fp = as.numeric(dataset$ipd$study_counts$fp),
  fn = as.numeric(dataset$ipd$study_counts$fn),
  tn = as.numeric(dataset$ipd$study_counts$tn),
  stringsAsFactors = FALSE
)

reference <- list(
  generated_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z"),
  dataset_path = normalizePath(dataset_path, winslash = "/", mustWork = FALSE),
  methods = list(
    comparative_dta = run_comparative_dta(comp_a, comp_b),
    threshold_optimization = run_threshold_optimization(threshold_studies, dataset$threshold$options),
    network_meta_dta = run_network_meta_dta(network_tests),
    ipd_two_stage = run_ipd_two_stage(ipd_counts)
  )
)

jsonlite::write_json(reference, output_path, auto_unbox = TRUE, pretty = TRUE, digits = 16, na = "null")
cat(sprintf("Wrote gap-fill R reference JSON: %s\n", output_path))
