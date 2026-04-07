-- Fix get_user_role() to set search_path (security best practice)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Fix users: update own profile policy
-- The old WITH CHECK prevented updates that didn't include the role column.
-- New policy: users can update their own row, but cannot change their role.
DROP POLICY IF EXISTS "users: update own profile" ON public.users;
CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (role IS NOT DISTINCT FROM (SELECT role FROM public.users WHERE id = auth.uid())));
