package dashboards

import "time"

type MemeDTO struct {
	ID				string		`json:"id" db:"id"`
	Title			string		`json:"title" db:"title"`
	VideoURL		string		`json:"videoURL" db:"video_url"`
	ThumbnailURL	string		`json:"thumbnailURL" db:"thumbnail_url"`
	CreatedAt 		time.Time	`json:"createdAt" db:"created_at"`
}

type UserMemeDTO struct {
	ID				string		`json:"id" db:"id"`
	Title			string		`json:"title" db:"title"`
	UploaderID		string		`json:"uploaderID" db:"uploader_id"`
	VideoURL		string		`json:"videoURL" db:"video_url"`
	ThumbnailURL	string		`json:"thumbnailURL" db:"thumbnail_url"`
	CreatedAt 		time.Time	`json:"createdAt" db:"created_at"`
}

type DashboardRequest struct {
	UserID	string	`json:"userId"`
}