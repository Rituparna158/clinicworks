import type {
  BloodPressureReading,
  ClinicalRuleEvaluationResult,
  ConfidenceBreakdown,
  PatientInfo,
} from '../types/clinical.types.js';

export interface BpEvaluationInput {
  readonly readings: readonly BloodPressureReading[];
  readonly patient: PatientInfo;
  readonly modelConfidenceEstimate?: number;
}

export function evaluateBpRules(input: BpEvaluationInput): ClinicalRuleEvaluationResult {
  const { readings, patient, modelConfidenceEstimate = 85 } = input;
  const reasoning: string[] = [];

  if (patient.age !== null && patient.age !== undefined && patient.age < 18) {
    reasoning.push(`Patient age is ${patient.age} (< 18). BP measurements for minors are excluded per protocol.`);
    return {
      status: 'Needs Review',
      documentType: 'BP',
      measureExtracted: null,
      measureDate: null,
      patientAge: patient.age,
      errorMessage: `Patient is under 18 years of age (${patient.age} yrs). BP measure excluded per clinical guidelines.`,
      confidence: calculateBpConfidence({
        selectedReading: null,
        hasValidFormat: false,
        hasValidDate: false,
        modelCertainty: modelConfidenceEstimate,
        reasoning,
        rulePenalty: 50,
      }),
    };
  }

  const candidateReadings = readings.filter((r) => {
    if (r.isGoalOrTarget) {
      reasoning.push(`Filtered out non-measured reading: ${r.systolic}/${r.diastolic} (Goal/Target/Historical).`);
      return false;
    }
    if (!isValidBpFormat(r.systolic, r.diastolic)) {
      reasoning.push(`Filtered out invalid BP reading: ${r.systolic}/${r.diastolic} (out of range or missing values).`);
      return false;
    }
    return true;
  });

  if (candidateReadings.length === 0) {
    reasoning.push('No valid, current measured blood pressure readings found in document.');
    return {
      status: 'Needs Review',
      documentType: 'BP',
      measureExtracted: null,
      measureDate: null,
      patientAge: patient.age,
      errorMessage: 'No valid measured Blood Pressure readings containing both systolic and diastolic values were found.',
      confidence: calculateBpConfidence({
        selectedReading: null,
        hasValidFormat: false,
        hasValidDate: false,
        modelCertainty: modelConfidenceEstimate,
        reasoning,
        rulePenalty: 40,
      }),
    };
  }

  let selectedReading: BloodPressureReading;

  if (candidateReadings.length === 1) {
    const single = candidateReadings[0];
    if (!single) {
      throw new Error('Unexpected empty candidate readings');
    }
    selectedReading = single;
    reasoning.push(`Single valid reading selected: ${single.systolic}/${single.diastolic} mmHg.`);
  } else {
    const datedReadings = candidateReadings.filter((r) => r.date && !isNaN(Date.parse(r.date)));

    if (datedReadings.length > 0 && datedReadings.length === candidateReadings.length) {
      const sortedByDate = [...datedReadings].sort((a, b) => {
        const timeA = a.date ? Date.parse(a.date) : 0;
        const timeB = b.date ? Date.parse(b.date) : 0;
        return timeB - timeA;
      });

      const mostRecent = sortedByDate[0];
      const secondRecent = sortedByDate[1];

      if (mostRecent && (!secondRecent || mostRecent.date !== secondRecent.date)) {
        selectedReading = mostRecent;
        reasoning.push(
          `Multiple dated readings found. Selected most recent reading from ${mostRecent.date}: ${mostRecent.systolic}/${mostRecent.diastolic} mmHg.`
        );
      } else {
        selectedReading = selectLowestSumBp(candidateReadings, reasoning, 'tied dates');
      }
    } else {
      selectedReading = selectLowestSumBp(candidateReadings, reasoning, 'undated readings');
    }
  }

  const measureFormatted = `${selectedReading.systolic}/${selectedReading.diastolic}`;
  const hasValidDate = Boolean(selectedReading.date && !isNaN(Date.parse(selectedReading.date)));

  return {
    status: 'Success',
    documentType: 'BP',
    measureExtracted: measureFormatted,
    measureDate: selectedReading.date,
    patientAge: patient.age,
    errorMessage: null,
    confidence: calculateBpConfidence({
      selectedReading,
      hasValidFormat: true,
      hasValidDate,
      modelCertainty: modelConfidenceEstimate,
      reasoning,
      rulePenalty: 0,
    }),
  };
}


function selectLowestSumBp(
  readings: readonly BloodPressureReading[],
  reasoning: string[],
  context: string
): BloodPressureReading {
  let lowest = readings[0];
  if (!lowest) {
    throw new Error('Readings array cannot be empty');
  }

  for (let i = 1; i < readings.length; i++) {
    const current = readings[i];
    if (current) {
      const lowestSum = lowest.systolic + lowest.diastolic;
      const currentSum = current.systolic + current.diastolic;
      if (currentSum < lowestSum) {
        lowest = current;
      }
    }
  }

  reasoning.push(
    `Selected lowest BP based on systolic + diastolic sum (${lowest.systolic + lowest.diastolic}) due to ${context}: ${lowest.systolic}/${lowest.diastolic} mmHg.`
  );
  return lowest;
}

export function isValidBpFormat(systolic: number, diastolic: number): boolean {
  return (
    Number.isInteger(systolic) &&
    Number.isInteger(diastolic) &&
    systolic >= 60 &&
    systolic <= 260 &&
    diastolic >= 40 &&
    diastolic <= 160 &&
    systolic > diastolic
  );
}

interface ConfidenceParams {
  readonly selectedReading: BloodPressureReading | null;
  readonly hasValidFormat: boolean;
  readonly hasValidDate: boolean;
  readonly modelCertainty: number;
  readonly reasoning: readonly string[];
  readonly rulePenalty: number;
}

function calculateBpConfidence(params: ConfidenceParams): ConfidenceBreakdown {
  const { selectedReading, hasValidFormat, hasValidDate, modelCertainty, reasoning, rulePenalty } = params;

  const modelScore = Math.min(100, Math.max(0, modelCertainty));
  const formatScore = hasValidFormat && selectedReading ? 100 : 20;
  const dateScore = hasValidDate ? 100 : 40;
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
