"""
train.py — Train the Risk Scorer and persist it to models/.

Usage:
    python -m scripts.train              # uses dataset2, falls back gracefully
    python -m scripts.train --limit 5000 # quick run on a subset

The trained model + feature stats are pickled so the FastAPI /score endpoint
can load them at startup without retraining.
"""
from __future__ import annotations
import argparse
import pickle
from pathlib import Path

from backend.core.data_loader import load_sessions
from backend.core.orchestrator import Orchestrator
from backend.core.config import MODELS_DIR


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefer", default="dataset2")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-enrich", action="store_true",
                    help="disable the synthetic behavioural signal layer")
    args = ap.parse_args()

    print(f"[train] loading sessions (prefer={args.prefer})...")
    sessions = load_sessions(prefer=args.prefer, limit=args.limit,
                             enrich=not args.no_enrich)

    orch = Orchestrator()
    print("[train] training risk scorer...")
    info = orch.train(sessions)
    print(f"[train] done: {info}")

    out = Path(MODELS_DIR) / "risk_model.pkl"
    with open(out, "wb") as fh:
        pickle.dump(orch.risk, fh)
    print(f"[train] saved model -> {out}")


if __name__ == "__main__":
    main()
