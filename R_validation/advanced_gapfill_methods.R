# ============================================================================
# DTA Meta-Analysis Pro v4.9.3 - Advanced R Gap Fill + Novel Methods
# ============================================================================
# Purpose:
# 1) Fill R-side validation gaps for comparative DTA, network DTA ranking, and
#    IPD two-stage analysis used by the app.
# 2) Implement a journal-based publication-bias sensitivity method for SROC
#    using a t-statistic selection function (Hattori & Zhou framework).
#
# Output:
#   - advanced_validation_reference.json (in this folder)
#
# Date: 2026-03-03
# ============================================================================

required_packages <- c("mada", "jsonlite")
missing_packages <- required_packages[
  !vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)
]
if (length(missing_packages) > 0) {
  stop(
    sprintf(
      "Missing required packages: %s",
      paste(missing_packages, collapse = ", ")
    )
  )
}

library(mada)
library(jsonlite)

args_all <- commandArgs(trailingOnly = FALSE)
script_arg <- grep("^--file=", args_all, value = TRUE)
script_dir <- if (length(script_arg) > 0) {
  dirname(normalizePath(sub("^--file=", "", script_arg[1]), winslash = "/", mustWork = FALSE))
} else {
  getwd()
}

eps <- 1e-12

safe_plogis <- function(x) {
  1 / (1 + exp(-x))
}

safe_logit <- function(p) {
  p <- pmin(1 - 1e-8, pmax(1e-8, p))
  log(p / (1 - p))
}

apply_continuity_correction <- function(df, cc = 0.5) {
  out <- df
  needs_cc <- out$TP == 0 | out$FP == 0 | out$FN == 0 | out$TN == 0
  if (any(needs_cc)) {
    out$TP[needs_cc] <- out$TP[needs_cc] + cc
    out$FP[needs_cc] <- out$FP[needs_cc] + cc
    out$FN[needs_cc] <- out$FN[needs_cc] + cc
    out$TN[needs_cc] <- out$TN[needs_cc] + cc
  }
  out
}

build_transformed_studies <- function(df_raw, cc = 0.5) {
  df <- apply_continuity_correction(df_raw, cc = cc)
  sens <- with(df, TP / (TP + FN))
  spec <- with(df, TN / (TN + FP))

  y1 <- safe_logit(sens)
  y2 <- safe_logit(spec)
  var1 <- with(df, 1 / TP + 1 / FN)
  var2 <- with(df, 1 / TN + 1 / FP)

  list(
    df = df,
    y = cbind(y1, y2),
    Sigma = lapply(seq_len(nrow(df)), function(i) {
      matrix(c(var1[i], 0, 0, var2[i]), nrow = 2, byrow = TRUE)
    }),
    sens = sens,
    spec = spec
  )
}

extract_reitsma_summary <- function(fit) {
  coef_mat <- as.matrix(stats::coef(fit))
  coef_cols <- tolower(colnames(coef_mat))
  tsens_col <- which(grepl("tsens", coef_cols))[1]
  tfpr_col <- which(grepl("tfpr", coef_cols))[1]
  if (is.na(tsens_col)) tsens_col <- 1
  if (is.na(tfpr_col)) tfpr_col <- min(2, ncol(coef_mat))

  mu_sens <- as.numeric(coef_mat[1, tsens_col])
  mu_fpr <- as.numeric(coef_mat[1, tfpr_col])

  sens <- safe_plogis(mu_sens)
  spec <- 1 - safe_plogis(mu_fpr)
  dor <- (sens * spec) / ((1 - sens) * (1 - spec))

  list(
    mu = c(mu_sens, safe_logit(spec)),
    sens = sens,
    spec = spec,
    dor = dor,
    auc_approx = stats::pnorm(log(dor) / sqrt(2)),
    Psi = fit$Psi
  )
}

fit_reitsma_safe <- function(df_2x2, correction = NULL) {
  out <- tryCatch(
    {
      if (is.null(correction)) {
        fit <- suppressWarnings(reitsma(df_2x2[, c("TP", "FP", "FN", "TN")]))
      } else {
        fit <- suppressWarnings(
          reitsma(
            df_2x2[, c("TP", "FP", "FN", "TN")],
            correction = correction,
            correction.control = "all"
          )
        )
      }
      extract_reitsma_summary(fit)
    },
    error = function(e) {
      NULL
    }
  )
  out
}

