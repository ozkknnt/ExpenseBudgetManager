INSERT INTO mst_event (
  event_id,
  event_code,
  event_name,
  event_order,
  create_date,
  update_date,
  del_flg
) VALUES
  (gen_random_uuid(), 'Q1', '1Q', 1, now(), now(), false),
  (gen_random_uuid(), 'Q2', '2Q', 2, now(), now(), false),
  (gen_random_uuid(), 'Q3', '3Q', 3, now(), now(), false),
  (gen_random_uuid(), 'Q4', '4Q', 4, now(), now(), false),
  (gen_random_uuid(), 'RIKEI_STANDARD', '利計標準', 5, now(), now(), false),
  (gen_random_uuid(), 'RIKEI_MIDDLE', '利計中間', 6, now(), now(), false),
  (gen_random_uuid(), 'RIKEI_FINAL', '利計最終', 7, now(), now(), false);
