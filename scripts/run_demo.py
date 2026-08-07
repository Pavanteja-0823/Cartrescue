"""
run_demo.py — One command to run the WHOLE pipeline and print the money story.

    python -m scripts.run_demo               # full dataset2 run
    python -m scripts.run_demo --limit 20000 # faster subset

What it does:
  1. Loads sessions (dataset2 + synthetic signal layer, or synthetic fallback).
  2. Trains the risk scorer.
  3. Runs the A/B holdout experiment across all 4 agents.
  4. Prints recovery %, TRUE uplift, incremental margin ₹, discount savings vs a
     naive coupon-to-everyone baseline, and cost-per-decision.
  5. Writes:
       - logs/audit_log.jsonl   (every decision + signals — auditability)
       - logs/metrics.json      (the headline numbers for the pitch/README)
       - logs/decisions.csv     (for the dashboard to stream)
"""
from __future__ import annotations
import argparse
import csv
import json
from dataclasses import asdict
from pathlib import Path

from backend.core.data_loader import load_sessions
from backend.core.orchestrator import Orchestrator
from backend.core.evaluation import run_ab_evaluation
from backend.agents.uplift_model import UpliftModel
from backend.core.config import LOGS_DIR, AUDIT_LOG_PATH


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefer", default="dataset2")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-enrich", action="store_true")
    args = ap.parse_args()

    # fresh audit log each run
    if Path(AUDIT_LOG_PATH).exists():
        Path(AUDIT_LOG_PATH).unlink()

    print("=" * 64)
    print("CART RESCUE — full pipeline demo")
    print("=" * 64)

    sessions = load_sessions(prefer=args.prefer, limit=args.limit,
                             enrich=not args.no_enrich)

    orch = Orchestrator()
    info = orch.train(sessions)
    print(f"[demo] risk model: {info}")
    auc = info.get("auc")
    if auc is not None:
        print(f"[demo] risk model holdout AUC: {auc}")

    # DIFFERENTIATOR — train the uplift model so budget is spent only on
    # Persuadables. We simulate the treatment flags that a real prior experiment
    # would provide (70% treated), matching the A/B setup below.
    import random
    random.seed(42)
    treated_flags = [random.random() < 0.7 for _ in sessions]
    uplift = UpliftModel()
    uinfo = uplift.train(sessions, treated_flags)
    orch.attach_uplift(uplift)
    print(f"[demo] uplift model: {uinfo}")

    metrics, decisions = run_ab_evaluation(sessions, orch)
    orch.close()

    # write metrics.json
    with open(Path(LOGS_DIR) / "metrics.json", "w", encoding="utf-8") as fh:
        json.dump({**asdict(metrics), "risk_model_auc": auc}, fh, indent=2)

    # write decisions.csv (dashboard feed)
    with open(Path(LOGS_DIR) / "decisions.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["session_id", "risk", "reason", "action", "discount",
                    "channel_cost", "engine", "latency_ms", "is_control",
                    "purchased", "explanation"])
        for d in decisions:
            w.writerow([d.session_id, d.risk, d.reason, d.action, d.discount_amount,
                        d.channel_cost, d.engine, d.latency_ms, d.is_control,
                        d.purchased, d.explanation])

    m = metrics
    print("\n" + "=" * 64)
    print("RESULTS")
    print("=" * 64)
    print(f"Risk model AUC (holdout):   {auc if auc is not None else 'n/a'}")
    print(f"Sessions scored:            {m.n_sessions:,}")
    print(f"Treatment recovery:         {m.treatment_recovery_pct}%")
    print(f"Control recovery:           {m.control_recovery_pct}%")
    print(f"TRUE UPLIFT:                {m.uplift_pp:+} pp")
    print(f"Incremental carts:          {m.incremental_carts:,}")
    print(f"Incremental margin:         ₹{m.incremental_margin:,}")
    print(f"Discount spend:             ₹{m.discount_spend:,}")
    print(f"Net incremental margin:     ₹{m.net_incremental_margin:,}")
    print(f"Discount / recovered cart:  ₹{m.discount_per_recovered_cart}")
    print(f"Naive coupon-to-all spend:  ₹{m.naive_spend:,}")
    print(f"Margin saved vs naive:      ₹{m.margin_saved_vs_naive:,} "
          f"({m.pct_less_discount}% less discount)")
    print(f"Classical / LLM decisions:  {m.pct_classical}% / {m.pct_llm}%")
    print(f"Avg cost/decision:          ₹{m.avg_cost_per_decision} "
          f"({m.cost_savings_x}x cheaper than LLM-for-all)")
    print(f"Avg latency/decision:       {m.avg_latency_ms} ms")
    print("=" * 64)
    print(f"[demo] audit log  -> {AUDIT_LOG_PATH}")
    print(f"[demo] metrics    -> {LOGS_DIR / 'metrics.json'}")
    print(f"[demo] decisions  -> {LOGS_DIR / 'decisions.csv'}")


if __name__ == "__main__":
    main()
