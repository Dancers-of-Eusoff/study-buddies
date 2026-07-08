-- +goose Up
INSERT INTO memes (id, uploader_id, title, video_url, thumbnail_url, is_public)
VALUES
    (uuidv7(), NULL, 'Flashbang', 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783512025/gahdyum_a93h6l.webm', 'https://res.cloudinary.com/jlixjhrm/video/upload/so_0/v1783512025/gahdyum_a93h6l.jpg', true),
    (uuidv7(), NULL, 'SG boleh', 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783512052/sgboleh_ju8cvg.mp4', 'https://res.cloudinary.com/jlixjhrm/video/upload/so_10/v1783512052/sgboleh_ju8cvg.jpg', true);

-- +goose Down
DELETE FROM memes WHERE is_public = true AND uploader_id IS NULL;