"""NumPy-only logistic regression for the coursework algorithm comparison.

The estimator learns imputation and scaling from its training matrix, then
optimizes weighted logistic loss with mini-batch gradient descent. It imports
no sklearn estimator or preprocessing routine.
"""

import numpy as np


class ScratchLogisticRegression:
    def __init__(self, learning_rate=0.04, epochs=25, batch_size=8192,
                 l2=0.001, seed=42):
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.batch_size = batch_size
        self.l2 = l2
        self.seed = seed

    @staticmethod
    def _matrix(values):
        matrix = np.asarray(values, dtype=np.float64)
        if matrix.ndim != 2 or not len(matrix):
            raise ValueError('X must be a nonempty two-dimensional numeric matrix')
        return matrix

    @staticmethod
    def _sigmoid(logits):
        return 1.0 / (1.0 + np.exp(-np.clip(logits, -40.0, 40.0)))

    def _transform(self, values):
        matrix = self._matrix(values)
        if matrix.shape[1] != self.n_features_in_:
            raise ValueError('feature count differs from training data')
        filled = np.where(np.isfinite(matrix), matrix, self.imputer_medians_)
        return (filled - self.scale_mean_) / self.scale_std_

    def fit(self, X, y):
        matrix = self._matrix(X)
        labels = np.asarray(y, dtype=np.int8)
        if labels.ndim != 1 or len(labels) != len(matrix) or not np.isin(labels, (0, 1)).all():
            raise ValueError('y must contain aligned binary labels')
        positive_count = int(labels.sum())
        negative_count = len(labels) - positive_count
        if not positive_count or not negative_count:
            raise ValueError('both binary classes are required for training')
        if self.learning_rate <= 0 or self.epochs <= 0 or self.batch_size <= 0 or self.l2 < 0:
            raise ValueError('invalid gradient descent settings')

        self.n_features_in_ = matrix.shape[1]
        self.classes_ = np.array([0, 1])
        self.imputer_medians_ = np.empty(self.n_features_in_, dtype=np.float64)
        for column in range(self.n_features_in_):
            observed = matrix[np.isfinite(matrix[:, column]), column]
            self.imputer_medians_[column] = float(np.median(observed)) if len(observed) else 0.0
        filled = np.where(np.isfinite(matrix), matrix, self.imputer_medians_)
        self.scale_mean_ = filled.mean(axis=0)
        self.scale_std_ = filled.std(axis=0)
        self.scale_std_[self.scale_std_ == 0] = 1.0
        scaled = (filled - self.scale_mean_) / self.scale_std_

        self.coef_ = np.zeros(self.n_features_in_, dtype=np.float64)
        self.intercept_ = 0.0
        sample_weights = np.where(
            labels == 1,
            len(labels) / (2.0 * positive_count),
            len(labels) / (2.0 * negative_count),
        )
        rng = np.random.default_rng(self.seed)
        self.loss_history_ = []
        for _ in range(self.epochs):
            for indices in np.array_split(rng.permutation(len(labels)),
                                          max(1, int(np.ceil(len(labels) / self.batch_size)))):
                batch = scaled[indices]
                logits = batch @ self.coef_ + self.intercept_
                errors = (self._sigmoid(logits) - labels[indices]) * sample_weights[indices]
                gradient = batch.T @ errors / len(indices) + self.l2 * self.coef_
                intercept_gradient = float(errors.mean())
                self.coef_ -= self.learning_rate * gradient
                self.intercept_ -= self.learning_rate * intercept_gradient
            # Log loss on a bounded deterministic sample for an inspectable
            # convergence trace without another pass over a large world table.
            sample = scaled[:min(20_000, len(scaled))]
            sample_y = labels[:len(sample)]
            sample_weight = sample_weights[:len(sample)]
            logits = sample @ self.coef_ + self.intercept_
            log_loss = np.average(np.logaddexp(0.0, logits) - sample_y * logits,
                                  weights=sample_weight)
            self.loss_history_.append(float(log_loss + 0.5 * self.l2 * np.dot(self.coef_, self.coef_)))
        return self

    def predict_proba(self, X):
        if not hasattr(self, 'coef_'):
            raise ValueError('estimator must be fitted before prediction')
        scaled = self._transform(X)
        positive = self._sigmoid(scaled @ self.coef_ + self.intercept_)
        return np.column_stack((1.0 - positive, positive))

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)
