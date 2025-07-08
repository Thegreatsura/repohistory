import { app } from '@/utils/octokit/app';
import { createClient } from '@supabase/supabase-js';

export async function updateTraffic(installationId: number) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const octokit = await app.getInstallationOctokit(installationId);
  app.eachRepository({ installationId }, async ({ repository }) => {
    // console.log(repository.full_name, 'start')

    try {
      const { data: viewsData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/views`,
      );

      const { data: clonesData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/clones`,
      );

      const { data: popularPathsData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/popular/paths`,
      );

      const { data: popularReferrersData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/popular/referrers`,
      );

      const { error: viewsError } = await supabase.from('views').upsert(
        viewsData.views.map((view: { timestamp: string; count: number; uniques: number }) => ({
          repo_id: repository.id,
          date: view.timestamp,
          total: view.count,
          unique: view.uniques,
        })),
        {
          onConflict: 'repo_id, date',
        },
      );

      const { error: clonesError } = await supabase.from('clones').upsert(
        clonesData.clones.map((clone: { timestamp: string; count: number; uniques: number }) => ({
          repo_id: repository.id,
          date: clone.timestamp,
          total: clone.count,
          unique: clone.uniques,
        })),
        {
          onConflict: 'repo_id, date',
        },
      );

      const { error: pathsError } = await supabase.from('paths').upsert(
        popularPathsData.map((path: { path: string; count: number; uniques: number }) => ({
          repo_id: repository.id,
          path: path.path,
          total: path.count,
          unique: path.uniques,
        })),
        {
          onConflict: 'repo_id, path, date',
        },
      );

      const { error: referrersError } = await supabase.from('referrers').upsert(
        popularReferrersData.map((referrer: { referrer: string; count: number; uniques: number }) => ({
          repo_id: repository.id,
          referrer: referrer.referrer,
          total: referrer.count,
          unique: referrer.uniques,
        })),
        {
          onConflict: 'repo_id, referrer, date',
        },
      );

      // console.log(repository.full_name, 'done');
      if (viewsError || clonesError || pathsError || referrersError) {
        console.log(viewsError, clonesError, pathsError, referrersError);
      }
    } catch (error) {
      console.error(repository.full_name, 'error', error instanceof Error ? error.message : String(error));
    }
  });
}
