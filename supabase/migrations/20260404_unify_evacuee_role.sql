-- Unify consumer role: legacy caregiver → evacuee (single hub / My People model).
UPDATE public.profiles
SET role = 'evacuee'
WHERE role = 'caregiver';

-- Normalize roles[]: caregiver → evacuee, dedupe
UPDATE public.profiles
SET roles = ARRAY(
  SELECT DISTINCT CASE WHEN x = 'caregiver' THEN 'evacuee' ELSE x END
  FROM unnest(COALESCE(roles, ARRAY[]::text[])) AS t(x)
)
WHERE roles IS NOT NULL AND cardinality(roles) > 0;

UPDATE public.profiles
SET roles = ARRAY[role]::text[]
WHERE (roles IS NULL OR cardinality(roles) = 0) AND role IS NOT NULL;