paired_comparative_dta <- function(test_a, test_b, conf_level = 0.95) {
  if (nrow(test_a) != nrow(test_b)) {
    stop("test_a and test_b must have equal numbers of paired studies.")
  }
  n <- nrow(test_a)
  if (n < 2) {
    stop("At least 2 paired studies required.")
  }

  a <- apply_continuity_correction(test_a, cc = 0.5)
  b <- apply_continuity_correction(test_b, cc = 0.5)

  sens_a <- with(a, TP / (TP + FN))
  spec_a <- with(a, TN / (TN + FP))
  sens_b <- with(b, TP / (TP + FN))
  spec_b <- with(b, TN / (TN + FP))

  d_logit_sens <- safe_logit(sens_a) - safe_logit(sens_b)
  d_logit_spec <- safe_logit(spec_a) - safe_logit(spec_b)

  mean_sens <- mean(d_logit_sens)
  mean_spec <- mean(d_logit_spec)
  se_sens <- stats::sd(d_logit_sens) / sqrt(n)
  se_spec <- stats::sd(d_logit_spec) / sqrt(n)

  t_sens <- ifelse(se_sens > eps, mean_sens / se_sens, 0)
  t_spec <- ifelse(se_spec > eps, mean_spec / se_spec, 0)
  p_sens <- 2 * (1 - stats::pt(abs(t_sens), df = n - 1))
  p_spec <- 2 * (1 - stats::pt(abs(t_spec), df = n - 1))

  pooled_sens_a <- mean(sens_a)
  pooled_spec_a <- mean(spec_a)
  pooled_sens_b <- mean(sens_b)
  pooled_spec_b <- mean(spec_b)

  rd_sens <- pooled_sens_a - pooled_sens_b
  rd_spec <- pooled_spec_a - pooled_spec_b

  z <- stats::qnorm(1 - (1 - conf_level) / 2)
  avg_sens <- (pooled_sens_a + pooled_sens_b) / 2
  avg_spec <- (pooled_spec_a + pooled_spec_b) / 2

  se_sens_prob <- se_sens * avg_sens * (1 - avg_sens)
  se_spec_prob <- se_spec * avg_spec * (1 - avg_spec)

  list(
    n_paired = n,
    pooled = list(
      test_a = list(sens = pooled_sens_a, spec = pooled_spec_a),
      test_b = list(sens = pooled_sens_b, spec = pooled_spec_b)
    ),
    differences = list(
      sensitivity_difference = rd_sens,
      sensitivity_ci = c(rd_sens - z * se_sens_prob, rd_sens + z * se_sens_prob),
      sensitivity_p_value = p_sens,
      specificity_difference = rd_spec,
      specificity_ci = c(rd_spec - z * se_spec_prob, rd_spec + z * se_spec_prob),
      specificity_p_value = p_spec
    )
  )
}

network_dta_point_rank <- function(network_df) {
  required_cols <- c("test", "study", "TP", "FP", "FN", "TN")
  if (!all(required_cols %in% names(network_df))) {
    stop("network_df must include columns: test, study, TP, FP, FN, TN")
  }

  tests <- sort(unique(network_df$test))
  if (length(tests) < 2) {
    stop("Need at least 2 tests for network ranking.")
  }

  test_summaries <- lapply(tests, function(test_name) {
    d <- network_df[network_df$test == test_name, c("TP", "FP", "FN", "TN")]
    fit <- fit_reitsma_safe(d)
    if (is.null(fit)) {
      d_cc <- apply_continuity_correction(d, cc = 0.5)
      sens <- mean(with(d_cc, TP / (TP + FN)))
      spec <- mean(with(d_cc, TN / (TN + FP)))
      dor <- (sens * spec) / ((1 - sens) * (1 - spec))
      auc <- stats::pnorm(log(dor) / sqrt(2))
      fit <- list(sens = sens, spec = spec, dor = dor, auc_approx = auc)
    }
    list(
      test = test_name,
      n_studies = nrow(d),
      sensitivity = fit$sens,
      specificity = fit$spec,
      dor = fit$dor,
      auc_approx = fit$auc_approx
    )
  })

  rank_df <- do.call(rbind, lapply(test_summaries, as.data.frame))
  rank_df <- rank_df[order(-rank_df$dor), ]
  rank_df$rank <- seq_len(nrow(rank_df))
  rank_df$point_sucra <- (nrow(rank_df) - rank_df$rank) / (nrow(rank_df) - 1)

  pairs <- utils::combn(rank_df$test, 2, simplify = FALSE)
  pairwise <- lapply(pairs, function(p) {
    a <- rank_df[rank_df$test == p[1], ]
    b <- rank_df[rank_df$test == p[2], ]
    data.frame(
      comparison = paste0(p[1], " vs ", p[2]),
      relative_dor = a$dor / b$dor,
      favored_test = ifelse(a$dor >= b$dor, p[1], p[2])
    )
  })

  list(
    n_tests = nrow(rank_df),
    ranking = rank_df,
    pairwise_relative_dor = do.call(rbind, pairwise)
  )
}

