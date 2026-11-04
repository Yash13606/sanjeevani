"""Event-level metrics for held-out synthetic outbreak worlds."""

import pandas as pd


DETAIL_COLUMNS = (
    'Task', 'WorldId', 'Scenario', 'OutbreakId', 'UnitId', 'StartDate',
    'EndDate', 'CandidatePredictionCount', 'WarnedOrDetected',
    'FirstAlertDate', 'LeadDays', 'DetectionDelayDays',
    'FirstFormalReportDate', 'HasUnreportedOpportunity',
    'DetectedWhileUnreported', 'FirstUnreportedAlertDate', 'DaysBeforeReport',
)


def event_level_metrics(predictions: pd.DataFrame, events: pd.DataFrame, task: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Score one event per world/scenario, using fixed validation alerts.

    M1 warnings are predictions in [onset-7 days, onset-1 day]. M2 detections
    are predictions within the operational active window; its unreported clock
    stops at the scenario's first formal report, if one exists. Events without
    a complete observation window or scored prediction are excluded and counted.
    """
    if task not in ('m1', 'm2'):
        raise ValueError('task must be m1 or m2')
    needed = {'world_id', 'scenario', 'unit_id', 'date', 'alert_target_recall'}
    if not needed.issubset(predictions.columns):
        raise ValueError(f'prediction columns missing: {sorted(needed - set(predictions.columns))}')
    predictions = predictions.copy()
    predictions['date'] = pd.to_datetime(predictions['date'])
    events = events.copy()
    if not events.empty:
        events['operational_start_date'] = pd.to_datetime(events['operational_start_date'])
        events['end_date'] = pd.to_datetime(events['end_date'])

    details = []
    summaries = []
    for (world_id, scenario), group in predictions.groupby(['world_id', 'scenario'], sort=True):
        first_date = group['date'].min()
        last_date = group['date'].max()
        world_events = events.loc[events['world_id'] == world_id] if not events.empty else events
        report_column = f'first_report_date_{scenario}'
        if task == 'm2' and not world_events.empty and report_column not in world_events:
            raise ValueError(f'missing scenario-specific formal report column: {report_column}')
        unit_predictions = {unit: frame for unit, frame in group.groupby('unit_id')}
        detail_start = len(details)
        excluded_window = 0
        excluded_opportunity = 0
        for _, event in world_events.iterrows():
            start = event['operational_start_date']
            end = event['end_date']
            if task == 'm1':
                window_start = start - pd.Timedelta(days=7)
                # Require the complete 7-day pre-onset warning period within
                # the scheduled prediction span (including the last 7-day horizon).
                if window_start < first_date or start > last_date + pd.Timedelta(days=7):
                    excluded_window += 1
                    continue
                candidate = unit_predictions.get(event['unit_id'], group.iloc[0:0])
                candidate = candidate.loc[(candidate['date'] >= window_start) & (candidate['date'] < start)]
            else:
                # Left-truncated active events do not have an unbiased delay.
                if start < first_date or start > last_date:
                    excluded_window += 1
                    continue
                candidate = unit_predictions.get(event['unit_id'], group.iloc[0:0])
                candidate = candidate.loc[(candidate['date'] >= start) & (candidate['date'] <= end)]
            if candidate.empty:
                excluded_opportunity += 1
                continue
            alerts = candidate.loc[candidate['alert_target_recall'] == 1].sort_values('date')
            detected = not alerts.empty
            first_alert = alerts['date'].iloc[0] if detected else pd.NaT
            days = ((start - first_alert).days if task == 'm1' else (first_alert - start).days) if detected else None
            report_date = pd.NaT
            unreported_candidates = candidate.iloc[0:0]
            unreported_alerts = candidate.iloc[0:0]
            if task == 'm2':
                report_date = pd.to_datetime(event[report_column])
                unreported_candidates = candidate.loc[
                    candidate['date'] < report_date
                ] if pd.notna(report_date) else candidate
                unreported_alerts = unreported_candidates.loc[
                    unreported_candidates['alert_target_recall'] == 1
                ].sort_values('date')
            unreported_detected = not unreported_alerts.empty
            first_unreported_alert = unreported_alerts['date'].iloc[0] if unreported_detected else pd.NaT
            details.append({
                'Task': task.upper(),
                'WorldId': world_id,
                'Scenario': scenario,
                'OutbreakId': event['outbreak_id'],
                'UnitId': event['unit_id'],
                'StartDate': start,
                'EndDate': end,
                'CandidatePredictionCount': len(candidate),
                'WarnedOrDetected': int(detected),
                'FirstAlertDate': first_alert,
                'LeadDays': days if task == 'm1' else None,
                'DetectionDelayDays': days if task == 'm2' else None,
                'FirstFormalReportDate': report_date,
                'HasUnreportedOpportunity': int(not unreported_candidates.empty) if task == 'm2' else None,
                'DetectedWhileUnreported': int(unreported_detected) if task == 'm2' else None,
                'FirstUnreportedAlertDate': first_unreported_alert,
                'DaysBeforeReport': (
                    (report_date - first_unreported_alert).days
                    if task == 'm2' and unreported_detected and pd.notna(report_date) else None
                ),
            })
        eligible = details[detail_start:]
        hit = [row for row in eligible if row['WarnedOrDetected']]
        metric_key = 'LeadDays' if task == 'm1' else 'DetectionDelayDays'
        days_values = pd.Series([row[metric_key] for row in hit], dtype=float)
        unreported_eligible = [row for row in eligible if row['HasUnreportedOpportunity'] == 1]
        unreported_detected = [row for row in unreported_eligible if row['DetectedWhileUnreported'] == 1]
        before_report = pd.Series([row['DaysBeforeReport'] for row in unreported_detected
                                   if row['DaysBeforeReport'] is not None], dtype=float)
        summaries.append({
            'Task': task.upper(),
            'WorldId': world_id,
            'Scenario': scenario,
            'EligibleEventScenarioPairs': len(eligible),
            'WarnedOrDetected': len(hit),
            'EventRecall': len(hit) / len(eligible) if eligible else None,
            'MedianLeadDays': float(days_values.median()) if task == 'm1' and not days_values.empty else None,
            'MeanLeadDays': float(days_values.mean()) if task == 'm1' and not days_values.empty else None,
            'MedianDetectionDelayDays': float(days_values.median()) if task == 'm2' and not days_values.empty else None,
            'MeanDetectionDelayDays': float(days_values.mean()) if task == 'm2' and not days_values.empty else None,
            'EligibleUnreportedEventScenarioPairs': len(unreported_eligible) if task == 'm2' else None,
            'DetectedWhileUnreported': len(unreported_detected) if task == 'm2' else None,
            'UnreportedDetectionRecall': (
                len(unreported_detected) / len(unreported_eligible)
                if task == 'm2' and unreported_eligible else None
            ),
            'MedianDaysBeforeReport': float(before_report.median()) if not before_report.empty else None,
            'MeanDaysBeforeReport': float(before_report.mean()) if not before_report.empty else None,
            'ExcludedCensoredEvents': excluded_window,
            'ExcludedNoScoredOpportunity': excluded_opportunity,
            'ExcludedNoUnreportedOpportunity': (
                len(eligible) - len(unreported_eligible) if task == 'm2' else None
            ),
            'WarningWindowDays': 7 if task == 'm1' else None,
        })
    return pd.DataFrame(summaries), pd.DataFrame(details, columns=DETAIL_COLUMNS)


def aggregate_event_metrics(world_summaries: pd.DataFrame, details: pd.DataFrame) -> pd.DataFrame:
    """Aggregate by scenario; each denominator counts event-scenario pairs."""
    records = []
    for (task, scenario), rows in world_summaries.groupby(['Task', 'Scenario'], sort=True):
        event_rows = details.loc[(details['Task'] == task) & (details['Scenario'] == scenario)]
        detected = event_rows.loc[event_rows['WarnedOrDetected'] == 1]
        eligible = len(event_rows)
        lead = detected['LeadDays'].dropna() if task == 'M1' else pd.Series(dtype=float)
        delay = detected['DetectionDelayDays'].dropna() if task == 'M2' else pd.Series(dtype=float)
        unreported_eligible = event_rows.loc[event_rows['HasUnreportedOpportunity'] == 1] if task == 'M2' else event_rows.iloc[0:0]
        unreported_detected = unreported_eligible.loc[unreported_eligible['DetectedWhileUnreported'] == 1]
        before_report = unreported_detected['DaysBeforeReport'].dropna()
        records.append({
            'Task': task,
            'Scenario': scenario,
            'EligibleEventScenarioPairs': eligible,
            'WarnedOrDetected': len(detected),
            'EventRecall': len(detected) / eligible if eligible else None,
            'MedianLeadDays': float(lead.median()) if not lead.empty else None,
            'MeanLeadDays': float(lead.mean()) if not lead.empty else None,
            'MedianDetectionDelayDays': float(delay.median()) if not delay.empty else None,
            'MeanDetectionDelayDays': float(delay.mean()) if not delay.empty else None,
            'EligibleUnreportedEventScenarioPairs': len(unreported_eligible) if task == 'M2' else None,
            'DetectedWhileUnreported': len(unreported_detected) if task == 'M2' else None,
            'UnreportedDetectionRecall': (
                len(unreported_detected) / len(unreported_eligible)
                if task == 'M2' and len(unreported_eligible) else None
            ),
            'MedianDaysBeforeReport': float(before_report.median()) if not before_report.empty else None,
            'MeanDaysBeforeReport': float(before_report.mean()) if not before_report.empty else None,
            'ExcludedCensoredEvents': int(rows['ExcludedCensoredEvents'].sum()),
            'ExcludedNoScoredOpportunity': int(rows['ExcludedNoScoredOpportunity'].sum()),
            'ExcludedNoUnreportedOpportunity': (
                int(rows['ExcludedNoUnreportedOpportunity'].sum()) if task == 'M2' else None
            ),
            'WarningWindowDays': 7 if task == 'M1' else None,
        })
    return pd.DataFrame(records)
