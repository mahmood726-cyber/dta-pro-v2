#!/usr/bin/env Rscript

# Compute R reference values for publication-bias methods used by the DTA app.

args <- commandArgs(trailingOnly = TRUE)
dataset_path <- if (length(args) >= 1) args[[1]] else "pubbias_comparator_dataset.csv"
output_path <- if (length(args) >= 2) args[[2]] else "pubbias_reference_r.json"

if (!requireNamespace("jsonlite", quietly = TRUE)) {
  stop("Missing required package: jsonlite")
}

eps <- 1e-12

as_num <- function(x) as.numeric(x)

read_dataset <- function(path) {
  df <- utils::read.csv(path, stringsAsFactors = FALSE)
  needed <- c("TP", "FP", "FN", "TN")
  if (!all(needed %in% names(df))) {
    stop(sprintf("Dataset must include columns: %s", paste(needed, collapse = ", ")))
  }
  df$TP <- as_num(df$TP)
  df$FP <- as_num(df$FP)
  df$FN <- as_num(df$FN)
  df$TN <- as_num(df$TN)
  df
}

transform_studies <- function(df) {
  out <- df
  has_zero <- out$TP == 0 | out$FP == 0 | out$FN == 0 | out$TN == 0
  if (any(has_zero)) {
    out$TP[has_zero] <- out$TP[has_zero] + 0.5
    out$FP[has_zero] <- out$FP[has_zero] + 0.5
    out$FN[has_zero] <- out$FN[has_zero] + 0.5
    out$TN[has_zero] <- out$TN[has_zero] + 0.5
  }
  dor <- (out$TP * out$TN) / (out$FP * out$FN)
  yi <- log(pmax(eps, dor))
  var_logit_sens <- 1 / out$TP + 1 / out$FN
  var_logit_spec <- 1 / out$TN + 1 / out$FP
  sei <- sqrt(pmax(eps, var_logit_sens + var_logit_spec))
  vi <- sei * sei
  wi <- 1 / pmax(eps, vi)
  list(df = out, yi = yi, sei = sei, vi = vi, wi = wi)
}

safe_weighted_mean <- function(values, weights) {
  s <- sum(weights)
  if (!(is.finite(s) && s > 0)) return(NaN)
  sum(values * weights) / s
}

weighted_regression <- function(x, y, w) {
  n <- length(x)
  if (n < 3) stop("Need at least 3 points for weighted regression")
  w <- pmax(eps, as_num(w))
  sum_w <- sum(w)
  sum_wx <- sum(w * x)
  sum_wx2 <- sum(w * x * x)
  sum_wy <- sum(w * y)
  sum_wxy <- sum(w * x * y)
  denom <- sum_w * sum_wx2 - sum_wx * sum_wx
  if (!is.finite(denom) || abs(denom) < eps) {
    stop("Weighted regression is singular for this dataset")
  }
  slope <- (sum_w * sum_wxy - sum_wx * sum_wy) / denom
  intercept <- (sum_wy - slope * sum_wx) / sum_w
  resid <- y - (intercept + slope * x)
  sse <- sum(w * resid * resid)
  df <- max(1, n - 2)
  sigma2 <- sse / df
  var_intercept <- max(eps, sigma2 * (sum_wx2 / denom))
  var_slope <- max(eps, sigma2 * (sum_w / denom))
  list(
    intercept = intercept,
    slope = slope,
    intercept_se = sqrt(var_intercept),
    slope_se = sqrt(var_slope),
    df = df,
    sigma2 = sigma2
  )
}

simple_linear_regression <- function(x, y) {
  n <- length(x)
  sum_x <- sum(x)
  sum_y <- sum(y)
  sum_xy <- sum(x * y)
  sum_x2 <- sum(x * x)
  denom <- n * sum_x2 - sum_x * sum_x
  if (!is.finite(denom) || abs(denom) < eps) {
    return(list(slope = 0, intercept = mean(y), slope_se = NaN, intercept_se = NaN))
  }
  slope <- (n * sum_xy - sum_x * sum_y) / denom
  intercept <- (sum_y - slope * sum_x) / n
  y_pred <- intercept + slope * x
  sse <- sum((y - y_pred)^2)
  mse <- sse / max(1, n - 2)
  sxx <- sum_x2 - (sum_x * sum_x / n)
  if (!is.finite(sxx) || abs(sxx) < eps) {
    return(list(slope = slope, intercept = intercept, slope_se = NaN, intercept_se = NaN))
  }
  intercept_se <- sqrt(max(0, mse * (1 / n + (sum_x / n)^2 / sxx)))
  slope_se <- sqrt(max(0, mse / sxx))
  list(slope = slope, intercept = intercept, slope_se = slope_se, intercept_se = intercept_se)
}