ipd_two_stage_dta <- function(ipd_df) {
  req <- c("study", "test_result", "disease_status")
  if (!all(req %in% names(ipd_df))) {
    stop("ipd_df must include columns: study, test_result, disease_status")
  }

  studies <- sort(unique(ipd_df$study))
  agg <- lapply(studies, function(s) {
    d <- ipd_df[ipd_df$study == s, ]
    tp <- sum(d$disease_status == 1 & d$test_result == 1)
    fp <- sum(d$disease_status == 0 & d$test_result == 1)
    fn <- sum(d$disease_status == 1 & d$test_result == 0)
    tn <- sum(d$disease_status == 0 & d$test_result == 0)
    data.frame(study = s, TP = tp, FP = fp, FN = fn, TN = tn)
  })
  agg_df <- do.call(rbind, agg)

  one_stage <- list(
    sensitivity = sum(agg_df$TP) / (sum(agg_df$TP) + sum(agg_df$FN)),
    specificity = sum(agg_df$TN) / (sum(agg_df$TN) + sum(agg_df$FP))
  )

  two_stage_fit <- fit_reitsma_safe(agg_df)
  if (is.null(two_stage_fit)) {
    agg_cc <- apply_continuity_correction(agg_df, cc = 0.5)
    two_stage_fit <- list(
      sens = mean(with(agg_cc, TP / (TP + FN))),
      spec = mean(with(agg_cc, TN / (TN + FP))),
      dor = NA_real_,
      auc_approx = NA_real_
    )
  }

  list(
    n_patients = nrow(ipd_df),
    n_studies = nrow(agg_df),
    one_stage = one_stage,
    two_stage = list(
      sensitivity = two_stage_fit$sens,
      specificity = two_stage_fit$spec,
      dor = two_stage_fit$dor,
      auc_approx = two_stage_fit$auc_approx
    ),
    study_table = agg_df
  )
}

