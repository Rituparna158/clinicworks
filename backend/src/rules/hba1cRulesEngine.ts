import type {
  ClinicalRuleEvaluationResult,
  ConfidenceBreakdown,
  HbA1cClassification,
  HbA1cReading,
  PatientInfo,
} from '../types/clinical.types.js';

export interface HbA1cEvaluationInput {
  readonly readings: readonly HbA1cReading[];
  readonly patient: PatientInfo;
  readonly modelConfidenceEstimate?: number;
}

export function evaluateHbA1cRules(input: HbA1cEvaluationInput): ClinicalRuleEvaluationResult {
  const { readings, patient, modelConfidenceEstimate = 88 } = input;
  const reasoning: string[] = [];

  const candidateReadings = readings.filter((r) => {
    if (r.isGoalOrTarget) {
      reasoning.push(`Filtered out non-measured reading: ${r.value}% (Goal/Target/Reference Range).`);
      return false;
    }
    if (!isValidHbA1cValue(r.value)) {
      reasoning.push(`Filtered out physiologically invalid HbA1c value: ${r.value}% (must be 3.0% - 20.0%).`);
      return false;
    }
    return true;
  });

  if (candidateReadings.length === 0) {
    reasoning.push('No valid, current measured HbA1c values found in document.');
    return {
      status: 'Needs Review',
      documentType: 'A1C',
      measureExtracted: null,
      measureDate: null,
      patientAge: patient.age,
      errorMessage: 'No valid measured HbA1c readings were identified after excluding reference ranges and targets.',
      confidence: calculateHbA1cConfidence({
        selectedReading: null,
        hasValidFormat: false,
        hasValidDate: false,
        modelCertainty: modelConfidenceEstimate,
        reasoning,
        rulePenalty: 40,
      }),
    };
  }

  let selectedReading: HbA1cReading = candidateReadings[0]!;

  if (candidateReadings.length === 1) {
    reasoning.push(`Single valid HbA1c reading identified: ${selectedReading.value}%.`);
  } else {
    for (let i = 1; i < candidateReadings.length; i++) {
      const current = candidateReadings[i];
      if (current && current.value < selectedReading.value) {
        selectedReading = current;
      }
    }
    reasoning.push(
      `Multiple valid HbA1c readings identified ([${candidateReadings.map((r) => r.value).join(', ')}]). Selected lowest value: ${selectedReading.value}%.`
    );
  }

  
  const classification = getHbA1cClassification(selectedReading.value);
  let measureFormatted: string;

  if (classification === 'Diabetes') {
    measureFormatted = `${selectedReading.value}% (Diabetes)`;
    reasoning.push(`HbA1c ${selectedReading.value}% is above 5.9% -> Classified as Diabetes.`);
  } else if (classification === 'Prediabetes') {
    measureFormatted = `${selectedReading.value}% (Prediabetes)`;
    reasoning.push(`HbA1c ${selectedReading.value}% is above 5.7% (<= 5.9%) -> Classified as Prediabetes.`);
  } else {
    measureFormatted = `${selectedReading.value}%`;
    reasoning.push(`HbA1c ${selectedReading.value}% is within normal range (<= 5.7%).`);
  }

  const hasValidDate = Boolean(selectedReading.date && !isNaN(Date.parse(selectedReading.date)));

  return {
    status: 'Success',
    documentType: 'A1C',
    measureExtracted: measureFormatted,
    measureDate: selectedReading.date,
    patientAge: patient.age,
    errorMessage: null,
    confidence: calculateHbA1cConfidence({
      selectedReading,
      hasValidFormat: true,
      hasValidDate,
      modelCertainty: modelConfidenceEstimate,
      reasoning,
      rulePenalty: 0,
    }),
  };
}

export function getHbA1cClassification(value: number): HbA1cClassification {
  if (value > 5.9) {
    return 'Diabetes';
  }
  if (value > 5.7) {
    return 'Prediabetes';
  }
  return 'Normal';
}

export function isValidHbA1cValue(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 3.0 && value <= 20.0;
}

interface ConfidenceParams {
  readonly selectedReading: HbA1cReading | null;
  readonly hasValidFormat: boolean;
  readonly hasValidDate: boolean;
  readonly modelCertainty: number;
  readonly reasoning: readonly string[];
  readonly rulePenalty: number;
}

function calculateHbA1cConfidence(params: ConfidenceParams): ConfidenceBreakdown {
  const { selectedReading, hasValidFormat, hasValidDate, modelCertainty, reasoning, rulePenalty } = params;

  const modelScore = Math.min(100, Math.max(0, modelCertainty));
  const formatScore = hasValidFormat && selectedReading ? 100 : 25;
  const dateScore = hasValidDate ? 100 : 45;
  const rulesScore = Math.max(0, 100 - rulePenalty);

  const composite = Math.round(
    modelScore * 0.25 + formatScore * 0.3 + dateScore * 0.2 + rulesScore * 0.25
  );

  return {
    modelCertainty: modelScore,
    formatValidation: formatScore,
    dateCertainty: dateScore,
    rulesValidation: rulesScore,
    compositeScore: composite,
    reasoning,
  };
}
