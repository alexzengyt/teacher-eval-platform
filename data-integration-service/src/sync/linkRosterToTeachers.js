// data-integration-service/src/sync/linkRosterToTeachers.js
// Link evaluation.teachers to roster_teachers by email (case-insensitive).
// Returns stats for summary_json.

export async function linkRosterToTeachers(pool) {
  // 1) Count potential matches by email
  const totalMatchesRes = await pool.query(`
    SELECT COUNT(*)::int AS total_matches
    FROM public.teachers t
    JOIN public.roster_teachers rt
      ON t.external_id IS NOT NULL
     AND rt.external_id IS NOT NULL
     AND t.external_id = rt.external_id
  `);
  const totalMatches = totalMatchesRes.rows[0]?.total_matches ?? 0;

  // 2) Update only when different (handles NULL properly)
  const updateRes = await pool.query(`
    WITH matches AS (
      SELECT t.id AS teacher_id, rt.id AS roster_id
      FROM public.teachers t
      JOIN public.roster_teachers rt
        ON t.external_id IS NOT NULL
       AND rt.external_id IS NOT NULL
       AND t.external_id = rt.external_id
    )
    UPDATE public.teachers t
    SET roster_source_id = (m.roster_id)::text 
    FROM matches m
    WHERE t.id = m.teacher_id
      AND (t.roster_source_id IS DISTINCT FROM (m.roster_id)::text)
    RETURNING t.id
  `);
  const updated = updateRes.rowCount;
  // 3) How many are linked now?
  const nowLinkedRes = await pool.query(`
    SELECT COUNT(*)::int AS now_linked
    FROM public.teachers
    WHERE roster_source_id IS NOT NULL
  `);
  const nowLinked = nowLinkedRes.rows[0]?.now_linked ?? 0;

  // 4) Already-linked count (matched but unchanged)
  const alreadyLinked = Math.max(totalMatches - updated, 0);

  return { totalMatches, updated, alreadyLinked, nowLinked };
}
