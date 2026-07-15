package dashboards

import "time"

type MemesDTO struct {
	ID				string		`json:"id" db:"id"`
	Title			string		`json:"title" db:"title"`
	VideoURL		string		`json:"videoURL" db:"video_url"`
	ThumbnailURL	string		`json:"thumbnailURL" db:"thumbnail_url"`
	CreatedAt 		time.Time	`json:"createdAt" db:"created_at"`
}

type DashboardRequest struct {
	UserID	string	`json:"userId"`
}