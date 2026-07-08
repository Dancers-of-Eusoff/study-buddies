-- +goose Up
CREATE TABLE room_participants (
    user_id UUID NOT NULL REFERENCES users(id),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, room_id)
);

-- +goose Down
DROP TABLE IF EXISTS room_participants;