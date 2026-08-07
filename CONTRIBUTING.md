# Contributing to Cart Rescue

Thanks for your interest! This project was built for AI BUILD 2026 (Track 2).

## Getting started
1. Fork & clone the repo.
2. Backend: `pip install -r requirements.txt`
3. Dashboard: `cd dashboard && npm install`
4. Run the demo: `python -m scripts.run_demo`

## Project conventions
- **Agents are independent** — each agent (`backend/agents/*.py`) has a single
  responsibility and a clear input/output. Keep them small and explainable.
- **All tunable numbers live in `backend/core/config.py`** — never hard-code a
  business constant (budget, margin, cost) elsewhere.
- **No outcome leakage** — never feed post-decision fields (purchase, completed
  checkout, payment success) into the Risk Scorer's features.
- **Everything must run without heavy deps** — if you add scikit-learn/XGBoost
  usage, keep the pure-numpy fallback working.

## Adding a new action
1. Add it to `ACTIONS` in `action_selector.py`.
2. Add its cost to `CHANNEL_COST` in `config.py`.
3. Map a reason → the action in `ActionSelector.select()`.
4. Handle any consent/budget rule in `self_check.py`.
5. Add efficacy in `evaluation.py` `ACTION_EFFICACY` so the A/B sim can score it.

## Pull requests
- Keep PRs focused and well-commented (a student should be able to explain it).
- Include a one-line summary of what you changed and why.
