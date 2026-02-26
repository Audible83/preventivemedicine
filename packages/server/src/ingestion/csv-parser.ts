import { parse } from 'csv-parse/sync';

interface RawCSVRow {
  [key: string]: string;
}

export async function parseCSV(buffer: Buffer, userId: string) {
  const content = buffer.toString('utf-8');
  const records: RawCSVRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((row) => {
    // Try to detect common column names
    const category = row.category || row.Category || row.type || row.Type || 'lab';
    const code = row.code || row.Code || row.test || row.Test || row.name || row.Name || 'unknown';
    const displayName = row.displayName || row.display_name || row.name || row.Name || row.test || code;
    const value = parseFloat(row.value || row.Value || row.result || row.Result || '0');
    const unit = row.unit || row.Unit || row.units || row.Units || '';
    const timestamp = row.timestamp || row.date || row.Date || row.datetime || new Date().toISOString();

    return {
      userId,
      category,
      code,
      displayName,
      value,
      unit,
      timestamp: new Date(timestamp),
      source: 'csv' as const,
      confidence: 0.9,
      rawReference: JSON.stringify(row),
      metadata: {},
    };
  });
}
