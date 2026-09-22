import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import type { BloodPressureReading, HbA1cReading } from '../types/clinical.types.js';
import type { DocumentProcessingInput, RawExtractionOutput } from '../types/extraction.types.js';
import { isOcrConfigured, performOcrOnPdf } from './ocrService.js';

dotenv.config();

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'] ?? '';
const GEMINI_MODEL = process.env['GEMINI_MODEL'] ?? 'gemini-3.5-flash-lite';
const BACKUP_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];

const SYSTEM_EXTRACTION_PROMPT = `
You are an expert clinical document extraction AI specialized in medical records and laboratory reports.
Your task is to analyze the uploaded document (which may be digital text PDF, scanned image PDF, or medical photograph) and extract clinical quality measures.

Follow these strict rules:
1. Identify Document Type:
   - "BP" if the document contains Blood Pressure measurements.
   - "A1C" if the document contains Hemoglobin A1c measurements.
   - "UNKNOWN" if neither measure is present.
2. Extract Patient Information:
   - Name and Age (in years) if clearly indicated.
3. Extract Blood Pressure (BP) Readings:
   - systolic: number (mmHg)
   - diastolic: number (mmHg)
   - unit: string (e.g. "mmHg")
   - date: ISO date string ("YYYY-MM-DD") if associated with this reading, else null.
   - isGoalOrTarget: boolean. Set to TRUE if the value is identified as a goal, target, past BP, previous BP, guideline, or educational reference. Set to FALSE if it is an actual measured reading for the patient.
   - rawSnippet: the exact text snippet from the document.
4. Extract Hemoglobin A1c Readings:
   - value: number (percentage e.g. 7.4)
   - unit: string ("%")
   - date: ISO date string ("YYYY-MM-DD") if clearly dated, else null.
   - isGoalOrTarget: boolean. Set to TRUE if identified as a goal, target, historical reference, or laboratory reference range (e.g. "Normal: < 5.7%"). Set to FALSE if it is the patient's actual result.
   - rawSnippet: the exact text snippet.
5. NEVER invent or hallucinate clinical values. If a measurement cannot be reliably determined, return empty arrays.
6. Provide an estimated confidence percentage (0 to 100) and brief summary notes.

Respond strictly with valid JSON conforming to this schema:
{
  "detectedType": "BP" | "A1C" | "UNKNOWN",
  "patient": { "name": string | null, "age": number | null },
  "bpReadings": [
    { "systolic": number, "diastolic": number, "unit": "mmHg", "date": string | null, "isGoalOrTarget": boolean, "rawSnippet": string }
  ],
  "hba1cReadings": [
    { "value": number, "unit": "%", "date": string | null, "isGoalOrTarget": boolean, "rawSnippet": string }
  ],
  "summaryNotes": string,
  "modelConfidenceEstimate": number
}
`;

function resolveMimeType(fileName: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/pdf';
}

