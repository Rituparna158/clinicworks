import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateSamplePdfs(outputDir: string): Promise<string[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generatedFiles: string[] = [];

  // 1. Adult BP Report (138/88 mmHg, age 54)
  const bpAdultPdf = await createClinicalPdf({
    title: 'CLINICAL VITALS EXAMINATION REPORT',
    patientName: 'Jane Smith',
    patientAge: 54,
    date: '2026-08-12',
    lines: [
      'Physical Examination - Routine Annual Checkup',
      'Physician: Dr. Robert Vance, MD',
      '',
      'Vitals Recorded:',
      '  Pulse: 72 bpm (Regular)',
      '  Respiratory Rate: 16 breaths/min',
      '  Body Temperature: 98.4 F',
      '  Blood Pressure: 138/88 mmHg',
      '',
      'Assessment: Stage 1 Hypertension noted. Patient advised on dietary sodium reduction.',
    ],
  });
  const file1 = path.join(outputDir, 'bp_adult_valid.pdf');
  fs.writeFileSync(file1, bpAdultPdf);
  generatedFiles.push(file1);

  // 2. Pediatric BP Report (Age 15 -> should trigger Needs Review per rule)
  const bpPediatricPdf = await createClinicalPdf({
    title: 'PEDIATRIC HEALTH RECORD',
    patientName: 'Tommy Jenkins',
    patientAge: 15,
    date: '2026-08-15',
    lines: [
      'Pediatric Sports Clearance Exam',
      'Physician: Dr. Sarah Lin, MD (Pediatrics)',
      '',
      'Vitals:',
      '  Height: 5 ft 6 in | Weight: 125 lbs',
      '  Blood Pressure: 118/76 mmHg',
      '  Heart Rate: 80 bpm',
      '',
      'Clinical Note: Cleared for interscholastic soccer.',
    ],
  });
  const file2 = path.join(outputDir, 'bp_under18_pediatric.pdf');
  fs.writeFileSync(file2, bpPediatricPdf);
  generatedFiles.push(file2);

  // 3. Multiple BP readings (dated: should select most recent 2026-08-15: 136/84)
  const bpMultiplePdf = await createClinicalPdf({
    title: 'HYPERTENSION LOG - MULTIPLE ENCOUNTERS',
    patientName: 'Marcus Reynolds',
    patientAge: 60,
    date: '2026-08-15',
    lines: [
      'Historical Blood Pressure Tracking:',
      '',
      '  Date: 2026-05-10 | Blood Pressure: 140/90 mmHg (Encounter 1)',
      '  Date: 2026-07-01 | Blood Pressure: 130/82 mmHg (Encounter 2)',
      '  Date: 2026-08-15 | Blood Pressure: 136/84 mmHg (Current Encounter)',
      '',
      'Notes: Return reading from 2026-08-15 as current evaluated clinical measure.',
    ],
  });
  const file3 = path.join(outputDir, 'bp_multiple_readings.pdf');
  fs.writeFileSync(file3, bpMultiplePdf);
  generatedFiles.push(file3);

  // 4. BP with Goal / Target (should ignore Goal < 120/80 and take measured 142/92)
  const bpGoalPdf = await createClinicalPdf({
    title: 'CARDIOLOGY CONSULTATION SUMMARY',
    patientName: 'Arthur Dent',
    patientAge: 52,
    date: '2026-08-10',
    lines: [
      'Cardiology Follow-up',
      'Care Plan Objectives:',
      '  Goal BP: < 120/80 mmHg per ACC/AHA guidelines',
      '  Past BP on last visit: 150/98 mmHg',
      '',
      'Today Measured Vitals:',
      '  Blood Pressure: 142/92 mmHg',
      '  Heart Rate: 74 bpm',
      '',
      'Plan: Increase Lisinopril dosage to 20mg daily to reach target BP.',
    ],
  });
  const file4 = path.join(outputDir, 'bp_with_goal.pdf');
  fs.writeFileSync(file4, bpGoalPdf);
  generatedFiles.push(file4);

  // 5. HbA1c Diabetes Report (> 5.9 -> 7.4% Diabetes)
  const a1cDiabetesPdf = await createClinicalPdf({
    title: 'ENDOCRINOLOGY LABORATORY REPORT',
    patientName: 'Eleanor Davis',
    patientAge: 62,
    date: '2026-07-30',
    lines: [
      'Diagnostic Lab Services - Reference Lab #402',
      'Test Ordered: Comprehensive Metabolic & Glycemic Profile',
      '',
      'Laboratory Findings:',
      '  Fasting Blood Glucose: 165 mg/dL',
      '  Hemoglobin A1c: 7.4%',
      '',
      'Reference Information (Educational):',
      '  Goal for diabetic patients: < 7.0%',
      '  Normal reference range: < 5.7%',
      '',
      'Impression: Suboptimal glycemic control. Metformin titrated to 1000mg BID.',
    ],
  });
  const file5 = path.join(outputDir, 'hba1c_diabetes.pdf');
  fs.writeFileSync(file5, a1cDiabetesPdf);
  generatedFiles.push(file5);

  // 6. HbA1c Prediabetes Report (> 5.7, <= 5.9 -> 5.8% Prediabetes)
  const a1cPrediabetesPdf = await createClinicalPdf({
    title: 'PRIMARY CARE PREVENTIVE LABS',
    patientName: 'David Miller',
    patientAge: 45,
    date: '2026-08-01',
    lines: [
      'Preventive Health Screening',
      '',
      'Laboratory Results:',
      '  Lipid Panel: Total Cholesterol 195 mg/dL',
      '  Hemoglobin A1c: 5.8%',
      '',
      'Clinical Interpretation: Impaired fasting glucose. Lifestyle modification recommended.',
    ],
  });
  const file6 = path.join(outputDir, 'hba1c_prediabetes.pdf');
  fs.writeFileSync(file6, a1cPrediabetesPdf);
  generatedFiles.push(file6);

  // 7. HbA1c Multiple Values (should return lowest value: 6.9%)
  const a1cMultiplePdf = await createClinicalPdf({
    title: 'DIABETIC PANEL - SERIAL MONITORING',
    patientName: 'Carlos Gomez',
    patientAge: 58,
    date: '2026-08-10',
    lines: [
      'Serial Glycemic Assessments over past quarter:',
      '  Test 1 (2026-08-01): Hemoglobin A1c: 8.2%',
      '  Test 2 (2026-05-15): Hemoglobin A1c: 6.9%',
      '  Test 3 (2026-07-20): Hemoglobin A1c: 7.5%',
      '',
      'Clinical Protocol: In multi-reading documents, evaluate against lowest value per rules.',
    ],
  });
  const file7 = path.join(outputDir, 'hba1c_multiple_values.pdf');
  fs.writeFileSync(file7, a1cMultiplePdf);
  generatedFiles.push(file7);

  // 8. Image / Scanned PDF Simulation
  const scannedPdf = await createClinicalPdf({
    title: 'SCANNED CLINICAL RECORD [FACSIMILE TRANSMISSION]',
    patientName: 'Patricia Taylor',
    patientAge: 51,
    date: '2026-08-14',
    lines: [
      '*** SCANNED DOCUMENT - DEPARTMENT OF CARDIOLOGY ***',
      'Transmission Date: 2026-08-14 09:30 AM',
      '',
      'Patient Encounter Summary:',
      '  Age: 51 | Gender: F',
      '  Blood Pressure: 132/86 mmHg',
      '  Heart Rhythm: Normal Sinus Rhythm',
      '',
      'Verified by Attending: Dr. M. Green, MD',
    ],
    isScannedStyle: true,
  });
  const file8 = path.join(outputDir, 'scanned_image_sample.pdf');
  fs.writeFileSync(file8, scannedPdf);
  generatedFiles.push(file8);

  return generatedFiles;
}

