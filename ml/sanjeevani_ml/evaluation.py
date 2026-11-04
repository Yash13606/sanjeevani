"""Small validation guards shared by the simulation benchmark and its tests."""

import numpy as np
from sklearn.metrics import average_precision_score, precision_recall_curve


def split_seed_groups(config: dict) -> dict[str, tuple[int, ...]]:
    """Read nonempty, disjoint world-seed groups from the experiment config."""
    splits = config['splits']
    groups = {}
    seen = set()
    for name in ('train', 'val', 'test'):
        seeds = splits[f'{name}_seeds']
        if not isinstance(seeds, list) or not seeds or any(type(seed) is not int or seed < 0 for seed in seeds):
            raise ValueError(f'{name}_seeds must be a nonempty list of nonnegative integers')
        if len(seeds) != len(set(seeds)) or seen.intersection(seeds):
            raise ValueError('world seeds must be unique across all splits')
        groups[name] = tuple(seeds)
        seen.update(seeds)
    return groups


def select_validation_thresholds(labels, scores, target_recall: float) -> dict[str, float]:
    """Choose F1 and recall operating points using validation data only."""
    y = np.asarray(labels)
    s = np.asarray(scores, dtype=float)
    if y.ndim != 1 or s.ndim != 1 or len(y) != len(s) or len(y) == 0:
        raise ValueError('validation labels and scores must be aligned one-dimensional arrays')
    if not np.isin(y, (0, 1)).all() or len(np.unique(y)) != 2:
        raise ValueError('validation labels must contain both binary classes')
    if not np.isfinite(s).all():
        raise ValueError('validation scores must be finite')
    if not 0 < target_recall <= 1:
        raise ValueError('target_recall must be in (0, 1]')

    precision, recall, thresholds = precision_recall_curve(y, s)
    # precision_recall_curve appends an endpoint with no corresponding
    # threshold; it cannot define a deployable operating point.
    p, r = precision[:-1], recall[:-1]
    f1 = 2 * p * r / np.maximum(p + r, 1e-12)
    f1_index = max(range(len(thresholds)), key=lambda i: (f1[i], thresholds[i]))
    eligible = [i for i in range(len(thresholds)) if r[i] >= target_recall]
    if not eligible:
        raise ValueError('no validation threshold reaches target recall')
    recall_index = max(eligible, key=lambda i: (p[i], thresholds[i]))
    return {
        'f1_threshold': float(thresholds[f1_index]),
        'target_recall_threshold': float(thresholds[recall_index]),
        'validation_f1': float(f1[f1_index]),
        'validation_precision_at_target_recall': float(p[recall_index]),
        'validation_recall_at_target_recall': float(r[recall_index]),
    }


def select_model_on_validation(labels, candidate_scores: dict[str, np.ndarray]) -> tuple[str, dict[str, float]]:
    """Choose a trained model by validation average precision only."""
    y = np.asarray(labels)
    if not candidate_scores:
        raise ValueError('at least one trained model is required')
    if y.ndim != 1 or len(y) == 0 or not np.isin(y, (0, 1)).all() or len(np.unique(y)) != 2:
        raise ValueError('validation labels must contain both binary classes')
    scores = {}
    for name, values in candidate_scores.items():
        pred = np.asarray(values, dtype=float)
        if pred.ndim != 1 or len(pred) != len(y) or not np.isfinite(pred).all():
            raise ValueError(f'{name}: validation predictions must be finite and aligned')
        scores[name] = float(average_precision_score(y, pred))
    winner = max(sorted(scores), key=lambda name: scores[name])
    return winner, scores
