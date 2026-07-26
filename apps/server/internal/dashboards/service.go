package dashboards

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetMemes(userId string) (*[]MemeDTO, error) {
	memes, err := s.repo.GetMemesByUser(userId)
	return memes, err
}

func (s *Service) AddMeme(meme *SubmittedMemeDTO) (*MemeDTO, error) {
	createdMeme, err := s.repo.AddMeme(meme)
	return createdMeme, err
}

func (s *Service) SelectMeme(req *SelectMemeDTO) error {
	return s.repo.SetSelectedMeme(req.UserID, req.MemeID)
}

func (s *Service) GetSelectedMemeID(userId string) (*string, error) {
	return s.repo.GetSelectedMemeID(userId)
}

func (s *Service) GetAllMemes() (*[]MemeDTO, error) {
	return s.repo.GetAllMemes()
}