# Hattori & Zhou style sensitivity analysis with fixed contrast vector.
# The full paper optimizes additional parameters; here we use a practical,
# reproducible profile over beta with alpha solved from target marginal
# publication probability p.
selection_sroc_sensitivity <- function(df_2x2, p_grid = c(1.0, 0.8, 0.6, 0.4),
                                       c_vec = c(1 / sqrt(2), 1 / sqrt(2)),
                                       beta_grid = seq(0, 3, by = 0.1)) {
  trans <- build_transformed_studies(df_2x2, cc = 0.5)
  y <- trans$y
  Sigma <- trans$Sigma
  n <- nrow(y)

  base <- fit_reitsma_safe(df_2x2, correction = 0.5)
  if (is.null(base)) {
    stop("Reitsma baseline fit failed; cannot run selection sensitivity.")
  }

  mu <- as.numeric(base$mu)
  Omega <- as.matrix(base$Psi)

  quad_form <- function(v, M) as.numeric(t(v) %*% M %*% v)

  v_i <- vapply(Sigma, function(Si) quad_form(c_vec, Si), numeric(1))
  t_i <- vapply(seq_len(n), function(i) {
    sum(c_vec * y[i, ]) / sqrt(v_i[i])
  }, numeric(1))
  cOmega <- quad_form(c_vec, Omega)

  p_from_alpha <- function(alpha, beta) {
    b_i <- vapply(seq_len(n), function(i) {
      num <- beta * (sum(c_vec * mu) / sqrt(v_i[i])) + alpha
      den <- sqrt(1 + beta * beta * (1 + cOmega / v_i[i]))
      stats::pnorm(num / den)
    }, numeric(1))
    b_i <- pmax(b_i, eps)
    n / sum(1 / b_i)
  }

  solve_alpha <- function(beta, p_target) {
    f <- function(alpha) p_from_alpha(alpha, beta) - p_target
    lo <- -12
    hi <- 12
    f_lo <- f(lo)
    f_hi <- f(hi)
    if (!is.finite(f_lo) || !is.finite(f_hi) || f_lo * f_hi > 0) {
      return(NA_real_)
    }
    stats::uniroot(f, interval = c(lo, hi), tol = 1e-8)$root
  }

  eval_profile <- function(p_target) {
    if (abs(p_target - 1) < 1e-10) {
      sens <- base$sens
      spec <- base$spec
      dor <- base$dor
      return(data.frame(
        p_select = p_target,
        beta = NA_real_,
        alpha = NA_real_,
        expected_unpublished = 0,
        sensitivity = sens,
        specificity = spec,
        dor = dor,
        sauc = stats::pnorm(log(dor) / sqrt(2))
      ))
    }

    best <- list(ll = -Inf, beta = NA_real_, alpha = NA_real_, a_i = NULL)
    for (beta in beta_grid) {
      alpha <- solve_alpha(beta, p_target)
      if (!is.finite(alpha)) next

      a_i <- stats::pnorm(beta * t_i + alpha)
      a_i <- pmax(a_i, eps)

      b_i <- vapply(seq_len(n), function(i) {
        num <- beta * (sum(c_vec * mu) / sqrt(v_i[i])) + alpha
        den <- sqrt(1 + beta * beta * (1 + cOmega / v_i[i]))
        stats::pnorm(num / den)
      }, numeric(1))
      b_i <- pmax(b_i, eps)

      ll <- sum(log(a_i)) - sum(log(b_i))
      if (is.finite(ll) && ll > best$ll) {
        best$ll <- ll
        best$beta <- beta
        best$alpha <- alpha
        best$a_i <- a_i
      }
    }

    if (!is.finite(best$beta)) {
      return(data.frame(
        p_select = p_target,
        beta = NA_real_,
        alpha = NA_real_,
        expected_unpublished = NA_real_,
        sensitivity = NA_real_,
        specificity = NA_real_,
        dor = NA_real_,
        sauc = NA_real_
      ))
    }

    ipw <- 1 / pmax(best$a_i, eps)
    var1 <- vapply(Sigma, function(Si) Si[1, 1], numeric(1))
    var2 <- vapply(Sigma, function(Si) Si[2, 2], numeric(1))
    w1 <- ipw / pmax(var1, eps)
    w2 <- ipw / pmax(var2, eps)
    mu1_adj <- sum(w1 * y[, 1]) / sum(w1)
    mu2_adj <- sum(w2 * y[, 2]) / sum(w2)

    sens <- safe_plogis(mu1_adj)
    spec <- safe_plogis(mu2_adj)
    dor <- (sens * spec) / ((1 - sens) * (1 - spec))
    sauc <- stats::pnorm(log(dor) / sqrt(2))

    data.frame(
      p_select = p_target,
      beta = best$beta,
      alpha = best$alpha,
      expected_unpublished = n * (1 - p_target) / p_target,
      sensitivity = sens,
      specificity = spec,
      dor = dor,
      sauc = sauc
    )
  }

  do.call(rbind, lapply(p_grid, eval_profile))
}

# ---------------------------------------------------------------------------
# Demo data for gap-fill validations
# ---------------------------------------------------------------------------

comparative_test_a <- data.frame(
  TP = c(45, 38, 52, 41, 49, 55),
  FP = c(10, 12, 8, 11, 9, 7),
  FN = c(8, 10, 6, 12, 9, 5),
  TN = c(40, 43, 34, 39, 41, 45)
)
comparative_test_b <- data.frame(
  TP = c(42, 35, 48, 39, 44, 50),
  FP = c(14, 16, 10, 13, 12, 10),
  FN = c(11, 13, 9, 14, 12, 8),
  TN = c(38, 40, 33, 37, 39, 42)
)

