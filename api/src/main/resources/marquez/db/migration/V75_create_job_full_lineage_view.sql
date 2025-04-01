CREATE MATERIALIZED VIEW IF NOT EXISTS job_full_lineage_view AS
WITH job_io_base AS (
  SELECT
    io.job_uuid AS job_uuid,
    io.job_symlink_target_uuid AS job_symlink_target_uuid,
    ARRAY_AGG(DISTINCT io.dataset_uuid) FILTER (WHERE io.io_type='INPUT') AS inputs,
    ARRAY_AGG(DISTINCT io.dataset_uuid) FILTER (WHERE io.io_type='OUTPUT') AS outputs
  FROM job_versions_io_mapping io
  WHERE io.is_current_job_version = TRUE
  GROUP BY io.job_symlink_target_uuid, io.job_uuid
),
job_with_lineage AS (
  SELECT
    j.uuid,
    j.symlink_target_uuid,
    j.namespace_name,
    j.name,
    j.type,
    j.description,
    j.created_at,
    j.updated_at,
    j.namespace_uuid,
    j.current_version_uuid,
    j.current_location_uuid,
    j.current_run_uuid,
    j.parent_job_uuid,
    io.inputs AS input_uuids,
    io.outputs AS output_uuids
  FROM jobs_view j
  LEFT JOIN job_io_base io ON j.uuid = io.job_uuid
)
SELECT 
  job_uuid,
  job_symlink_target_uuid,
  inputs,
  outputs,
  uuid,
  symlink_target_uuid,
  namespace_name, 
  name,
  type,
  description,
  created_at,
  updated_at,
  namespace_uuid,
  current_version_uuid,
  current_location_uuid,
  current_run_uuid,
  parent_job_uuid,
  input_uuids,
  output_uuids
FROM 
  job_with_lineage;

-- Create indexes to speed up lookups
CREATE INDEX IF NOT EXISTS job_full_lineage_view_job_uuid_idx ON job_full_lineage_view (job_uuid);
CREATE INDEX IF NOT EXISTS job_full_lineage_view_symlink_uuid_idx ON job_full_lineage_view (job_symlink_target_uuid);
CREATE INDEX IF NOT EXISTS job_full_lineage_view_inputs_idx ON job_full_lineage_view USING gin (inputs);
CREATE INDEX IF NOT EXISTS job_full_lineage_view_outputs_idx ON job_full_lineage_view USING gin (outputs);

-- Add indexes to improve performance of direct connection queries
CREATE INDEX IF NOT EXISTS idx_job_versions_io_mapping_dataset_uuid ON job_versions_io_mapping (dataset_uuid, io_type);
CREATE INDEX IF NOT EXISTS idx_job_versions_io_mapping_job_version ON job_versions_io_mapping (job_version_uuid, io_type);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_job_full_lineage_view()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY job_full_lineage_view;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically refresh the materialized view when relevant tables change
DROP TRIGGER IF EXISTS refresh_job_full_lineage_view_on_job_versions_io_mapping ON job_versions_io_mapping;
CREATE TRIGGER refresh_job_full_lineage_view_on_job_versions_io_mapping
AFTER INSERT OR UPDATE OR DELETE ON job_versions_io_mapping
FOR EACH STATEMENT EXECUTE FUNCTION refresh_job_full_lineage_view();

DROP TRIGGER IF EXISTS refresh_job_full_lineage_view_on_jobs ON jobs;
CREATE TRIGGER refresh_job_full_lineage_view_on_jobs
AFTER INSERT OR UPDATE OR DELETE ON jobs
FOR EACH STATEMENT EXECUTE FUNCTION refresh_job_full_lineage_view();