poisson_binomial_tail_probability <- function(probabilities, threshold) {
  probs <- as_num(probabilities)
  probs <- probs[is.finite(probs)]
  probs <- pmax(1e-9, pmin(1 - 1e-9, probs))
  n <- length(probs)
  if (threshold <= 0) return(1)
  if (threshold > n) return(0)
  dp <- rep(0, n + 1)
  dp[1] <- 1
  for (i in seq_len(n)) {
    p <- probs[i]
    if (i >= 1) {
      for (j in seq(i + 1, 2, by = -1)) {
        dp[j] <- dp[j] * (1 - p) + dp[j - 1] * p
      }
    }
    dp[1] <- dp[1] * (1 - p)
  }
  sum(dp[(threshold + 1):(n + 1)])
}

binomial_tail_ge <- function(n, p, k_min) {
  if (k_min <= 0) return(1)
  if (k_min > n) return(0)
  prob <- pmax(eps, pmin(1 - eps, as_num(p)))
  ks <- k_min:n
  lp <- lchoose(n, ks) + ks * log(prob) + (n - ks) * log(1 - prob)
  pmin(1, pmax(0, sum(exp(lp))))
}

rank_normalize <- function(values) {
  n <- length(values)
  ord <- order(values, seq_along(values))
  ranks <- rep(0, n)
  ranks[ord] <- seq(0, n - 1)
  denom <- max(1, n - 1)
  ranks / denom
}

compute_monotone_step_bounds <- function(yi, wi, score, p_min_grid = c(0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8)) {
  n <- length(yi)
  order_idx <- order(score, seq_along(score))
  evaluate <- function(p_min, cutoff_rank) {
    adj_w <- vapply(seq_along(order_idx), function(rank_pos) {
      idx <- order_idx[rank_pos]
      if ((rank_pos - 1) <= cutoff_rank) wi[idx] / p_min else wi[idx]
    }, numeric(1))
    ordered_y <- yi[order_idx]
    safe_weighted_mean(ordered_y, adj_w)
  }
  lower <- Inf
  upper <- -Inf
  lower_cfg <- list(p_min = NA_real_, cutoff = NA_integer_)
  upper_cfg <- list(p_min = NA_real_, cutoff = NA_integer_)
  for (p_min in p_min_grid) {
    for (cutoff in -1:(n - 1)) {
      theta <- evaluate(p_min, cutoff)
      if (is.finite(theta) && theta < lower) {
        lower <- theta
        lower_cfg <- list(p_min = p_min, cutoff = as.integer(cutoff))
      }
      if (is.finite(theta) && theta > upper) {
        upper <- theta
        upper_cfg <- list(p_min = p_min, cutoff = as.integer(cutoff))
      }
    }
  }
  list(lower = lower, upper = upper, lower_cfg = lower_cfg, upper_cfg = upper_cfg)
}

pet_peese <- function(yi, sei, vi, wi) {
  pet <- weighted_regression(sei, yi, wi)
  peese <- weighted_regression(vi, yi, wi)
  pet_t_intercept <- pet$intercept / pet$intercept_se
  pet_t_slope <- pet$slope / pet$slope_se
  peese_t_intercept <- peese$intercept / peese$intercept_se

  p_pet_intercept <- 2 * stats::pt(-abs(pet_t_intercept), df = pet$df)
  p_pet_slope <- 2 * stats::pt(-abs(pet_t_slope), df = pet$df)
  p_peese_intercept <- 2 * stats::pt(-abs(peese_t_intercept), df = peese$df)

  use_peese <- is.finite(p_pet_intercept) && p_pet_intercept < 0.10
  corrected_log_dor <- if (use_peese) peese$intercept else pet$intercept
  corrected_dor <- exp(corrected_log_dor)
  unadjusted_log_dor <- sum(yi * wi) / sum(wi)
  unadjusted_dor <- exp(unadjusted_log_dor)
  change_pct <- (corrected_dor / max(eps, unadjusted_dor) - 1) * 100

  list(
    pet = list(
      intercept = pet$intercept,
      slope = pet$slope,
      intercept_se = pet$intercept_se,
      slope_se = pet$slope_se,
      df = pet$df,
      p_intercept = p_pet_intercept,
      p_slope = p_pet_slope
    ),
    peese = list(
      intercept = peese$intercept,
      slope = peese$slope,
      intercept_se = peese$intercept_se,
      slope_se = peese$slope_se,
      df = peese$df,
      p_intercept = p_peese_intercept
    ),
    decision = list(
      use_peese = use_peese,
      corrected_log_dor = corrected_log_dor,
      corrected_dor = corrected_dor,
      unadjusted_log_dor = unadjusted_log_dor,
      unadjusted_dor = unadjusted_dor,
      change_pct = change_pct
    )
  )
}

