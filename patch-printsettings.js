import fs from 'fs';

let content = fs.readFileSync('src/services/printSettingsService.ts', 'utf8');

const exportTypes = `export type PaperSize = 'A4' | 'F4';
export type PageOrientation = 'Portrait' | 'Landscape' | 'Otomatis';
export type ImageExportFormat = 'JPEG' | 'PNG';
export interface DocumentPrintConfig {
  paperSize: PaperSize;
  orientation: PageOrientation;
  autoFitContent: boolean;
  imageFormat: ImageExportFormat;
  includeLogo: boolean;
  includeKop: boolean;
  includeSignature: boolean;
}
`;

content = content.replace("export const DEFAULT_PRINT_SETTINGS:", exportTypes + "\nexport const DEFAULT_PRINT_SETTINGS:");

fs.writeFileSync('src/services/printSettingsService.ts', content);
