-- Expanded mobility/disability/medical chip LABELS are app-defined (text[] in profiles).
-- No schema change required for new onboarding options — values are stored in existing columns:
--   mobility_needs, disability_needs, disability_other, medical_needs, medical_other
-- MANUAL: No action required unless you add CHECK constraints on allowed values.

SELECT 1; -- placeholder so migration runner accepts empty-compatible file
