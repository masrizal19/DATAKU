export const isUuidFormat = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

export const validateUuid = (
  id: string | null | undefined,
  fieldName: string = 'ID'
): { isValid: boolean; error?: string } => {
  if (!id || !isUuidFormat(id)) {
    return {
      isValid: false,
      error: `${fieldName} tidak valid.`,
    };
  }
  return { isValid: true };
};
