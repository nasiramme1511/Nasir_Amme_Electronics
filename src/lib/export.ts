/**
 * Client-side CSV export helper for Nasir Amme Electronics demo data
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): void {
  const sanitizeCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const stringValue = String(cell);
    // Escape double quotes
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvRows: string[] = [];
  
  // Header row
  csvRows.push(headers.map(sanitizeCell).join(','));

  // Content rows
  for (const row of rows) {
    csvRows.push(row.map(sanitizeCell).join(','));
  }

  const csvString = '\uFEFF' + csvRows.join('\r\n'); // Add BOM for Excel UTF-8 support
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename.replace(/[^a-z0-9_-]/gi, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Client-side JSON export helper for Nasir Amme Electronics data
 */
export function exportToJSON(filename: string, data: any): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/[^a-z0-9_-]/gi, '_')}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
