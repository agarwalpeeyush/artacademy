INSERT INTO ROLES (ID, NAME) VALUES
    (gen_random_uuid(), 'PRINCIPAL'),
    (gen_random_uuid(), 'TEACHER'),
    (gen_random_uuid(), 'STUDENT')
ON CONFLICT DO NOTHING;
