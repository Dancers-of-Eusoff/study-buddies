-- +goose Up
ALTER TABLE users ADD COLUMN selected_meme_id UUID REFERENCES memes(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE users DROP COLUMN selected_meme_id;