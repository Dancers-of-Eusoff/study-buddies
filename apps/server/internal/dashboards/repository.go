package dashboards

import (
	"database/sql"
)

type Repository interface {
	GetMemesByUser(userId string) (*[]MemeDTO, error)
	AddMeme(meme *SubmittedMemeDTO) (*MemeDTO, error)
	SetSelectedMeme(userId string, memeId string) error
	GetSelectedMemeID(userId string) (*string, error)
}

type DashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepo(db *sql.DB) *DashboardRepo {
	return &DashboardRepo{db: db}
}

func (r *DashboardRepo) GetMemesByUser(userId string) (*[]MemeDTO, error) {
	var memes []MemeDTO
	query := `SELECT id, title, video_url, thumbnail_url, created_at FROM memes WHERE (uploader_id = $1 or is_public = true)`

	rows, err := r.db.Query(query, userId)
	if err != nil {
		return &[]MemeDTO{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var meme MemeDTO
		if err := rows.Scan(
			&meme.ID,
			&meme.Title,
			&meme.VideoURL,
			&meme.ThumbnailURL,
			&meme.CreatedAt,
		); err != nil {
			return &[]MemeDTO{}, err
		}
		memes = append(memes, meme)
	}
	return &memes, nil
}

func (r *DashboardRepo) AddMeme(meme *SubmittedMemeDTO) (*MemeDTO, error) {
	var createdMeme MemeDTO
	query := `INSERT INTO memes (title, uploader_id, video_url, thumbnail_url)
			VALUES ($1, $2, $3, $4)
			RETURNING id, title, video_url, thumbnail_url, created_at`

	err := r.db.QueryRow(query, meme.Title, meme.UploaderID, meme.VideoURL, meme.ThumbnailURL).Scan(
		&createdMeme.ID,
		&createdMeme.Title,
		&createdMeme.VideoURL,
		&createdMeme.ThumbnailURL,
		&createdMeme.CreatedAt,
	)
	if err != nil {
		return &MemeDTO{}, err
	}

	return &createdMeme, nil
}

func (r *DashboardRepo) SetSelectedMeme(userId string, memeId string) error {
	query := `UPDATE users SET selected_meme_id = $1 WHERE id = $2`
	_, err := r.db.Exec(query, memeId, userId)
	return err
}

func (r *DashboardRepo) GetSelectedMemeID(userId string) (*string, error) {
	var selectedMemeID sql.NullString
	query := `SELECT selected_meme_id FROM users WHERE id = $1`
	err := r.db.QueryRow(query, userId).Scan(&selectedMemeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if !selectedMemeID.Valid {
		return nil, nil
	}
	s := selectedMemeID.String
	return &s, nil
}
