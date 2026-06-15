package aieo_generate

import (
	"embed"
)

//go:embed docs/*.md
var complianceDocs embed.FS

// GetComplianceDoc retrieves the content of a compliance document by its filename.
func (uc *AIEOGenerate) GetComplianceDoc(filename string) (string, error) {
	content, err := complianceDocs.ReadFile("docs/" + filename)
	if err != nil {
		return "", err
	}
	return string(content), nil
}
