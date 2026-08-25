CREATE SCHEMA IF NOT EXISTS des_y6_gold;

CREATE TABLE IF NOT EXISTS des_y6_gold.y6_cluster_wazp (
    id_cluster   bigint PRIMARY KEY,   -- meta.id;meta.main
    ra           double precision,     -- pos.eq.ra;meta.main
    dec          double precision,     -- pos.eq.dec;meta.main
    redshift     double precision,
    richness     double precision
);

CREATE TABLE IF NOT EXISTS des_y6_gold.y6_cluster_members_wazp (
    id_member    bigint PRIMARY KEY,   -- meta.id;meta.main
    id_cluster   bigint,               -- meta.id.cross
    ra           double precision,     -- pos.eq.ra;meta.main
    dec          double precision,     -- pos.eq.dec;meta.main
    pmem         double precision
);

INSERT INTO des_y6_gold.y6_cluster_wazp VALUES
  (1, 10.5, -30.2, 0.35, 25.4),
  (2, 15.1, -28.9, 0.41, 18.2)
ON CONFLICT (id_cluster) DO NOTHING;

INSERT INTO des_y6_gold.y6_cluster_members_wazp VALUES
  (101, 1, 10.51, -30.19, 0.92),
  (102, 1, 10.48, -30.22, 0.87),
  (201, 2, 15.09, -28.88, 0.95)
ON CONFLICT (id_member) DO NOTHING;
