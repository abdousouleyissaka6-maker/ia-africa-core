/**
 * IA AFRICA CORE — Provenance
 *
 * Conserve l'origine des informations utilisées
 * pour construire une réponse.
 */

export interface ProvenanceSource {
  id: string;
  type:
    | "knowledge-base"
    | "web"
    | "user"
    | "system"
    | "model";
  title?: string;
  url?: string;
  domain?: string;
  retrievedAt?: string;
}

export interface ProvenanceRecord {
  sources: ProvenanceSource[];
  generatedBy?: string;
  verified: boolean;
}

/**
 * Crée une trace de provenance.
 */
export function createProvenance(
  sources: ProvenanceSource[] = [],
  generatedBy?: string,
  verified = false,
): ProvenanceRecord {

  return {
    sources,
    generatedBy,
    verified,
  };
}

/**
 * Ajoute une source sans créer de doublon.
 */
export function addProvenanceSource(
  record: ProvenanceRecord,
  source: ProvenanceSource,
): ProvenanceRecord {

  const exists = record.sources.some(
    (item) => item.id === source.id,
  );

  if (exists) {
    return record;
  }

  return {
    ...record,
    sources: [
      ...record.sources,
      source,
    ],
  };
}

/**
 * Marque une provenance comme vérifiée.
 */
export function markProvenanceVerified(
  record: ProvenanceRecord,
): ProvenanceRecord {

  return {
    ...record,
    verified: true,
  };
}
