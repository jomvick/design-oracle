/** Shared analysis types — mirrors backend result.json structure */

export interface DesignDna {
  style?: string;
  visual_score?: number | string;
  complexity?: string;
  summary?: string;
  visual_rules?: string[];
  [key: string]: unknown;
}

export interface ColorEntry {
  hex?: string;
  role?: string;
  count?: number;
}

export interface ColorsData {
  count?: number;
  all?: ColorEntry[];
  palette?: Record<string, string>;
  custom_properties?: Record<string, string>;
}

export interface TypographyData {
  families?: string[];
  primary_font?: string;
  scale?: { size?: string; weight?: string; line_height?: string }[];
}

export interface ComponentData {
  type?: string;
  selector?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface PatternData {
  name?: string;
  detected?: boolean | string;
  confidence?: number;
  description?: string;
}

export interface LayoutData {
  responsive?: boolean;
  uses_grid?: boolean;
  uses_flexbox?: boolean;
  max_container_width?: string | number;
}

export interface DesignSummary {
  id: string;
  url: string;
  title?: string;
  style?: string;
  visual_score?: string | number;
}

export interface AnalysisResult {
  url: string;
  final_url: string;
  title: string;
  design_md?: string;
  dna?: DesignDna;
  colors?: ColorsData;
  typography?: TypographyData;
  components?: ComponentData[];
  layout?: LayoutData;
  spacing?: { scale?: (string | number)[] };
  radius?: { radii?: string[]; shadows?: string[] };
  patterns?: PatternData[];
  design_tokens?: Record<string, unknown>;
}

export type PlatformKey =
  | "awwwards"
  | "siteinspire"
  | "mobbin"
  | "behance"
  | "dribbble"
  | "designspiration";

export interface InspirationPreset {
  id: string;
  title: string;
  category: string;
  target_url: string;
  gallery_url: string;
  source_platform: PlatformKey;
  preview_image: string;
  fallback_image: string;
  tags: string[];
}

export interface ResolveResult {
  platform: string;
  resolvable: boolean;
  target_url?: string;
  message?: string;
}
