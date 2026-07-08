-- +goose Up
CREATE TABLE memes (
    id UUID PRIMARY KEY,
    uploader_id UUID REFERENCES users(id),
    title VARCHAR NOT NULL,
    video_url VARCHAR NOT NULL,
    thumbnail_url VARCHAR,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS memes;