excess_significance <- function(yi, sei, vi, wi, alpha = 0.05) {
  z_crit <- stats::qnorm(1 - alpha / 2)
  p_values <- 2 * stats::pnorm(-abs(yi / pmax(eps, sei)))
  observed_sig <- sum(is.finite(p_values) & p_values < alpha)
  k <- length(yi)

  theta_fe <- sum(yi * wi) / max(eps, sum(wi))
  q <- sum(wi * (yi - theta_fe)^2)
  sum_w <- sum(wi)
  sum_w2 <- sum(wi * wi)
  c_tau <- sum_w - sum_w2 / max(eps, sum_w)
  tau2_dl <- max(0, (q - (k - 1)) / max(eps, c_tau))
  w_re <- 1 / pmax(eps, vi + tau2_dl)
  theta_re <- sum(w_re * yi) / max(eps, sum(w_re))

  powers_from <- function(theta, tau2_adj) {
    total_se <- sqrt(pmax(eps, sei * sei + tau2_adj))
    non_central <- abs(theta) / total_se
    powers <- 1 - stats::pnorm(z_crit - non_central) + stats::pnorm(-z_crit - non_central)
    pmax(1e-6, pmin(1 - 1e-6, powers))
  }

  powers_fe <- powers_from(theta_fe, 0)
  powers_re <- powers_from(theta_re, tau2_dl)
  expected_sig_fe <- sum(powers_fe)
  expected_sig_re <- sum(powers_re)
  exact_p_fe <- poisson_binomial_tail_probability(powers_fe, observed_sig)
  exact_p_re <- poisson_binomial_tail_probability(powers_re, observed_sig)

  excess_stats <- function(expected_sig, p_exact) {
    if (!(expected_sig > 1e-6 && expected_sig < k - 1e-6)) {
      return(list(expected_sig = expected_sig, chi2 = NaN, p_excess = NaN, p_exact = NaN, ratio = NaN))
    }
    chi2 <- ((observed_sig - expected_sig)^2) / expected_sig +
      (((k - observed_sig) - (k - expected_sig))^2) / (k - expected_sig)
    p_excess <- 1 - stats::pchisq(chi2, df = 1)
    ratio <- observed_sig / expected_sig
    list(expected_sig = expected_sig, chi2 = chi2, p_excess = p_excess, p_exact = p_exact, ratio = ratio)
  }

  stats_fe <- excess_stats(expected_sig_fe, exact_p_fe)
  stats_re <- excess_stats(expected_sig_re, exact_p_re)
  primary_is_re <- is.finite(stats_re$p_exact)
  primary <- if (primary_is_re) stats_re else stats_fe
  primary_label <- if (primary_is_re) "Random-effects (primary)" else "Fixed-effect (fallback)"

  list(
    alpha = alpha,
    z_crit = z_crit,
    observed_sig = observed_sig,
    k = k,
    theta_fe = theta_fe,
    theta_re = theta_re,
    tau2_dl = tau2_dl,
    stats_fe = stats_fe,
    stats_re = stats_re,
    primary = primary,
    primary_label = primary_label
  )
}