network_demo <- data.frame(
  test = c(
    "MRI", "MRI", "MRI",
    "CT", "CT", "CT",
    "PET", "PET", "PET"
  ),
  study = c(
    "Study1", "Study2", "Study3",
    "Study1", "Study2", "Study4",
    "Study2", "Study3", "Study4"
  ),
  TP = c(45, 38, 52, 42, 35, 48, 40, 55, 50),
  FP = c(8, 12, 6, 10, 15, 9, 8, 4, 7),
  FN = c(5, 7, 8, 8, 10, 6, 5, 5, 4),
  TN = c(42, 43, 34, 40, 40, 37, 47, 36, 39)
)

expand_ipd <- function(study, tp, fp, fn, tn) {
  rbind(
    data.frame(study = study, test_result = 1, disease_status = 1)[rep(1, tp), ],
    data.frame(study = study, test_result = 1, disease_status = 0)[rep(1, fp), ],
    data.frame(study = study, test_result = 0, disease_status = 1)[rep(1, fn), ],
    data.frame(study = study, test_result = 0, disease_status = 0)[rep(1, tn), ]
  )
}

ipd_demo <- rbind(
  expand_ipd("Study1", tp = 12, fp = 4, fn = 3, tn = 16),
  expand_ipd("Study2", tp = 10, fp = 5, fn = 4, tn = 15),
  expand_ipd("Study3", tp = 14, fp = 3, fn = 2, tn = 17)
)

data_env <- new.env(parent = emptyenv())
suppressWarnings(data("Dementia", package = "mada", envir = data_env))
if (!exists("Dementia", envir = data_env, inherits = FALSE)) {
  stop("mada::Dementia dataset not available.")
}
dementia <- get("Dementia", envir = data_env, inherits = FALSE)
dementia_df <- data.frame(
  TP = round(dementia$TP),
  FP = round(dementia$FP),
  FN = round(dementia$FN),
  TN = round(dementia$TN)
)

# ---------------------------------------------------------------------------
# Run methods
# ---------------------------------------------------------------------------

comparative_result <- paired_comparative_dta(comparative_test_a, comparative_test_b)
network_result <- network_dta_point_rank(network_demo)
ipd_result <- ipd_two_stage_dta(ipd_demo)
selection_result <- selection_sroc_sensitivity(
  dementia_df,
  p_grid = c(1.0, 0.8, 0.6, 0.4),
  c_vec = c(1 / sqrt(2), 1 / sqrt(2)),
  beta_grid = seq(0, 3, by = 0.1)
)

reference <- list(
  metadata = list(
    generated_at = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"),
    r_version = R.version.string,
    packages = list(
      mada = as.character(packageVersion("mada")),
      jsonlite = as.character(packageVersion("jsonlite"))
    )
  ),
  citations = list(
    copas_original = "Copas JB, Shi JQ. A sensitivity analysis for publication bias in systematic reviews. Stat Methods Med Res. 2001;10(4):251-265. doi:10.1177/096228020101000402",
    sroc_selection = "Hattori S, Zhou XH. A likelihood-based sensitivity analysis for publication bias on the summary ROC in meta-analysis of diagnostic test accuracy. Stat Med. 2024;43(6):1048-1067. doi:10.1002/sim.10053",
    comparative_and_network_note = "Comparative, network, and IPD sections provide reproducible R reference implementations for app modules that are not covered by mada's single-test core interface."
  ),
  gap_fill_methods = list(
    comparative_dta = comparative_result,
    network_point_ranking = network_result,
    ipd_two_stage = ipd_result
  ),
  novel_method = list(
    name = "t_statistic_selection_sroc_sensitivity",
    description = "Profile-based sensitivity analysis over assumed marginal publication probability p using a probit selection function on t-type statistics.",
    contrast_vector = c(1 / sqrt(2), 1 / sqrt(2)),
    result_table = selection_result
  )
)

json_output <- toJSON(reference, pretty = TRUE, auto_unbox = TRUE, digits = 8)
output_json_path <- file.path(script_dir, "advanced_validation_reference.json")
writeLines(json_output, output_json_path)

cat("Advanced gap-fill + novel method reference written to:\n")
cat(output_json_path, "\n")