export async function extractClinicalData(input: DocumentProcessingInput): Promise<RawExtractionOutput> {
  const { fileName, fileBuffer, mimeType } = input;
  const resolvedMime = resolveMimeType(fileName, mimeType);

  let extractedText = '';
  let ocrMethod = 'multimodal-vision';

  if (resolvedMime === 'application/pdf') {
    try {
      const parsed = await pdfParse(fileBuffer);
      extractedText = (parsed.text || '').trim();
      ocrMethod = 'pdf-parse';
    } catch {
      // ignore local parse failure
    }

    if ((!extractedText || extractedText.length < 20) && isOcrConfigured()) {
      try {
        console.log(`[OCR] Scanned or image-based PDF detected for "${fileName}". Triggering Azure Document Intelligence OCR...`);
        extractedText = await performOcrOnPdf(fileBuffer);
        ocrMethod = 'azure-document-intelligence';
        console.log(`[OCR] Azure Document Intelligence OCR extracted ${extractedText.length} characters.`);
      } catch (ocrErr) {
        console.warn(`[OCR] Azure Document Intelligence OCR notice for "${fileName}":`, ocrErr);
      }
    }
  }

  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('your_gemini_api_key')) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelsToTry = Array.from(new Set([GEMINI_MODEL, ...BACKUP_MODELS]));

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const base64Data = fileBuffer.toString('base64');
        const inlinePart = {
          inlineData: {
            data: base64Data,
            mimeType: resolvedMime,
          },
        };

        const prompt = extractedText
          ? `Please extract clinical quality measures from this clinical document (${fileName}).
Document text extracted via ${ocrMethod}:
"""
${extractedText.slice(0, 15000)}
"""`
          : `Please extract clinical quality measures from this clinical document (${fileName}).`;

        // Optimization: Fast-path text-only inference if digital text / OCR is already present.
        // Pure text token generation takes ~1-2s, bypassing 15s+ multimodal PDF rendering overhead.
        const hasCleanText = Boolean(extractedText && extractedText.length >= 20);

        if (hasCleanText) {
          try {
            const textResult = await model.generateContent([SYSTEM_EXTRACTION_PROMPT, prompt]);
            const textResponse = textResult.response.text();
            const parsedText = parseGeminiResponse(textResponse);
            if (
              parsedText &&
              parsedText.detectedType !== 'UNKNOWN' &&
              (parsedText.bpReadings.length > 0 || parsedText.hba1cReadings.length > 0)
            ) {
              console.log(`[GeminiService] Fast-path text extraction succeeded using ${modelName} (${ocrMethod}) for ${fileName}.`);
              return parsedText;
            }
          } catch (textErr: unknown) {
            const textErrMsg = textErr instanceof Error ? textErr.message : String(textErr);
            console.warn(`[GeminiService] Fast-path text extraction attempt failed (${textErrMsg.split('\n')[0]}). Falling back to multimodal vision...`);
          }
        }

        // Multimodal vision fallback (for scanned documents, image files, or ambiguous layouts)
        const result = await model.generateContent([SYSTEM_EXTRACTION_PROMPT, inlinePart, prompt]);
        const responseText = result.response.text();

        const parsed = parseGeminiResponse(responseText);
        if (parsed) {
          console.log(`[GeminiService] Multimodal extraction succeeded using ${modelName} (${ocrMethod}) for ${fileName}.`);
          return parsed;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[GeminiService] Model ${modelName} call failed (${msg.split('\n')[0]}). Trying next candidate...`);
      }
    }
  }

  console.warn(`[GeminiService] Live Gemini AI calls exhausted or unconfigured for ${fileName}; using direct text extractor.`);
  return fallbackClinicalExtractor(fileBuffer, fileName);
}


function parseGeminiResponse(jsonText: string): RawExtractionOutput | null {
  try {
    const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const data = JSON.parse(cleaned) as Record<string, unknown>;

    const detectedType = (data['detectedType'] === 'BP' || data['detectedType'] === 'A1C')
      ? data['detectedType']
      : 'UNKNOWN';

    const patientObj = (typeof data['patient'] === 'object' && data['patient'] !== null)
      ? (data['patient'] as Record<string, unknown>)
      : {};

    const rawBpList = Array.isArray(data['bpReadings']) ? data['bpReadings'] : [];
    const bpReadings: BloodPressureReading[] = [];
    for (const item of rawBpList) {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        const systolic = Number(obj['systolic']);
        const diastolic = Number(obj['diastolic']);
        if (!isNaN(systolic) && !isNaN(diastolic) && systolic > 0 && diastolic > 0) {
          bpReadings.push({
            systolic,
            diastolic,
            unit: String(obj['unit'] ?? 'mmHg'),
            date: typeof obj['date'] === 'string' ? obj['date'] : null,
            isGoalOrTarget: Boolean(obj['isGoalOrTarget']),
            rawSnippet: typeof obj['rawSnippet'] === 'string' ? obj['rawSnippet'] : undefined,
          });
        }
      }
    }

    const rawA1cList = Array.isArray(data['hba1cReadings']) ? data['hba1cReadings'] : [];
    const hba1cReadings: HbA1cReading[] = [];
    for (const item of rawA1cList) {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        const value = Number(obj['value']);
        if (!isNaN(value) && value > 0) {
          hba1cReadings.push({
            value,
            unit: String(obj['unit'] ?? '%'),
            date: typeof obj['date'] === 'string' ? obj['date'] : null,
            isGoalOrTarget: Boolean(obj['isGoalOrTarget']),
            rawSnippet: typeof obj['rawSnippet'] === 'string' ? obj['rawSnippet'] : undefined,
          });
        }
      }
    }

    return {
      detectedType,
      patient: {
        name: typeof patientObj['name'] === 'string' ? patientObj['name'] : null,
        age: typeof patientObj['age'] === 'number' ? patientObj['age'] : null,
      },
      bpReadings,
      hba1cReadings,
      summaryNotes: typeof data['summaryNotes'] === 'string' ? data['summaryNotes'] : 'Gemini extraction complete.',
      modelConfidenceEstimate: typeof data['modelConfidenceEstimate'] === 'number' ? data['modelConfidenceEstimate'] : 90,
    };
  } catch (err: unknown) {
    console.warn('[GeminiService] Failed to parse model response JSON:', err);
    return null;
  }
}


export function fallbackClinicalExtractor(buffer: Buffer, fileName: string): RawExtractionOutput {
  const text = buffer.toString('utf-8');

  // 1. Detect Patient Age
  let age: number | null = null;
  const ageMatch = text.match(/(?:age|patient age)[\s:]+(\d{1,3})/i);
  if (ageMatch && ageMatch[1]) {
    age = parseInt(ageMatch[1], 10);
  }

  // 2. Detect Patient Name
  let name: string | null = null;
  const nameMatch = text.match(/(?:patient name|patient)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim();
  }

  // 3. Detect Blood Pressure Readings
  const bpReadings: BloodPressureReading[] = [];
  const bpRegex = /(?:bp|blood pressure)?\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmHg)?/gi;
  let bpMatch: RegExpExecArray | null;

  while ((bpMatch = bpRegex.exec(text)) !== null) {
    const systolic = parseInt(bpMatch[1] ?? '0', 10);
    const diastolic = parseInt(bpMatch[2] ?? '0', 10);

    if (systolic >= 60 && systolic <= 260 && diastolic >= 40 && diastolic <= 160) {
      const lineStart = text.lastIndexOf('\n', bpMatch.index) + 1;
      const lineEnd = text.indexOf('\n', bpMatch.index);
      const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd).toLowerCase();
      const isGoal = currentLine.includes('goal') || currentLine.includes('target') || currentLine.includes('past') || currentLine.includes('previous');

      // Date detection on or near line
      const surrounding = text.substring(Math.max(0, bpMatch.index - 50), bpMatch.index + 50);
      const dateMatch = surrounding.match(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/);
      const date = dateMatch && dateMatch[1] ? formatDate(dateMatch[1]) : null;

      bpReadings.push({
        systolic,
        diastolic,
        unit: 'mmHg',
        date,
        isGoalOrTarget: isGoal,
        rawSnippet: bpMatch[0],
      });
    }
  }

  const hba1cReadings: HbA1cReading[] = [];
  const a1cRegex = /(?:hba1c|hemoglobin a1c|a1c)[\s:=]+(\d{1,2}(?:\.\d{1,2})?)\s*%?/gi;
  let a1cMatch: RegExpExecArray | null;

  while ((a1cMatch = a1cRegex.exec(text)) !== null) {
    const value = parseFloat(a1cMatch[1] ?? '0');
    if (value >= 3.0 && value <= 20.0) {
      const lineStart = text.lastIndexOf('\n', a1cMatch.index) + 1;
      const lineEnd = text.indexOf('\n', a1cMatch.index);
      const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd).toLowerCase();
      const isGoal = currentLine.includes('goal') || currentLine.includes('target') || currentLine.includes('reference') || currentLine.includes('normal');

      const surrounding = text.substring(Math.max(0, a1cMatch.index - 50), a1cMatch.index + 50);
      const dateMatch = surrounding.match(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/);
      const date = dateMatch && dateMatch[1] ? formatDate(dateMatch[1]) : null;

      hba1cReadings.push({
        value,
        unit: '%',
        date,
        isGoalOrTarget: isGoal,
        rawSnippet: a1cMatch[0],
      });
    }
  }

  let detectedType: 'BP' | 'A1C' | 'UNKNOWN' = 'UNKNOWN';
  if (bpReadings.length > 0) {
    detectedType = 'BP';
  } else if (hba1cReadings.length > 0) {
    detectedType = 'A1C';
  }

  const confidence = detectedType === 'UNKNOWN' ? 20 : 85;

  return {
    detectedType,
    patient: { name, age },
    bpReadings,
    hba1cReadings,
    summaryNotes: detectedType === 'UNKNOWN'
      ? `No valid clinical quality measures detected in document (${fileName}).`
      : `Extracted clinical measure from text parser (${fileName}).`,
    modelConfidenceEstimate: confidence,
  };
}

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0] ?? raw;
    }
  } catch {
    // Return raw if unparseable
  }
  return raw;
}
