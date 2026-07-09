-- +goose Up
INSERT INTO memes (id, uploader_id, title, video_url, thumbnail_url, is_public)
VALUES
    (uuidv7(), NULL, 'Flashbang', 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783512025/gahdyum_a93h6l.webm', 'https://res.cloudinary.com/jlixjhrm/video/upload/so_0/v1783512025/gahdyum_a93h6l.jpg', true),
    (uuidv7(), NULL, 'SG boleh', 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783512052/sgboleh_ju8cvg.mp4', 'https://res.cloudinary.com/jlixjhrm/video/upload/so_10/v1783512052/sgboleh_ju8cvg.jpg', true),
    (uuidv7(), '019f41a3-5394-7a98-bf7c-2573ef440077', 'Lemme know', 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783580048/lemmeknow_fvhkmd.mp4', 'https://res.cloudinary.com/jlixjhrm/video/upload/so_5/v1783580048/lemmeknow_fvhkmd.jpg', false);

-- +goose Down
DELETE FROM memes WHERE is_public = true AND uploader_id IS NULL;