import pdfParse from 'pdf-parse';

interface ExtractedValue {
  code: string;
  displayName: string;
  value: number;
  unit: string;
  category: string;
}

// Common lab result patterns
const LAB_PATTERNS = [
  { regex: /glucose[:\s]+(\d+\.?\d*)\s*(mg\/dL|mmol\/L)/gi, code: 'glucose', category: 'lab', name: 'Glucose' },
  { regex: /cholesterol[:\s]+(\d+\.?\d*)\s*(mg\/dL|mmol\/L)/gi, code: 'cholesterol-total', category: 'lab', name: 'Total Cholesterol' },
  { regex: /HDL[:\s]+(\d+\.?\d*)\s*(mg\/dL|mmol\/L)/gi, code: 'cholesterol-hdl', category: 'lab', name: 'HDL Cholesterol' },
  { regex: /LDL[:\s]+(\d+\.?\d*)\s*(mg\/dL|mmol\/L)/gi, code: 'cholesterol-ldl', category: 'lab', name: 'LDL Cholesterol' },
  { regex: /triglycerides?[:\s]+(\d+\.?\d*)\s*(mg\/dL|mmol\/L)/gi, code: 'triglycerides', category: 'lab', name: 'Triglycerides' },
  { regex: /HbA1c[:\s]+(\d+\.?\d*)\s*%/gi, code: 'hba1c', category: 'lab', name: 'HbA1c' },
  { regex: /blood\s*pressure[:\s]+(\d+)\/(\d+)/gi, code: 'blood-pressure', category: 'vital', name: 'Blood Pressure' },
  { regex: /BMI[:\s]+(\d+\.?\d*)/gi, code: 'bmi', category: 'vital', name: 'BMI' },
  { regex: /heart\s*rate[:\s]+(\d+)/gi, code: 'heart-rate', category: 'vital', name: 'Heart Rate' },
  { regex: /weight[:\s]+(\d+\.?\d*)\s*(kg|lbs?|pounds?)/gi, code: 'weight', category: 'vital', name: 'Weight' },
];

export async function parsePDF(buffer: Buffer, userId: string) {
  const data = await pdfParse(buffer);
  const text = data.text;

  const observations: any[] = [];

  for (const pattern of LAB_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(text)) !== null) {
      if (pattern.code === 'blood-pressure') {
        // Systolic
        observations.push({
          userId,
          category: pattern.category,
          code: 'blood-pressure-systolic',
          displayName: 'Systolic Blood Pressure',
          value: parseFloat(match[1]),
          unit: 'mmHg',
          timestamp: new Date(),
          source: 'pdf',
          confidence: 0.7,
          rawReference: match[0],
          metadata: {},
        });
        // Diastolic
        observations.push({
          userId,
          category: pattern.category,
          code: 'blood-pressure-diastolic',
          displayName: 'Diastolic Blood Pressure',
          value: parseFloat(match[2]),
          unit: 'mmHg',
          timestamp: new Date(),
          source: 'pdf',
          confidence: 0.7,
          rawReference: match[0],
          metadata: {},
        });
      } else {
        observations.push({
          userId,
          category: pattern.category,
          code: pattern.code,
          displayName: pattern.name,
          value: parseFloat(match[1]),
          unit: match[2] || '',
          timestamp: new Date(),
          source: 'pdf',
          confidence: 0.7,
          rawReference: match[0],
          metadata: {},
        });
      }
    }
  }

  return observations;
}