deeks_test <- function(tr) {
  df <- tr$df
  yi <- tr$yi
  k <- length(yi)
  if (k < 3) {
    return(list(
      intercept = NaN,
      slope = NaN,
      se_slope = NaN,
      t = NaN,
      p_value = NaN,
      n = k
    ))
  }
  diseased <- df$TP + df$FN
  healthy <- df$FP + df$TN
  n_total <- diseased + healthy
  ess <- 4 * diseased * healthy / pmax(eps, n_total)
  inv_sqrt_ess <- 1 / sqrt(pmax(eps, ess))

  if (stats::var(inv_sqrt_ess) < eps) {
    return(list(
      intercept = mean(yi),
      slope = 0,
      se_slope = NaN,
      t = 0,
      p_value = 1,
      n = k
    ))
  }

  fit <- stats::lm(yi ~ inv_sqrt_ess)
  sm <- summary(fit)
  cf <- sm$coefficients
  slope_row <- which(rownames(cf) == "inv_sqrt_ess")
  intercept_row <- which(rownames(cf) == "(Intercept)")
  list(
    intercept = as.numeric(cf[intercept_row, 1]),
    slope = as.numeric(cf[slope_row, 1]),
    se_slope = as.numeric(cf[slope_row, 2]),
    t = as.numeric(cf[slope_row, 3]),
    p_value = as.numeric(cf[slope_row, 4]),
    n = k
  )
}

egger_variants <- function(df_raw, tr) {
  k <- nrow(df_raw)
  if (k < 3) {
    empty <- list(coefficient = NaN, se = NaN, t = NaN, p = NaN)
    return(list(
      standard_egger = empty,
      deeks_funnel_asymmetry = empty,
      peters_test = empty
    ))
  }

  log_dor <- tr$yi
  se <- tr$sei
  precision <- 1 / pmax(eps, se)
  egger <- simple_linear_regression(precision, log_dor / pmax(eps, se))
  t_egger <- egger$intercept / pmax(eps, egger$intercept_se)
  p_egger <- 2 * stats::pt(-abs(t_egger), df = k - 2)

  ess <- 4 * (df_raw$TP + df_raw$FN) * (df_raw$FP + df_raw$TN) /
    pmax(eps, (df_raw$TP + df_raw$FP + df_raw$FN + df_raw$TN))
  deeks <- simple_linear_regression(1 / sqrt(pmax(eps, ess)), log_dor)
  t_deeks <- deeks$slope / pmax(eps, deeks$slope_se)
  p_deeks <- 2 * stats::pt(-abs(t_deeks), df = k - 2)

  n_total <- df_raw$TP + df_raw$FP + df_raw$FN + df_raw$TN
  peters <- simple_linear_regression(1 / pmax(eps, n_total), log_dor)
  t_peters <- peters$slope / pmax(eps, peters$slope_se)
  p_peters <- 2 * stats::pt(-abs(t_peters), df = k - 2)

  list(
    standard_egger = list(
      coefficient = egger$intercept,
      se = egger$intercept_se,
      t = t_egger,
      p = p_egger
    ),
    deeks_funnel_asymmetry = list(
      coefficient = deeks$slope,
      se = deeks$slope_se,
      t = t_deeks,
      p = p_deeks
    ),
    peters_test = list(
      coefficient = peters$slope,
      se = peters$slope_se,
      t = t_peters,
      p = p_peters
    )
  )
}

trim_and_fill <- function(tr) {
  log_dor <- tr$yi
  se <- tr$sei
  n <- length(log_dor)
  sorted <- sort(log_dor)
  median_idx <- floor(n / 2) + 1
  median_dor <- sorted[median_idx]
  dev <- log_dor - median_dor
  pos_idx <- which(dev > 0)
  neg_idx <- which(dev <= 0)
  if (length(pos_idx) > 0) {
    pos_idx <- pos_idx[order(dev[pos_idx], decreasing = TRUE)]
  }
  k_imputed <- max(0, floor((length(pos_idx) - length(neg_idx)) / 2))
  imputed_log_dor <- numeric(0)
  imputed_se <- numeric(0)
  if (k_imputed > 0 && length(pos_idx) > 0) {
    for (i in seq_len(k_imputed)) {
      if (i <= length(pos_idx)) {
        idx <- pos_idx[i]
        imputed_log_dor <- c(imputed_log_dor, median_dor - dev[idx])
        imputed_se <- c(imputed_se, se[idx])
      }
    }
  }
  all_log_dor <- c(log_dor, imputed_log_dor)
  all_se <- c(se, imputed_se)
  weights_all <- 1 / pmax(eps, all_se * all_se)
  adjusted_log_dor <- sum(all_log_dor * weights_all) / sum(weights_all)
  weights_orig <- 1 / pmax(eps, se * se)
  original_log_dor <- sum(log_dor * weights_orig) / sum(weights_orig)
  list(
    k_imputed = k_imputed,
    median_log_dor = median_dor,
    original_log_dor = original_log_dor,
    adjusted_log_dor = adjusted_log_dor,
    original_dor = exp(original_log_dor),
    adjusted_dor = exp(adjusted_log_dor)
  )
}

