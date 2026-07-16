-- +goose Up
CREATE TABLE session_summaries (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL REFERENCES users(id),
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    focus_duration_seconds INTEGER NOT NULL DEFAULT 0,
    distraction_duration_seconds INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ
);

-- +goose Down
DROP TABLE IF EXISTS session_summaries;