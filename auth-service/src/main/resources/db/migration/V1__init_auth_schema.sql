CREATE TABLE roles
(
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users
(
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(100) UNIQUE  NOT NULL,
    password   VARCHAR(255)         NOT NULL,
    email      VARCHAR(200) UNIQUE  NOT NULL,
    status     VARCHAR(20)          NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles
(
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id)
);

CREATE TABLE refresh_tokens
(
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token       VARCHAR(500) UNIQUE NOT NULL,
    expiry_date TIMESTAMPTZ  NOT NULL
);