pcurve_analysis <- function(df_raw) {
  p_values <- vapply(seq_len(nrow(df_raw)), function(i) {
    s <- df_raw[i, ]
    sens <- s$TP / pmax(eps, s$TP + s$FN)
    spec <- s$TN / pmax(eps, s$TN + s$FP)
    z_sens <- (sens - 0.5) / sqrt(0.25 / pmax(eps, s$TP + s$FN))
    z_spec <- (spec - 0.5) / sqrt(0.25 / pmax(eps, s$TN + s$FP))
    p_sens <- 2 * (1 - stats::pnorm(abs(z_sens)))
    p_spec <- 2 * (1 - stats::pnorm(abs(z_spec)))
    min(p_sens, p_spec)
  }, numeric(1))
  sig_p <- p_values[p_values < 0.05]
  b1 <- sum(sig_p <= 0.01)
  b2 <- sum(sig_p > 0.01 & sig_p <= 0.02)
  b3 <- sum(sig_p > 0.02 & sig_p <= 0.03)
  b4 <- sum(sig_p > 0.03 & sig_p <= 0.04)
  b5 <- sum(sig_p > 0.04 & sig_p <= 0.05)
  low_p <- b1 + b2
  high_p <- b4 + b5
  list(
    n_significant = length(sig_p),
    low_p = low_p,
    high_p = high_p,
    right_skew = low_p > high_p,
    bins = list(
      `0.00-0.01` = b1,
      `0.01-0.02` = b2,
      `0.02-0.03` = b3,
      `0.03-0.04` = b4,
      `0.04-0.05` = b5
    )
  )
}

worst_case_selection_bounds <- function(tr) {
  yi <- tr$yi
  sei <- tr$sei
  wi <- 1 / pmax(eps, sei * sei)
  abs_z <- abs(yi / pmax(eps, sei))
  precision <- 1 / pmax(eps, sei)
  precision_rank <- rank_normalize(precision)
  z_rank <- rank_normalize(abs_z)
  composite_score <- 0.5 * precision_rank + 0.5 * z_rank

  by_precision <- compute_monotone_step_bounds(yi, wi, precision_rank)
  by_significance <- compute_monotone_step_bounds(yi, wi, z_rank)
  by_composite <- compute_monotone_step_bounds(yi, wi, composite_score)

  global_lower <- min(by_precision$lower, by_significance$lower, by_composite$lower)
  global_upper <- max(by_precision$upper, by_significance$upper, by_composite$upper)
  spread <- exp(global_upper) - exp(global_lower)
  robustness <- if (spread < 0.5) {
    "High robustness"
  } else if (spread < 1.5) {
    "Moderate robustness"
  } else {
    "Low robustness"
  }

  list(
    global_lower = global_lower,
    global_upper = global_upper,
    global_lower_dor = exp(global_lower),
    global_upper_dor = exp(global_upper),
    spread_dor = spread,
    robustness = robustness,
    precision = by_precision,
    significance = by_significance,
    composite = by_composite
  )
}

caliper_discontinuity <- function(tr, alpha = 0.05, width = 0.01) {
  yi <- tr$yi
  sei <- tr$sei
  p_values <- 2 * (1 - stats::pnorm(abs(yi / pmax(eps, sei))))
  left <- sum(is.finite(p_values) & p_values >= (alpha - width) & p_values < alpha)
  right <- sum(is.finite(p_values) & p_values >= alpha & p_values < (alpha + width))
  n_window <- left + right
  if (n_window < 4) {
    return(list(
      alpha = alpha,
      width = width,
      left = left,
      right = right,
      n_window = n_window,
      too_few_window = TRUE
    ))
  }
  p_exact_one_sided <- binomial_tail_ge(n_window, 0.5, left)
  z_score <- (left - n_window / 2) / sqrt(max(eps, n_window / 4))
  p_normal_one_sided <- 1 - stats::pnorm(z_score)
  ratio <- if (right > 0) left / right else Inf
  log_ratio <- if (left > 0 && right > 0) log(ratio) else NaN
  se_log_ratio <- if (left > 0 && right > 0) sqrt(1 / left + 1 / right) else NaN
  ratio_ci <- if (is.finite(log_ratio) && is.finite(se_log_ratio)) {
    c(exp(log_ratio - 1.96 * se_log_ratio), exp(log_ratio + 1.96 * se_log_ratio))
  } else {
    c(NA_real_, NA_real_)
  }
  list(
    alpha = alpha,
    width = width,
    left = left,
    right = right,
    n_window = n_window,
    too_few_window = FALSE,
    p_exact_one_sided = p_exact_one_sided,
    z_score = z_score,
    p_normal_one_sided = p_normal_one_sided,
    ratio = ratio,
    ratio_ci = ratio_ci,
    discontinuity_flag = is.finite(p_exact_one_sided) && p_exact_one_sided < 0.10 && left > right
  )
}

