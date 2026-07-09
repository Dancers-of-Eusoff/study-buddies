package dashboards

import "time"

type MemesDTO struct {
	Title			string		`json:"title" db:"title"`
	VideoURL		string		`json:"video_url" db:"video_url"`
	ThumbnailURL	string		`json:"thumbnail_url" db:"thumbnail_url"`
	CreatedAt 		time.Time	`json:"created_at" db:"created_at"`
}