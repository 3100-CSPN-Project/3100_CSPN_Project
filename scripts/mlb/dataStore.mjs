const PAGE_SIZE = 1000;

/** Upsert a list of model rows in batches, honoring the database conflict key. */
export async function upsertRows(client, table, rows, onConflict, batchSize) {
  if (rows.length === 0) return;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await client.from(table).upsert(batch, { onConflict });

    if (error) {
      throw new Error(`Supabase upsert failed for ${table}: ${error.message}`);
    }
  }
}

/** Create the row that records the state of an importer run. */
export async function startIngestRun(client, season, mode) {
  const { data, error } = await client
    .from('mlb_ingest_runs')
    .insert({ season, mode, status: 'running' })
    .select('run_id')
    .single();

  if (error) {
    throw new Error(`Unable to start ingest run: ${error.message}`);
  }

  return data.run_id;
}

/** Update completion or failure counters for one importer run. */
export async function updateIngestRun(client, runId, values) {
  const { error } = await client
    .from('mlb_ingest_runs')
    .update(values)
    .eq('run_id', runId);

  if (error) {
    throw new Error(`Unable to update ingest run ${runId}: ${error.message}`);
  }
}

/** Page through rows whose image URL is still unset. */
export async function fetchPendingImageIds(client, target) {
  const { table, idColumn, urlColumn } = target;
  const ids = [];
  let data;
  let from = 0;

  do {
    const page = await client
      .from(table)
      .select(idColumn)
      .is(urlColumn, null)
      .order(idColumn)
      .range(from, from + PAGE_SIZE - 1);

    if (page.error) {
      throw new Error(`Could not read ${table}: ${page.error.message}`);
    }

    data = page.data;
    from += PAGE_SIZE;
    for (const row of data) ids.push(row[idColumn]);
  } while (data.length === PAGE_SIZE);

  return ids;
}

/** Save the delivery URL and public ID returned by Cloudinary. */
export async function saveUploadedImage(client, target, id, upload) {
  const { table, idColumn, urlColumn, publicIdColumn } = target;
  const newValues = {
    [urlColumn]: upload.secure_url,
    [publicIdColumn]: upload.public_id,
  };

  const { error } = await client.from(table).update(newValues).eq(idColumn, id);
  if (error) throw new Error(error.message);
}