selection_ratio_sensitivity <- function(tr, alpha = 0.05) {
  yi <- tr$yi
  sei <- tr$sei
  vi <- tr$vi
  wi <- tr$wi
  p_values <- 2 * (1 - stats::pnorm(abs(yi / pmax(eps, sei))))
  significant <- is.finite(p_values) & p_values < alpha
  n_sig <- sum(significant)
  n_non_sig <- length(significant) - n_sig
  eta_grid <- c(1, 1.25, 1.5, 2, 3, 4, 5, 7, 10, 15, 20)
  unadjusted_log_dor <- safe_weighted_mean(yi, wi)
  unadjusted_dor <- exp(unadjusted_log_dor)

  rows <- lapply(eta_grid, function(eta) {
    adj_w <- wi / ifelse(significant, eta, 1)
    theta <- safe_weighted_mean(yi, adj_w)
    sum_adj_w <- sum(adj_w)
    se_theta <- sqrt(1 / max(eps, sum_adj_w))
    dor <- exp(theta)
    dor_ci <- c(exp(theta - 1.96 * se_theta), exp(theta + 1.96 * se_theta))
    list(
      eta = eta,
      theta = theta,
      dor = dor,
      dor_ci = dor_ci,
      ratio_to_unadjusted = dor / max(eps, unadjusted_dor)
    )
  })

  ratio_vec <- vapply(rows, function(r) r$ratio_to_unadjusted, numeric(1))
  theta_vec <- vapply(rows, function(r) r$theta, numeric(1))
  eta_vec <- vapply(rows, function(r) r$eta, numeric(1))
  idx20 <- which(ratio_vec <= 0.8)[1]
  idx0 <- which(theta_vec <= 0)[1]
  eta20pct <- if (length(idx20) == 0 || is.na(idx20)) NA_real_ else eta_vec[idx20]
  eta_null <- if (length(idx0) == 0 || is.na(idx0)) NA_real_ else eta_vec[idx0]
  max_attenuation <- 1 - min(ratio_vec)
  robustness <- if (max_attenuation < 0.15) {
    "High robustness"
  } else if (max_attenuation < 0.35) {
    "Moderate robustness"
  } else {
    "Low robustness"
  }

  list(
    alpha = alpha,
    n_sig = n_sig,
    n_non_sig = n_non_sig,
    unadjusted_log_dor = unadjusted_log_dor,
    unadjusted_dor = unadjusted_dor,
    eta_20pct = eta20pct,
    eta_null = eta_null,
    max_attenuation = max_attenuation,
    robustness = robustness,
    rows = rows
  )
}

df_raw <- read_dataset(dataset_path)
tr <- transform_studies(df_raw)
pet <- pet_peese(tr$yi, tr$sei, tr$vi, tr$wi)
excess <- excess_significance(tr$yi, tr$sei, tr$vi, tr$wi)
deeks <- deeks_test(tr)
egger <- egger_variants(df_raw, tr)
trimfill <- trim_and_fill(tr)
pcurve <- pcurve_analysis(df_raw)
worst_case <- worst_case_selection_bounds(tr)
caliper <- caliper_discontinuity(tr)
selection_ratio <- selection_ratio_sensitivity(tr)

out <- list(
  generated_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z"),
  dataset_path = normalizePath(dataset_path, winslash = "/", mustWork = FALSE),
  n_studies = nrow(df_raw),
  methods = list(
    pet_peese = pet,
    excess_significance = excess,
    deeks = deeks,
    egger_variants = egger,
    trim_and_fill = trimfill,
    pcurve = pcurve,
    worst_case_selection_bounds = worst_case,
    caliper_discontinuity = caliper,
    selection_ratio_sensitivity = selection_ratio
  )
)

jsonlite::write_json(out, output_path, auto_unbox = TRUE, pretty = TRUE, digits = 16, na = "null")
cat(sprintf("Wrote R reference JSON: %s\n", output_path))