interface PdfOptions {
  title: string;
  patientName: string;
  patientAge: number;
  date: string;
  lines: string[];
  isScannedStyle?: boolean;
}

async function createClinicalPdf(opts: PdfOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header banner
  page.drawRectangle({
    x: 40,
    y: y - 10,
    width: width - 80,
    height: 35,
    color: opts.isScannedStyle ? rgb(0.9, 0.9, 0.9) : rgb(0.12, 0.35, 0.6),
  });

  page.drawText(opts.title, {
    x: 55,
    y: y + 2,
    size: 13,
    font: boldFont,
    color: opts.isScannedStyle ? rgb(0.2, 0.2, 0.2) : rgb(1, 1, 1),
  });

  y -= 45;

  // Patient Info Box
  page.drawText(`Patient Name: ${opts.patientName}    |    Age: ${opts.patientAge}    |    Date: ${opts.date}`, {
    x: 45,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 15;
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  y -= 25;

  // Content lines
  for (const line of opts.lines) {
    if (line === '') {
      y -= 10;
      continue;
    }
    const isHeader = line.endsWith(':') || line.startsWith('***');
    page.drawText(line, {
      x: 50,
      y,
      size: isHeader ? 11 : 10,
      font: isHeader ? boldFont : font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 18;
  }

  // Footer
  page.drawText('ClinicWorks Confidential Healthcare Document Processing Platform', {
    x: 50,
    y: 35,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Allow direct CLI execution: tsx src/utils/generateSampleDocs.ts
if (process.argv[1]?.endsWith('generateSampleDocs.ts') || process.argv[1]?.endsWith('generateSampleDocs.js')) {
  const targetDir = path.resolve(process.cwd(), 'sample-docs');
  generateSamplePdfs(targetDir)
    .then((files) => console.log(`[PdfGenerator] Created ${files.length} test clinical PDFs in ${targetDir}`))
    .catch((err) => console.error('[PdfGenerator] Error:', err));
}
