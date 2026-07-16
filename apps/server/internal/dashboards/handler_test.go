package dashboards

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Doesn't work btw...
func (h *Handler) TestAddMeme(t *testing.T) {
	t.Run("add meme to postgres", func(t *testing.T) {
		reqBody := map[string]string{
			"title": "Senator pls",
			"videoURL": "https://res.cloudinary.com/jlixjhrm/video/upload/v1784132294/iii2bdklybkpdt7kc3n1.mp4",
			"thumbnailURL": "https://res.cloudinary.com/jlixjhrm/video/upload/so_5/v1784132294/iii2bdklybkpdt7kc3n1.jpg",
			"uploaderID": "019f41a3-5394-7a98-bf7c-2573ef440077",
		}
		jsonBytes, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/dashboard/submit-meme", bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		h.AddMeme(rr, req)
		if rr.Code != http.StatusCreated {
			t.Errorf("Add meme return wrong status code: got %v want %v", rr.Code, http.StatusCreated)
		}
	})
}