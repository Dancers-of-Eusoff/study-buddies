-- +goose Up
ALTER TABLE rooms ADD COLUMN module_code VARCHAR;
ALTER TABLE rooms ADD COLUMN invite_code VARCHAR;

CREATE UNIQUE INDEX rooms_invite_code_key ON rooms (invite_code) WHERE invite_code IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS rooms_invite_code_key;
ALTER TABLE rooms DROP COLUMN IF EXISTS invite_code;
ALTER TABLE rooms DROP COLUMN IF EXISTS module_code;
