INSERT INTO ROLES (ID, NAME) VALUES
    (gen_random_uuid(), 'ADMIN'),
    (gen_random_uuid(), 'PRINCIPAL'),
    (gen_random_uuid(), 'TEACHER'),
    (gen_random_uuid(), 'STUDENT'),
    (gen_random_uuid(), 'PARENT')
ON CONFLICT DO NOTHING;
